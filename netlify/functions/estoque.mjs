/* GET /api/estoque — o que o site precisa saber para riscar os tamanhos esgotados.
   Nunca devolve mais do que TETO_VISIVEL por tamanho (ver lib/config.mjs). */
import { lerEstoque, visivel } from '../lib/loja.mjs';
import { PRECOS } from '../lib/config.mjs';
import { json } from '../lib/http.mjs';

export default async () => {
  try {
    const { estoque } = await lerEstoque();
    return json({ precos: PRECOS, estoque: visivel(estoque) });
  } catch (e) {
    console.error('estoque:', e);
    return json({ erro: 'estoque indisponível' }, 503);
  }
};

export const config = { path: '/api/estoque' };
