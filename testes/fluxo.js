// Testa a compra completa (retirada e entrega), o Pix (CRC + leitura do QR) e a página sem JavaScript.
const puppeteer = require('puppeteer-core');
const jsQR = require('jsqr');
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
// sem servidor: python -m http.server 8765 (na raiz)  |  com servidor: URL=http://localhost:8888/ node fluxo.js
const URL = process.env.URL || 'http://localhost:8765/site/index.html';
const COM_SERVIDOR = !!process.env.URL;
const espera = ms => new Promise(r => setTimeout(r, ms));
let falhas = 0;
const confere = (ok, txt) => { console.log((ok ? 'OK   ' : 'FALHA') + ' ' + txt); if (!ok) falhas++; };

function crc16(s){ let c=0xFFFF; for(const ch of s){ c^=ch.charCodeAt(0)<<8; for(let j=0;j<8;j++) c=(c&0x8000)?((c<<1)^0x1021)&0xFFFF:(c<<1)&0xFFFF; } return c.toString(16).toUpperCase().padStart(4,'0'); }
function tlv(s){ const o={}; let i=0; while(i<s.length){ const id=s.substr(i,2), n=+s.substr(i+2,2); o[id]=s.substr(i+4,n); i+=4+n; } return o; }

async function compra(browser, modo) {
  const p = await browser.newPage();
  await p.setViewport({ width: 390, height: 844, isMobile: true });
  await p.goto(URL, { waitUntil: 'networkidle0' });
  await p.evaluate(() => { addCarrinho('Ocean Breeze','100g'); addCarrinho('Jardim de Figo','200g'); abrirSacola(); irEtapa(2); });
  await espera(400);                                      // a sacola move o cursor sozinha ao abrir
  await p.type('#nome', 'Cliente Teste');
  await p.type('#telefone', '11988887777');
  await p.type('#email', 'teste@example.com');
  let esperado = 39.50 + 59.50;
  if (modo === 'retirada') {
    await p.evaluate(() => escolheModo('retirada'));
  } else {
    await p.type('#cep', '01310100');                       // Av. Paulista
    await p.waitForFunction(() => frete.status !== 'buscando', { timeout: 30000 });
    await p.type('#numero', '1000');
    const f = await p.evaluate(() => ({ status: frete.status, km: frete.km, taxa: frete.taxa, rua: $('rua').value }));
    const faixa = [[5,12],[10,18],[15,25],[25,35]].find(([k]) => f.km <= k);
    console.log('      CEP 01310-100 ->', f.rua || '(sem rua)', '| status ' + f.status + ' | ~' + (f.km == null ? '?' : f.km.toFixed(1)) + ' km | taxa', f.taxa);
    confere(f.status === 'ok' && faixa && f.taxa === faixa[1], 'frete pela faixa de distância');
    esperado += f.taxa;
  }
  await p.evaluate(() => confirmarPedido());
  await espera(400);
  const r = await p.evaluate(() => {
    const cv = $('pix-qr'), g = cv.getContext('2d');
    return { etapa, id: pedidoFeito.id, total: pedidoFeito.total, salvo: !!pedidoFeito.salvo, codigo: $('pix-codigo').textContent,
             w: cv.width, h: cv.height, px: Array.from(g.getImageData(0,0,cv.width,cv.height).data),
             estoque: ESTOQUE['Jardim de Figo']['200g'] };
  });
  confere(r.etapa === 3 && /^LON-[0-9A-Z]{5}$/.test(r.id), `${modo}: chegou na etapa 3, pedido ${r.id}`);
  confere(Math.abs(r.total - esperado) < 0.001, `${modo}: total R$ ${r.total.toFixed(2)} (esperado ${esperado.toFixed(2)})`);
  const corpo = r.codigo.slice(0, -4);
  confere(crc16(corpo) === r.codigo.slice(-4), `${modo}: CRC16 do Pix válido (${r.codigo.slice(-4)})`);
  const t = tlv(r.codigo);
  confere(t['54'] === esperado.toFixed(2), `${modo}: valor no Pix = ${t['54']}`);
  confere(tlv(t['62'])['05'] === r.id.replace('-', ''), `${modo}: txid = ${tlv(t['62'])['05']}`);
  const qr = jsQR(Uint8ClampedArray.from(r.px), r.w, r.h);
  confere(qr && qr.data === r.codigo, `${modo}: QR Code lido e igual ao copia e cola`);
  confere(r.estoque === 0, `${modo}: Jardim de Figo 200g ficou esgotado nesta visita`);
  // "Já paguei": só agradece, não abre o WhatsApp
  const abas = (await browser.pages()).length;
  const tela3 = await p.evaluate(() => ({ msg: $('pd-msg').textContent, botao: $('sc-rodape').textContent }));
  confere(!/comprovante/i.test(tela3.msg + tela3.botao) && tela3.botao.includes('Já paguei'), `${modo}: nenhuma menção a comprovante; botão "Já paguei"`);
  await p.evaluate(() => informarPagamento());
  await espera(800);
  const pago = await p.evaluate(() => ({ msg: $('pd-msg').textContent, selo: $('pd-selo-txt').textContent, rodape: $('sc-rodape').innerHTML }));
  confere(pago.msg === 'Obrigada pela compra, nossa equipe entrará em contato em alguns instantes.' && pago.selo === 'Pagamento informado' && pago.rodape === '',
    `${modo}: depois de pagar aparece "${pago.msg}"`);
  confere((await browser.pages()).length === abas, `${modo}: o WhatsApp não abriu`);
  if (COM_SERVIDOR) {
    confere(r.salvo, `${modo}: pedido gravado no servidor`);
    const pub = await (await fetch(new globalThis.URL('/api/estoque', URL))).json();
    confere(pub.estoque['Jardim de Figo']['200g'] === 0, `${modo}: estoque do servidor também baixou (outras clientes veem riscado)`);
    await repoe();
  }
  await p.close();
}

