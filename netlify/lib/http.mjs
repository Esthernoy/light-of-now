export const json = (dados, status = 200, extra = {}) =>
  new Response(JSON.stringify(dados), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...extra },
  });

export async function corpo(req, limite = 20000) {
  const txt = await req.text();
  if (txt.length > limite) throw new Error('pedido grande demais');
  try { return JSON.parse(txt || '{}'); } catch { throw new Error('JSON inválido'); }
}

/* texto limpo e com tamanho máximo, para o que a cliente digita */
export const texto = (v, max = 200) => String(v == null ? '' : v).replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, max);
