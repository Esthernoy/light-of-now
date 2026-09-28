/* Mesmo cálculo de entrega do site (site/loja.js), feito de novo no servidor
   para que o valor do pedido não dependa do que o navegador mandou. */
import { ENTREGA } from './config.mjs';

const num = x => { const f = parseFloat(x); return isFinite(f) ? f : null; };

async function pegaJson(url, ms) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    const r = await fetch(url, { signal: ctrl.signal, headers: { 'User-Agent': 'LightOfNow/1.0 (lightofnow.com.br)' } });
    if (!r.ok) return null;
    return await r.json();
  } catch { return null; }
  finally { clearTimeout(t); }
}

/* A Netlify dá 10 segundos para cada função responder. Por isso os três
   serviços de CEP são consultados ao mesmo tempo, e o mapa (Nominatim) só se
   nenhum deles trouxer a localização. Pior caso: ~6,5 s. */
export async function localizaCep(n) {
  const [a, b, v] = await Promise.all([
    pegaJson('https://cep.awesomeapi.com.br/json/' + n, 3500),
    pegaJson('https://brasilapi.com.br/api/cep/v2/' + n, 3500),
    pegaJson('https://viacep.com.br/ws/' + n + '/json/', 3500),
  ]);
  let end = null;
  if (a && a.cep) end = { cidade: a.city || '', uf: a.state || '', rua: a.address || '', bairro: a.district || '', lat: num(a.lat), lon: num(a.lng) };
  if (b && b.cep) {
    const co = (b.location && b.location.coordinates) || {};
    end = end || { cidade: '', uf: '', rua: '', bairro: '', lat: null, lon: null };
    end.rua = end.rua || b.street || ''; end.bairro = end.bairro || b.neighborhood || '';
    end.cidade = end.cidade || b.city || ''; end.uf = end.uf || b.state || '';
    if (end.lat == null && num(co.latitude) != null) { end.lat = num(co.latitude); end.lon = num(co.longitude); }
  }
  if (!end && v && !v.erro) end = { cidade: v.localidade || '', uf: v.uf || '', rua: v.logradouro || '', bairro: v.bairro || '', lat: null, lon: null };
  if (end && end.lat == null && end.cidade) {
    const q = encodeURIComponent([end.rua, end.bairro, end.cidade, end.uf, 'Brasil'].filter(Boolean).join(', '));
    const o = await pegaJson('https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=br&q=' + q, 3000);
    if (o && o[0]) { end.lat = num(o[0].lat); end.lon = num(o[0].lon); }
  }
  return end;
}

function distancia(a, b) {
  const R = 6371, rad = x => x * Math.PI / 180;
  const dLat = rad(b.lat - a.lat), dLon = rad(b.lon - a.lon);
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

/* Devolve {status, taxa, km, cidade}. status: ok | gratis | fora | sem-local | erro */
export async function calculaFrete(cep, subtotal) {
  const n = String(cep || '').replace(/\D/g, '');
  if (n.length !== 8) return { status: 'erro', taxa: null, km: null, cidade: '' };
  const e = await localizaCep(n);
  if (!e) return { status: 'erro', taxa: null, km: null, cidade: '' };
  const cidade = e.cidade ? e.cidade + (e.uf ? '/' + e.uf : '') : '';
  if (e.lat == null) return { status: 'sem-local', taxa: null, km: null, cidade };
  const km = distancia(ENTREGA.origem, e) * ENTREGA.fatorRua;
  const f = ENTREGA.faixas.find(x => km <= x.ate);
  let taxa = f ? f.valor : ENTREGA.acimaDisso;
  if (taxa == null) return { status: 'fora', taxa: null, km, cidade };
  if (ENTREGA.gratisAcimaDe && subtotal >= ENTREGA.gratisAcimaDe) return { status: 'gratis', taxa: 0, km, cidade };
  return { status: 'ok', taxa, km, cidade };
}
