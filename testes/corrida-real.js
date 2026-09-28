// 20 pedidos ao mesmo tempo da última unidade, no site publicado. Uso: BASE=https://... node corrida-real.js
const BASE = process.env.BASE;
const item = { essencia: 'Jardim de Figo', tamanho: '100g', qtd: 1 };
(async () => {
  const antes = (await (await fetch(BASE + '/api/estoque')).json()).estoque['Jardim de Figo']['100g'];
  const r = await Promise.all(Array.from({ length: 20 }, (_, n) => fetch(BASE + '/api/pedido', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ itens: [item], modo: 'retirada', cliente: { nome: 'TESTE CORRIDA ' + n, telefone: '11900000000', email: 'teste@example.com' } }),
  }).then(async x => ({ s: x.status, j: await x.json().catch(() => ({})) }))));
  const conta = {}; r.forEach(x => conta[x.s] = (conta[x.s] || 0) + 1);
  const depois = (await (await fetch(BASE + '/api/estoque')).json()).estoque['Jardim de Figo']['100g'];
  console.log('estoque antes:', antes, '| respostas:', JSON.stringify(conta), '| estoque depois:', depois);
  console.log('pedidos criados:', r.filter(x => x.s === 201).map(x => x.j.id).join(', ') || 'nenhum');
  console.log(conta[201] === Math.min(antes, 20) && depois === Math.max(0, antes - 20) ? 'OK: só vendeu o que tinha' : 'FALHA');
})();
