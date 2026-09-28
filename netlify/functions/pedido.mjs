/* POST /api/pedido         — confere o pedido, recalcula o total, reserva o estoque e grava.
   POST /api/pedido/avisou  — a cliente tocou em "Já paguei · enviar comprovante". */
import { createHash } from 'node:crypto';
import { reservar, devolver, gravarPedidoNovo, mudarPedido, lojaStore, visivel } from '../lib/loja.mjs';
import { PRECOS, ESSENCIAS, TAMANHOS, ENTREGA } from '../lib/config.mjs';
import { calculaFrete } from '../lib/frete.mjs';
import { json, corpo, texto } from '../lib/http.mjs';

const centavos = v => Math.round(v * 100) / 100;
const LIMITE_POR_HORA = Number(process.env.LIMITE_PEDIDOS_HORA) || 8;   // pedidos por pessoa (IP) por hora

function validaItens(lista) {
  if (!Array.isArray(lista) || !lista.length || lista.length > 20) return null;
  const junta = new Map();
  for (const i of lista) {
    const qtd = Number(i && i.qtd);
    if (!ESSENCIAS.includes(i.essencia) || !TAMANHOS.includes(i.tamanho) || !Number.isInteger(qtd) || qtd < 1 || qtd > 20) return null;
    const k = i.essencia + '|' + i.tamanho;
    junta.set(k, { essencia: i.essencia, tamanho: i.tamanho, qtd: (junta.get(k)?.qtd || 0) + qtd });
  }
  return [...junta.values()];
}

function validaCliente(c, modo) {
  const d = {};
  for (const [k, max] of Object.entries({ nome: 120, telefone: 20, email: 120, cep: 9, rua: 150, numero: 20, complemento: 80, bairro: 80, obs: 500 }))
    d[k] = texto(c && c[k], max);
  if (!d.nome) return [null, 'Informe seu nome.'];
  if (d.telefone.replace(/\D/g, '').length < 10) return [null, 'Informe seu WhatsApp com DDD.'];
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email)) return [null, 'Confira seu e-mail.'];
  if (modo === 'retirada') { d.cep = d.rua = d.numero = d.complemento = d.bairro = ''; return [d]; }
  if (d.cep.replace(/\D/g, '').length !== 8) return [null, 'Informe o CEP com 8 números.'];
  if (!d.rua || !d.numero || !d.bairro) return [null, 'Confira o endereço de entrega.'];
  return [d];
}

/* Frete que o servidor aceita. Se o servidor não conseguir localizar o CEP
   (serviços de CEP fora do ar), aceita o valor do navegador desde que seja um
   valor de faixa válido — e o pedido fica marcado como "frete não conferido". */
async function freteDoPedido(modo, cep, subtotal, nav) {
  if (modo === 'retirada') return { ok: true, taxa: 0, km: null, cidade: '', conferido: true };
  const f = await calculaFrete(cep, subtotal);
  if (f.status === 'ok' || f.status === 'gratis')
    return { ok: true, taxa: f.taxa, km: Math.max(1, Math.round(f.km)), cidade: f.cidade, conferido: true };
  if (f.status === 'fora') return { ok: false, taxa: null, km: Math.round(f.km), cidade: f.cidade, conferido: true };
  const validas = ENTREGA.faixas.map(x => x.valor).concat(subtotal >= ENTREGA.gratisAcimaDe ? [0] : []);
  if (nav && nav.ok && validas.includes(Number(nav.taxa)))
    return { ok: true, taxa: Number(nav.taxa), km: Number(nav.km) || null, cidade: texto(nav.cidade, 60) || f.cidade, conferido: false };
  return { ok: false, taxa: null, km: null, cidade: f.cidade, conferido: true };
}

async function passouDoLimite(ip) {
  if (!ip) return false;
  const hora = new Date().toISOString().slice(0, 13);
  const chave = 'limite/' + createHash('sha256').update(ip).digest('hex').slice(0, 16) + '/' + hora;
  const store = lojaStore();
  const n = (await store.get(chave, { type: 'json' })) || 0;
  if (n >= LIMITE_POR_HORA) return true;
  await store.setJSON(chave, n + 1);
  return false;
}

async function novoPedido(req, context) {
  const b = await corpo(req);
  const modo = b.modo === 'retirada' ? 'retirada' : 'entrega';
  const itens = validaItens(b.itens);
  if (!itens) return json({ erro: 'Sua sacola tem um item inválido. Atualize a página e tente de novo.' }, 400);
  const [cliente, erroCliente] = validaCliente(b.cliente, modo);
  if (!cliente) return json({ erro: erroCliente }, 400);
  if (await passouDoLimite(context.ip))
    return json({ erro: 'Recebemos muitos pedidos seguidos daqui. Fale com a gente pelo WhatsApp.' }, 429);

  itens.forEach(i => { i.preco = PRECOS[i.tamanho]; });
  const subtotal = centavos(itens.reduce((s, i) => s + i.preco * i.qtd, 0));
  const frete = await freteDoPedido(modo, cliente.cep, subtotal, b.frete);

  const r = await reservar(itens);
  if (!r.ok) return json({ erro: 'estoque', faltas: r.faltas.map(f => ({ ...f, disponivel: Math.min(f.disponivel, f.pedido) })), estoque: visivel(r.estoque) }, 409);

  const agora = new Date().toISOString();
  try {
    const pedido = await gravarPedidoNovo({
      criadoEm: agora, status: 'aguardando', modo, itens, subtotal, frete,
      total: centavos(subtotal + (frete.ok ? frete.taxa : 0)),
      cliente, historico: [{ em: agora, status: 'aguardando', por: 'site' }],
    });
    return json({ id: pedido.id, subtotal, total: pedido.total, freteOk: frete.ok, taxa: frete.ok ? frete.taxa : null, km: frete.km, cidade: frete.cidade }, 201);
  } catch (e) {
    await devolver(itens);          // não gravou o pedido: as velas voltam para a prateleira
    throw e;
  }
}

async function avisou(req) {
  const { id } = await corpo(req, 500);
  if (!/^LON-[0-9A-Z]{5}$/.test(String(id))) return json({ erro: 'pedido inválido' }, 400);
  const r = await mudarPedido(id, p => {
    if (p.clienteAvisouEm) return { ok: false };
    p.clienteAvisouEm = new Date().toISOString();
    return { ok: true };
  });
  return json({ ok: true, jaAvisado: !r.ok && !!r.pedido });
}

export default async (req, context) => {
  if (req.method !== 'POST') return json({ erro: 'use POST' }, 405);
  try {
    return new URL(req.url).pathname.endsWith('/avisou') ? await avisou(req) : await novoPedido(req, context);
  } catch (e) {
    console.error('pedido:', e);
    return json({ erro: 'Não conseguimos registrar o pedido agora.' }, 500);
  }
};

export const config = { path: ['/api/pedido', '/api/pedido/avisou'] };
