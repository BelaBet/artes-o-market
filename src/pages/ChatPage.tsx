import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { usePageMeta } from "@/hooks/usePageMeta";
import { useConversas, useMensagens } from "@/hooks/useChat";

const ChatPage = () => {
  const [searchParams] = useSearchParams();
  const { conversas, loading } = useConversas();
  const [activeConv, setActiveConv] = useState<string | null>(searchParams.get("conversa"));
  const { mensagens, enviar } = useMensagens(activeConv);
  const [msgInput, setMsgInput] = useState("");
  usePageMeta("Mensagens");

  useEffect(() => {
    const daUrl = searchParams.get("conversa");
    if (daUrl) setActiveConv(daUrl);
  }, [searchParams]);

  const conversaAtual = conversas.find((c) => c.id === activeConv);

  const enviarMensagem = () => {
    if (!msgInput.trim()) return;
    enviar(msgInput);
    setMsgInput("");
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[275px_1fr] h-[calc(100vh-110px)] lg:h-[80vh]">
      {/* Conversations list */}
      <div
        className={`bg-parchment border-r border-border flex-col ${
          activeConv !== null ? "hidden lg:flex" : "flex"
        }`}
      >
        <div className="p-4 border-b border-border">
          <div className="font-display text-[1.08rem]">Mensagens</div>
          <div className="text-[0.64rem] text-muted-foreground tracking-[0.06em] mt-1">Suas conversas</div>
        </div>
        <div className="overflow-y-auto flex-1">
          {!loading && conversas.length === 0 && (
            <div className="p-4 text-[0.76rem] text-muted-foreground font-light">
              Nenhuma conversa ainda. Mande uma mensagem a partir da página de um artesão.
            </div>
          )}
          {conversas.map((c) => (
            <div
              key={c.id}
              onClick={() => setActiveConv(c.id)}
              className={`flex gap-2.5 p-3 cursor-pointer border-b border-border items-center transition-colors ${activeConv === c.id ? "bg-terra/[0.06]" : "hover:bg-terra/[0.06]"}`}
            >
              <div className="w-[34px] h-[34px] rounded-full bg-border shrink-0 border border-border overflow-hidden">
                {c.otherImg && <img src={c.otherImg} alt={c.otherName} className="w-full h-full object-cover" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-[0.8rem]">{c.otherName}</div>
              </div>
              <span className="text-[0.58rem] text-muted-foreground shrink-0">
                {new Date(c.lastMessageAt).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Chat panel */}
      <div className={`flex-col bg-background ${activeConv !== null ? "flex" : "hidden lg:flex"}`}>
        {!conversaAtual ? (
          <div className="flex-1 hidden lg:flex items-center justify-center text-[0.8rem] text-muted-foreground">
            Selecione uma conversa
          </div>
        ) : (
          <>
            <div className="p-3 bg-background border-b border-border flex items-center gap-2.5">
              <button
                onClick={() => setActiveConv(null)}
                aria-label="Voltar"
                className="lg:hidden p-1.5 text-muted-foreground"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <div className="w-[34px] h-[34px] rounded-full bg-border border border-border overflow-hidden shrink-0">
                {conversaAtual.otherImg && <img src={conversaAtual.otherImg} alt={conversaAtual.otherName} className="w-full h-full object-cover" />}
              </div>
              <div className="min-w-0">
                <div className="font-medium text-[0.85rem] truncate">{conversaAtual.otherName}</div>
              </div>
            </div>
            <div className="flex-1 p-4 sm:p-5 overflow-y-auto flex flex-col gap-3">
              {mensagens.map((m) => (
                <div key={m.id} className={`max-w-[80%] sm:max-w-[63%] ${m.fromMe ? "self-end" : "self-start"}`}>
                  <div className={`px-3 py-2 text-[0.8rem] sm:text-[0.82rem] leading-[1.6] font-light ${m.fromMe ? "bg-espresso text-parchment" : "bg-background border border-border"}`}>
                    {m.body}
                  </div>
                  <div className={`text-[0.6rem] text-muted-foreground mt-1 ${m.fromMe ? "text-right" : ""}`}>
                    {new Date(m.createdAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                  </div>
                </div>
              ))}
            </div>
            <div className="p-3 bg-background border-t border-border flex items-center gap-2">
              <input
                className="flex-1 border-b border-border bg-transparent px-0 py-1.5 outline-none font-body text-[0.82rem] font-light focus:border-terra transition-colors min-w-0"
                placeholder="Digite sua mensagem…"
                value={msgInput}
                onChange={(e) => setMsgInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && enviarMensagem()}
              />
              <button
                onClick={enviarMensagem}
                className="bg-terra text-background border-none w-[36px] h-[36px] cursor-pointer text-[0.78rem] flex items-center justify-center hover:brightness-90 transition-colors shrink-0"
              >
                →
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ChatPage;
