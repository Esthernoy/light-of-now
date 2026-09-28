/* Estoque e pedidos guardados no Netlify Blobs.

   O estoque inteiro fica numa chave só ("estoque"). Toda mudança é feita assim:
   lê (com o etag) → confere → grava com onlyIfMatch. Se outra pessoa gravou
   no meio, a gravação é recusada e tudo é refeito com o valor novo.
   Por isso um pedido com várias velas é reservado inteiro ou não é reservado,
   e a última unidade nunca é vendida duas vezes. */
import { getStore } from '@netlify/blobs';
import { randomInt } from 'node:crypto';
import { ESSENCIAS, TAMANHOS, ESTOQUE_INICIAL, TETO_VISIVEL } from './config.mjs';

const TENTATIVAS = 25;
const pausa = ms => new Promise(r => setTimeout(r, ms));

export const lojaStore = () => getStore({ name: 'loja', consistency: 'strong' });
export const pedidosStore = () => getStore({ name: 'pedidos', consistency: 'strong' });

function normaliza(e) {
  const out = {};
  for (const ess of ESSENCIAS) {
    out[ess] = {};
    for (const t of TAMANHOS) {
      const n = e && e[ess] && Number.isInteger(e[ess][t]) ? e[ess][t] : 0;
      out[ess][t] = Math.max(0, n);
    }
  }
  return out;
}

export async function lerEstoque() {
  const store = lojaStore();
  let r = await store.getWithMetadata('estoque', { type: 'json' });
  if (!r) {
    await store.setJSON('estoque', normaliza(ESTOQUE_INICIAL), { onlyIfNew: true });
    r = await store.getWithMetadata('estoque', { type: 'json' });
  }
  return { estoque: normaliza(r.data), etag: r.etag };
}

/* Aplica "muda(estoque)" de forma atômica. muda devolve {ok, ...} e altera o
   objeto; se ok for falso, nada é gravado. */
export async function mudarEstoque(muda) {
  const store = lojaStore();
  for (let i = 0; i < TENTATIVAS; i++) {
    const { estoque, etag } = await lerEstoque();
    const res = muda(estoque);
    if (!res.ok) return { ...res, estoque };
    const { modified } = await store.setJSON('estoque', estoque, { onlyIfMatch: etag });
    if (modified) return { ...res, estoque };
    await pausa(15 + randomInt(60) * (i + 1));    // alguém gravou antes: tenta de novo
  }
  throw new Error('estoque ocupado demais, tente de novo');
}

/* Reserva todos os itens ou nenhum. Devolve {ok:false, faltas:[...]} se faltar. */
export function reservar(itens) {
  return mudarEstoque(est => {
    const faltas = itens
      .filter(i => est[i.essencia][i.tamanho] < i.qtd)
      .map(i => ({ essencia: i.essencia, tamanho: i.tamanho, pedido: i.qtd, disponivel: est[i.essencia][i.tamanho] }));
    if (faltas.length) return { ok: false, faltas };
    itens.forEach(i => { est[i.essencia][i.tamanho] -= i.qtd; });
    return { ok: true };
  });
}

export function devolver(itens) {
  return mudarEstoque(est => {
    itens.forEach(i => { est[i.essencia][i.tamanho] += i.qtd; });
    return { ok: true };
  });
}

/* ── Pedidos ── */

const LETRAS = '0123456789ABCDEFGHJKLMNPQRSTUVWXYZ';   // sem I e O, que confundem

export async function gravarPedidoNovo(dados) {
  const store = pedidosStore();
  for (let i = 0; i < 20; i++) {
    let cod = '';
    for (let k = 0; k < 5; k++) cod += LETRAS[randomInt(LETRAS.length)];
    const pedido = { ...dados, id: 'LON-' + cod };
    const { modified } = await store.setJSON(pedido.id, pedido, { onlyIfNew: true });
    if (modified) return pedido;
  }
  throw new Error('não foi possível gerar o número do pedido');
}

export async function lerPedidos() {
  const store = pedidosStore();
  const { blobs } = await store.list();
  const todos = await Promise.all(blobs.map(b => store.get(b.key, { type: 'json' })));
  return todos.filter(Boolean).sort((a, b) => (b.criadoEm || '').localeCompare(a.criadoEm || ''));
}

/* Muda um pedido de forma atômica (mesmo esquema do estoque). */
export async function mudarPedido(id, muda) {
  const store = pedidosStore();
  for (let i = 0; i < TENTATIVAS; i++) {
    const r = await store.getWithMetadata(id, { type: 'json' });
    if (!r) return { ok: false, erro: 'pedido não encontrado' };
    const pedido = r.data;
    const res = muda(pedido);
    if (!res.ok) return { ...res, pedido };
    const { modified } = await store.setJSON(id, pedido, { onlyIfMatch: r.etag });
    if (modified) return { ...res, pedido };
    await pausa(15 + randomInt(60) * (i + 1));
  }
  throw new Error('pedido ocupado demais, tente de novo');
}

/* O que o site pode saber: nunca mais do que TETO_VISIVEL por tamanho. */
export const visivel = estoque =>
  Object.fromEntries(Object.entries(estoque).map(([e, t]) =>
    [e, Object.fromEntries(Object.entries(t).map(([k, n]) => [k, Math.min(n, TETO_VISIVEL)]))]));
