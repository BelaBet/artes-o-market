interface MarketHeaderProps {
  currentPage: string;
  onNavigate: (page: string) => void;
  cartCount: number;
  isLoggedIn?: boolean;
  onSignOut?: () => void;
}

const MarketHeader = ({ currentPage, onNavigate, cartCount, isLoggedIn, onSignOut }: MarketHeaderProps) => {
  return (
    <>
      {/* Top banner */}
      <div className="bg-espresso text-gold-light text-center py-2.5 px-5 text-[0.7rem] tracking-[0.1em] font-medium">
        ✈️ Frete grátis para todo o Brasil em pedidos acima de R$200 · Enviamos para 50+ países
      </div>

      {/* Header */}
      <header className="sticky top-0 z-[200] bg-background/95 backdrop-blur-[18px] border-b border-border px-9">
        <div className="max-w-[1320px] mx-auto flex items-center h-[68px] gap-5">
          <div
            className="font-display font-semibold text-[1.42rem] tracking-[0.04em] text-foreground cursor-pointer flex items-center gap-2 shrink-0"
            onClick={() => onNavigate("home")}
          >
            Feito <em className="italic text-terra">à Mão</em>
            <span className="font-body text-[0.52rem] tracking-[0.16em] uppercase bg-espresso text-gold-light px-1.5 py-0.5 font-semibold">
              🇧🇷 Brazil
            </span>
          </div>

          <div className="flex-1 max-w-[320px] flex items-center gap-2 border-b border-border pb-1 focus-within:border-terra transition-colors">
            <span className="text-muted-foreground text-[0.88rem]">⌕</span>
            <input
              className="flex-1 border-none bg-transparent outline-none font-body text-[0.8rem] text-foreground placeholder:text-muted-foreground"
              placeholder="Buscar artesanato, artesãos…"
            />
          </div>

          <nav className="flex items-center gap-1 ml-auto shrink-0">
            <button
              onClick={() => onNavigate("catalog")}
              className="bg-transparent border-none cursor-pointer font-body text-[0.7rem] font-medium tracking-[0.1em] uppercase text-muted-foreground px-3 py-1.5 hover:text-foreground transition-colors whitespace-nowrap"
            >
              Catálogo
            </button>

            {isLoggedIn && (
              <>
                <button
                  onClick={() => onNavigate("chat")}
                  className="bg-transparent border-none cursor-pointer font-body text-[0.7rem] font-medium tracking-[0.1em] uppercase text-muted-foreground px-3 py-1.5 hover:text-foreground transition-colors whitespace-nowrap"
                >
                  Mensagens
                </button>
                <button
                  onClick={() => onNavigate("dashboard")}
                  className="bg-transparent border-none cursor-pointer font-body text-[0.7rem] font-medium tracking-[0.1em] uppercase text-muted-foreground px-3 py-1.5 hover:text-foreground transition-colors whitespace-nowrap"
                >
                  Minha Loja
                </button>
              </>
            )}

            <button className="bg-transparent border-none cursor-pointer font-body text-[0.7rem] font-medium tracking-[0.1em] uppercase text-muted-foreground px-3 py-1.5 hover:text-foreground transition-colors whitespace-nowrap">
              Carrinho <span className="inline-flex items-center justify-center bg-terra text-background w-[15px] h-[15px] rounded-full text-[0.56rem] font-semibold ml-0.5">{cartCount}</span>
            </button>

            {isLoggedIn ? (
              <button
                onClick={onSignOut}
                className="bg-transparent border border-foreground cursor-pointer font-body text-[0.7rem] font-medium tracking-[0.1em] uppercase text-foreground px-4 py-1.5 hover:bg-foreground hover:text-background transition-colors whitespace-nowrap"
              >
                Sair
              </button>
            ) : (
              <button
                onClick={() => onNavigate("artisan-login")}
                className="bg-transparent border border-foreground cursor-pointer font-body text-[0.7rem] font-medium tracking-[0.1em] uppercase text-foreground px-4 py-1.5 hover:bg-foreground hover:text-background transition-colors whitespace-nowrap"
              >
                Entrar
              </button>
            )}
          </nav>
        </div>
      </header>

      {/* Tabs */}
      <div className="bg-parchment border-b border-border px-9 flex overflow-x-auto">
        {[
          { key: "home", label: "Início" },
          { key: "catalog", label: "Catálogo" },
          ...(isLoggedIn
            ? [
                { key: "dashboard", label: "Painel do Artesão" },
                { key: "chat", label: "Mensagens" },
              ]
            : []),
        ].map(({ key, label }) => (
          <button
            key={key}
            onClick={() => onNavigate(key)}
            className={`bg-transparent border-none cursor-pointer font-body text-[0.68rem] font-medium tracking-[0.12em] uppercase py-3 px-4 border-b-2 -mb-px transition-all whitespace-nowrap ${
              currentPage === key
                ? "text-foreground border-b-terra"
                : "text-muted-foreground border-b-transparent hover:text-foreground"
            }`}
          >
            {label}
          </button>
        ))}
      </div>
    </>
  );
};

export default MarketHeader;