// devolve Jardim de Figo 200g = 1 pelo /admin, para o próximo teste
async function repoe(alvo = { 'Jardim de Figo': { '200g': 1, '150g': 1 }, 'Ocean Breeze': { '100g': 2 } }) {
  const base = new globalThis.URL('/', URL).href.replace(/\/$/, '');
  const r = await fetch(base + '/api/admin/entrar', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ senha: process.env.SENHA || 'senha-de-teste-local-123' }) });
  const cookie = r.headers.get('set-cookie').split(';')[0];
  const est = (await (await fetch(base + '/api/admin/dados', { headers: { cookie } })).json()).estoque;
  for (const [e, ts] of Object.entries(alvo)) for (const [t, n] of Object.entries(ts)) {
    let atual = est[e][t];
    while (atual !== n) {
      const x = await (await fetch(base + '/api/admin/estoque', { method: 'POST', headers: { cookie, 'Content-Type': 'application/json' },
        body: JSON.stringify({ essencia: e, tamanho: t, delta: atual < n ? 1 : -1 }) })).json();
      atual = x.estoque[e][t];
    }
  }
}

// outra cliente leva a última unidade enquanto esta ainda está preenchendo os dados
async function outraLevou(browser) {
  await repoe();
  const p = await browser.newPage();
  await p.setViewport({ width: 390, height: 844, isMobile: true });
  await p.goto(URL, { waitUntil: 'networkidle0' });
  await p.evaluate(() => { addCarrinho('Jardim de Figo', '150g'); addCarrinho('Ocean Breeze', '100g'); abrirSacola(); irEtapa(2); escolheModo('retirada'); });
  await espera(400);
  await p.type('#nome', 'Cliente Lenta'); await p.type('#telefone', '11977776666'); await p.type('#email', 'lenta@example.com');
  const outra = await fetch(new globalThis.URL('/api/pedido', URL), { method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ itens: [{ essencia: 'Jardim de Figo', tamanho: '150g', qtd: 1 }], modo: 'retirada',
      cliente: { nome: 'Cliente Rápida', telefone: '11966665555', email: 'rapida@example.com' } }) });
  confere(outra.status === 201, 'a outra cliente comprou a última Jardim de Figo 150g');
  await p.evaluate(() => confirmarPedido());
  await p.waitForFunction(() => etapa === 1, { timeout: 20000 });
  const r = await p.evaluate(() => ({ aviso: $('aviso-estoque').hidden ? '' : $('aviso-estoque').textContent,
    itens: carrinho.map(i => i.essencia + ' ' + i.tamanho + ' x' + i.qtd),
    riscado: document.querySelector('.size-btn[data-essencia="Jardim de Figo"][data-tamanho="150g"]').classList.contains('esgotado') }));
  console.log('      aviso: "' + r.aviso + '"');
  confere(r.aviso.includes('Jardim de Figo 150g') && r.itens.join() === 'Ocean Breeze 100g x1' && r.riscado,
    'esta cliente volta para a sacola com aviso gentil, a vela esgotada sai da sacola e fica riscada');
  await p.screenshot({ path: 'aviso-estoque.png' });
  await p.evaluate(() => irEtapa(2));
  await p.evaluate(() => confirmarPedido());
  await p.waitForFunction(() => etapa === 3, { timeout: 20000 });
  confere(await p.evaluate(() => pedidoFeito.salvo && pedidoFeito.total === 39.5), 'e consegue fechar o pedido com o que sobrou (R$ 39,50)');
  await p.close();
  await repoe();
}

async function semJs(browser, bloqueia) {
  const p = await browser.newPage();
  await p.setViewport({ width: 1440, height: 900 });
  if (bloqueia === 'tudo') await p.setJavaScriptEnabled(false);
  else { await p.setRequestInterception(true); p.on('request', q => q.url().endsWith(bloqueia) ? q.abort() : q.continue()); }
  await p.goto(URL, { waitUntil: 'networkidle0' });
  await espera(3500);
  const vis = await p.evaluate(() => [...document.querySelectorAll('.reveal')].map(e => +getComputedStyle(e).opacity));
  const txt = await p.evaluate(() => document.body.innerText.includes('Escolha a Fragrância do Seu Momento') && document.body.innerText.includes('R$ 59,50'));
  confere(vis.length > 10 && vis.every(o => o === 1) && txt, `sem JavaScript (${bloqueia}): ${vis.length} blocos visíveis, textos e preços na tela`);
  await p.close();
}

(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: true });
  await compra(browser, 'retirada');
  await compra(browser, 'entrega');
  if (COM_SERVIDOR) await outraLevou(browser);
  await semJs(browser, 'tudo');
  await semJs(browser, 'loja.js');
  await browser.close();
  console.log(falhas ? falhas + ' FALHA(S)' : 'TUDO CERTO');
  process.exit(falhas ? 1 : 0);
})();
