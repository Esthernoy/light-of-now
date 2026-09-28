/* /api/admin/* — tudo o que a página /admin usa. Só funciona com login.
     POST entrar  {senha}
     POST sair
     GET  dados                      pedidos + estoque (com os números)
     POST estoque {essencia, tamanho, delta: +1 | -1}
     POST status  {id, status: aguardando | pago | entregue | cancelado}   */
import { lerEstoque, mudarEstoque, lerPedidos, mudarPedido, devolver } from '../lib/loja.mjs';
import { ESSENCIAS, TAMANHOS, PRECOS } from '../lib/config.mjs';
import { json, corpo } from '../lib/http.mjs';
import { senhaConfigurada, senhaCerta, logado, cookieDeLogin, cookieDeSaida, bloqueado, registraErro, limpaErros } from '../lib/auth.mjs';

const STATUS = ['aguardando', 'pago', 'entregue', 'cancelado'];
const pausa = ms => new Promise(r => setTimeout(r, ms));

async function entrar(req, ip) {
  if (!senhaConfigurada())
    return json({ erro: 'A senha do painel ainda não foi configurada (ADMIN_SENHA, com pelo menos 10 caracteres). Veja o README.' }, 503);
  if (await bloqueado(ip)) return json({ erro: 'Muitas tentativas erradas. Espere 15 minutos.' }, 429);
  const { senha } = await corpo(req, 1000);
  if (!senhaCerta(senha)) {
    await registraErro(ip);
    await pausa(800);
    return json({ erro: 'Senha incorreta.' }, 401);
  }
  await limpaErros(ip);
  return json({ ok: true }, 200, { 'Set-Cookie': cookieDeLogin() });
}

async function dados() {
  const [{ estoque }, pedidos] = await Promise.all([lerEstoque(), lerPedidos()]);
  return json({ estoque, pedidos, precos: PRECOS });
}

async function ajustaEstoque(req) {
  const { essencia, tamanho, delta } = await corpo(req, 500);
  if (!ESSENCIAS.includes(essencia) || !TAMANHOS.includes(tamanho) || ![1, -1].includes(delta))
    return json({ erro: 'ajuste inválido' }, 400);
  const r = await mudarEstoque(est => {
    if (est[essencia][tamanho] + delta < 0) return { ok: false };
    est[essencia][tamanho] += delta;
    return { ok: true };
  });
  return json({ estoque: r.estoque });
}

async function mudaStatus(req) {
  const { id, status } = await corpo(req, 500);
  if (!/^LON-[0-9A-Z]{5}$/.test(String(id)) || !STATUS.includes(status)) return json({ erro: 'pedido ou situação inválida' }, 400);
  const agora = new Date().toISOString();
  const r = await mudarPedido(id, p => {
    if (p.status === 'cancelado') return { ok: false, erro: 'Este pedido já foi cancelado.' };
    if (p.status === status) return { ok: false, erro: null };
    p.status = status;
    p.historico = (p.historico || []).concat({ em: agora, status, por: 'admin' });
    if (status === 'cancelado') p.estoqueDevolvido = false;
    return { ok: true };
  });
  if (!r.ok) return r.pedido ? json({ pedido: r.pedido, aviso: r.erro }, r.erro ? 409 : 200) : json({ erro: r.erro }, 404);

  // cancelou agora (e só esta chamada conseguiu cancelar): as velas voltam para o estoque
  if (status === 'cancelado') {
    await devolver(r.pedido.itens);
    const f = await mudarPedido(id, p => { p.estoqueDevolvido = true; return { ok: true }; });
    return json({ pedido: f.pedido });
  }
  return json({ pedido: r.pedido });
}

export default async (req, context) => {
  const acao = new URL(req.url).pathname.replace(/^\/api\/admin\/?/, '');
  try {
    if (acao === 'entrar' && req.method === 'POST') return await entrar(req, context.ip);
    if (acao === 'sair') return json({ ok: true }, 200, { 'Set-Cookie': cookieDeSaida() });
    if (!logado(req)) return json({ erro: 'entre com a senha' }, 401);
    if (acao === 'dados' && req.method === 'GET') return await dados();
    if (acao === 'estoque' && req.method === 'POST') return await ajustaEstoque(req);
    if (acao === 'status' && req.method === 'POST') return await mudaStatus(req);
    return json({ erro: 'não encontrado' }, 404);
  } catch (e) {
    console.error('admin:', e);
    return json({ erro: 'Algo deu errado. Tente de novo.' }, 500);
  }
};

export const config = { path: '/api/admin/*' };
