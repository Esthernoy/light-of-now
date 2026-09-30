/* ═══════════════ Light of Now — loja ═══════════════ */

let emailPronto = false;
(function(){
  try {
    if(typeof emailjs !== 'undefined'){ emailjs.init("vkXMZ59NjavDdzP0C"); emailPronto = true; }
  } catch(e){ console.warn('EmailJS indisponível; o pedido fica só no painel.'); }
})();

const io = new IntersectionObserver(entries => {
  entries.forEach(e => { if(e.isIntersecting) e.target.classList.add('visible'); });
}, {threshold:0.1});
document.querySelectorAll('.reveal').forEach(el => io.observe(el));


/* ═══════════════ CONFIGURAÇÕES ═══════════════ */

const WHATS = '5511961353324';

const PRECOS = {'100g':39.50, '150g':48.50, '180g':53.00, '200g':59.50};

/* Preços e estoque de verdade vêm do servidor (/api/estoque) assim que a
   página abre; o estoque se ajusta pelo /admin. Os valores abaixo só valem
   se o servidor não responder. Quando chegar a 0, o tamanho aparece riscado.
   Os números não aparecem no site. */
const ESTOQUE = {
  'Aura Tropical':     {'100g':2, '150g':2, '180g':2, '200g':2},
  'Jardim de Figo':    {'100g':1, '150g':1, '180g':1, '200g':1},
  'Lavandim Baunilha': {'100g':2, '150g':2, '180g':2, '200g':2},
  'Ocean Breeze':      {'100g':2, '150g':2, '180g':2, '200g':2}
};

const PIX = {
  chave:  '66433134000104',          // CNPJ (só números)
  nome:   'ESTHER NOEMY DA COSTA',   // até 25 caracteres
  cidade: 'SAO PAULO',
  rotulo: 'CNPJ 66.433.134/0001-04'
};

/* Taxa de entrega.
   "origem" é um ponto aproximado do bairro de onde saem as entregas —
   não é o endereço, só serve para medir a distância. */
const ENTREGA = {
  origem: {lat:-23.49, lon:-46.58},
  faixas: [                 // km de trajeto → valor cobrado
    {ate: 5,  valor: 12.00},
    {ate: 10, valor: 18.00},
    {ate: 15, valor: 25.00},
    {ate: 25, valor: 35.00}
  ],
  acimaDisso: null,         // null = acima da última faixa, combina pelo WhatsApp
  gratisAcimaDe: 200.00,    // entrega grátis a partir deste valor (dentro da área)
  fatorRua: 1.35            // converte linha reta em trajeto de rua
};

/* ═══════════════ UTILIDADES ═══════════════ */

const fmtReal = v => 'R$ ' + v.toFixed(2).replace('.', ',');
const $ = id => document.getElementById(id);
const limpaCep = c => (c || '').replace(/\D/g, '');
const num = x => { const f = parseFloat(x); return isFinite(f) ? f : null; };
const esc = s => String(s || '').replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

function fmtTel(inp){
  let v = inp.value.replace(/\D/g,'').slice(0,11);
  if(v.length > 10)      v = '(' + v.slice(0,2) + ') ' + v.slice(2,7) + '-' + v.slice(7);
  else if(v.length > 6)  v = '(' + v.slice(0,2) + ') ' + v.slice(2,6) + '-' + v.slice(6);
  else if(v.length > 2)  v = '(' + v.slice(0,2) + ') ' + v.slice(2);
  else if(v.length > 0)  v = '(' + v;
  inp.value = v;
  inp.classList.remove('invalido');
}

async function pegaJson(url, ms){
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms || 6500);
  try {
    const r = await fetch(url, {signal: ctrl.signal});
    if(!r.ok) return null;
    return await r.json();
  } catch(e){ return null; }
  finally { clearTimeout(t); }
}

/* ═══════════════ PIX ═══════════════ */

