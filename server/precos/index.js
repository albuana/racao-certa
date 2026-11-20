// Servidor de preços da Ração Certa (Cloudflare Worker).
//
// GET  /precos?nome=Purina%20Junior&marca=Purina%20one&kg=2.8&tipo=dry&ean=761...
//   → { atualizado, ofertas: [...online], lojas: [...vistos nas lojas], supermercados: [...] }
//     ofertas: Google Shopping em Portugal (SerpApi), só a mesma ração, a mais barata (€/kg) por loja.
//     lojas:   preços vistos nas lojas físicas e partilhados pelos utilizadores (últimos 90 dias).
//
// POST /precos/loja  { ean, nome, marca, store, price, kg }
//   → guarda um preço visto numa loja (ex.: Lidl, Aldi, Mercadona).
//
// Segredos (wrangler secret put …):
//   SERPAPI_KEY  chave da SerpApi (obrigatória)
//   APP_TOKEN    código partilhado com a app (recomendado)
// Armazenamento (wrangler.toml): KV "PRECOS" para os preços vistos nas lojas.

import { SUPERMARKETS, cleanReport, matches, productKey, toOffers } from './parse.js';
import { classify, searchStores } from './stores.js';
import { inferConditions, inferStagesFor } from '../../src/lib/lookup.js';

const DAY = 24 * 60 * 60;
const CORS = {
  'access-control-allow-origin': '*',
  'access-control-allow-headers': 'content-type, x-app-token',
  'access-control-allow-methods': 'GET, POST, OPTIONS',
};


// Página que abre depois de carregar no link do email de confirmação de conta.
const CONFIRMADO_HTML = `<!doctype html>
<html lang="pt"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Conta confirmada · Ração Certa</title>
<style>
body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#FFF6F4;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Helvetica,Arial,sans-serif;color:#2E2A2A}
main{max-width:360px;padding:32px 24px;text-align:center}
.icon{width:96px;height:96px;border-radius:22px;background:#FF6B5E;display:flex;align-items:center;justify-content:center;margin:0 auto 24px}
h1{font-size:26px;color:#14345A;margin:0 0 12px}
p{font-size:17px;line-height:1.5;color:#6B5F5D;margin:0 0 10px}
</style></head>
<body><main>
<div class="icon"><svg width="62" height="62" viewBox="0 0 120 120" aria-hidden="true">
<path d="M12 60 H108 A48 44 0 0 1 12 60 Z" fill="#fff"/><rect x="6" y="53" width="108" height="13" rx="6.5" fill="#fff"/>
<circle cx="42" cy="80" r="5.5" fill="#FF6B5E"/><circle cx="60" cy="88" r="5.5" fill="#FF6B5E"/><circle cx="78" cy="80" r="5.5" fill="#FF6B5E"/>
<polyline points="34,30 54,48 94,8" fill="none" stroke="#14345A" stroke-width="13" stroke-linecap="round" stroke-linejoin="round"/></svg></div>
<h1 id="t">Conta confirmada</h1>
<p id="m">Já podes fechar esta página. Volta à app Ração Certa e carrega em <strong>Já confirmei, entrar</strong>.</p>
</main>
<script>
var q=new URLSearchParams(location.search+'&'+location.hash.slice(1));
if(q.get('error')){document.getElementById('t').textContent='O link já não é válido';
document.getElementById('m').textContent='Pode ter expirado ou já ter sido usado. Na app, entra com o teu email: se a conta ainda não estiver confirmada, enviamos-te outro email.';}
</script>
</body></html>`;

function json(body, status = 200, extra = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', ...CORS, ...extra },
  });
}

// Preços online (SerpApi), guardados 24 h por ração.
async function onlineOffers({ nome, marca, kg, tipo, todas }, env, ctx) {
  const cacheKey = new Request(
    `https://cache.racaocerta/online?n=${encodeURIComponent(nome.toLowerCase())}&m=${encodeURIComponent(marca.toLowerCase())}&kg=${kg || ''}&t=${tipo || ''}&a=${todas ? 1 : 0}&v=3`
  );
  const cache = caches.default;
  const cached = await cache.match(cacheKey);
  if (cached) return cached.json();

  const q = marca && !nome.toLowerCase().includes(marca.toLowerCase()) ? `${marca} ${nome}` : nome;
  const api = new URL('https://serpapi.com/search.json');
  api.search = new URLSearchParams({ engine: 'google_shopping', q, gl: 'pt', hl: 'pt', google_domain: 'google.pt', api_key: env.SERPAPI_KEY }).toString();

  const res = await fetch(api.toString());
  const data = await res.json();
  if (data.error) throw new Error(data.error);
  const results = [...(data.shopping_results || []), ...(data.inline_shopping_results || [])];
  const body = {
    atualizado: new Date().toISOString(),
    ofertas: toOffers(results, { name: nome, brand: marca, defaultKg: kg, type: tipo, allStores: todas }).map((o) => ({ ...o, origem: 'online' })),
  };
  ctx.waitUntil(cache.put(cacheKey, new Response(JSON.stringify(body), { headers: { 'cache-control': `public, max-age=${DAY}` } })));
  return body;
}

