import { usePageMeta } from "@/hooks/usePageMeta";

const PrivacidadePage = () => {
  usePageMeta("Política de Privacidade");
  return (
    <div className="max-w-[760px] mx-auto px-4 py-14 sm:py-20">
      <div className="text-[0.62rem] tracking-[0.2em] uppercase text-terra mb-3">Legal</div>
      <h1 className="font-display text-[2rem] sm:text-[2.4rem] font-light mb-8">Política de Privacidade</h1>

      <div className="border border-gold/30 bg-gold/5 px-4 py-3 mb-8 text-[0.76rem] text-muted-foreground">
        Rascunho gerado automaticamente — revise com um advogado (LGPD) antes de publicar. Preencha os campos entre colchetes com os dados reais da empresa.
      </div>

      <div className="space-y-6 text-[0.86rem] leading-[1.85] text-muted-foreground font-light">
        <p>
          Esta Política de Privacidade descreve como [RAZÃO SOCIAL], inscrita no CNPJ sob o nº [CNPJ]
          ("nós"), coleta, usa e protege os dados pessoais de quem usa a plataforma [NOME DA PLATAFORMA],
          em conformidade com a Lei Geral de Proteção de Dados (Lei nº 13.709/2018 — LGPD).
        </p>
        <div>
          <h2 className="font-display text-[1.1rem] text-foreground mb-2">1. Dados que coletamos</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>Dados de cadastro: nome, e-mail, telefone e, quando aplicável, CPF/CNPJ.</li>
            <li>Dados de pedidos: endereço de entrega, itens comprados e histórico de compras.</li>
            <li>Dados de uso: páginas visitadas e interações na plataforma.</li>
            <li>Para artesãos: dados bancários e de recebimento, para processar os pagamentos das vendas.</li>
          </ul>
        </div>
        <div>
          <h2 className="font-display text-[1.1rem] text-foreground mb-2">2. Para que usamos seus dados</h2>
          <p>
            Processar pedidos e pagamentos, viabilizar a comunicação entre compradores e artesãos,
            melhorar a plataforma e cumprir obrigações legais e fiscais.
          </p>
        </div>
        <div>
          <h2 className="font-display text-[1.1rem] text-foreground mb-2">3. Com quem compartilhamos</h2>
          <p>
            Compartilhamos dados estritamente necessários com o provedor de pagamentos (para processar
            cobranças) e com o artesão responsável por um pedido (para que ele possa produzir e enviar
            a peça). Não vendemos dados pessoais a terceiros.
          </p>
        </div>
        <div>
          <h2 className="font-display text-[1.1rem] text-foreground mb-2">4. Seus direitos</h2>
          <p>
            Você pode solicitar acesso, correção, portabilidade ou exclusão dos seus dados a qualquer
            momento, entrando em contato pelo e-mail [E-MAIL DE SUPORTE/DPO].
          </p>
        </div>
        <div>
          <h2 className="font-display text-[1.1rem] text-foreground mb-2">5. Segurança</h2>
          <p>
            Adotamos medidas técnicas e organizacionais para proteger seus dados, incluindo controle de
            acesso por função e criptografia em trânsito.
          </p>
        </div>
        <p className="text-[0.74rem]">Última atualização: [DATA].</p>
      </div>
    </div>
  );
};

export default PrivacidadePage;
