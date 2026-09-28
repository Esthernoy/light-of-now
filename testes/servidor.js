// Testa as funções do servidor. Por padrão no "netlify dev" (http://localhost:8888);
// para testar o site publicado:  BASE=https://endereco.netlify.app SENHA=... node servidor.js
// ATENÇÃO: o simulador local de Blobs não é atômico (confere o etag e grava depois),
// então no localhost as disputas simultâneas só dão AVISO. A prova de verdade é
// atomico.test.mjs + este arquivo rodando contra o site publicado.
//   - 20 pedidos AO MESMO TEMPO da última unidade: só 1 pode passar
//   - pedido com vários itens é reservado inteiro ou nada
//   - total recalculado no servidor (preço adulterado no navegador não vale)
//   - /admin: senha, estoque +/−, status, cancelar devolve as velas (uma vez só)
// Precisa do .env com ADMIN_SENHA=senha-de-teste-local-123 e LIMITE_PEDIDOS_HORA=1000.
const BASE = process.env.BASE || 'http://localhost:8888';
const SENHA = process.env.SENHA || 'senha-de-teste-local-123';
const LOCAL = /localhost|127\.0\.0\.1/.test(BASE);
let falhas = 0;
const confere = (ok, txt) => { console.log((ok ? 'OK   ' : 'FALHA') + ' ' + txt); if (!ok) falhas++; };
const corrida = (ok, txt) => LOCAL && !ok ? console.log('AVISO ' + txt + '  (simulador local não é atômico)') : confere(ok, txt);

let cookie = '';
async function req(caminho, corpo, metodo) {
  const r = await fetch(BASE + caminho, {
    method: metodo || (corpo === undefined ? 'GET' : 'POST'),
    headers: { 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}) },
    body: corpo === undefined ? undefined : JSON.stringify(corpo),
  });
  const sc = r.headers.get('set-cookie'); if (sc) cookie = sc.split(';')[0];
  return { status: r.status, j: await r.json().catch(() => ({})) };
}
const cliente = n => ({ nome: 'Cliente ' + n, telefone: '(11) 98888-77' + String(n).padStart(2, '0'), email: `c${n}@example.com` });
const pedido = (itens, n, extra = {}) => req('/api/pedido', { itens, modo: 'retirada', cliente: cliente(n), ...extra });

async function defineEstoque(ess, tam, alvo) {
  let { j } = await req('/api/admin/dados');
  let atual = j.estoque[ess][tam];
  while (atual !== alvo) {
    const r = await req('/api/admin/estoque', { essencia: ess, tamanho: tam, delta: atual < alvo ? 1 : -1 });
    atual = r.j.estoque[ess][tam];
  }
}