function pixPayload(chave, nome, cidade, valor, txid){
  const c = (id, v) => id + String(v.length).padStart(2,'0') + v;
  const limpa = s => (s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^A-Za-z0-9 .,\-]/g,'').trim();
  let p = c('00','01') + c('01','11')
        + c('26', c('00','br.gov.bcb.pix') + c('01', chave))
        + c('52','0000') + c('53','986');
  if(valor > 0) p += c('54', valor.toFixed(2));
  p += c('58','BR')
     + c('59', limpa(nome).slice(0,25).toUpperCase())
     + c('60', limpa(cidade).slice(0,15).toUpperCase())
     + c('62', c('05', (txid || '***').replace(/[^A-Za-z0-9]/g,'').slice(0,25) || '***'));
  p += '6304';
  return p + crc16(p);
}
function crc16(s){
  let crc = 0xFFFF;
  for(let i=0;i<s.length;i++){
    crc ^= s.charCodeAt(i) << 8;
    for(let j=0;j<8;j++) crc = (crc & 0x8000) ? ((crc<<1) ^ 0x1021) & 0xFFFF : (crc<<1) & 0xFFFF;
  }
  return crc.toString(16).toUpperCase().padStart(4,'0');
}

function desenhaPix(valor, txid){
  const codigo = pixPayload(PIX.chave, PIX.nome, PIX.cidade, valor, txid);
  $('pix-valor').textContent = fmtReal(valor);
  $('pix-nome').innerHTML = esc(PIX.nome) + '<span class="pix-chave">Chave: ' + esc(PIX.rotulo) + '</span>';
  $('pix-codigo').textContent = codigo;
  try {
    const q = qrcode(0, 'M');
    q.addData(codigo, 'Byte');
    q.make();
    const n = q.getModuleCount(), e = 5, quiet = 4, lado = (n + quiet*2) * e;
    const cv = $('pix-qr');
    cv.width = lado; cv.height = lado;
    const g = cv.getContext('2d');
    g.fillStyle = '#fff'; g.fillRect(0,0,lado,lado);
    g.fillStyle = '#1b3757';
    for(let r=0;r<n;r++) for(let c=0;c<n;c++)
      if(q.isDark(r,c)) g.fillRect((c+quiet)*e,(r+quiet)*e,e,e);
  } catch(err){ console.warn('QR Pix:', err); }
}

$('pix-copiar').addEventListener('click', function(){
  const txt = $('pix-codigo').textContent;
  const feito = () => {
    this.textContent = 'Código copiado'; this.classList.add('ok');
    setTimeout(() => { this.textContent = 'Copiar código Pix'; this.classList.remove('ok'); }, 2200);
  };
  const manual = () => {
    const r = document.createRange(); r.selectNodeContents($('pix-codigo'));
    const s = getSelection(); s.removeAllRanges(); s.addRange(r);
    try { document.execCommand('copy'); feito(); } catch(e){ mostrarToast('Selecione o código e copie manualmente'); }
  };
  if(navigator.clipboard) navigator.clipboard.writeText(txt).then(feito).catch(manual);
  else manual();
});

/* ═══════════════ ESTOQUE E SACOLA ═══════════════ */

/* Estoque compartilhado: busca no servidor ao abrir a página e ao abrir a sacola. */
async function carregaEstoque(){
  const r = await pegaJson('/api/estoque', 5000);
  if(!r || !r.estoque) return false;             // servidor fora do ar: fica o que está no arquivo
  Object.keys(r.estoque).forEach(e => { ESTOQUE[e] = r.estoque[e]; });
  if(r.precos) Object.keys(r.precos).forEach(t => { PRECOS[t] = r.precos[t]; });
  ajustaSacolaAoEstoque();
  aplicaFrete();
  renderSacola();
  return true;
}

/* Se alguém comprou antes, a sacola diminui para o que ainda existe. */
function ajustaSacolaAoEstoque(){
  const acabou = [];
  carrinho = carrinho.filter(i => {
    const tem = estoqueDe(i.essencia, i.tamanho);
    if(i.qtd <= tem) return true;
    acabou.push(i.essencia + ' ' + i.tamanho);
    if(tem > 0){ i.qtd = tem; return true; }
    return false;
  });
  if(acabou.length) avisoEstoque('Enquanto você escolhia, ' + (acabou.length > 1 ? 'as últimas unidades de ' : 'a última unidade de ')
    + acabou.join(', ') + (acabou.length > 1 ? ' foram vendidas' : ' foi vendida') + '. Atualizamos sua sacola com carinho para você seguir com o que ainda temos.');
  return acabou.length;
}

function avisoEstoque(msg){
  const a = $('aviso-estoque');
  if(!a) return;
  a.textContent = msg || '';
  a.hidden = !msg;
}

let carrinho = [];

