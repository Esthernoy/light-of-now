// Prova que a lógica de reserva/cancelamento é segura quando o armazenamento
// cumpre a gravação condicional (onlyIfMatch / onlyIfNew), como o Netlify Blobs
// de produção promete. O simulador local do "netlify dev" NÃO cumpre (ele confere
// o etag e grava depois, sem trava), por isso aqui usamos um armazenamento falso,
// atômico, que embaralha a ordem das operações com pausas aleatórias.
//
//   node --test --experimental-test-module-mocks testes/atomico.test.mjs
import { test, mock } from 'node:test';
import assert from 'node:assert/strict';

const bancos = new Map();
let seq = 0;
const pausa = () => new Promise(r => setTimeout(r, Math.random() * 8));
function lojaFalsa(name) {
  if (!bancos.has(name)) bancos.set(name, new Map());
  const m = bancos.get(name);
  return {
    async getWithMetadata(k) { await pausa(); const v = m.get(k); return v ? { data: JSON.parse(v.dado), etag: v.etag, metadata: {} } : null; },
    async get(k) { await pausa(); const v = m.get(k); return v ? JSON.parse(v.dado) : null; },
    async setJSON(k, valor, op = {}) {
      await pausa();
      // a partir daqui é síncrono: conferir e gravar acontecem juntos (atômico)
      const atual = m.get(k);
      if (op.onlyIfNew && atual) return { modified: false };
      if (op.onlyIfMatch && (!atual || atual.etag !== op.onlyIfMatch)) return { modified: false };
      const etag = 'e' + (++seq);
      m.set(k, { dado: JSON.stringify(valor), etag });
      await pausa();
      return { modified: true, etag };
    },
    async list() { await pausa(); return { blobs: [...m.keys()].map(key => ({ key, etag: m.get(key).etag })) }; },
    async delete(k) { await pausa(); m.delete(k); },
  };
}
// o mesmo arquivo que netlify/lib/loja.mjs importa (a pasta testes tem outra cópia)
const alvo = new URL('../node_modules/@netlify/blobs/dist/main.js', import.meta.url).href;
mock.module(alvo, { namedExports: { getStore: o => lojaFalsa(typeof o === 'string' ? o : o.name) } });

process.env.ADMIN_SENHA = 'senha-de-teste-local-123';
process.env.LIMITE_PEDIDOS_HORA = '100000';
const loja = await import('../netlify/lib/loja.mjs');
const pedidoFn = (await import('../netlify/functions/pedido.mjs')).default;
const adminFn = (await import('../netlify/functions/admin.mjs')).default;

async function define(ess, tam, n) {
  await loja.mudarEstoque(e => { e[ess][tam] = n; return { ok: true }; });
}
const ret = n => ({ nome: 'C' + n, telefone: '11988887777', email: `c${n}@example.com` });
const post = (fn, url, corpo, cookie) => fn(new Request('http://x' + url, {
  method: 'POST', headers: { 'Content-Type': 'application/json', ...(cookie ? { cookie } : {}) }, body: JSON.stringify(corpo) }), { ip: '1.2.3.4' });

test('50 pedidos simultâneos da ÚLTIMA unidade: só 1 passa (10 rodadas)', async () => {
  for (let rodada = 0; rodada < 10; rodada++) {
    await define('Jardim de Figo', '100g', 1);
    const r = await Promise.all(Array.from({ length: 50 }, (_, n) =>
      post(pedidoFn, '/api/pedido', { itens: [{ essencia: 'Jardim de Figo', tamanho: '100g', qtd: 1 }], modo: 'retirada', cliente: ret(n) })));
    const st = r.map(x => x.status);
    assert.equal(st.filter(s => s === 201).length, 1, 'aceitos na rodada ' + rodada);
    assert.equal(st.filter(s => s === 409).length, 49);
    assert.equal((await loja.lerEstoque()).estoque['Jardim de Figo']['100g'], 0);
  }
});

test('3 unidades, 30 pedidos de 1 e 2 unidades misturados: nunca passa de 3', async () => {
  for (let rodada = 0; rodada < 10; rodada++) {
    await define('Ocean Breeze', '150g', 3);
    const r = await Promise.all(Array.from({ length: 30 }, (_, n) =>
      loja.reservar([{ essencia: 'Ocean Breeze', tamanho: '150g', qtd: 1 + (n % 2) }]).then(x => x.ok ? 1 + (n % 2) : 0)));
    const vendidas = r.reduce((a, b) => a + b, 0);
    const sobra = (await loja.lerEstoque()).estoque['Ocean Breeze']['150g'];
    assert.equal(vendidas + sobra, 3, `vendidas ${vendidas} + sobra ${sobra}`);
    assert.ok(sobra >= 0 && sobra <= 1);
  }
});

test('cancelar o mesmo pedido 5 vezes ao mesmo tempo devolve as velas UMA vez', async () => {
  const login = await post(adminFn, '/api/admin/entrar', { senha: process.env.ADMIN_SENHA });
  const cookie = login.headers.get('set-cookie').split(';')[0];
  for (let rodada = 0; rodada < 10; rodada++) {
    await define('Aura Tropical', '200g', 2);
    const p = await post(pedidoFn, '/api/pedido', { itens: [{ essencia: 'Aura Tropical', tamanho: '200g', qtd: 2 }], modo: 'retirada', cliente: ret(99) });
    const { id } = await p.json();
    assert.equal((await loja.lerEstoque()).estoque['Aura Tropical']['200g'], 0);
    await Promise.all(Array.from({ length: 5 }, () => post(adminFn, '/api/admin/status', { id, status: 'cancelado' }, cookie)));
    assert.equal((await loja.lerEstoque()).estoque['Aura Tropical']['200g'], 2, 'rodada ' + rodada);
    const ped = (await loja.lerPedidos()).find(x => x.id === id);
    assert.equal(ped.historico.filter(h => h.status === 'cancelado').length, 1);
    assert.equal(ped.estoqueDevolvido, true);
  }
});

test('ajustes de + e − simultâneos no /admin não se perdem', async () => {
  await define('Lavandim Baunilha', '100g', 30);   // alto o bastante para nunca passar por baixo de 0
  await Promise.all(Array.from({ length: 40 }, (_, n) =>
    loja.mudarEstoque(e => { e['Lavandim Baunilha']['100g'] += n % 2 ? 1 : -1; return { ok: true }; })));
  assert.equal((await loja.lerEstoque()).estoque['Lavandim Baunilha']['100g'], 30);
});
