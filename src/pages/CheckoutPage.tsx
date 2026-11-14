import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCart } from "@/contexts/CartContext";
import { useAuth } from "@/contexts/AuthContext";
import { useCheckout, type Endereco, type MetodoPagamento } from "@/hooks/useCheckout";
import { formatPrice } from "@/lib/data";
import { usePageMeta } from "@/hooks/usePageMeta";
import { tokenizarCartao } from "@/lib/pagarme";
import { toast } from "sonner";

const campo =
  "w-full border border-border bg-transparent px-3 py-2.5 font-body text-[0.82rem] outline-none focus:border-terra transition-colors";
const rotulo = "block text-[0.6rem] tracking-[0.16em] uppercase text-muted-foreground mb-2";

const ENDERECO_VAZIO: Endereco = { zipcode: "", street: "", number: "", complement: "", district: "", city: "", state: "" };

const CheckoutPage = () => {
  const { items, totalPrice, clearCart, requerEndereco } = useCart();
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
  const [buscandoCep, setBuscandoCep] = useState(false);
  const [numeroCartao, setNumeroCartao] = useState("");
  const [nomeCartao, setNomeCartao] = useState("");
  const [validadeCartao, setValidadeCartao] = useState("");
  const [cvvCartao, setCvvCartao] = useState("");
  const [parcelas, setParcelas] = useState(1);
  const [tokenizando, setTokenizando] = useState(false);

  const buscarEnderecoPeloCep = async (cepDigitado: string) => {
    const cep = cepDigitado.replace(/\D/g, "");
    if (cep.length !== 8) return;
    setBuscandoCep(true);
    try {
      const resposta = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const dados = await resposta.json();
      if (dados.erro) {
        toast.error("CEP não encontrado. Preencha o endereço manualmente.");
        return;
      }
      setEndereco((atual) => ({
        ...atual,
        street: dados.logradouro || atual.street,
        district: dados.bairro || atual.district,
        city: dados.localidade || atual.city,
        state: dados.uf || atual.state,
      }));
    } catch {
      // Sem internet ou ViaCEP fora do ar: segue com o preenchimento manual.
    } finally {
      setBuscandoCep(false);
    }
  };

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
    nome.trim() &&
    email.trim() &&
    (!requerEndereco || (endereco.street && endereco.number && endereco.district && endereco.city && endereco.state)) &&
    (metodo !== "credit_card" || (numeroCartao.trim() && nomeCartao.trim() && validadeCartao.trim() && cvvCartao.trim()));

  const finalizarCompra = async () => {
    if (!camposObrigatoriosPreenchidos) {
      toast.error(
        metodo === "credit_card"
          ? "Preencha nome, e-mail e os dados do cartão."
          : requerEndereco
            ? "Preencha nome, e-mail e endereço de entrega."
            : "Preencha nome e e-mail.",
      );
      return;
    }

    let cardToken: string | undefined;
    if (metodo === "credit_card") {
      setTokenizando(true);
      try {
        cardToken = await tokenizarCartao({
          numero: numeroCartao,
          nomeTitular: nomeCartao,
          validade: validadeCartao,
          cvv: cvvCartao,
        });
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Não foi possível validar o cartão.");
        return;
      } finally {
        setTokenizando(false);
      }
    }

    const pedido = await finalizar(
      items,
      { name: nome, email, phone: telefone, document: documento },
      requerEndereco ? endereco : null,
      metodo,
      metodo === "credit_card" ? parcelas : 1,
      cardToken,
    );
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

          {requerEndereco && (
            <section>
              <h2 className="text-[0.62rem] tracking-[0.18em] uppercase text-terra mb-4">Endereço de entrega</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={rotulo}>CEP{buscandoCep ? " · buscando…" : ""}</label>
                  <input
                    className={campo}
                    value={endereco.zipcode}
                    maxLength={9}
                    onChange={(e) => {
                      const zipcode = e.target.value;
                      setEndereco({ ...endereco, zipcode });
                      void buscarEnderecoPeloCep(zipcode);
                    }}
                    onBlur={(e) => void buscarEnderecoPeloCep(e.target.value)}
                    placeholder="00000-000"
                  />
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
          )}

          <section>
            <h2 className="text-[0.62rem] tracking-[0.18em] uppercase text-terra mb-4">Pagamento</h2>
            <div className="flex flex-col sm:flex-row gap-2">
              {([
                { key: "pix", label: "Pix" },
                { key: "boleto", label: "Boleto" },
                { key: "credit_card", label: "Cartão de crédito" },
              ] as const).map((op) => (
                <button
                  key={op.key}
                  onClick={() => setMetodo(op.key)}
                  className={`flex-1 border px-4 py-3 text-[0.72rem] tracking-[0.08em] uppercase transition-colors ${
                    metodo === op.key ? "border-terra bg-terra/5 text-terra" : "border-border text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {op.label}
                </button>
              ))}
            </div>

            {metodo === "credit_card" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                <div className="sm:col-span-2">
                  <label className={rotulo}>Número do cartão</label>
                  <input
                    className={campo}
                    inputMode="numeric"
                    maxLength={19}
                    placeholder="0000 0000 0000 0000"
                    value={numeroCartao}
                    onChange={(e) => setNumeroCartao(e.target.value.replace(/[^\d\s]/g, ""))}
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className={rotulo}>Nome impresso no cartão</label>
                  <input
                    className={campo}
                    placeholder="Como está no cartão"
                    value={nomeCartao}
                    onChange={(e) => setNomeCartao(e.target.value)}
                  />
                </div>
                <div>
                  <label className={rotulo}>Validade (MM/AA)</label>
                  <input
                    className={campo}
                    inputMode="numeric"
                    maxLength={5}
                    placeholder="12/30"
                    value={validadeCartao}
                    onChange={(e) => {
                      const digitos = e.target.value.replace(/\D/g, "").slice(0, 4);
                      setValidadeCartao(digitos.length > 2 ? `${digitos.slice(0, 2)}/${digitos.slice(2)}` : digitos);
                    }}
                  />
                </div>
                <div>
                  <label className={rotulo}>CVV</label>
                  <input
                    className={campo}
                    inputMode="numeric"
                    maxLength={4}
                    placeholder="123"
                    value={cvvCartao}
                    onChange={(e) => setCvvCartao(e.target.value.replace(/\D/g, ""))}
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className={rotulo}>Parcelas</label>
                  <select
                    className={campo}
                    value={parcelas}
                    onChange={(e) => setParcelas(Number(e.target.value))}
                  >
                    {Array.from({ length: 12 }, (_, i) => i + 1).map((n) => (
                      <option key={n} value={n}>
                        {n}x {n === 1 ? "à vista" : `de ${formatPrice(totalPrice / n)}`}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}
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
            disabled={processando || tokenizando}
            className="w-full bg-espresso text-parchment py-3 font-body text-[0.7rem] tracking-[0.14em] uppercase hover:brightness-125 transition-all disabled:opacity-50"
          >
            {tokenizando ? "Validando cartão…" : processando ? "Processando…" : "Confirmar pedido"}
          </button>
        </aside>
      </div>
    </div>
  );
};

export default CheckoutPage;