const estoqueDe  = (e,t) => (ESTOQUE[e] && ESTOQUE[e][t] != null) ? ESTOQUE[e][t] : 0;
const noCarrinho = (e,t) => { const i = carrinho.find(x => x.essencia === e && x.tamanho === t); return i ? i.qtd : 0; };
const disponivel = (e,t) => estoqueDe(e,t) - noCarrinho(e,t);
const subtotal   = () => carrinho.reduce((s,i) => s + PRECOS[i.tamanho] * i.qtd, 0);
const qtdTotal   = () => carrinho.reduce((s,i) => s + i.qtd, 0);

function fotoDe(essencia){
  const card = [...document.querySelectorAll('.card')].find(c => {
    const h = c.querySelector('.c-name'); return h && h.textContent.trim() === essencia;
  });
  const img = card && card.querySelector('.c-photo img');
  return img ? img.src : '';
}

function atualizaBotoes(){
  document.querySelectorAll('.size-btn[data-essencia]').forEach(b => {
    const e = b.dataset.essencia, t = b.dataset.tamanho;
    const esgotado = estoqueDe(e,t) <= 0;
    const noLimite = !esgotado && disponivel(e,t) <= 0;
    b.classList.toggle('esgotado', esgotado);
    b.classList.toggle('no-limite', noLimite);
    b.disabled = esgotado || noLimite;
    b.title = esgotado ? 'Esgotado' : (noLimite ? 'Todas as unidades disponíveis já estão na sua sacola' : '');
  });
}

function addCarrinho(essencia, tamanho){
  if(estoqueDe(essencia, tamanho) <= 0){ mostrarToast(essencia + ' ' + tamanho + ' está esgotada no momento'); return; }
  if(disponivel(essencia, tamanho) <= 0){ mostrarToast('Todas as unidades de ' + essencia + ' ' + tamanho + ' já estão na sua sacola', true); return; }
  const it = carrinho.find(i => i.essencia === essencia && i.tamanho === tamanho);
  if(it) it.qtd++; else carrinho.push({essencia, tamanho, qtd: 1});
  aplicaFrete();
  renderSacola();
  mostrarToast(essencia + ' ' + tamanho + ' foi para a sacola', true);
  const c = $('cart-count');
  c.classList.add('pulse'); setTimeout(() => c.classList.remove('pulse'), 250);
}

function mudarQtd(idx, delta){
  const it = carrinho[idx];
  if(!it) return;
  if(delta > 0 && disponivel(it.essencia, it.tamanho) <= 0){
    mostrarToast('Essa é a última unidade disponível de ' + it.essencia + ' ' + it.tamanho);
    return;
  }
  it.qtd += delta;
  if(it.qtd <= 0) carrinho.splice(idx, 1);
  aplicaFrete();
  renderSacola();
}
function removerItem(idx){ carrinho.splice(idx, 1); aplicaFrete(); renderSacola(); }

/* ═══════════════ FRETE ═══════════════ */

const frete = { cep:'', status:'vazio', taxa:null, km:null, endereco:null, token:0 };
let modo = 'entrega';   // 'entrega' ou 'retirada'
function escolheModo(m){
  modo = m;
  document.querySelectorAll('.sacola .invalido').forEach(el => el.classList.remove('invalido'));
  renderSacola();
}
/* status: vazio | buscando | ok | gratis | fora | sem-local | erro */

async function localizaCep(n){
  let end = null;
  const a = await pegaJson('https://cep.awesomeapi.com.br/json/' + n);
  if(a && a.cep){
    end = {rua:a.address||'', bairro:a.district||'', cidade:a.city||'', uf:a.state||'', lat:num(a.lat), lon:num(a.lng)};
  }
  if(!end || end.lat == null){
    const b = await pegaJson('https://brasilapi.com.br/api/cep/v2/' + n);
    if(b && b.cep){
      const co = (b.location && b.location.coordinates) || {};
      end = end || {rua:'', bairro:'', cidade:'', uf:'', lat:null, lon:null};
      end.rua = end.rua || b.street || ''; end.bairro = end.bairro || b.neighborhood || '';
      end.cidade = end.cidade || b.city || ''; end.uf = end.uf || b.state || '';
      if(num(co.latitude) != null){ end.lat = num(co.latitude); end.lon = num(co.longitude); }
    }
  }
  if(!end){
    const v = await pegaJson('https://viacep.com.br/ws/' + n + '/json/');
    if(v && !v.erro) end = {rua:v.logradouro||'', bairro:v.bairro||'', cidade:v.localidade||'', uf:v.uf||'', lat:null, lon:null};
  }
  if(end && end.lat == null && end.cidade){
    const q = encodeURIComponent([end.rua, end.bairro, end.cidade, end.uf, 'Brasil'].filter(Boolean).join(', '));
    const o = await pegaJson('https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=br&q=' + q, 7000);
    if(o && o[0]){ end.lat = num(o[0].lat); end.lon = num(o[0].lon); }
  }
  return end;
}

