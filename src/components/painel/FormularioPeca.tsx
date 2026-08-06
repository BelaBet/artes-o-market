import { useEffect, useState } from "react";
import { ArrowLeft, Loader2, Sparkles, Trash2, Camera, Check } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { useMinhaLoja, useSelecaoVocabulario, useVocabulario } from "@/hooks/useMinhaLoja";
import {
  useDescricaoAssistida,
  useDescricaoDisponivel,
  useFotosProduto,
  useProduto,
  useSalvarProduto,
  type ImagemProduto,
} from "@/hooks/useProdutosArtesao";

const campo =
  "w-full border border-border bg-background px-3 py-2.5 font-body text-[0.85rem] outline-none focus:border-terra transition-colors";
const rotulo = "block font-body text-[0.62rem] tracking-[0.14em] uppercase text-muted-foreground mb-2";

interface Props {
  produtoId: string | null;
  onVoltar: () => void;
}

const FormularioPeca = ({ produtoId, onVoltar }: Props) => {
  const { loja } = useMinhaLoja();
  const { produto, loading } = useProduto(produtoId ?? undefined);
  const { criar, atualizar, remover } = useSalvarProduto();
  const [idAtual, setIdAtual] = useState<string | null>(produtoId);
  const { enviar, enviando, remover: removerFoto } = useFotosProduto(
    idAtual ?? undefined,
    loja?.id,
  );

  const iaDisponivel = useDescricaoDisponivel();
  const descrever = useDescricaoAssistida();

  const materiais = useVocabulario("materials");
  const tecnicas = useVocabulario("techniques");
  const selMateriais = useSelecaoVocabulario("materials", loja?.id);
  const selTecnicas = useSelecaoVocabulario("techniques", loja?.id);

  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [preco, setPreco] = useState("");
  const [precoDe, setPrecoDe] = useState("");
  const [pecaUnica, setPecaUnica] = useState(true);
  const [quantidade, setQuantidade] = useState("1");
  const [dimensoes, setDimensoes] = useState("");
  const [peso, setPeso] = useState("");
  const [sugestao, setSugestao] = useState<string | null>(null);

  useEffect(() => {
    if (!produto) return;
    setTitulo(produto.title);
    setDescricao(produto.description ?? "");
    setPreco((produto.price_cents / 100).toFixed(2));
    setPrecoDe(produto.compare_at_price_cents ? (produto.compare_at_price_cents / 100).toFixed(2) : "");
    setPecaUnica(produto.stock_mode === "unique");
    setQuantidade(String(produto.stock_quantity));
    setPeso(produto.weight_grams ? String(produto.weight_grams) : "");
    setIdAtual(produto.id);
  }, [produto]);

  const centavos = (texto: string) => Math.round(Number(texto.replace(",", ".")) * 100) || 0;

  const salvar = async (status?: "draft" | "active") => {
    if (!loja) return;
    if (titulo.trim().length < 2) {
      toast.error("Dê um nome para a peça.");
      return;
    }
    if (centavos(preco) <= 0) {
      toast.error("Informe o preço da peça.");
      return;
    }

    const campos = {
      title: titulo.trim(),
      description: descricao.trim() || null,
      price_cents: centavos(preco),
      compare_at_price_cents: precoDe ? centavos(precoDe) : null,
      stock_mode: (pecaUnica ? "unique" : "quantity") as "unique" | "quantity",
      stock_quantity: pecaUnica ? 1 : Math.max(Number(quantidade) || 0, 0),
      weight_grams: peso ? Number(peso) : null,
      ...(status ? { status } : {}),
    };

    try {
      if (idAtual) {
        await atualizar.mutateAsync({ id: idAtual, ...campos });
      } else {
        const nova = await criar.mutateAsync({
          artisan_id: loja.id,
          title: campos.title,
          price_cents: campos.price_cents,
        });
        setIdAtual(nova.id);
        await atualizar.mutateAsync({ id: nova.id, ...campos });
      }

      toast.success(
        status === "active" ? "Peça publicada! 🎉" : "Peça salva como rascunho.",
      );
      if (status === "active") onVoltar();
    } catch (erro) {
      toast.error(
        erro instanceof Error && erro.message.includes("duplicate")
          ? "Já existe uma peça com esse endereço. Mude um pouco o nome."
          : "Não conseguimos salvar agora. Tente de novo.",
      );
    }
  };

  const pedirSugestao = async () => {
    if (titulo.trim().length < 2) {
      toast.error("Escreva o nome da peça primeiro — é a partir dele que escrevemos.");
      return;
    }

    try {
      const texto = await descrever.mutateAsync({
        titulo: titulo.trim(),
        materiais: materiais.opcoes
          .filter((m) => selMateriais.selecionados.includes(m.id))
          .map((m) => m.name),
        tecnicas: tecnicas.opcoes
          .filter((t) => selTecnicas.selecionados.includes(t.id))
          .map((t) => t.name),
        cidade: loja?.city,
        estado: loja?.state,
        dimensoes: dimensoes || undefined,
        observacoes: descricao.trim() || undefined,
      });
      setSugestao(texto);
    } catch {
      toast.error("Não conseguimos escrever a sugestão agora.");
    }
  };

  const imagens: ImagemProduto[] = produto?.product_images ?? [];

  if (produtoId && loading) {
    return (
      <div className="max-w-[720px]">
        <Skeleton className="h-[2rem] w-1/2 rounded-none mb-6" />
        <Skeleton className="h-[16rem] w-full rounded-none" />
      </div>
    );
  }

  return (
    <div className="max-w-[720px]">
      <button
        onClick={onVoltar}
        className="flex items-center gap-1.5 font-body text-[0.68rem] tracking-[0.12em] uppercase text-muted-foreground hover:text-foreground transition-colors mb-4"
      >
        <ArrowLeft className="w-3.5 h-3.5" /> Minhas peças
      </button>

      <h2 className="font-display text-[1.5rem] sm:text-[1.85rem] font-light mb-6">
        {idAtual ? "Editar peça" : "Nova peça"}
      </h2>

      <div className="border border-border bg-background p-5 sm:p-7">
        {/* Fotos */}
        <div className="mb-7">
          <label className={rotulo}>Fotos da peça</label>

          {!idAtual && (
            <p className="text-[0.76rem] text-muted-foreground font-light mb-3">
              Salve a peça uma vez e as fotos ficam disponíveis logo abaixo.
            </p>
          )}

          <div className="flex flex-wrap gap-2">
            {imagens.map((img) => (
              <div key={img.id} className="relative w-[92px] h-[92px] border border-border bg-parchment">
                <img
                  src={supabase.storage.from("produtos").getPublicUrl(img.storage_path).data.publicUrl}
                  alt=""
                  className="w-full h-full object-cover"
                />
                <button
                  onClick={async () => {
                    await removerFoto(img);
                    toast.success("Foto removida");
                  }}
                  aria-label="Remover foto"
                  className="absolute top-1 right-1 bg-background/90 border border-border p-1 hover:bg-background transition-colors"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ))}

            {idAtual && (
              <label className="w-[92px] h-[92px] border border-dashed border-border flex flex-col items-center justify-center gap-1 cursor-pointer hover:border-foreground transition-colors">
                {enviando ? (
                  <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                ) : (
                  <Camera className="w-4 h-4 text-muted-foreground" />
                )}
                <span className="text-[0.62rem] text-muted-foreground">
                  {enviando ? "Enviando" : "Adicionar"}
                </span>
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={async (e) => {
                    const arquivo = e.target.files?.[0];
                    e.target.value = "";
                    if (!arquivo) return;
                    try {
                      await enviar(arquivo);
                      toast.success("Foto adicionada");
                    } catch (erro) {
                      toast.error(
                        erro instanceof Error ? erro.message : "Não conseguimos enviar a foto.",
                      );
                    }
                  }}
                />
              </label>
            )}
          </div>
        </div>

        {/* Nome */}
        <div className="mb-5">
          <label className={rotulo} htmlFor="titulo">Nome da peça</label>
          <input
            id="titulo"
            className={campo}
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            placeholder="Vaso de cerâmica queimado a lenha"
          />
        </div>

        {/* Descrição */}
        <div className="mb-6">
          <div className="flex items-center justify-between gap-3 mb-2">
            <label className={`${rotulo} mb-0`} htmlFor="descricao">Descrição</label>

            {iaDisponivel && (
              <button
                onClick={pedirSugestao}
                disabled={descrever.isPending}
                className="flex items-center gap-1.5 border border-border px-3 py-1.5 font-body text-[0.64rem] tracking-[0.1em] uppercase hover:border-foreground transition-colors disabled:opacity-50"
              >
                {descrever.isPending ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <Sparkles className="w-3 h-3" />
                )}
                Me ajude a escrever
              </button>
            )}
          </div>

          <textarea
            id="descricao"
            rows={6}
            className={`${campo} leading-[1.7] resize-y`}
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
            placeholder="Como é feita, para que serve, o que tem de especial…"
          />

          {sugestao && (
            <div className="border border-terra/40 bg-terra/5 p-4 mt-3">
              <div className="font-body text-[0.62rem] tracking-[0.14em] uppercase text-terra mb-2">
                Sugestão
              </div>
              <p className="text-[0.85rem] font-light leading-[1.7] mb-3 whitespace-pre-wrap">
                {sugestao}
              </p>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => {
                    setDescricao(sugestao);
                    setSugestao(null);
                  }}
                  className="flex items-center gap-1.5 bg-espresso text-parchment px-3.5 py-2 font-body text-[0.64rem] tracking-[0.1em] uppercase"
                >
                  <Check className="w-3 h-3" /> Usar este texto
                </button>
                <button
                  onClick={pedirSugestao}
                  className="border border-border px-3.5 py-2 font-body text-[0.64rem] tracking-[0.1em] uppercase hover:border-foreground transition-colors"
                >
                  Fazer outra
                </button>
                <button
                  onClick={() => setSugestao(null)}
                  className="px-3.5 py-2 font-body text-[0.64rem] tracking-[0.1em] uppercase text-muted-foreground hover:text-foreground transition-colors"
                >
                  Descartar
                </button>
              </div>
              <p className="text-[0.72rem] text-muted-foreground mt-3 leading-snug">
                Confira antes de usar — o texto é uma sugestão, e quem conhece a peça é você.
              </p>
            </div>
          )}
        </div>

        {/* Preço */}
        <div className="grid grid-cols-2 gap-4 mb-5">
          <div>
            <label className={rotulo} htmlFor="preco">Preço</label>
            <input
              id="preco"
              inputMode="decimal"
              className={campo}
              value={preco}
              onChange={(e) => setPreco(e.target.value)}
              placeholder="129,00"
            />
          </div>
          <div>
            <label className={rotulo} htmlFor="precoDe">Preço anterior</label>
            <input
              id="precoDe"
              inputMode="decimal"
              className={campo}
              value={precoDe}
              onChange={(e) => setPrecoDe(e.target.value)}
              placeholder="Opcional"
            />
          </div>
        </div>

        {/* Estoque */}
        <div className="mb-5">
          <label className={rotulo}>Disponibilidade</label>
          <div className="flex gap-2 mb-3">
            <button
              onClick={() => setPecaUnica(true)}
              className={`flex-1 border px-3 py-2.5 font-body text-[0.78rem] transition-colors ${
                pecaUnica ? "border-foreground bg-parchment" : "border-border hover:border-foreground"
              }`}
            >
              Peça única
            </button>
            <button
              onClick={() => setPecaUnica(false)}
              className={`flex-1 border px-3 py-2.5 font-body text-[0.78rem] transition-colors ${
                !pecaUnica ? "border-foreground bg-parchment" : "border-border hover:border-foreground"
              }`}
            >
              Tenho várias
            </button>
          </div>

          {!pecaUnica && (
            <input
              inputMode="numeric"
              className={`${campo} max-w-[160px]`}
              value={quantidade}
              onChange={(e) => setQuantidade(e.target.value)}
              placeholder="Quantidade"
              aria-label="Quantidade disponível"
            />
          )}
          <p className="text-[0.74rem] text-muted-foreground mt-2">
            {pecaUnica
              ? "Sai da loja assim que for vendida."
              : "A quantidade diminui a cada venda."}
          </p>
        </div>

        {/* Medidas */}
        <div className="grid grid-cols-2 gap-4 mb-7">
          <div>
            <label className={rotulo} htmlFor="dimensoes">Medidas</label>
            <input
              id="dimensoes"
              className={campo}
              value={dimensoes}
              onChange={(e) => setDimensoes(e.target.value)}
              placeholder="20 x 15 cm"
            />
          </div>
          <div>
            <label className={rotulo} htmlFor="peso">Peso</label>
            <input
              id="peso"
              inputMode="numeric"
              className={campo}
              value={peso}
              onChange={(e) => setPeso(e.target.value)}
              placeholder="gramas"
            />
          </div>
        </div>

        {/* Ações */}
        <div className="flex flex-wrap gap-2 pt-4 border-t border-border">
          <button
            onClick={() => salvar("active")}
            disabled={atualizar.isPending || criar.isPending}
            className="bg-terra text-background px-5 py-2.5 font-body text-[0.68rem] tracking-[0.14em] uppercase hover:brightness-95 transition-all disabled:opacity-50 flex items-center gap-2"
          >
            {(atualizar.isPending || criar.isPending) && (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            )}
            Publicar na loja
          </button>

          <button
            onClick={() => salvar("draft")}
            disabled={atualizar.isPending || criar.isPending}
            className="border border-border px-5 py-2.5 font-body text-[0.68rem] tracking-[0.14em] uppercase hover:border-foreground transition-colors disabled:opacity-50"
          >
            Salvar rascunho
          </button>

          {idAtual && (
            <button
              onClick={async () => {
                if (!confirm("Apagar esta peça? Não dá para desfazer.")) return;
                await remover.mutateAsync(idAtual);
                toast.success("Peça apagada");
                onVoltar();
              }}
              className="ml-auto flex items-center gap-1.5 px-4 py-2.5 font-body text-[0.68rem] tracking-[0.12em] uppercase text-muted-foreground hover:text-destructive transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" /> Apagar
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default FormularioPeca;
