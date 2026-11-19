// Preços reais das lojas, vindos do servidor de preços (server/precos).
// Configura em .env.local: EXPO_PUBLIC_PRICES_API_URL e EXPO_PUBLIC_PRICES_TOKEN.

const API_URL = (process.env.EXPO_PUBLIC_PRICES_API_URL || '').replace(/\/$/, '');
const TOKEN = process.env.EXPO_PUBLIC_PRICES_TOKEN || '';

export const livePricesEnabled = !!API_URL;

// Supermercados que aparecem sempre no comparador.
export const SUPERMARKETS = ['Continente', 'Pingo Doce', 'Lidl', 'Aldi', 'Mercadona', 'Auchan', 'Intermarché', 'Minipreço'];

// Junta ofertas: por loja fica a mais barata por kg.
export function mergeOffers(...lists) {
  const best = new Map();
  for (const o of lists.flat()) {
    if (!o || !(o.price > 0) || !(o.kg > 0)) continue;
    const prev = best.get(o.store);
    if (!prev || o.price / o.kg < prev.price / prev.kg) best.set(o.store, o);
  }
  return [...best.values()];
}

// Preços com mais de 12 h são pedidos outra vez.
export function pricesAreStale(product, hours = 12) {
  if (!product?.pricesUpdatedAt) return true;
  return Date.now() - new Date(product.pricesUpdatedAt).getTime() > hours * 3600 * 1000;
}

export function bagKgFromQuantity(quantity = '') {
  const t = String(quantity).toLowerCase().replace(',', '.');
  const kg = /(\d+(?:\.\d+)?)\s*kg/.exec(t);
  if (kg) return Number(kg[1]);
  const g = /(\d+(?:\.\d+)?)\s*g\b/.exec(t);
  return g ? Number(g[1]) / 1000 : null;
}

// Devolve { offers, updatedAt } ou lança erro.
export async function fetchLivePrices(product) {
  if (!API_URL) throw new Error('Servidor de preços não configurado');
  const params = new URLSearchParams({ nome: product.name, marca: product.brand || '' });
  if (product.ean) params.set('ean', product.ean);
  const kg = bagKgFromQuantity(product.quantity);
  if (kg) params.set('kg', String(kg));
  if (product.type) params.set('tipo', product.type);
  if (product.species) params.set('especie', product.species);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);
  try {
    const res = await fetch(`${API_URL}/precos?${params}`, {
      headers: TOKEN ? { 'x-app-token': TOKEN } : {},
      signal: controller.signal,
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.erro || `Erro ${res.status}`);
    const online = (data.ofertas || []).map((o) => ({ store: o.store, kg: o.kg, price: o.price, link: o.link, title: o.title, image: o.image || null, origin: o.origem === 'site' ? 'site' : 'online' }));
    const inStore = (data.lojas || []).map((o) => ({ store: o.store, kg: o.kg, price: o.price, seenAt: o.visto, origin: 'store' }));
    return { updatedAt: data.atualizado || new Date().toISOString(), offers: mergeOffers(online, inStore) };
  } finally {
    clearTimeout(timer);
  }
}

// Partilha um preço visto numa loja física (fica visível para todos os utilizadores).
export async function reportStorePrice(product, { store, price, kg }) {
  const offer = { store, price, kg, seenAt: new Date().toISOString(), origin: 'store' };
  if (!API_URL) return offer; // sem servidor: fica só neste telemóvel
  const res = await fetch(`${API_URL}/precos/loja`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...(TOKEN ? { 'x-app-token': TOKEN } : {}) },
    body: JSON.stringify({ ean: product.ean || '', nome: product.name, marca: product.brand || '', store, price, kg }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.erro || `Erro ${res.status}`);
  return offer;
}

// Rações do mesmo tipo nos supermercados (para sugerir alternativas mais baratas).
export async function fetchSuggestions({ species, type, stage, conditions = [] }) {
  if (!API_URL) return [];
  const params = new URLSearchParams({ especie: species || 'cat', tipo: type || 'dry', fase: stage || '', cond: conditions.join(',') });
  const res = await fetch(`${API_URL}/precos/sugestoes?${params}`, { headers: TOKEN ? { 'x-app-token': TOKEN } : {} });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.erro || `Erro ${res.status}`);
  return data.sugestoes || [];
}