function distancia(a, b){
  const R = 6371, rad = x => x * Math.PI / 180;
  const dLat = rad(b.lat - a.lat), dLon = rad(b.lon - a.lon);
  const s = Math.sin(dLat/2)**2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon/2)**2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

function aplicaFrete(){
  if(frete.status === 'buscando') return;
  frete.taxa = null; frete.km = null;
  if(limpaCep(frete.cep).length !== 8){ frete.status = 'vazio'; return; }
  const e = frete.endereco;
  if(!e){ frete.status = 'erro'; return; }
  if(e.lat == null){ frete.status = 'sem-local'; return; }
  const km = distancia(ENTREGA.origem, e) * ENTREGA.fatorRua;
  frete.km = km;
  const f = ENTREGA.faixas.find(x => km <= x.ate);
  if(f) frete.taxa = f.valor;
  else if(ENTREGA.acimaDisso != null) frete.taxa = ENTREGA.acimaDisso;
  if(frete.taxa == null){ frete.status = 'fora'; return; }
  if(ENTREGA.gratisAcimaDe && subtotal() >= ENTREGA.gratisAcimaDe){ frete.taxa = 0; frete.status = 'gratis'; return; }
  frete.status = 'ok';
}

const freteConhecido = () => modo === 'retirada' || frete.status === 'ok' || frete.status === 'gratis';
const taxaAtual = () => modo === 'retirada' ? 0 : (freteConhecido() ? frete.taxa : 0);
const totalPedido = () => subtotal() + taxaAtual();

async function onCep(inp){
  let v = inp.value.replace(/\D/g,'').slice(0,8);
  inp.value = v.length > 5 ? v.slice(0,5) + '-' + v.slice(5) : v;
  inp.classList.remove('invalido');
  if(v.length !== 8){
    frete.cep = ''; frete.endereco = null; frete.status = 'vazio';
    renderSacola(); return;
  }
  if(v === frete.cep && frete.status !== 'erro') return;
  frete.cep = v; frete.endereco = null; frete.status = 'buscando';
  const meu = ++frete.token;
  renderSacola();
  const end = await localizaCep(v);
  if(meu !== frete.token) return;            // a cliente já digitou outro CEP
  frete.endereco = end; frete.status = 'calculado';
  if(end){
    if(!$('rua').value.trim() && end.rua) $('rua').value = end.rua;
    if(!$('bairro').value.trim() && end.bairro) $('bairro').value = end.bairro;
    if(!$('numero').value.trim()) setTimeout(() => $('numero').focus(), 60);
  }
  aplicaFrete();
  renderSacola();
}

function textoEntrega(){
  if(modo === 'retirada') return {valor:'sem custo', nota:'combinamos pelo WhatsApp', classe:'gratis'};
  switch(frete.status){
    case 'buscando':  return {valor:'calculando…', nota:'', classe:'pendente'};
    case 'ok':        return {valor:fmtReal(frete.taxa), nota:'cerca de ' + Math.max(1, Math.round(frete.km)) + ' km', classe:''};
    case 'gratis':    return {valor:'grátis', nota:'compra acima de ' + fmtReal(ENTREGA.gratisAcimaDe), classe:'gratis'};
    case 'fora':      return {valor:'a combinar', nota:'fora da nossa área · combinamos pelo WhatsApp', classe:'pendente'};
    case 'sem-local': return {valor:'a combinar', nota:'combinamos pelo WhatsApp', classe:'pendente'};
    case 'erro':      return {valor:'a combinar', nota:'não localizamos esse CEP · confira os números', classe:'pendente'};
    default:          return {valor:'informe o CEP', nota:'', classe:'pendente'};
  }
}

/* ═══════════════ PAINEL DA SACOLA ═══════════════ */

let etapa = 1;
let pedidoFeito = null;

