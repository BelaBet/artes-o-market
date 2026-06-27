import { Share2, Facebook, Twitter, Linkedin, Link2, MessageCircle, Mail } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toast } from "@/hooks/use-toast";

const PinterestIcon = ({ className = "" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
    <path d="M12.04 2C6.5 2 2 6.5 2 12.04c0 4.25 2.64 7.88 6.37 9.34-.09-.79-.17-2.02.04-2.89.19-.78 1.22-4.97 1.22-4.97s-.31-.62-.31-1.55c0-1.45.84-2.53 1.88-2.53.89 0 1.32.67 1.32 1.47 0 .9-.57 2.24-.86 3.48-.25 1.04.52 1.89 1.55 1.89 1.86 0 3.29-1.96 3.29-4.79 0-2.5-1.8-4.25-4.37-4.25-2.98 0-4.72 2.23-4.72 4.54 0 .9.35 1.86.78 2.39.09.1.1.19.07.3-.08.32-.26 1.04-.29 1.18-.05.19-.16.23-.36.14-1.35-.63-2.19-2.6-2.19-4.18 0-3.4 2.47-6.53 7.13-6.53 3.74 0 6.65 2.67 6.65 6.23 0 3.72-2.34 6.71-5.6 6.71-1.09 0-2.12-.57-2.47-1.24l-.67 2.56c-.24.94-.9 2.11-1.34 2.83.99.31 2.04.48 3.14.48 5.54 0 10.04-4.5 10.04-10.04C22.04 6.5 17.58 2 12.04 2z" />
  </svg>
);

interface ShareMenuProps {
  title: string;
  url?: string;
  variant?: "light" | "dark";
}

const ShareMenu = ({ title, url, variant = "light" }: ShareMenuProps) => {
  const shareUrl = url || (typeof window !== "undefined" ? window.location.href : "");
  const encodedUrl = encodeURIComponent(shareUrl);
  const encodedTitle = encodeURIComponent(title);

  const networks = [
    { name: "Facebook", icon: <Facebook className="w-4 h-4" />, href: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}` },
    { name: "Twitter / X", icon: <Twitter className="w-4 h-4" />, href: `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}` },
    { name: "Pinterest", icon: <PinterestIcon className="w-4 h-4" />, href: `https://pinterest.com/pin/create/button/?url=${encodedUrl}&description=${encodedTitle}` },
    { name: "LinkedIn", icon: <Linkedin className="w-4 h-4" />, href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}` },
    { name: "WhatsApp", icon: <MessageCircle className="w-4 h-4" />, href: `https://wa.me/?text=${encodedTitle}%20${encodedUrl}` },
    { name: "E-mail", icon: <Mail className="w-4 h-4" />, href: `mailto:?subject=${encodedTitle}&body=${encodedUrl}` },
  ];

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast({ title: "Link copiado", description: "O link foi copiado para a área de transferência." });
    } catch {
      toast({ title: "Não foi possível copiar", description: shareUrl });
    }
  };

  const triggerClasses =
    variant === "dark"
      ? "bg-espresso/80 border border-gold/30 text-gold-light hover:bg-espresso"
      : "bg-background/90 border border-border text-foreground hover:bg-background";

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          onClick={(e) => e.stopPropagation()}
          aria-label="Compartilhar"
          className={`w-8 h-8 flex items-center justify-center backdrop-blur transition-colors ${triggerClasses}`}
        >
          <Share2 className="w-3.5 h-3.5" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        sideOffset={6}
        onClick={(e) => e.stopPropagation()}
        className="w-56 p-2 bg-card border border-border rounded-none shadow-lg"
      >
        <div className="px-2 py-1.5 text-[0.58rem] tracking-[0.16em] uppercase text-muted-foreground font-medium">
          Compartilhar
        </div>
        <div className="flex flex-col">
          {networks.map((n) => (
            <a
              key={n.name}
              href={n.href}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2.5 px-2 py-2 text-[0.78rem] text-foreground hover:bg-parchment transition-colors"
            >
              <span className="text-terra">{n.icon}</span>
              {n.name}
            </a>
          ))}
          <button
            onClick={copyLink}
            className="flex items-center gap-2.5 px-2 py-2 text-[0.78rem] text-foreground hover:bg-parchment transition-colors border-t border-border mt-1 pt-2"
          >
            <span className="text-terra"><Link2 className="w-4 h-4" /></span>
            Copiar link
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default ShareMenu;