(async () => {
  // ── login
  confere((await req('/api/admin/dados')).status === 401, 'admin sem senha: bloqueado (401)');
  confere((await req('/api/admin/entrar', { senha: 'errada' })).status === 401, 'senha errada: recusada');
  const e = await req('/api/admin/entrar', { senha: SENHA });
  confere(e.status === 200 && cookie.startsWith('lon_admin='), 'senha certa: entrou');

  // ── corrida pela última unidade
  await defineEstoque('Jardim de Figo', '100g', 1);
  const corr = await Promise.all(Array.from({ length: 20 }, (_, n) =>
    pedido([{ essencia: 'Jardim de Figo', tamanho: '100g', qtd: 1 }], n)));
  const aceitos = corr.filter(r => r.status === 201), recusados = corr.filter(r => r.status === 409);
  corrida(aceitos.length === 1 && recusados.length === 19, `20 pedidos simultâneos da última unidade: ${aceitos.length} aceito, ${recusados.length} recusados`);
  const pub = (await req('/api/estoque')).j;
  corrida(pub.estoque['Jardim de Figo']['100g'] === 0, 'depois da corrida o estoque público é 0 (fica riscado)');
  confere(recusados.every(r => r.j.faltas && r.j.faltas[0].disponivel === 0), 'os recusados recebem "faltou" para ajustar a sacola');

  // ── duas unidades, 10 pessoas querendo 1 cada
  await defineEstoque('Ocean Breeze', '200g', 2);
  const c2 = await Promise.all(Array.from({ length: 10 }, (_, n) => pedido([{ essencia: 'Ocean Breeze', tamanho: '200g', qtd: 1 }], 40 + n)));
  corrida(c2.filter(r => r.status === 201).length === 2, `2 unidades e 10 pedidos simultâneos: ${c2.filter(r => r.status === 201).length} aceitos`);

  // ── tudo ou nada
  await defineEstoque('Aura Tropical', '150g', 2);
  await defineEstoque('Lavandim Baunilha', '180g', 0);
  const misto = await pedido([{ essencia: 'Aura Tropical', tamanho: '150g', qtd: 1 }, { essencia: 'Lavandim Baunilha', tamanho: '180g', qtd: 1 }], 60);
  const depois = (await req('/api/admin/dados')).j.estoque;
  confere(misto.status === 409 && depois['Aura Tropical']['150g'] === 2, 'pedido com um item esgotado: nada é reservado');

  // ── total calculado pelo servidor
  const barato = await req('/api/pedido', { itens: [{ essencia: 'Aura Tropical', tamanho: '150g', qtd: 2, preco: 0.01 }], modo: 'retirada',
    cliente: cliente(61), frete: { ok: true, taxa: 0 } });
  confere(barato.status === 201 && barato.j.total === 97, `preço mandado pelo navegador é ignorado: total ${barato.j.total} (2 × 48,50)`);
  confere((await pedido([{ essencia: 'Vela Falsa', tamanho: '100g', qtd: 1 }], 62)).status === 400, 'essência que não existe: recusada');
  confere((await pedido([{ essencia: 'Aura Tropical', tamanho: '150g', qtd: -3 }], 63)).status === 400, 'quantidade negativa: recusada');
  confere((await req('/api/pedido', { itens: [{ essencia: 'Aura Tropical', tamanho: '100g', qtd: 1 }], modo: 'entrega', cliente: cliente(64) })).status === 400,
    'entrega sem endereço: recusada');

  // ── entrega: frete calculado no servidor
  await defineEstoque('Aura Tropical', '100g', 5);
  const ent = await req('/api/pedido', { itens: [{ essencia: 'Aura Tropical', tamanho: '100g', qtd: 1 }], modo: 'entrega',
    cliente: { ...cliente(65), cep: '01310-100', rua: 'Avenida Paulista', numero: '1000', bairro: 'Bela Vista' }, frete: { ok: true, taxa: 12 } });
  confere(ent.status === 201 && ent.j.freteOk && ent.j.taxa === 35 && ent.j.total === 74.5,
    `entrega: servidor calculou taxa ${ent.j.taxa} (~${ent.j.km} km), ignorou os 12 do navegador; total ${ent.j.total}`);
  await defineEstoque('Aura Tropical', '200g', 4);
  const gratis = await req('/api/pedido', { itens: [{ essencia: 'Aura Tropical', tamanho: '200g', qtd: 4 }], modo: 'entrega',
    cliente: { ...cliente(66), cep: '01310-100', rua: 'Avenida Paulista', numero: '1000', bairro: 'Bela Vista' } });
  confere(gratis.status === 201 && gratis.j.taxa === 0 && gratis.j.total === 238, `acima de R$ 200: entrega grátis, total ${gratis.j.total}`);

  // ── aviso "já paguei"
  const id = aceitos[0].j.id;
  await req('/api/pedido/avisou', { id });
  let p = (await req('/api/admin/dados')).j.pedidos.find(x => x.id === id);
  confere(!!p.clienteAvisouEm, `pedido ${id}: aviso de pagamento registrado`);

  // ── status e cancelamento
  confere((await req('/api/admin/status', { id, status: 'pago' })).j.pedido.status === 'pago', 'marcar como pago');
  confere((await req('/api/admin/status', { id, status: 'entregue' })).j.pedido.status === 'entregue', 'marcar como entregue');
  const canc = await Promise.all([1, 2, 3].map(() => req('/api/admin/status', { id, status: 'cancelado' })));
  const est = (await req('/api/admin/dados')).j.estoque;
  corrida(canc.every(c => c.j.pedido && c.j.pedido.status === 'cancelado') && est['Jardim de Figo']['100g'] === 1,
    `cancelar 3 vezes ao mesmo tempo devolve a vela UMA vez só (estoque agora ${est['Jardim de Figo']['100g']})`);
  confere((await req('/api/admin/status', { id, status: 'pago' })).status === 409, 'pedido cancelado não volta a ser pago');

  // ── nenhum número de estoque acima do teto sai para o público
  await defineEstoque('Ocean Breeze', '100g', 14);
  confere((await req('/api/estoque')).j.estoque['Ocean Breeze']['100g'] === 10, 'estoque público nunca passa de 10 (o real é 14)');
  await defineEstoque('Ocean Breeze', '100g', 2);

  // ── sair
  await req('/api/admin/sair', {});
  cookie = '';
  confere((await req('/api/admin/dados')).status === 401, 'depois de sair: bloqueado');

  console.log(falhas ? falhas + ' FALHA(S)' : 'TUDO CERTO');
  process.exit(falhas ? 1 : 0);
})();