function abrirSacola(){
  $('sacola').classList.add('aberta');
  $('sacola-fundo').classList.add('aberto');
  $('sacola').setAttribute('aria-hidden', 'false');
  document.body.classList.add('sacola-aberta');
  const t = $('toast'); if(t) t.classList.remove('show');
  renderSacola();
  if(etapa !== 3) carregaEstoque();
  setTimeout(() => $('sc-fechar').focus(), 80);
  return false;
}
function fecharSacola(){
  $('sacola').classList.remove('aberta');
  $('sacola-fundo').classList.remove('aberto');
  $('sacola').setAttribute('aria-hidden', 'true');
  document.body.classList.remove('sacola-aberta');
  avisoEstoque('');
  if(etapa === 3){                 // pedido concluído: começa uma sacola nova
    carrinho = []; pedidoFeito = null; etapa = 1;
    ['obs'].forEach(id => { if($(id)) $(id).value = ''; });
    aplicaFrete(); renderSacola();
  }
}
function fazerPedido(){
  if(carrinho.length){ abrirSacola(); return false; }
  return true;                     // sacola vazia: segue para o catálogo
}
function verEssencias(){
  fecharSacola();
  $('catalogo').scrollIntoView({behavior:'smooth'});
}

function irEtapa(n){
  if(n === 2 && !carrinho.length) return;
  if(n !== 1) avisoEstoque('');
  etapa = n;
  renderSacola();
  $('sc-corpo').scrollTop = 0;
  if(n === 2) setTimeout(() => { const p = ['nome','telefone','email'].concat(modo === 'entrega' ? ['cep','numero'] : []).find(id => !$(id).value.trim()); if(p) $(p).focus(); }, 120);
}

