import { useState } from "react";
import { Loader2, Pencil, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { formatPriceCents } from "@/lib/data";
import { useCategorias } from "@/hooks/useCategorias";
import { useMeusProdutos, useSalvarProduto, type DadosProduto, type MeuProduto } from "@/hooks/useMeusProdutos";

const campo =
  "w-full border border-border bg-transparent px-3 py-2.5 font-body text-[0.82rem] outline-none focus:border-terra transition-colors";
const rotulo = "block text-[0.6rem] tracking-[0.16em] uppercase text-muted-foreground mb-2";

const VAZIO: DadosProduto = {
  title: "",
  description: "",
  priceCents: 0,
  stockQuantity: 1,
  status: "active",
  categoryId: null,
};

interface FormularioProdutoProps {
  artisanId: string;
  produto: MeuProduto | null;
  onFechar: () => void;
}

const FormularioProduto = ({ artisanId, produto, onFechar }: FormularioProdutoProps) => {
  const { categorias } = useCategorias();
  const { criar, atualizar, salvando } = useSalvarProduto(artisanId);
  const [dados, setDados] = useState<DadosProduto>(
    produto
      ? {
          title: produto.title,
          description: produto.description ?? "",
          priceCents: produto.priceCents,
          stockQuantity: produto.stockQuantity,
          status: produto.status,
          categoryId: produto.categoryId,
        }
      : VAZIO,
  );
  const [imagem, setImagem] = useState<File | null>(null);

  const salvar = async () => {
    if (!dados.title.trim() || dados.priceCents <= 0) {
      toast.error("Preencha nome e preço antes de salvar.");
      return;
    }
    try {
      if (produto) {
        await atualizar(produto.id, dados, imagem ?? undefined);
        toast.success("Produto atualizado");
      } else {
        await criar(dados, imagem ?? undefined);
        toast.success("Produto criado");
      }
      onFechar();
    } catch {
      toast.error("Não foi possível salvar o produto agora.");
    }
  };

  return (
    <div className="border border-border bg-background p-5 sm:p-6 mb-6">
      <div className="flex items-center justify-between mb-5">
        <h3 className="font-display text-[1.1rem]">{produto ? "Editar produto" : "Novo produto"}</h3>
        <button onClick={onFechar} aria-label="Fechar" className="text-muted-foreground hover:text-foreground">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
        <div className="sm:col-span-2">
          <label className={rotulo}>Nome da peça</label>
          <input
            className={campo}
            value={dados.title}
            onChange={(e) => setDados({ ...dados, title: e.target.value })}
            placeholder="Ex.: Vaso de Cerâmica"
          />
        </div>
        <div className="sm:col-span-2">
          <label className={rotulo}>Descrição</label>
          <textarea
            className={campo}
            rows={3}
            value={dados.description}
            onChange={(e) => setDados({ ...dados, description: e.target.value })}
          />
        </div>
        <div>
          <label className={rotulo}>Preço (R$)</label>
          <input
            type="number"
            step="0.01"
            min="0"
            className={campo}
            value={dados.priceCents ? (dados.priceCents / 100).toFixed(2) : ""}
            onChange={(e) => setDados({ ...dados, priceCents: Math.round(Number(e.target.value || 0) * 100) })}
          />
        </div>
        <div>
          <label className={rotulo}>Estoque</label>
          <input
            type="number"
            min="0"
            className={campo}
            value={dados.stockQuantity}
            onChange={(e) => setDados({ ...dados, stockQuantity: Math.max(0, Number(e.target.value || 0)) })}
          />
        </div>
        <div>
          <label className={rotulo}>Categoria</label>
          <select
            className={campo}
            value={dados.categoryId ?? ""}
            onChange={(e) => setDados({ ...dados, categoryId: e.target.value || null })}
          >
            <option value="">Sem categoria</option>
            {categorias.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className={rotulo}>Situação</label>
          <select
            className={campo}
            value={dados.status}
            onChange={(e) => setDados({ ...dados, status: e.target.value as DadosProduto["status"] })}
          >
            <option value="draft">Rascunho (não aparece na vitrine)</option>
            <option value="active">Ativo</option>
            <option value="archived">Arquivado</option>
          </select>
        </div>
        <div className="sm:col-span-2">
          <label className={rotulo}>Foto principal</label>
          <input
            type="file"
            accept="image/*"
            className="text-[0.78rem]"
            onChange={(e) => setImagem(e.target.files?.[0] ?? null)}
          />
          {produto?.img && !imagem && (
            <img src={produto.img} alt="" className="w-20 h-20 object-cover mt-2 border border-border" />
          )}
        </div>
      </div>

      <button
        onClick={salvar}
        disabled={salvando}
        className="bg-espresso text-parchment px-6 py-2.5 font-body text-[0.68rem] tracking-[0.14em] uppercase hover:brightness-125 transition-all disabled:opacity-50 flex items-center gap-2"
      >
        {salvando && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
        Salvar produto
      </button>
    </div>
  );
};

const ProdutosPainel = ({ artisanId }: { artisanId: string }) => {
  const { produtos, loading } = useMeusProdutos(artisanId);
  const { remover } = useSalvarProduto(artisanId);
  const [editando, setEditando] = useState<MeuProduto | null>(null);
  const [criandoNovo, setCriandoNovo] = useState(false);

  const excluir = async (produto: MeuProduto) => {
    if (!window.confirm(`Remover "${produto.title}"? Isso não pode ser desfeito.`)) return;
    try {
      await remover(produto.id);
      toast.success("Produto removido");
    } catch {
      toast.error("Não foi possível remover agora.");
    }
  };

  return (
    <div className="max-w-[760px]">
      <div className="flex items-center justify-between mb-5">
        <h2 className="font-display text-[1.5rem] font-light">Meus produtos</h2>
        {!criandoNovo && !editando && (
          <button
            onClick={() => setCriandoNovo(true)}
            className="bg-espresso text-parchment px-4 py-2 font-body text-[0.66rem] tracking-[0.14em] uppercase hover:brightness-125 transition-all flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" /> Novo produto
          </button>
        )}
      </div>

      {criandoNovo && (
        <FormularioProduto artisanId={artisanId} produto={null} onFechar={() => setCriandoNovo(false)} />
      )}
      {editando && (
        <FormularioProduto artisanId={artisanId} produto={editando} onFechar={() => setEditando(null)} />
      )}

      {loading ? (
        <p className="text-[0.8rem] text-muted-foreground">Carregando…</p>
      ) : produtos.length === 0 && !criandoNovo ? (
        <p className="text-[0.82rem] text-muted-foreground">Você ainda não cadastrou nenhum produto.</p>
      ) : (
        <div className="border border-border divide-y divide-border">
          {produtos.map((p) => (
            <div key={p.id} className="flex items-center gap-3 p-3">
              <div className="w-14 h-14 shrink-0 bg-parchment border border-border overflow-hidden">
                {p.img && <img src={p.img} alt="" className="w-full h-full object-cover" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-[0.85rem] truncate">{p.title}</div>
                <div className="text-[0.7rem] text-muted-foreground">
                  {formatPriceCents(p.priceCents)} · estoque {p.stockQuantity} ·{" "}
                  <span className={p.status === "active" ? "text-sage" : "text-muted-foreground"}>
                    {p.status === "draft" ? "rascunho" : p.status === "archived" ? "arquivado" : p.status === "sold_out" ? "esgotado" : "ativo"}
                  </span>
                </div>
              </div>
              <button onClick={() => setEditando(p)} aria-label="Editar" className="p-2 text-muted-foreground hover:text-foreground">
                <Pencil className="w-4 h-4" />
              </button>
              <button onClick={() => excluir(p)} aria-label="Remover" className="p-2 text-muted-foreground hover:text-destructive">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ProdutosPainel;
