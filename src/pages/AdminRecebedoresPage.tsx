import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, ArrowLeft, Check, FileText, Loader2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { usePageMeta } from "@/hooks/usePageMeta";
import {
  useCriarRecebedor,
  useEhAdmin,
  useLeituraDisponivel,
  useLerDocumento,
  useLojasParaCadastro,
  type DadosRecebedor,
  type LojaComRecebimento,
  type SugestaoDocumento,
} from "@/hooks/useAdminRecebedores";

const campo =
  "w-full border border-border bg-background px-3 py-2.5 font-body text-[0.85rem] outline-none focus:border-terra transition-colors";
const rotulo = "block font-body text-[0.6rem] tracking-[0.14em] uppercase text-muted-foreground mb-1.5";

const vazio: DadosRecebedor = {
  nome: "", email: "", documento: "", nascimento: "", telefone: "",
  ocupacao: "Artesão", faturamento_mensal: 1000,
  endereco: { rua: "", numero: "", complemento: "", bairro: "", cidade: "", estado: "", cep: "" },
  banco: { codigo: "", agencia: "", conta: "", conta_digito: "", tipo: "checking" },
};

const situacao = (loja: LojaComRecebimento) => {
  const b = loja.artisan_billing;
  if (!b?.pagarme_recipient_id) return { texto: "Sem recebedor", cor: "border-border text-muted-foreground" };
  if (b.can_withdraw) return { texto: "Pode receber", cor: "border-sage text-sage" };
  return { texto: "Aguardando verificação", cor: "border-terra text-terra" };
};

