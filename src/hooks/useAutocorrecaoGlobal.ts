// Aplica auto-capitalização + correção ortográfica (pt-BR) em qualquer
// <input>/<textarea> de texto do site, ao sair do campo (blur).
//
// É um único listener global (event delegation em "focusout", que borbulha
// — "blur" não borbulha) em vez de tocar em cada formulário: o site usa
// <input> nativo direto na maioria das páginas, não um componente
// compartilhado. Ver src/lib/autocorrigir.ts para a lógica de correção.
import { useEffect } from "react";
import { autocorrigirTexto } from "@/lib/autocorrigir";

const TIPOS_IGNORADOS = new Set([
  "email",
  "password",
  "tel",
  "number",
  "url",
  "date",
  "time",
  "datetime-local",
  "month",
  "week",
  "color",
  "range",
  "file",
  "hidden",
  "checkbox",
  "radio",
  "search",
]);

// Campos onde o valor precisa ficar exatamente como digitado (documento,
// senha, preço, código...) mesmo sendo type="text".
const PISTA_A_IGNORAR =
  /cpf|cnpj|cep|senha|password|cart[aã]o|card|e-?mail|telefone|whats ?app|cupom|c[oó]digo|slug|pre[cç]o|valor|cents|zipcode|document/i;

function deveIgnorar(elemento: HTMLInputElement | HTMLTextAreaElement): boolean {
  if (elemento.readOnly || elemento.disabled) return true;
  if (elemento.dataset.noAutocorrect !== undefined) return true;
  if (elemento instanceof HTMLInputElement && TIPOS_IGNORADOS.has(elemento.type)) return true;

  const pista = [
    elemento.name,
    elemento.id,
    elemento.getAttribute("autocomplete"),
    elemento.placeholder,
  ]
    .filter(Boolean)
    .join(" ");
  return PISTA_A_IGNORAR.test(pista);
}

export function useAutocorrecaoGlobal() {
  useEffect(() => {
    function aoSairDoCampo(evento: FocusEvent) {
      const alvo = evento.target;
      const ehInput = alvo instanceof HTMLInputElement;
      const ehTextarea = alvo instanceof HTMLTextAreaElement;
      if (!ehInput && !ehTextarea) return;
      if (deveIgnorar(alvo as HTMLInputElement | HTMLTextAreaElement)) return;

      const original = (alvo as HTMLInputElement | HTMLTextAreaElement).value;
      if (!original || !original.trim()) return;

      autocorrigirTexto(original, ehTextarea).then((corrigido) => {
        if (corrigido === original) return;
        // o campo pode ter mudado de valor (ou sumido) enquanto a
        // correção rodava de forma assíncrona — não sobrescreve nesse caso.
        if ((alvo as HTMLInputElement | HTMLTextAreaElement).value !== original) return;

        const prototipo = ehTextarea ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
        const setter = Object.getOwnPropertyDescriptor(prototipo, "value")?.set;
        setter?.call(alvo, corrigido);
        alvo.dispatchEvent(new Event("input", { bubbles: true }));
      });
    }

    document.addEventListener("focusout", aoSairDoCampo);
    return () => document.removeEventListener("focusout", aoSairDoCampo);
  }, []);
}