function renderSacola(){
  const qtd = qtdTotal();
  $('cart-count').textContent = qtd;
  atualizaBotoes();

  document.querySelectorAll('.sc-etapa').forEach(s => s.classList.toggle('ativa', +s.dataset.etapa === etapa));
  document.querySelectorAll('.sc-passos [data-p]').forEach(s => {
    const p = +s.dataset.p;
    s.classList.toggle('ativo', p === etapa);
    s.classList.toggle('feito', p < etapa);
  });

  /* etapa 1 — itens */
  const lista = $('cart-itens');
  if(!carrinho.length){
    lista.innerHTML = '<div class="sc-vazia"><p>Sua sacola está vazia.</p>'
      + '<button type="button" class="sc-link" onclick="verEssencias()">Conhecer as essências</button></div>';
  } else {
    lista.innerHTML = carrinho.map((i, idx) => {
      const f = fotoDe(i.essencia);
      return '<div class="sc-item">'
        + (f ? '<img class="ci-foto" src="' + f + '" alt="">' : '<span class="ci-foto"></span>')
        + '<div class="sci-info">'
        +   '<div class="sci-topo"><span class="sci-nome">' + esc(i.essencia) + '</span>'
        +   '<button class="ci-rm" onclick="removerItem(' + idx + ')" aria-label="Remover ' + esc(i.essencia) + '" title="Remover">×</button></div>'
        +   '<span class="sci-tam">' + i.tamanho + ' · ' + fmtReal(PRECOS[i.tamanho]) + ' cada</span>'
        +   '<div class="sci-base"><div class="ci-qty"><button class="qty-btn" onclick="mudarQtd(' + idx + ',-1)" aria-label="Diminuir">−</button>'
        +   '<span class="ci-qtd">' + i.qtd + '</span>'
        +   '<button class="qty-btn" onclick="mudarQtd(' + idx + ',1)" aria-label="Aumentar">+</button></div>'
        +   '<b class="sci-sub">' + fmtReal(PRECOS[i.tamanho] * i.qtd) + '</b></div>'
        + '</div></div>';
    }).join('');
  }

  /* aviso de frete grátis */
  let aviso = '';
  if(carrinho.length && ENTREGA.gratisAcimaDe){
    const falta = ENTREGA.gratisAcimaDe - subtotal();
    aviso = falta > 0
      ? '<div class="cr-frete-aviso">Faltam <b>' + fmtReal(falta) + '</b> para a entrega sair de graça</div>'
      : '<div class="cr-frete-aviso ok">Sua entrega é por nossa conta</div>';
  }
  $('frete-aviso-1').innerHTML = aviso;

  /* etapa 2 — resumo com frete */
  const t = textoEntrega();
  $('cep-status').textContent =
      frete.status === 'buscando' ? 'Buscando seu endereço…'
    : frete.status === 'erro' ? 'CEP não encontrado'
    : (frete.endereco && frete.endereco.cidade) ? frete.endereco.cidade + (frete.endereco.uf ? '/' + frete.endereco.uf : '')
    : '';
  $('cep-status').className = 'cep-status' + (frete.status === 'erro' ? ' erro' : '');

  /* entrega ou retirada */
  document.querySelectorAll('.modo-btn').forEach(b => {
    const on = b.dataset.modo === modo; b.classList.toggle('ativo', on); b.setAttribute('aria-checked', on ? 'true' : 'false');
  });
  $('bloco-endereco').hidden = modo === 'retirada';
  $('bloco-retirada').hidden = modo !== 'retirada';

  /* rodapé */
  const rod = $('sc-rodape');
  if(etapa === 1){
    rod.innerHTML = carrinho.length
      ? '<div class="sc-linha"><span>Produtos</span><b>' + fmtReal(subtotal()) + '</b></div>'
        + '<p class="sc-mini">Na próxima etapa você escolhe entre receber em casa ou retirar.</p>'
        + '<button type="button" class="sc-btn" onclick="irEtapa(2)">Continuar para a entrega</button>'
      : '<button type="button" class="sc-btn" onclick="verEssencias()">Ver essências</button>';
  } else if(etapa === 2){
    rod.innerHTML =
        '<div class="sc-linha"><span>Produtos</span><b>' + fmtReal(subtotal()) + '</b></div>'
      + '<div class="sc-linha ' + t.classe + '"><span>' + (modo === 'retirada' ? 'Retirada' : 'Taxa de entrega') + (t.nota ? '<small>' + esc(t.nota) + '</small>' : '') + '</span><b>' + t.valor + '</b></div>'
      + '<div class="sc-linha total"><span>Total</span><b>' + fmtReal(totalPedido()) + (freteConhecido() ? '' : '<small class="sc-mais">+ entrega</small>') + '</b></div>'
      + '<p class="sc-erro" id="sc-erro"></p>'
      + '<button type="button" class="sc-btn" id="btn-confirmar" onclick="confirmarPedido()"' + (modo === 'entrega' && frete.status === 'buscando' ? ' disabled' : '') + '>'
      + (modo === 'entrega' && frete.status === 'buscando' ? 'Calculando a entrega…' : 'Confirmar e pagar com Pix') + '</button>';
  } else {
    rod.innerHTML = pedidoFeito && pedidoFeito.emailEnviado ? '' :
        '<button type="button" class="sc-btn" onclick="informarPagamento()">Já paguei</button>'
      + '<p class="sc-mini">Depois de pagar, toque aqui para nos avisar.</p>'
      + '<p class="sc-mini">Prefere pagar em cartão? <a href="' + linkWhats('Olá! Fiz o pedido ' + (pedidoFeito ? pedidoFeito.id : '') + ' no site e gostaria de pagar em cartão.') + '" target="_blank" rel="noopener">Combine pelo WhatsApp</a>.</p>';
  }
}

/* ═══════════════ CONFIRMAÇÃO DO PEDIDO ═══════════════ */

function linkWhats(txt){ return 'https://wa.me/' + WHATS + '?text=' + encodeURIComponent(txt); }

function dadosCliente(){
  const v = id => $(id).value.trim();
  return {nome:v('nome'), telefone:v('telefone'), email:v('email'), cep:v('cep'),
          rua:v('rua'), numero:v('numero'), complemento:v('complemento'), bairro:v('bairro'), obs:v('obs')};
}

function erroEm(id, msg){
  const el = $(id); if(el){ el.classList.add('invalido'); el.focus(); }
  const e = $('sc-erro'); if(e) e.textContent = msg;
  return false;
}

function validaDados(d){
  document.querySelectorAll('.sacola .invalido').forEach(el => el.classList.remove('invalido'));
  if(!d.nome) return erroEm('nome', 'Informe seu nome.');
  if(d.telefone.replace(/\D/g,'').length < 10) return erroEm('telefone', 'Informe seu WhatsApp com DDD.');
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email)) return erroEm('email', 'Confira seu e-mail.');
  if(modo === 'retirada') return true;
  if(limpaCep(d.cep).length !== 8) return erroEm('cep', 'Informe o CEP com 8 números.');
  if(!d.rua) return erroEm('rua', 'Informe a rua.');
  if(!d.numero) return erroEm('numero', 'Informe o número.');
  if(!d.bairro) return erroEm('bairro', 'Informe o bairro.');
  return true;
}

