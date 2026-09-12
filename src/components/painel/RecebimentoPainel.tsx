import { useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useRecebimento, useCriarRecebedor, type DadosRecebedor } from "@/hooks/useRecebimento";

const campo =
  "w-full border border-border bg-transparent px-3 py-2.5 font-body text-[0.82rem] outline-none focus:border-terra transition-colors";
const rotulo = "block text-[0.6rem] tracking-[0.16em] uppercase text-muted-foreground mb-2";

const VAZIO: DadosRecebedor = {
  type: "individual",
  name: "",
  document: "",
  email: "",
  bankAccount: { bank: "", branchNumber: "", accountNumber: "", accountCheckDigit: "", accountType: "checking" },
};

const STATUS_LABEL: Record<string, string> = {
  pending: "Em análise pelo Pagar.me",
  active: "Ativo — já pode receber",
  refused: "Recusado — revise os dados",
  registration_pending: "Cadastro incompleto",
};

const RecebimentoPainel = ({ artisanId }: { artisanId: string }) => {
  const { recebimento, loading } = useRecebimento(artisanId);
  const { criar, salvando, erro } = useCriarRecebedor(artisanId);
  const [dados, setDados] = useState<DadosRecebedor>(VAZIO);

  if (loading) return <p className="text-[0.8rem] text-muted-foreground">Carregando…</p>;

  if (recebimento?.recipientId) {
    return (
      <div className="max-w-[520px]">
        <h2 className="font-display text-[1.3rem] font-light mb-1">Recebimento</h2>
        <p className="text-[0.82rem] text-muted-foreground mb-5">
          Sua conta de recebimento já está cadastrada no Pagar.me.
        </p>
        <div className="border border-border p-4">
          <div className="text-[0.6rem] tracking-[0.14em] uppercase text-muted-foreground mb-1">Status</div>
          <div className="font-display text-[1.05rem]">
            {STATUS_LABEL[recebimento.status ?? ""] ?? recebimento.status ?? "—"}
          </div>
        </div>
      </div>
    );
  }

  const enviar = async () => {
    if (!dados.name.trim() || !dados.document.trim() || !dados.email.trim() || !dados.bankAccount.bank) {
      toast.error("Preencha todos os campos antes de continuar.");
      return;
    }
    const ok = await criar(dados);
    if (ok) toast.success("Recebedor cadastrado! Assim que o Pagar.me aprovar, você já pode receber pelas vendas.");
  };

  return (
    <div className="max-w-[520px]">
      <h2 className="font-display text-[1.3rem] font-light mb-1">Recebimento</h2>
      <p className="text-[0.82rem] text-muted-foreground mb-5">
        Cadastre sua conta bancária para receber diretamente pelas vendas, sem passar pela conta da plataforma.
      </p>

      <div className="space-y-4">
        <div>
          <label className={rotulo}>Você vende como</label>
          <select
            className={campo}
            value={dados.type}
            onChange={(e) => setDados({ ...dados, type: e.target.value as DadosRecebedor["type"] })}
          >
            <option value="individual">Pessoa física</option>
            <option value="company">Empresa (CNPJ)</option>
          </select>
        </div>
        <div>
          <label className={rotulo}>{dados.type === "company" ? "Razão social" : "Nome completo"}</label>
          <input className={campo} value={dados.name} onChange={(e) => setDados({ ...dados, name: e.target.value })} />
        </div>
        <div>
          <label className={rotulo}>{dados.type === "company" ? "CNPJ" : "CPF"}</label>
          <input className={campo} value={dados.document} onChange={(e) => setDados({ ...dados, document: e.target.value })} />
        </div>
        <div>
          <label className={rotulo}>E-mail</label>
          <input type="email" className={campo} value={dados.email} onChange={(e) => setDados({ ...dados, email: e.target.value })} />
        </div>

        <div className="pt-2 border-t border-border">
          <div className="text-[0.6rem] tracking-[0.16em] uppercase text-terra mb-3 mt-3">Conta bancária</div>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className={rotulo}>Código do banco</label>
              <input placeholder="Ex.: 260 (Nubank), 341 (Itaú)" className={campo} value={dados.bankAccount.bank} onChange={(e) => setDados({ ...dados, bankAccount: { ...dados.bankAccount, bank: e.target.value } })} />
            </div>
            <div>
              <label className={rotulo}>Agência</label>
              <input className={campo} value={dados.bankAccount.branchNumber} onChange={(e) => setDados({ ...dados, bankAccount: { ...dados.bankAccount, branchNumber: e.target.value } })} />
            </div>
            <div>
              <label className={rotulo}>Tipo de conta</label>
              <select className={campo} value={dados.bankAccount.accountType} onChange={(e) => setDados({ ...dados, bankAccount: { ...dados.bankAccount, accountType: e.target.value as "checking" | "savings" } })}>
                <option value="checking">Corrente</option>
                <option value="savings">Poupança</option>
              </select>
            </div>
            <div>
              <label className={rotulo}>Conta</label>
              <input className={campo} value={dados.bankAccount.accountNumber} onChange={(e) => setDados({ ...dados, bankAccount: { ...dados.bankAccount, accountNumber: e.target.value } })} />
            </div>
            <div>
              <label className={rotulo}>Dígito</label>
              <input maxLength={2} className={campo} value={dados.bankAccount.accountCheckDigit} onChange={(e) => setDados({ ...dados, bankAccount: { ...dados.bankAccount, accountCheckDigit: e.target.value } })} />
            </div>
          </div>
        </div>

        {erro && <p className="text-[0.76rem] text-destructive">{erro}</p>}

        <button
          onClick={enviar}
          disabled={salvando}
          className="bg-espresso text-parchment px-6 py-2.5 font-body text-[0.68rem] tracking-[0.14em] uppercase hover:brightness-125 transition-all disabled:opacity-50 flex items-center gap-2"
        >
          {salvando && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
          Cadastrar recebimento
        </button>
      </div>
    </div>
  );
};

export default RecebimentoPainel;