const Formulario = ({
  loja,
  onVoltar,
}: {
  loja: LojaComRecebimento;
  onVoltar: () => void;
}) => {
  const criar = useCriarRecebedor();
  const ler = useLerDocumento();
  const leituraDisponivel = useLeituraDisponivel();

  const [dados, setDados] = useState<DadosRecebedor>(vazio);
  const [sugestao, setSugestao] = useState<SugestaoDocumento | null>(null);
  const [preenchidoPorLeitura, setPreenchidoPorLeitura] = useState<Set<string>>(new Set());

  // Caminho 1: o que a plataforma já sabe da loja entra sozinho.
  useEffect(() => {
    setDados((d) => ({
      ...d,
      nome: loja.public_name || loja.shop_name || "",
      telefone: loja.whatsapp ?? "",
      endereco: {
        ...d.endereco,
        cidade: loja.city ?? "",
        estado: loja.state ?? "",
      },
      documento: loja.company_document ?? "",
    }));
  }, [loja]);

  const mudar = (campos: Partial<DadosRecebedor>) => setDados((d) => ({ ...d, ...campos }));

  const aplicarSugestao = (s: SugestaoDocumento) => {
    const aplicados = new Set<string>();
    setDados((d) => {
      const novo = { ...d, banco: { ...d.banco } };
      if (s.nome) { novo.nome = s.nome; aplicados.add("nome"); }
      if (s.documento) { novo.documento = s.documento; aplicados.add("documento"); }
      if (s.nascimento) { novo.nascimento = s.nascimento; aplicados.add("nascimento"); }
      if (s.banco) { novo.banco.codigo = s.banco; aplicados.add("banco"); }
      if (s.agencia) { novo.banco.agencia = s.agencia; aplicados.add("agencia"); }
      if (s.conta) { novo.banco.conta = s.conta; aplicados.add("conta"); }
      if (s.conta_digito) { novo.banco.conta_digito = s.conta_digito; aplicados.add("digito"); }
      return novo;
    });
    setPreenchidoPorLeitura(aplicados);
    setSugestao(null);
    toast.success("Campos preenchidos — confira cada um.");
  };

  const faltando = useMemo(() => {
    const f: string[] = [];
    if (!dados.nome) f.push("nome");
    if (!dados.email) f.push("e-mail");
    if (dados.documento.replace(/\D/g, "").length < 11) f.push("CPF ou CNPJ");
    if (!dados.nascimento && dados.documento.replace(/\D/g, "").length === 11)
      f.push("data de nascimento");
    if (!dados.banco.codigo || !dados.banco.agencia || !dados.banco.conta)
      f.push("dados bancários");
    if (!dados.endereco.rua || !dados.endereco.cep) f.push("endereço");
    return f;
  }, [dados]);

  const marcado = (chave: string) =>
    preenchidoPorLeitura.has(chave) ? "border-terra" : "";

  return (
    <div className="max-w-[720px]">
      <button
        onClick={onVoltar}
        className="flex items-center gap-1.5 font-body text-[0.68rem] tracking-[0.12em] uppercase text-muted-foreground hover:text-foreground transition-colors mb-4"
      >
        <ArrowLeft className="w-3.5 h-3.5" /> Lojas
      </button>

      <h2 className="font-display text-[1.5rem] sm:text-[1.85rem] font-light mb-1">
        Cadastrar recebedor
      </h2>
      <p className="text-[0.84rem] font-light text-muted-foreground mb-6">
        {loja.shop_name}
        {loja.city && ` · ${loja.city}${loja.state ? `/${loja.state}` : ""}`}
      </p>

      {/* Aviso de privacidade — visível, não escondido em rodapé */}
      <div className="border border-border bg-parchment px-4 py-3.5 mb-6 flex gap-3">
        <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5 text-sage" />
        <p className="text-[0.8rem] font-light leading-[1.6]">
          CPF, conta bancária e endereço vão direto para o Pagar.me e{" "}
          <strong className="font-medium">não ficam guardados aqui</strong>. Se você enviar
          uma foto de documento, ela é lida e descartada na hora — não fica salva em lugar
          nenhum.
        </p>
      </div>

      {/* Caminho 2: leitura do documento */}
      {leituraDisponivel && (
        <div className="border border-border p-4 mb-6">
          <div className="flex items-center justify-between gap-3 mb-2">
            <span className="font-body text-[0.8rem]">Preencher a partir de um documento</span>
            <label className="shrink-0 flex items-center gap-1.5 border border-border px-3 py-2 font-body text-[0.66rem] tracking-[0.1em] uppercase cursor-pointer hover:border-foreground transition-colors">
              {ler.isPending ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <FileText className="w-3 h-3" />
              )}
              {ler.isPending ? "Lendo…" : "Enviar foto"}
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
                    const resultado = await ler.mutateAsync(arquivo);
                    setSugestao(resultado);
                  } catch (erro) {
                    toast.error(
                      erro instanceof Error ? erro.message : "Não conseguimos ler o documento.",
                    );
                  }
                }}
              />
            </label>
          </div>
          <p className="text-[0.74rem] text-muted-foreground font-light leading-snug">
            RG, CNH ou comprovante bancário. A leitura é uma sugestão — nada é salvo sem
            você confirmar.
          </p>
        </div>
      )}

      {/* Confirmação da leitura */}
      {sugestao && (
        <div className="border border-terra/50 bg-terra/5 p-4 mb-6">
          <div className="font-body text-[0.62rem] tracking-[0.14em] uppercase text-terra mb-3">
            Encontramos isto no documento
          </div>

          {sugestao.confianca !== "alta" && (
            <div className="flex gap-2 mb-3 text-[0.78rem] text-muted-foreground">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              <span>
                A leitura não ficou totalmente clara
                {sugestao.observacao ? `: ${sugestao.observacao}` : "."} Confira com atenção.
              </span>
            </div>
          )}

          <dl className="text-[0.84rem] mb-4 space-y-1.5">
            {[
              ["Nome", sugestao.nome],
              ["CPF/CNPJ", sugestao.documento],
              ["Nascimento", sugestao.nascimento],
              ["Banco", sugestao.banco],
              ["Agência", sugestao.agencia],
              ["Conta", sugestao.conta && `${sugestao.conta}${sugestao.conta_digito ? `-${sugestao.conta_digito}` : ""}`],
            ]
              .filter(([, v]) => v)
              .map(([k, v]) => (
                <div key={k as string} className="flex gap-2">
                  <dt className="text-muted-foreground min-w-[92px]">{k}</dt>
                  <dd className="font-medium">{v}</dd>
                </div>
              ))}
          </dl>

          <p className="text-[0.82rem] font-light mb-3">Essas informações estão certas?</p>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => aplicarSugestao(sugestao)}
              className="flex items-center gap-1.5 bg-espresso text-parchment px-4 py-2.5 font-body text-[0.66rem] tracking-[0.12em] uppercase"
            >
              <Check className="w-3 h-3" /> Sim, usar
            </button>
            <button
              onClick={() => setSugestao(null)}
              className="border border-border px-4 py-2.5 font-body text-[0.66rem] tracking-[0.12em] uppercase hover:border-foreground transition-colors"
            >
              Não, preencho à mão
            </button>
          </div>
        </div>
      )}

      <div className="border border-border bg-background p-5 sm:p-7">
        {preenchidoPorLeitura.size > 0 && (
          <p className="text-[0.76rem] text-terra mb-5">
            Os campos destacados vieram do documento. Confira antes de salvar.
          </p>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          <div>
            <label className={rotulo} htmlFor="nome">Nome completo</label>
            <input id="nome" className={`${campo} ${marcado("nome")}`} value={dados.nome}
              onChange={(e) => mudar({ nome: e.target.value })} />
          </div>
          <div>
            <label className={rotulo} htmlFor="email">E-mail</label>
            <input id="email" type="email" className={campo} value={dados.email}
              onChange={(e) => mudar({ email: e.target.value })} />
          </div>
          <div>
            <label className={rotulo} htmlFor="documento">CPF ou CNPJ</label>
            <input id="documento" inputMode="numeric" className={`${campo} ${marcado("documento")}`}
              value={dados.documento} onChange={(e) => mudar({ documento: e.target.value })} />
          </div>
          <div>
            <label className={rotulo} htmlFor="nascimento">Data de nascimento</label>
            <input id="nascimento" type="date" className={`${campo} ${marcado("nascimento")}`}
              value={dados.nascimento} onChange={(e) => mudar({ nascimento: e.target.value })} />
          </div>
          <div>
            <label className={rotulo} htmlFor="telefone">Telefone</label>
            <input id="telefone" className={campo} value={dados.telefone}
              onChange={(e) => mudar({ telefone: e.target.value })} />
          </div>
          <div>
            <label className={rotulo} htmlFor="ocupacao">Ocupação</label>
            <input id="ocupacao" className={campo} value={dados.ocupacao}
              onChange={(e) => mudar({ ocupacao: e.target.value })} />
          </div>
        </div>

        <div className="font-body text-[0.6rem] tracking-[0.16em] uppercase text-muted-foreground mt-6 mb-3">
          Endereço
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-[1fr_100px] gap-4 mb-4">
          <div>
            <label className={rotulo} htmlFor="rua">Rua</label>
            <input id="rua" className={campo} value={dados.endereco.rua}
              onChange={(e) => mudar({ endereco: { ...dados.endereco, rua: e.target.value } })} />
          </div>
          <div>
            <label className={rotulo} htmlFor="numero">Número</label>
            <input id="numero" className={campo} value={dados.endereco.numero}
              onChange={(e) => mudar({ endereco: { ...dados.endereco, numero: e.target.value } })} />
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
          <div>
            <label className={rotulo} htmlFor="bairro">Bairro</label>
            <input id="bairro" className={campo} value={dados.endereco.bairro}
              onChange={(e) => mudar({ endereco: { ...dados.endereco, bairro: e.target.value } })} />
          </div>
          <div>
            <label className={rotulo} htmlFor="cidade">Cidade</label>
            <input id="cidade" className={campo} value={dados.endereco.cidade}
              onChange={(e) => mudar({ endereco: { ...dados.endereco, cidade: e.target.value } })} />
          </div>
          <div>
            <label className={rotulo} htmlFor="uf">UF</label>
            <input id="uf" maxLength={2} className={campo} value={dados.endereco.estado}
              onChange={(e) => mudar({ endereco: { ...dados.endereco, estado: e.target.value.toUpperCase() } })} />
          </div>
          <div>
            <label className={rotulo} htmlFor="cep">CEP</label>
            <input id="cep" inputMode="numeric" className={campo} value={dados.endereco.cep}
              onChange={(e) => mudar({ endereco: { ...dados.endereco, cep: e.target.value } })} />
          </div>
        </div>

        <div className="font-body text-[0.6rem] tracking-[0.16em] uppercase text-muted-foreground mt-6 mb-3">
          Conta bancária
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          <div>
            <label className={rotulo} htmlFor="banco">Banco</label>
            <input id="banco" inputMode="numeric" placeholder="001"
              className={`${campo} ${marcado("banco")}`} value={dados.banco.codigo}
              onChange={(e) => mudar({ banco: { ...dados.banco, codigo: e.target.value } })} />
          </div>
          <div>
            <label className={rotulo} htmlFor="agencia">Agência</label>
            <input id="agencia" inputMode="numeric" className={`${campo} ${marcado("agencia")}`}
              value={dados.banco.agencia}
              onChange={(e) => mudar({ banco: { ...dados.banco, agencia: e.target.value } })} />
          </div>
          <div>
            <label className={rotulo} htmlFor="conta">Conta</label>
            <input id="conta" inputMode="numeric" className={`${campo} ${marcado("conta")}`}
              value={dados.banco.conta}
              onChange={(e) => mudar({ banco: { ...dados.banco, conta: e.target.value } })} />
          </div>
          <div>
            <label className={rotulo} htmlFor="digito">Dígito</label>
            <input id="digito" inputMode="numeric" className={`${campo} ${marcado("digito")}`}
              value={dados.banco.conta_digito}
              onChange={(e) => mudar({ banco: { ...dados.banco, conta_digito: e.target.value } })} />
          </div>
        </div>

        {faltando.length > 0 && (
          <p className="text-[0.8rem] text-muted-foreground mb-4">
            Ainda falta: {faltando.join(", ")}.
          </p>
        )}

        <button
          disabled={faltando.length > 0 || criar.isPending}
          onClick={async () => {
            try {
              const resposta = await criar.mutateAsync({ ...dados, artisan_id: loja.id });
              toast.success(resposta.aviso ?? "Recebedor cadastrado.");
              onVoltar();
            } catch (erro) {
              toast.error(
                erro instanceof Error ? erro.message : "Não conseguimos cadastrar agora.",
              );
            }
          }}
          className="bg-terra text-background px-6 py-3 font-body text-[0.7rem] tracking-[0.14em] uppercase hover:brightness-95 transition-all disabled:opacity-40 flex items-center gap-2"
        >
          {criar.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
          Cadastrar no Pagar.me
        </button>
      </div>
    </div>
  );
};

const AdminRecebedoresPage = () => {
  const { ehAdmin, verificando } = useEhAdmin();
  const { lojas, loading } = useLojasParaCadastro();
  const [selecionada, setSelecionada] = useState<LojaComRecebimento | null>(null);

  usePageMeta("Recebedores");

  if (verificando || loading) {
    return (
      <div className="max-w-[820px] mx-auto px-4 py-10">
        <Skeleton className="h-[2rem] w-1/3 rounded-none mb-6" />
        <Skeleton className="h-[12rem] w-full rounded-none" />
      </div>
    );
  }

  // Área restrita: quem não é admin não vê nem que ela existe.
  if (!ehAdmin) {
    return (
      <div className="max-w-[520px] mx-auto px-4 py-16 text-center">
        <h1 className="font-display text-[1.6rem] font-light mb-2">Página não encontrada</h1>
        <Link to="/" className="text-[0.84rem] text-terra hover:underline">
          Voltar ao início
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-[820px] mx-auto px-4 py-8 sm:py-12">
      {selecionada ? (
        <Formulario loja={selecionada} onVoltar={() => setSelecionada(null)} />
      ) : (
        <>
          <div className="mb-6 pb-3 border-b border-border">
            <div className="font-body text-[0.6rem] tracking-[0.18em] uppercase text-terra mb-1.5">
              Administração
            </div>
            <h1 className="font-display text-[1.6rem] sm:text-[2rem] font-light leading-tight">
              Recebedores
            </h1>
            <p className="text-[0.84rem] font-light text-muted-foreground mt-2">
              Cadastre as lojas no Pagar.me para que possam receber pelas vendas.
            </p>
          </div>

          <div className="border border-border divide-y divide-border">
            {lojas.map((loja) => {
              const s = situacao(loja);
              return (
                <button
                  key={loja.id}
                  onClick={() => setSelecionada(loja)}
                  className="w-full flex items-center gap-3 px-4 py-4 text-left hover:bg-parchment transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <div className="font-display text-[1rem] leading-tight truncate">
                      {loja.shop_name}
                    </div>
                    <div className="text-[0.74rem] text-muted-foreground">
                      {[loja.city, loja.state].filter(Boolean).join("/") || "sem cidade"}
                      {loja.user_id ? "" : " · sem dono"}
                    </div>
                  </div>
                  <span
                    className={`shrink-0 font-body text-[0.56rem] tracking-[0.12em] uppercase px-2 py-1 border ${s.cor}`}
                  >
                    {s.texto}
                  </span>
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
};

export default AdminRecebedoresPage;
