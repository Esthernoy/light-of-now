// Tira fotos do /admin no celular (390 px): login, pedidos e estoque.
const puppeteer = require('puppeteer-core');
const URL = process.env.URL || 'http://localhost:8888/';
(async () => {
  const b = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
  const p = await b.newPage();
  await p.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 1 });
  await p.goto(URL + 'admin/', { waitUntil: 'networkidle0' });
  await p.screenshot({ path: 'admin-login.png' });
  await p.type('#senha', process.env.SENHA || 'senha-de-teste-local-123');
  await p.click('#form-login button');
  await p.waitForSelector('#tela-painel:not([hidden])');
  await p.click('#filtros [data-f="todos"]');
  await p.screenshot({ path: 'admin-pedidos.png' });
  await p.click('[data-aba="estoque"]');
  const antes = await p.$eval('#lista-estoque output', o => o.textContent);
  await p.click('#lista-estoque button[data-d="1"]');
  await p.waitForFunction(a => document.querySelector('#lista-estoque output').textContent !== a, {}, antes);
  const depois = await p.$eval('#lista-estoque output', o => o.textContent);
  await p.click('#lista-estoque button[data-d="-1"]');
  await p.waitForFunction(a => document.querySelector('#lista-estoque output').textContent === a, {}, antes);
  console.log('botão +: ' + antes + ' -> ' + depois + ' -> botão −: ' + antes);
  await p.screenshot({ path: 'admin-estoque.png' });
  const larg = await p.evaluate(() => document.documentElement.scrollWidth);
  console.log('largura da página: ' + larg + ' px (sem rolagem lateral: ' + (larg <= 390) + ')');
  await b.close();
})();
