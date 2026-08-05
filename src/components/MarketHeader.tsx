import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Menu, X, Search, ShoppingBag } from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { useAuth } from "@/contexts/AuthContext";

const MarketHeader = () => {
  const { setIsOpen, totalItems } = useCart();
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  const isLoggedIn = !!user;

  const tabs = [
    { to: "/", label: "Início" },
    { to: "/catalogo", label: "Catálogo" },
    { to: "/experiencias", label: "Experiências" },
    ...(isLoggedIn
      ? [
          { to: "/painel", label: "Painel do Artesão" },
          { to: "/mensagens", label: "Mensagens" },
        ]
      : []),
  ];

  const isActive = (to: string) => (to === "/" ? pathname === "/" : pathname.startsWith(to));

  const handleSignOut = async () => {
    setMenuOpen(false);
    await signOut();
    navigate("/");
  };

  return (
    <>
      {/* Top banner */}
      <div className="bg-espresso text-gold-light text-center py-2 px-3 sm:px-5 text-[0.6rem] sm:text-[0.7rem] tracking-[0.08em] sm:tracking-[0.1em] font-medium leading-snug">
        ✈️ Frete grátis Brasil acima de R$200 · Enviamos para 50+ países
      </div>

      {/* Header */}
      <header className="sticky top-0 z-[200] bg-background/95 backdrop-blur-[18px] border-b border-border px-4 md:px-9">
        <div className="max-w-[1320px] mx-auto flex items-center h-[58px] md:h-[68px] gap-3 md:gap-5">
          <Link
            to="/"
            className="font-display font-semibold text-[1.15rem] md:text-[1.42rem] tracking-[0.04em] text-foreground cursor-pointer flex items-center gap-2 shrink-0"
          >
            Feito <em className="italic text-terra">à Mão</em>
            <span className="hidden sm:inline font-body text-[0.52rem] tracking-[0.16em] uppercase bg-espresso text-gold-light px-1.5 py-0.5 font-semibold">
              🇧🇷 Brasil
            </span>
          </Link>

          {/* Desktop search */}
          <div className="hidden md:flex flex-1 max-w-[320px] items-center gap-2 border-b border-border pb-1 focus-within:border-terra transition-colors">
            <span className="text-muted-foreground text-[0.88rem]">⌕</span>
            <input
              className="flex-1 border-none bg-transparent outline-none font-body text-[0.8rem] text-foreground placeholder:text-muted-foreground"
              placeholder="Buscar artesanato, artesãos…"
            />
          </div>

          {/* Desktop nav */}
          <nav className="hidden lg:flex items-center gap-1 ml-auto shrink-0">
            <Link
              to="/catalogo"
              className="font-body text-[0.7rem] font-medium tracking-[0.1em] uppercase text-muted-foreground px-3 py-1.5 hover:text-foreground transition-colors whitespace-nowrap"
            >
              Catálogo
            </Link>
            <Link
              to="/experiencias"
              className="font-body text-[0.7rem] font-medium tracking-[0.1em] uppercase text-muted-foreground px-3 py-1.5 hover:text-foreground transition-colors whitespace-nowrap"
            >
              Experiências
            </Link>

            {isLoggedIn && (
              <>
                <Link
                  to="/mensagens"
                  className="font-body text-[0.7rem] font-medium tracking-[0.1em] uppercase text-muted-foreground px-3 py-1.5 hover:text-foreground transition-colors whitespace-nowrap"
                >
                  Mensagens
                </Link>
                <Link
                  to="/painel"
                  className="font-body text-[0.7rem] font-medium tracking-[0.1em] uppercase text-muted-foreground px-3 py-1.5 hover:text-foreground transition-colors whitespace-nowrap"
                >
                  Minha Loja
                </Link>
              </>
            )}

            <button
              onClick={() => setIsOpen(true)}
              className="bg-transparent border-none cursor-pointer font-body text-[0.7rem] font-medium tracking-[0.1em] uppercase text-muted-foreground px-3 py-1.5 hover:text-foreground transition-colors whitespace-nowrap"
            >
              Carrinho
              {totalItems > 0 && (
                <span className="inline-flex items-center justify-center bg-terra text-background w-[15px] h-[15px] rounded-full text-[0.56rem] font-semibold ml-0.5">
                  {totalItems}
                </span>
              )}
            </button>

            {isLoggedIn ? (
              <button
                onClick={handleSignOut}
                className="bg-transparent border border-foreground cursor-pointer font-body text-[0.7rem] font-medium tracking-[0.1em] uppercase text-foreground px-4 py-1.5 hover:bg-foreground hover:text-background transition-colors whitespace-nowrap"
              >
                Sair
              </button>
            ) : (
              <Link
                to="/entrar"
                className="border border-foreground font-body text-[0.7rem] font-medium tracking-[0.1em] uppercase text-foreground px-4 py-1.5 hover:bg-foreground hover:text-background transition-colors whitespace-nowrap"
              >
                Entrar
              </Link>
            )}
          </nav>

          {/* Mobile actions */}
          <div className="flex lg:hidden items-center gap-1 ml-auto shrink-0">
            <button
              onClick={() => setSearchOpen((s) => !s)}
              aria-label="Buscar"
              className="md:hidden p-2 text-foreground"
            >
              <Search className="w-[18px] h-[18px]" />
            </button>
            <button
              onClick={() => setIsOpen(true)}
              aria-label="Carrinho"
              className="relative p-2 text-foreground"
            >
              <ShoppingBag className="w-[18px] h-[18px]" />
              {totalItems > 0 && (
                <span className="absolute top-0 right-0 inline-flex items-center justify-center bg-terra text-background min-w-[16px] h-[16px] rounded-full text-[0.55rem] font-semibold px-1">
                  {totalItems}
                </span>
              )}
            </button>
            <button
              onClick={() => setMenuOpen((o) => !o)}
              aria-label="Menu"
              className="p-2 text-foreground"
            >
              {menuOpen ? <X className="w-[20px] h-[20px]" /> : <Menu className="w-[20px] h-[20px]" />}
            </button>
          </div>
        </div>

        {/* Mobile search input */}
        {searchOpen && (
          <div className="md:hidden pb-3 px-1 flex items-center gap-2 border-b border-border">
            <Search className="w-4 h-4 text-muted-foreground" />
            <input
              autoFocus
              className="flex-1 border-none bg-transparent outline-none font-body text-sm py-1 placeholder:text-muted-foreground"
              placeholder="Buscar artesanato, artesãos…"
            />
          </div>
        )}

        {/* Mobile menu panel */}
        {menuOpen && (
          <div className="lg:hidden border-t border-border bg-background py-3 -mx-4 md:-mx-9 px-4 md:px-9">
            {tabs.map((t) => (
              <Link
                key={t.to}
                to={t.to}
                onClick={() => setMenuOpen(false)}
                className={`block w-full text-left py-3 font-body text-[0.78rem] tracking-[0.1em] uppercase border-b border-border/60 ${
                  isActive(t.to) ? "text-terra" : "text-foreground"
                }`}
              >
                {t.label}
              </Link>
            ))}
            <div className="pt-4">
              {isLoggedIn ? (
                <button
                  onClick={handleSignOut}
                  className="w-full border border-foreground py-2.5 font-body text-[0.72rem] tracking-[0.14em] uppercase"
                >
                  Sair
                </button>
              ) : (
                <Link
                  to="/entrar"
                  onClick={() => setMenuOpen(false)}
                  className="block text-center w-full border border-foreground py-2.5 font-body text-[0.72rem] tracking-[0.14em] uppercase"
                >
                  Entrar
                </Link>
              )}
            </div>
          </div>
        )}
      </header>

      {/* Desktop tabs */}
      <div className="hidden md:flex bg-parchment border-b border-border px-9 overflow-x-auto">
        {tabs.map(({ to, label }) => (
          <Link
            key={to}
            to={to}
            className={`font-body text-[0.68rem] font-medium tracking-[0.12em] uppercase py-3 px-4 border-b-2 -mb-px transition-all whitespace-nowrap ${
              isActive(to)
                ? "text-foreground border-b-terra"
                : "text-muted-foreground border-b-transparent hover:text-foreground"
            }`}
          >
            {label}
          </Link>
        ))}
      </div>
    </>
  );
};

export default MarketHeader;
