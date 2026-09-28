// Compara o arquivo original com o site separado, pixel a pixel.
// Uso: node visual.js   (com um servidor em http://localhost:8765 servindo a pasta light-of-now)
const puppeteer = require('puppeteer-core');
const { PNG } = require('pngjs');
const pixelmatch = require('pixelmatch');
const fs = require('fs');

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const BASE = 'http://localhost:8765';
const PAGINAS = { original: '/ferramentas/original.html', novo: process.env.NOVO || '/site/index.html' };   // NOVO=https://... compara com o site publicado
const TELAS = {
  pc: { width: 1440, height: 900, deviceScaleFactor: 1 },
  cel: { width: 390, height: 844, deviceScaleFactor: 1, isMobile: true, hasTouch: true },
};
const espera = ms => new Promise(r => setTimeout(r, ms));

async function fotos(browser, url, tela) {
  const p = await browser.newPage();
  await p.setViewport(tela);
  await p.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
  await p.goto(url.startsWith('http') ? url : BASE + url, { waitUntil: 'networkidle0' });
  await p.evaluate(() => document.fonts.ready);
  await espera(3500);                               // .tudo-visivel entra aos 2,5 s
  // congela o que se mexe: anéis girando, o olho animado (AVIF) e transições
  await p.addStyleTag({ content: '*,*::before,*::after{animation:none!important;transition:none!important}' });
  await p.evaluate(() => { const s = document.querySelector('.hero-olho source'); if (s) s.remove(); });
  await p.evaluate(() => { const i = document.querySelector('.hero-olho img'); if (i) i.src = i.src; });
  await espera(600);
  const pagina = await p.screenshot({ fullPage: true });
  // sacola aberta com um item, etapa 1 e etapa 2
  await p.evaluate(() => { addCarrinho('Ocean Breeze', '100g'); addCarrinho('Aura Tropical', '200g'); abrirSacola(); });
  await espera(700);
  const sacola1 = await p.screenshot();
  await p.evaluate(() => irEtapa(2));
  await espera(700);
  await p.evaluate(() => document.activeElement && document.activeElement.blur());
  const sacola2 = await p.screenshot();
  await p.close();
  return { pagina, sacola1, sacola2 };
}

function compara(a, b, nome) {
  const A = PNG.sync.read(a), B = PNG.sync.read(b);
  if (A.width !== B.width || A.height !== B.height) {
    console.log(`${nome}: TAMANHO DIFERENTE ${A.width}x${A.height} x ${B.width}x${B.height}`);
    return false;
  }
  const d = new PNG({ width: A.width, height: A.height });
  const n = pixelmatch(A.data, B.data, d.data, A.width, A.height, { threshold: 0 });
  fs.writeFileSync(`dif-${nome}.png`, PNG.sync.write(d));
  fs.writeFileSync(`novo-${nome}.png`, b);
  console.log(`${nome}: ${A.width}x${A.height}, pixels diferentes: ${n}`);
  return n === 0;
}

(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: true });
  let ok = true;
  for (const [t, tela] of Object.entries(TELAS)) {
    const o = await fotos(browser, PAGINAS.original, tela);
    const n = await fotos(browser, PAGINAS.novo, tela);
    for (const k of Object.keys(o)) ok = compara(o[k], n[k], `${t}-${k}`) && ok;
  }
  await browser.close();
  console.log(ok ? 'IDENTICO' : 'HA DIFERENCAS');
  process.exit(ok ? 0 : 1);
})();
