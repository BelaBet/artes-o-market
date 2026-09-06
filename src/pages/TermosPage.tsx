import { usePageMeta } from "@/hooks/usePageMeta";

const TermosPage = () => {
  usePageMeta("Termos de Uso");
  return (
    <div className="max-w-[760px] mx-auto px-4 py-14 sm:py-20">
      <div className="text-[0.62rem] tracking-[0.2em] uppercase text-terra mb-3">Legal</div>
      <h1 className="font-display text-[2rem] sm:text-[2.4rem] font-light mb-8">Termos de Uso</h1>

      <div className="border border-gold/30 bg-gold/5 px-4 py-3 mb-8 text-[0.76rem] text-muted-foreground">
        Rascunho gerado automaticamente — revise com um advogado antes de publicar. Preencha os campos entre colchetes com os dados reais da empresa.
      </div>

      <div className="space-y-6 text-[0.86rem] leading-[1.85] text-muted-foreground font-light">
        <p>
          Estes Termos de Uso regulam o acesso e uso da plataforma [NOME DA PLATAFORMA] ("Plataforma"),
          operada por [RAZÃO SOCIAL], inscrita no CNPJ sob o nº [CNPJ], com sede em [ENDEREÇO] ("nós").
          Ao criar uma conta, navegar ou realizar compras na Plataforma, você concorda com estes termos.
        </p>
        <div>
          <h2 className="font-display text-[1.1rem] text-foreground mb-2">1. O que é a Plataforma</h2>
          <p>
            A Plataforma é um marketplace que conecta artesãos independentes a compradores interessados
            em produtos e experiências artesanais. Não somos fabricantes nem vendedores diretos dos
            produtos anunciados — cada artesão é responsável pela sua loja, seus anúncios e pelo
            cumprimento dos pedidos.
          </p>
        </div>
        <div>
          <h2 className="font-display text-[1.1rem] text-foreground mb-2">2. Cadastro</h2>
          <p>
            Compradores e artesãos devem fornecer informações verdadeiras no cadastro e são responsáveis
            por manter a confidencialidade de suas credenciais de acesso.
          </p>
        </div>
        <div>
          <h2 className="font-display text-[1.1rem] text-foreground mb-2">3. Pedidos e pagamento</h2>
          <p>
            Os pagamentos são processados por um provedor de pagamentos terceirizado. A Plataforma retém
            uma comissão sobre cada venda, conforme informado ao artesão no momento do cadastro. Os
            prazos de produção e envio são definidos por cada artesão em sua loja.
          </p>
        </div>
        <div>
          <h2 className="font-display text-[1.1rem] text-foreground mb-2">4. Cancelamentos, trocas e devoluções</h2>
          <p>
            [DESCREVER A POLÍTICA DE CANCELAMENTO, TROCA E DEVOLUÇÃO, EM CONFORMIDADE COM O CÓDIGO DE
            DEFESA DO CONSUMIDOR — incluindo o direito de arrependimento em até 7 dias para compras
            feitas fora do estabelecimento comercial.]
          </p>
        </div>
        <div>
          <h2 className="font-display text-[1.1rem] text-foreground mb-2">5. Propriedade intelectual</h2>
          <p>
            Fotos, descrições e demais conteúdos enviados pelos artesãos permanecem de propriedade deles,
            e sua publicação na Plataforma concede a nós uma licença para exibi-los no contexto do
            marketplace.
          </p>
        </div>
        <div>
          <h2 className="font-display text-[1.1rem] text-foreground mb-2">6. Contato</h2>
          <p>Dúvidas sobre estes termos podem ser enviadas para [E-MAIL DE SUPORTE].</p>
        </div>
        <p className="text-[0.74rem]">Última atualização: [DATA].</p>
      </div>
    </div>
  );
};

export default TermosPage;
