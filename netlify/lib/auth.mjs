/* Login do /admin. A senha fica só na variável de ambiente ADMIN_SENHA da Netlify.
   Depois de entrar, o navegador guarda um "crachá" assinado (cookie HttpOnly)
   que vale 7 dias. Trocar a ADMIN_SENHA invalida todos os crachás. */
import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import { lojaStore } from './loja.mjs';

const COOKIE = 'lon_admin';
const VALIDADE_S = 7 * 24 * 3600;
const MAX_ERROS = 8, JANELA_MS = 15 * 60 * 1000;

export const senhaConfigurada = () => {
  const s = process.env.ADMIN_SENHA || '';
  return s.length >= 10 ? s : null;
};

const chave = s => createHash('sha256').update('lon-admin|' + s).digest();
const assina = (s, exp) => createHmac('sha256', chave(s)).update(String(exp)).digest('hex');
const iguais = (a, b) => { const x = Buffer.from(a), y = Buffer.from(b); return x.length === y.length && timingSafeEqual(x, y); };

export function cookieDeLogin() {
  const exp = Math.floor(Date.now() / 1000) + VALIDADE_S;
  return `${COOKIE}=${exp}.${assina(senhaConfigurada(), exp)}; Path=/api/admin; HttpOnly; Secure; SameSite=Strict; Max-Age=${VALIDADE_S}`;
}
export const cookieDeSaida = () => `${COOKIE}=; Path=/api/admin; HttpOnly; Secure; SameSite=Strict; Max-Age=0`;

export function logado(req) {
  const s = senhaConfigurada();
  if (!s) return false;
  const m = (req.headers.get('cookie') || '').match(new RegExp(COOKIE + '=(\\d+)\\.([0-9a-f]{64})'));
  if (!m || +m[1] < Date.now() / 1000) return false;
  return iguais(m[2], assina(s, m[1]));
}

export function senhaCerta(tentativa) {
  const s = senhaConfigurada();
  if (!s || typeof tentativa !== 'string') return false;
  return iguais(createHash('sha256').update(tentativa).digest('hex'), createHash('sha256').update(s).digest('hex'));
}

/* Trava de tentativas: 8 erros em 15 minutos a partir do mesmo lugar (IP) bloqueiam o login. */
const chaveIp = ip => 'login/' + createHash('sha256').update(ip || 'sem-ip').digest('hex').slice(0, 16);

export async function bloqueado(ip) {
  const r = await lojaStore().get(chaveIp(ip), { type: 'json' });
  return !!r && r.n >= MAX_ERROS && Date.now() - r.desde < JANELA_MS;
}
export async function registraErro(ip) {
  const store = lojaStore(), k = chaveIp(ip);
  const r = await store.get(k, { type: 'json' });
  const novo = !r || Date.now() - r.desde >= JANELA_MS ? { n: 1, desde: Date.now() } : { n: r.n + 1, desde: r.desde };
  await store.setJSON(k, novo);
}
export const limpaErros = ip => lojaStore().delete(chaveIp(ip));
