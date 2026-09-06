import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCart } from "@/contexts/CartContext";
import { useAuth } from "@/contexts/AuthContext";
import { useCheckout, type Endereco, type MetodoPagamento } from "@/hooks/useCheckout";
import { formatPrice } from "@/lib/data";
import { usePageMeta } from "@/hooks/usePageMeta";
import { toast } from "sonner";

const campo =
  "w-full border border-border bg-transparent px-3 py-2.5 font-body text-[0.82rem] outline-none focus:border-terra transition-colors";
const rotulo = "block text-[0.6rem] tracking-[0.16em] uppercase text-muted-foreground mb-2";

const ENDERECO_VAZIO: Endereco = { zipcode: "", street: "", number: "", complement: "", district: "", city: "", state: "" };

const CheckoutPage = () => {
  const { items, totalPrice, clearCart } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { finalizar, processando, erro } = useCheckout();
  usePageMeta("Finalizar compra");

  const [nome, setNome] = useState((user?.user_metadata?.display_name as string) ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [telefone, setTelefone] = useState("");
  const [documento, setDocumento] = useState("");
  const [endereco, setEndereco] = useState<Endereco>(ENDERECO_VAZIO);
  const [metodo, setMetodo] = useState<MetodoPagamento>("pix");

  if (items.length === 0) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4">
        <div className="max-w-[420px] text-center">
          <div className="font-display text-[1.4rem] mb-2">Seu carrinho está vazio</div>
          <button onClick={() => navigate("/catalogo")} className="text-terra underline text-[0.82rem]">
            Ver o catálogo
          </button>
        </div>
      </div>
    );
  }

  const camposObrigatoriosPreenchidos =
    nome.trim() && email.trim() && endereco.street && endereco.number && endereco.district && endereco.city && endereco.state;

  const finalizarCompra = async () => {
    if (!camposObrigatoriosPreenchidos) {
      toast.error("Preencha nome, e-mail e endereço de entrega.");
      return;
    }
    const pedido = await finalizar(items, { name: nome, email, phone: telefone, document: documento }, endereco, metodo);
    if (pedido) {
      clearCart();
      navigate(`/pedido/${pedido.id}`);
    }
  };

  return (
    <div className="max-w-[900px] mx-auto px-4 md:px-9 py-10 sm:py-14">
      <h1 className="font-display text-[1.8rem] sm:text-[2.2rem] font-light mb-8">Finalizar compra</h1>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-8">
        <div className="space-y-8">
          <section>
            <h2 className="text-[0.62rem] tracking-[0.18em] uppercase text-terra mb-4">Seus dados</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className={rotulo}>Nome completo</label>
                <input className={campo} value={nome} onChange={(e) => setNome(e.target.value)} />
              </div>
              <div>
                <label className={rotulo}>E-mail</label>
                <input type="email" className={campo} value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <div>
                <label className={rotulo}>Telefone (opcional)</label>
                <input className={campo} value={telefone} onChange={(e) => setTelefone(e.target.value)} placeholder="11999999999" />
              </div>
              <div>
                <label className={rotulo}>CPF/CNPJ (opcional)</label>
                <input className={campo} value={documento} onChange={(e) => setDocumento(e.target.value)} />
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-[0.62rem] tracking-[0.18em] uppercase text-terra mb-4">Endereço de entrega</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={rotulo}>CEP</label>
                <input className={campo} value={endereco.zipcode} onChange={(e) => setEndereco({ ...endereco, zipcode: e.target.value })} />
              </div>
              <div>
                <label className={rotulo}>Cidade</label>
                <input className={campo} value={endereco.city} onChange={(e) => setEndereco({ ...endereco, city: e.target.value })} />
              </div>
              <div className="sm:col-span-2">
                <label className={rotulo}>Rua</label>
                <input className={campo} value={endereco.street} onChange={(e) => setEndereco({ ...endereco, street: e.target.value })} />
              </div>
              <div>
                <label className={rotulo}>Número</label>
                <input className={campo} value={endereco.number} onChange={(e) => setEndereco({ ...endereco, number: e.target.value })} />
              </div>
              <div>
                <label className={rotulo}>Complemento</label>
                <input className={campo} value={endereco.complement} onChange={(e) => setEndereco({ ...endereco, complement: e.target.value })} />
              </div>
              <div>
                <label className={rotulo}>Bairro</label>
                <input className={campo} value={endereco.district} onChange={(e) => setEndereco({ ...endereco, district: e.target.value })} />
              </div>
              <div>
                <label className={rotulo}>Estado (UF)</label>
                <input maxLength={2} className={campo} value={endereco.state} onChange={(e) => setEndereco({ ...endereco, state: e.target.value.toUpperCase() })} />
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-[0.62rem] tracking-[0.18em] uppercase text-terra mb-4">Pagamento</h2>
            <div className="flex flex-col sm:flex-row gap-2">
              {([
                { key: "pix", label: "Pix", disabled: false },
                { key: "boleto", label: "Boleto", disabled: false },
                { key: "credit_card", label: "Cartão de crédito", disabled: true },
              ] as const).map((op) => (
                <button
                  key={op.key}
                  disabled={op.disabled}
                  onClick={() => setMetodo(op.key)}
                  className={`flex-1 border px-4 py-3 text-[0.72rem] tracking-[0.08em] uppercase transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                    metodo === op.key ? "border-terra bg-terra/5 text-terra" : "border-border text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {op.label}{op.disabled ? " (em breve)" : ""}
                </button>
              ))}
            </div>
          </section>
        </div>

        <aside className="border border-border p-5 h-fit sticky top-4">
          <h2 className="font-display text-[1.05rem] mb-4">Resumo</h2>
          <div className="space-y-2 mb-4">
            {items.map((i) => (
              <div key={i.id} className="flex justify-between text-[0.78rem]">
                <span className="text-muted-foreground">{i.name} × {i.qty}</span>
                <span>{formatPrice(i.price * i.qty)}</span>
              </div>
            ))}
          </div>
          <div className="flex justify-between font-display text-[1.1rem] pt-3 border-t border-border mb-5">
            <span>Total</span>
            <span>{formatPrice(totalPrice)}</span>
          </div>
          {erro && <p className="text-[0.76rem] text-destructive mb-3">{erro}</p>}
          <button
            onClick={finalizarCompra}
            disabled={processando}
            className="w-full bg-espresso text-parchment py-3 font-body text-[0.7rem] tracking-[0.14em] uppercase hover:brightness-125 transition-all disabled:opacity-50"
          >
            {processando ? "Processando…" : "Confirmar pedido"}
          </button>
        </aside>
      </div>
    </div>
  );
};

export default CheckoutPage;
