/* ═══════════════ CONFIGURAÇÕES DA LOJA (lado do servidor) ═══════════════
   É daqui que o servidor tira os preços e a entrega para calcular o total
   do pedido. O site pega os preços daqui também, ao abrir.
   Se mudar um preço, mude também nos quadros azuis de "Tamanhos e Valores"
   em site/index.html. */

export const PRECOS = { '100g': 39.50, '150g': 48.50, '180g': 53.00, '200g': 59.50 };

export const ESSENCIAS = ['Ocean Breeze', 'Jardim de Figo', 'Lavandim Baunilha', 'Aura Tropical'];
export const TAMANHOS = Object.keys(PRECOS);

/* Usado UMA vez só: na primeira vez que o site roda, o estoque começa assim.
   Depois disso o estoque é ajustado pelo /admin, e este número não vale mais. */
export const ESTOQUE_INICIAL = {
  'Aura Tropical':     { '100g': 2, '150g': 2, '180g': 2, '200g': 2 },
  'Jardim de Figo':    { '100g': 1, '150g': 1, '180g': 1, '200g': 1 },
  'Lavandim Baunilha': { '100g': 2, '150g': 2, '180g': 2, '200g': 2 },
  'Ocean Breeze':      { '100g': 2, '150g': 2, '180g': 2, '200g': 2 },
};

/* Igual ao ENTREGA de site/loja.js. "origem" é um ponto aproximado do bairro,
   arredondado de propósito — não é o endereço. */
export const ENTREGA = {
  origem: { lat: -23.49, lon: -46.58 },
  faixas: [
    { ate: 5, valor: 12.00 },
    { ate: 10, valor: 18.00 },
    { ate: 15, valor: 25.00 },
    { ate: 25, valor: 35.00 },
  ],
  acimaDisso: null,
  gratisAcimaDe: 200.00,
  fatorRua: 1.35,
};

/* O site nunca mostra quantas unidades há. O servidor também não conta além
   deste número: acima dele, a página só fica sabendo que "tem bastante". */
export const TETO_VISIVEL = 10;
