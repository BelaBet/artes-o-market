import { useEffect } from "react";

const BASE_TITLE = "Artes o Market";

function setMeta(selector: string, content: string) {
  const el = document.querySelector<HTMLMetaElement>(selector);
  if (el) el.setAttribute("content", content);
}

/**
 * Define título e meta description por rota.
 * Necessário porque a app é SPA — sem isso todas as páginas
 * compartilham o mesmo <title>, prejudicando SEO e compartilhamento.
 */
export function usePageMeta(title: string, description?: string) {
  useEffect(() => {
    const fullTitle = title ? `${title} · ${BASE_TITLE}` : BASE_TITLE;
    document.title = fullTitle;
    setMeta('meta[property="og:title"]', fullTitle);
    setMeta('meta[name="twitter:title"]', fullTitle);

    if (description) {
      setMeta('meta[name="description"]', description);
      setMeta('meta[property="og:description"]', description);
      setMeta('meta[name="twitter:description"]', description);
    }

    setMeta('meta[property="og:url"]', window.location.href);
  }, [title, description]);
}
