import { registerSW } from "virtual:pwa-register";
import { toast } from "sonner";
import { CARRINHO_STORAGE_KEY } from "@/lib/storageKeys";

// De quanto em quanto tempo procurar por uma versão nova enquanto o app
// está aberto. Sem isso, uma aba deixada aberta por dias nunca atualiza.
const INTERVALO_CHECAGEM = 60 * 60 * 1000; // 1h

/**
 * Atualização automática:
 * - o SW novo assume o controle sozinho (skipWaiting + clientsClaim);
 * - a página recarrega sozinha, exceto se houver carrinho em andamento —
 *   nesse caso avisamos e deixamos a decisão com a pessoa, para não
 *   descartar itens no meio de uma compra.
 */
export function registrarPWA() {
  const atualizarSW = registerSW({
    immediate: true,

    onNeedRefresh() {
      const temCarrinho = carrinhoTemItens();

      if (!temCarrinho) {
        atualizarSW(true); // recarrega já
        return;
      }

      toast("Nova versão disponível", {
        description: "Atualize quando terminar — seu carrinho será mantido.",
        duration: Infinity,
        action: {
          label: "Atualizar",
          onClick: () => atualizarSW(true),
        },
      });
    },

    onOfflineReady() {
      toast.success("Pronto para uso offline");
    },

    onRegisteredSW(_url, registration) {
      if (!registration) return;

      setInterval(() => {
        // Só faz sentido checar se a aba está visível e há rede.
        if (document.visibilityState === "visible" && navigator.onLine) {
          registration.update();
        }
      }, INTERVALO_CHECAGEM);

      // Ao voltar para a aba, checa na hora.
      document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "visible" && navigator.onLine) {
          registration.update();
        }
      });
    },

    onRegisterError(error) {
      console.error("Falha ao registrar o service worker:", error);
    },
  });
}

function carrinhoTemItens(): boolean {
  try {
    const bruto = localStorage.getItem(CARRINHO_STORAGE_KEY);
    if (!bruto) return false;
    const itens = JSON.parse(bruto);
    return Array.isArray(itens) && itens.length > 0;
  } catch {
    return false;
  }
}
