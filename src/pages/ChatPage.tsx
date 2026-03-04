import { useState } from "react";
import { IMAGES, CONVERSATIONS, MESSAGES } from "@/lib/data";

const ChatPage = () => {
  const [activeConv, setActiveConv] = useState(1);
  const [msgInput, setMsgInput] = useState("");

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[275px_1fr] h-[80vh]">
      <div className="bg-parchment border-r border-border flex flex-col">
        <div className="p-4 border-b border-border">
          <div className="font-display text-[1.08rem]">Mensagens</div>
          <div className="text-[0.64rem] text-muted-foreground tracking-[0.06em] mt-1">Conversas com compradores</div>
        </div>
        {CONVERSATIONS.map((c) => (
          <div
            key={c.id}
            onClick={() => setActiveConv(c.id)}
            className={`flex gap-2.5 p-3 cursor-pointer border-b border-border items-center transition-colors ${activeConv === c.id ? "bg-terra/[0.06]" : "hover:bg-terra/[0.06]"}`}
          >
            <div className="w-[34px] h-[34px] rounded-full bg-border shrink-0 border border-border overflow-hidden">
              <img src={IMAGES[c.img]} alt={c.name} className="w-full h-full object-cover" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-medium text-[0.8rem]">{c.name}</div>
              <div className="text-[0.68rem] text-muted-foreground whitespace-nowrap overflow-hidden text-ellipsis max-w-[136px]">{c.preview}</div>
            </div>
            <div className="flex flex-col items-end gap-1">
              <span className="text-[0.58rem] text-muted-foreground">{c.time}</span>
              {c.unread && <span className="w-[5px] h-[5px] rounded-full bg-terra shrink-0" />}
            </div>
          </div>
        ))}
      </div>
      <div className="flex flex-col bg-background">
        <div className="p-3 bg-background border-b border-border flex items-center gap-2.5">
          <div className="w-[34px] h-[34px] rounded-full bg-border border border-border overflow-hidden">
            <img src={IMAGES.straw1} alt="Juliana" className="w-full h-full object-cover" />
          </div>
          <div>
            <div className="font-medium text-[0.85rem]">Juliana P.</div>
            <div className="text-[0.64rem] text-terra">📍 São Paulo, SP</div>
            <div className="text-[0.64rem] text-sage tracking-[0.06em]">Online agora</div>
          </div>
        </div>
        <div className="flex-1 p-5 overflow-y-auto flex flex-col gap-3">
          {MESSAGES.map((m, i) => (
            <div key={i} className={`max-w-[63%] ${m.dir === "out" ? "self-end" : "self-start"}`}>
              <div className={`px-3 py-2 text-[0.82rem] leading-[1.6] font-light ${m.dir === "out" ? "bg-espresso text-parchment" : "bg-background border border-border"}`}>
                {m.text}
              </div>
              <div className={`text-[0.6rem] text-muted-foreground mt-1 ${m.dir === "out" ? "text-right" : ""}`}>
                {m.time}{m.dir === "out" && " · lido"}
              </div>
            </div>
          ))}
        </div>
        <div className="p-3 bg-background border-t border-border flex items-center gap-2">
          <input
            className="flex-1 border-none border-b border-border bg-transparent px-0 py-1.5 outline-none font-body text-[0.82rem] font-light focus:border-terra transition-colors"
            placeholder="Digite sua mensagem…"
            value={msgInput}
            onChange={(e) => setMsgInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && setMsgInput("")}
          />
          <button
            onClick={() => setMsgInput("")}
            className="bg-terra text-background border-none w-[33px] h-[33px] cursor-pointer text-[0.78rem] flex items-center justify-center hover:brightness-90 transition-colors"
          >
            →
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatPage;