async function mandaEmail(p){
  if(!emailPronto) return false;
  const itens = p.itens.map(i => i.qtd + 'x ' + i.essencia + ' ' + i.tamanho + ' — ' + fmtReal(PRECOS[i.tamanho] * i.qtd)).join(' | ');
  const resumo = 'PAGAMENTO INFORMADO PELA CLIENTE — confira o Pix na sua conta | Pedido ' + p.id + ' | Produtos: ' + fmtReal(p.subtotal)
    + (p.modo === 'retirada' ? ' | RETIRADA (sem custo) — combinar dia e horário com a cliente' : ' | Taxa de entrega: ' + (p.freteOk ? (p.taxa === 0 ? 'grátis' : fmtReal(p.taxa) + ' (~' + p.km + ' km)') : 'a combinar'))
    + ' | TOTAL: ' + fmtReal(p.total) + (p.freteOk ? '' : ' + entrega');
  const envio = emailjs.send('service_z2lsics', 'template_djxy7xq', {
    nome: p.d.nome, email: p.d.email, telefone: p.d.telefone,
    fragancia: itens, tamanho: resumo,
    rua: p.modo === 'retirada' ? 'RETIRADA — entrar em contato com a cliente' : p.d.rua + (p.d.complemento ? ' — ' + p.d.complemento : ''),
    bairro: p.modo === 'retirada' ? '—' : p.d.bairro, numero: p.modo === 'retirada' ? '—' : p.d.numero, cep: p.modo === 'retirada' ? '—' : p.d.cep,
    obs: 'Pedido ' + p.id + ' · WhatsApp: ' + p.d.telefone + (p.d.obs ? ' · ' + p.d.obs : '')
  });
  const limite = new Promise(res => setTimeout(() => res('tempo'), 9000));
  try { const r = await Promise.race([envio, limite]); return r !== 'tempo'; }
  catch(e){ console.warn('EmailJS:', e); return false; }
}

async function confirmarPedido(){
  if(!carrinho.length) return;
  const d = dadosCliente();
  if(!validaDados(d)) return;
  if(modo === 'entrega' && frete.status === 'buscando'){ $('sc-erro').textContent = 'Estamos calculando a entrega, um instante.'; return; }

  const btn = $('btn-confirmar');
  btn.disabled = true; btn.textContent = 'Confirmando seu pedido…';

  const p = {
    id: '', d,
    itens: carrinho.map(i => ({...i})),
    subtotal: subtotal(),
    modo,
    freteOk: freteConhecido(),
    taxa: freteConhecido() ? taxaAtual() : null,
    km: modo === 'entrega' && frete.km ? Math.max(1, Math.round(frete.km)) : null,
    cidade: modo === 'entrega' && frete.endereco && frete.endereco.cidade ? frete.endereco.cidade + '/' + frete.endereco.uf : '',
    total: totalPedido()
  };
  p.emailEnviado = false;

  /* o servidor confere o total, reserva as unidades e dá o número do pedido */
  const r = await registraPedido(p);
  if(r && r.falta){
    Object.keys(r.estoque || {}).forEach(e => { ESTOQUE[e] = r.estoque[e]; });
    if(!ajustaSacolaAoEstoque()) avisoEstoque('Algumas velas acabaram de ser vendidas. Atualizamos sua sacola.');
    aplicaFrete();
    irEtapa(1);
    return;
  }
  if(r && r.erro){
    const b = $('btn-confirmar'); if(b){ b.disabled = false; b.textContent = 'Confirmar e pagar com Pix'; }
    $('sc-erro').textContent = r.erro;
    return;
  }
  if(r && r.ok){
    Object.assign(p, {id: r.id, subtotal: r.subtotal, total: r.total, freteOk: r.freteOk, taxa: r.taxa,
                      km: r.km, cidade: r.cidade || p.cidade, salvo: true});
  } else {
    p.id = 'LON-' + Date.now().toString(36).toUpperCase().slice(-5);   // servidor fora do ar: segue como antes
  }

  /* reserva as unidades nesta visita */
  p.itens.forEach(i => { if(ESTOQUE[i.essencia]) ESTOQUE[i.essencia][i.tamanho] = Math.max(0, estoqueDe(i.essencia, i.tamanho) - i.qtd); });

  pedidoFeito = p;
  $('pd-selo-txt').textContent = 'Aguardando pagamento';
  $('pd-selo-txt').classList.remove('ok');
  $('pd-numero').textContent = 'Pedido ' + p.id;
  $('pd-msg').textContent = p.modo === 'retirada'
    ? 'Agora é só pagar pelo Pix e tocar em "Já paguei". Depois combinamos com você o dia e o horário da retirada.'
    : p.freteOk
    ? 'Agora é só pagar pelo Pix e tocar em "Já paguei".'
    : 'Pague os produtos pelo Pix e toque em "Já paguei". Depois combinamos a entrega com você.';
  $('pix-nota').innerHTML = p.modo === 'retirada' ? 'Retirada sem custo de entrega.' : p.freteOk
    ? (p.taxa === 0 ? 'Entrega grátis incluída.' : 'Valor já com a taxa de entrega de ' + fmtReal(p.taxa) + '.')
    : '<b>Este valor é só dos produtos.</b> A taxa de entrega é cobrada à parte.';
  desenhaPix(p.total, p.id);
  irEtapa(3);
}

