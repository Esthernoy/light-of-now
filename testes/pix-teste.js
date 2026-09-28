// Gera um Pix de teste com a MESMA função e a MESMA chave do site (site/loja.js).
// Uso: node pix-teste.js 1.00
const fs = require('fs'), vm = require('vm');
const { PNG } = require('pngjs');
const ctx = { console };
vm.createContext(ctx);
vm.runInContext(fs.readFileSync('../site/qrcode.js', 'utf8') + '\nthis.qrcode = qrcode;', ctx);
const loja = fs.readFileSync('../site/loja.js', 'utf8');
const pedaco = n => loja.slice(loja.indexOf(n)).match(/^[\s\S]*?\n};?\n/)[0];
vm.runInContext(pedaco('const PIX') + pedaco('function pixPayload') + pedaco('function crc16') + 'this.PIX=PIX;this.pixPayload=pixPayload;this.crc16=crc16;', ctx);

const valor = parseFloat(process.argv[2] || '1');
const codigo = ctx.pixPayload(ctx.PIX.chave, ctx.PIX.nome, ctx.PIX.cidade, valor, 'TESTE' + Date.now().toString(36).toUpperCase().slice(-5));
const ok = ctx.crc16(codigo.slice(0, -4)) === codigo.slice(-4);

const q = ctx.qrcode(0, 'M'); q.addData(codigo, 'Byte'); q.make();
const n = q.getModuleCount(), e = 10, quiet = 4, lado = (n + quiet * 2) * e;
const img = new PNG({ width: lado, height: lado });
for (let y = 0; y < lado; y++) for (let x = 0; x < lado; x++) {
  const r = Math.floor(y / e) - quiet, c = Math.floor(x / e) - quiet;
  const escuro = r >= 0 && c >= 0 && r < n && c < n && q.isDark(r, c);
  const i = (y * lado + x) * 4;
  img.data[i] = escuro ? 0x1b : 255; img.data[i + 1] = escuro ? 0x37 : 255; img.data[i + 2] = escuro ? 0x57 : 255; img.data[i + 3] = 255;
}
fs.writeFileSync('pix-teste.png', PNG.sync.write(img));
console.log('recebedor:', ctx.PIX.nome, '|', ctx.PIX.rotulo, '| valor: R$', valor.toFixed(2), '| CRC válido:', ok);
console.log(codigo);