// Pesquisa nos sites dos supermercados (guardado 12 h por pesquisa).
async function storeItems(query, ctx) {
  const key = new Request(`https://cache.racaocerta/lojas?q=${encodeURIComponent(query.toLowerCase())}&v=2`);
  const cached = await caches.default.match(key);
  if (cached) return cached.json();
  const items = (await searchStores(query)).map(classify);
  ctx.waitUntil(caches.default.put(key, new Response(JSON.stringify(items), { headers: { 'cache-control': 'public, max-age=43200' } })));
  return items;
}

// A mesma ração em cada supermercado: a mais barata por kg de cada loja.
function sameProductOffers(items, { nome, marca, tipo, especie }) {
  const best = new Map();
  for (const it of items) {
    if (especie && it.species && it.species !== especie) continue;
    if (tipo && it.type && it.type !== tipo) continue;
    if (!matches(`${it.brand} ${it.name}`, nome, marca)) continue;
    const prev = best.get(it.store);
    if (!prev || it.perKg < prev.perKg) best.set(it.store, it);
  }
  return [...best.values()].map((it) => ({ store: it.store, title: it.name, price: it.price, kg: it.kg, perKg: it.perKg, link: it.url, image: it.image, origem: 'site' }));
}

// Preços vistos nas lojas (KV): uma entrada por produto e loja, com o preço nos metadados.
async function storeReports(key, env) {
  if (!env.PRECOS || !key) return [];
  const list = await env.PRECOS.list({ prefix: `r:${key}:` });
  return list.keys
    .map((k) => k.metadata)
    .filter(Boolean)
    .map((m) => ({ store: m.store, price: m.price, kg: m.kg, perKg: m.price / m.kg, visto: m.at, origem: 'loja', link: null }));
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (request.method === 'OPTIONS') return new Response(null, { headers: CORS });
    // Regresso do Google e dos links de recuperação: reencaminha para a app (exp:// no Expo Go, racaocerta:// na loja).
    if (url.pathname === '/auth/voltar') {
      const to = url.searchParams.get('to') || 'racaocerta://auth-callback';
      if (!/^(exp|racaocerta):\/\//.test(to)) return json({ erro: 'Destino inválido' }, 400);
      const params = new URLSearchParams(url.search);
      params.delete('to');
      const target = params.toString() ? `${to}${to.includes('?') ? '&' : '?'}${params}` : to;
      const safe = target.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
      return new Response(
        `<!doctype html><html lang="pt"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta http-equiv="refresh" content="0;url=${safe}"><title>Ração Certa</title></head><body style="font-family:-apple-system,Helvetica,Arial,sans-serif;text-align:center;padding:48px 24px;background:#FFF6F4;color:#2E2A2A"><p>A voltar à app Ração Certa…</p><p><a href="${safe}" style="color:#14345A;font-weight:600">Abrir a app</a></p></body></html>`,
        { status: 302, headers: { location: target, 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' } }
      );
    }
    if (url.pathname === '/confirmado') {
      return new Response(CONFIRMADO_HTML, { headers: { 'content-type': 'text/html; charset=utf-8' } });
    }
    if (!url.pathname.startsWith('/precos')) return json({ erro: 'Não encontrado' }, 404);
    if (env.APP_TOKEN && request.headers.get('x-app-token') !== env.APP_TOKEN) {
      return json({ erro: 'Não autorizado' }, 401);
    }

    // Guardar um preço visto numa loja.
    if (url.pathname === '/precos/loja' && request.method === 'POST') {
      if (!env.PRECOS) return json({ erro: 'Armazenamento não configurado' }, 501);
      let body;
      try {
        body = await request.json();
      } catch {
        return json({ erro: 'Pedido inválido' }, 400);
      }
      const key = productKey({ ean: body.ean, name: body.nome, brand: body.marca });
      const report = cleanReport(body);
      if (!key || !report) return json({ erro: 'Dados inválidos' }, 400);
      const meta = { ...report, at: new Date().toISOString() };
      await env.PRECOS.put(`r:${key}:${report.store}`, '1', { metadata: meta, expirationTtl: 90 * DAY });
      return json({ ok: true, loja: { ...meta, perKg: meta.price / meta.kg, visto: meta.at, origem: 'loja' } });
    }

    // Sugestões: rações do mesmo tipo (espécie, seca/húmida, fase ou problema de saúde) nos supermercados.
    if (url.pathname === '/precos/sugestoes' && request.method === 'GET') {
      const especie = url.searchParams.get('especie') === 'dog' ? 'dog' : 'cat';
      const tipo = url.searchParams.get('tipo') === 'wet' ? 'wet' : 'dry';
      const fase = url.searchParams.get('fase') || '';
      const conds = (url.searchParams.get('cond') || '').split(',').filter(Boolean);
      const animal = especie === 'dog' ? 'cão' : 'gato';
      const condWords = { renal: 'renal', urinary: 'urinary', digestive: 'gastrointestinal', weight: 'light', diabetes: 'diabetes', skin: 'hipoalergénica', liver: 'hepatic', joints: 'mobility', heart: 'cardiac' };
      const faseWords = { junior: 'júnior', adult: 'adulto', mature: 'sénior', senior: 'sénior' };
      const base = tipo === 'wet' ? `comida húmida ${animal}` : `ração ${animal}`;
      const extra = conds.length ? conds.map((c) => condWords[c] || c).join(' ') : faseWords[fase] || '';
      const items = await storeItems(`${base} ${extra}`.trim(), ctx).catch(() => []);
      const seen = new Set();
      const sugestoes = items
        .filter((it) => (!it.species || it.species === especie) && (!it.type || it.type === tipo))
        .filter((it) => {
          const text = `${it.brand} ${it.name} ${it.category}`;
          if (conds.length) return conds.every((c) => inferConditions(text).includes(c));
          return !fase || inferStagesFor(text).includes(fase);
        })
        .filter((it) => {
          const k = `${it.store}|${it.name}|${it.kg}`.toLowerCase();
          return !seen.has(k) && seen.add(k);
        })
        .slice(0, 30)
        .map((it) => ({ store: it.store, name: it.name, brand: it.brand, price: it.price, kg: it.kg, perKg: it.perKg, link: it.url, image: it.image, type: it.type }));
      return json({ sugestoes });
    }

    if (url.pathname !== '/precos' || request.method !== 'GET') return json({ erro: 'Não encontrado' }, 404);

    const nome = (url.searchParams.get('nome') || '').trim().slice(0, 120);
    const marca = (url.searchParams.get('marca') || '').trim().slice(0, 60);
    const ean = (url.searchParams.get('ean') || '').trim().slice(0, 20);
    const kg = Number(url.searchParams.get('kg')) || null;
    const tipo = ['dry', 'wet'].includes(url.searchParams.get('tipo')) ? url.searchParams.get('tipo') : null;
    const todas = url.searchParams.get('todas') === '1';
    const especie = ['cat', 'dog'].includes(url.searchParams.get('especie')) ? url.searchParams.get('especie') : null;
    if (nome.length < 3) return json({ erro: 'Falta o nome da ração' }, 400);

    const query = marca && !nome.toLowerCase().includes(marca.toLowerCase()) ? `${marca} ${nome}` : nome;
    const [online, lojas, sites] = await Promise.all([
      env.SERPAPI_KEY ? onlineOffers({ nome, marca, kg, tipo, todas }, env, ctx).catch((e) => ({ erro: e.message, ofertas: [] })) : { ofertas: [] },
      storeReports(productKey({ ean, name: nome, brand: marca }), env).catch(() => []),
      storeItems(query, ctx).catch(() => []),
    ]);

    // Os preços lidos nos sites dos supermercados têm prioridade sobre o Google Shopping.
    const fromSites = sameProductOffers(sites, { nome, marca, tipo, especie });
    const siteStores = new Set(fromSites.map((o) => o.store));
    const ofertas = [...fromSites, ...online.ofertas.filter((o) => !siteStores.has(o.store))];

    return json({
      atualizado: online.atualizado || new Date().toISOString(),
      ofertas,
      lojas,
      supermercados: SUPERMARKETS,
      ...(online.erro ? { avisoOnline: online.erro } : {}),
    });
  },
};
