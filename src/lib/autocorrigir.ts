// Corretor ortográfico (pt-BR) usado pela auto-correção global dos campos
// de texto do site (ver src/hooks/useAutocorrecaoGlobal.ts).
//
// O dicionário Hunspell (aff+dic) tem ~5MB — fica em public/dict/ como
// arquivo estático (não entra no bundle JS) e só é buscado quando o
// usuário realmente sai de um campo de texto pela primeira vez.
import nspell from "nspell";

type Corretor = ReturnType<typeof nspell>;

let corretorPromise: Promise<Corretor> | null = null;

function carregarCorretor(): Promise<Corretor> {
  if (!corretorPromise) {
    corretorPromise = Promise.all([
      fetch("/dict/pt-BR.aff").then((r) => r.text()),
      fetch("/dict/pt-BR.dic").then((r) => r.text()),
    ]).then(([aff, dic]) => nspell({ aff, dic }));
  }
  return corretorPromise;
}

const CONECTIVOS = new Set(["de", "da", "do", "das", "dos", "e"]);
const SO_LETRAS = /^[a-zà-üA-ZÀ-Ü]+$/;
const COMECA_MAIUSCULA = /^[A-ZÀ-Ü]/;

function capitalizar(palavra: string): string {
  return palavra ? palavra[0].toUpperCase() + palavra.slice(1) : palavra;
}

function tituloComConectivos(texto: string): string {
  let primeira = true;
  return texto.replace(/[^\s]+/g, (palavra) => {
    const ehPrimeira = primeira;
    primeira = false;
    const minuscula = palavra.toLowerCase();
    if (!ehPrimeira && CONECTIVOS.has(minuscula)) return minuscula;
    return capitalizar(minuscula);
  });
}

function maiusculaNoInicioDasFrases(texto: string): string {
  return texto.replace(/(^\s*|[.!?]\s+)([a-zà-ü])/g, (_m, prefixo, letra) => prefixo + letra.toUpperCase());
}

// Distância de Levenshtein simples, só para decidir se a sugestão do
// corretor é próxima o bastante pra valer a pena aplicar sozinho.
function distancia(a: string, b: string): number {
  const linhas: number[][] = [];
  for (let i = 0; i <= a.length; i++) {
    linhas[i] = [i];
    for (let j = 1; j <= b.length; j++) linhas[i][j] = 0;
  }
  for (let j = 0; j <= b.length; j++) linhas[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      linhas[i][j] =
        a[i - 1] === b[j - 1]
          ? linhas[i - 1][j - 1]
          : 1 + Math.min(linhas[i - 1][j - 1], linhas[i - 1][j], linhas[i][j - 1]);
    }
  }
  return linhas[a.length][b.length];
}

async function corrigirPalavra(palavra: string): Promise<string> {
  if (!SO_LETRAS.test(palavra) || palavra.length < 3) return palavra;
  if (palavra === palavra.toUpperCase()) return palavra; // sigla, não mexe

  const corretor = await carregarCorretor();
  if (corretor.correct(palavra)) return palavra;

  // Nomes próprios (começam com maiúscula fora do início da frase) o
  // dicionário não conhece — arriscado "corrigir" pra outra palavra.
  if (COMECA_MAIUSCULA.test(palavra)) return palavra;

  const [sugestao] = corretor.suggest(palavra);
  if (!sugestao || distancia(palavra, sugestao.toLowerCase()) > 2) return palavra;
  return sugestao;
}

/**
 * Corrige ortografia (palavra a palavra, só quando há uma sugestão bem
 * próxima) e maiúsculas/minúsculas de um texto já digitado.
 * `multilinha=false` (campos curtos: nome, cidade, rua) aplica Title Case
 * com conectivos em minúsculo ("Rua das Flores"); `multilinha=true`
 * (descrições, mensagens) só corrige o início de cada frase.
 */
export async function autocorrigirTexto(texto: string, multilinha: boolean): Promise<string> {
  if (!texto || !texto.trim()) return texto;

  const partes = texto.split(/(\s+)/);
  const corrigidas = await Promise.all(
    partes.map((parte) => (/^\s+$/.test(parte) || !parte ? parte : corrigirPalavra(parte))),
  );
  const corrigido = corrigidas.join("");

  return multilinha ? maiusculaNoInicioDasFrases(corrigido) : tituloComConectivos(corrigido);
}
