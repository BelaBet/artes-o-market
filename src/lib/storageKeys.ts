// Chaves de persistência local. Ficam isoladas aqui para que o registro
// do service worker possa consultá-las sem importar contextos de React.
//
// v2: o carrinho passou a guardar id em UUID e preço em centavos; a
// versão no nome descarta o carrinho antigo em vez de quebrar ao ler.
export const CARRINHO_STORAGE_KEY = "feito-a-mao:carrinho:v2";