/* Manda o pedido para o servidor. Devolve {ok,...}, {falta,estoque}, {erro}
   ou null se o servidor não respondeu (aí a compra segue só com o Pix e o e-mail do pedido). */
async function registraPedido(p){
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 20000);
  try {
    const resp = await fetch('/api/pedido', {
      method: 'POST', signal: ctrl.signal, headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({
        itens: p.itens.map(i => ({essencia: i.essencia, tamanho: i.tamanho, qtd: i.qtd})),
        modo: p.modo, cliente: p.d,
        frete: {ok: p.freteOk, taxa: p.taxa, km: p.km, cidade: p.cidade}
      })
    });
    const j = await resp.json().catch(() => ({}));
    if(resp.status === 201) return {ok: true, ...j};
    if(resp.status === 409 && j.erro === 'estoque') return {falta: true, estoque: j.estoque};
    if(resp.status >= 400 && resp.status < 500 && j.erro) return {erro: j.erro};
    return null;
  } catch(e){ return null; }
  finally { clearTimeout(t); }
}

/* A cliente tocou em "Já paguei": avisa a loja (painel + e-mail) e agradece. */
function informarPagamento(){
  if(!pedidoFeito) return;
  const p = pedidoFeito;
  if(!p.emailEnviado){
    p.emailEnviado = true;
    if(p.salvo){
      try { fetch('/api/pedido/avisou', {method: 'POST', keepalive: true, headers: {'Content-Type': 'application/json'},
                                          body: JSON.stringify({id: p.id})}).catch(() => {}); } catch(e){}
    }
    p.pagoEm = new Date().toLocaleString('pt-BR');
    mandaEmail(p).then(ok => { p.emailOk = ok; });
    $('pd-msg').textContent = 'Obrigada pela compra, nossa equipe entrará em contato em alguns instantes.';
    $('pd-selo-txt').textContent = 'Pagamento informado';
    $('pd-selo-txt').classList.add('ok');
    renderSacola();
  }
}

/* ═══════════════ AVISOS E NAVEGAÇÃO ═══════════════ */

let toastTimer;
function mostrarToast(msg, comAtalho){
  let t = $('toast');
  if(!t){ t = document.createElement('div'); t.id = 'toast'; t.className = 'toast'; t.setAttribute('role','status'); document.body.appendChild(t); }
  t.innerHTML = '<span>' + esc(msg) + '</span>' + (comAtalho ? '<button type="button" onclick="abrirSacola()">Ver sacola</button>' : '');
  requestAnimationFrame(() => t.classList.add('show'));
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 2600);
}

const burger = $('nav-burger'), navLinks = $('nav-links');
burger.addEventListener('click', () => navLinks.classList.toggle('open'));
navLinks.querySelectorAll('a').forEach(a => a.addEventListener('click', () => navLinks.classList.remove('open')));
document.addEventListener('click', e => {
  if(navLinks.classList.contains('open') && !navLinks.contains(e.target) && !burger.contains(e.target)) navLinks.classList.remove('open');
});

$('abrir-sacola').addEventListener('click', abrirSacola);
$('sc-fechar').addEventListener('click', fecharSacola);
$('sacola-fundo').addEventListener('click', fecharSacola);
document.addEventListener('keydown', e => { if(e.key === 'Escape' && $('sacola').classList.contains('aberta')) fecharSacola(); });

renderSacola();
carregaEstoque();
