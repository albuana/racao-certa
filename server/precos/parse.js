// Funções puras do servidor de preços (testadas em parse.test.js).

// Peso do saco a partir do título: "2,8 kg", "1.5kg", "400 g", "12 x 85 g".
export function parseKg(text = '') {
  const t = String(text).toLowerCase().replace(/,/g, '.');
  const multi = /(\d+)\s*[x×]\s*(\d+(?:\.\d+)?)\s*(kg|g)\b/.exec(t);
  if (multi) {
    const total = Number(multi[1]) * Number(multi[2]); 
    return multi[3] === 'kg' ? total : total / 1000;
  }
  const kg = /(\d+(?:\.\d+)?)\s*kg\b/.exec(t);
  if (kg) return Number(kg[1]);
  const g = /(\d+(?:\.\d+)?)\s*g(?:r|rs)?\b/.exec(t);
  if (g) return Number(g[1]) / 1000;
  return null;
}

const STOP = new Set(['de', 'da', 'do', 'com', 'para', 'e', 'a', 'o', 'the', 'and', 'with', 'for', 'racao', 'ração', 'comida', 'food', 'kg', 'g']);

export function tokens(text = '') {
  return String(text)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9 ]+/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 1 && !STOP.has(w) && !/^\d+$/.test(w));
}

// O resultado é a mesma ração? Tem de ter a marca toda (ex.: "Purina One", não
// "Purina Pro Plan") e a maior parte do nome.
export function matches(title, name, brand) {
  const t = new Set(tokens(title));
  const brandTokens = tokens(brand);
  if (brandTokens.length && !brandTokens.every((w) => t.has(w))) return false;
  const nameTokens = tokens(name).filter((w) => !brandTokens.includes(w));
  if (!nameTokens.length) return true;
  const hit = nameTokens.filter((w) => t.has(w)).length;
  return hit / nameTokens.length >= 0.6;
}

// Ração húmida (saquetas, latas, patês) ou seca (grãos/croquetes), pelo título.
export function isWetTitle(title = '') {
  const t = String(title).toLowerCase();
  if (/(húmid|humid|nassfutter|natvoer|\bwet\b|pat[eêé]\b|mousse|saqueta|sachet|\blata|\bcan\b|gelatina|gel[ée]e|jelly|gravy|molho|terrine)/.test(t)) return true;
  return /\d+\s*[x×]\s*\d{2,3}\s*g\b/.test(t); // ex.: 12 x 85 g
}

export function isDryTitle(title = '') {
  const t = String(title).toLowerCase();
  return /(\bseca\b|croquete|kibble|\bdry\b|trockenfutter|pienso|grãos)/.test(t);
}

// Supermercados que aparecem SEMPRE no comparador (com preço online, preço visto
// na loja por utilizadores, ou "ainda sem preço").
export const SUPERMARKETS = ['Continente', 'Pingo Doce', 'Lidl', 'Aldi', 'Mercadona', 'Auchan', 'Intermarché', 'Minipreço'];

// Chave de um produto para guardar os preços vistos nas lojas.
export function productKey({ ean, name, brand }) {
  const code = String(ean || '').replace(/\D/g, '');
  if (code.length >= 8) return `ean-${code}`;
  const t = [...new Set([...tokens(brand), ...tokens(name)])].sort();
  return t.length ? `nome-${t.join('-')}`.slice(0, 200) : null;
}

// Valida um preço visto numa loja. Devolve o registo limpo ou null.
export function cleanReport({ store, price, kg }) {
  const name = storeName(store || '');
  const p = Number(price);
  const k = Number(kg);
  if (!PT_STORES.includes(name)) return null;
  if (!(p >= 0.3 && p <= 400)) return null;
  if (!(k >= 0.05 && k <= 30)) return null;
  return { store: name, price: Math.round(p * 100) / 100, kg: k };
}

// Lojas que vendem em Portugal: grandes superfícies e lojas de animais principais.
// Acrescenta aqui outras lojas portuguesas se quiseres.
export const PT_STORES = [
  'Continente',
  'Auchan',
  'Pingo Doce',
  'Intermarché',
  'Mercadona',
  'El Corte Inglés',
  'Lidl',
  'Minipreço',
  'Aldi',
  'Zooplus',
  'Kiwoko',
  'Tiendanimal',
  'Bitiba',
  'Miscota',
  'Worten',
  'Amazon',
];

// Normaliza o nome da loja ("Continente.pt", "continente online" → "Continente").
export function storeName(source = '') {
  const s = String(source).trim();
  const known = PT_STORES;
  const low = s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const found = known.find((k) => low.includes(k.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')));
  return found || s.replace(/\.(pt|com|es)$/i, '');
}

// Converte os resultados do Google Shopping em ofertas: a mais barata (€/kg) por loja.
// type: 'dry' | 'wet' (do produto escolhido). allStores: incluir lojas fora da lista.
export function toOffers(results, { name, brand, defaultKg, type, allStores = false }) {
  const best = new Map();
  for (const r of results || []) {
    const price = Number(r.extracted_price);
    if (!(price > 0) || !r.title || !r.source) continue;
    if (!matches(r.title, name, brand)) continue;
    if (type === 'dry' && isWetTitle(r.title)) continue;
    if (type === 'wet' && isDryTitle(r.title)) continue;
    if (!allStores && !PT_STORES.includes(storeName(r.source))) continue;
    const kg = parseKg(r.title) ?? (defaultKg > 0 ? defaultKg : null);
    if (!kg) continue;
    const store = storeName(r.source);
    const offer = {
      store,
      title: r.title,
      price: Math.round(price * 100) / 100,
      kg,
      perKg: price / kg,
      link: r.product_link || r.link || null,
    };
    const prev = best.get(store);
    if (!prev || offer.perKg < prev.perKg) best.set(store, offer);
  }
  return [...best.values()].sort((a, b) => a.perKg - b.perKg);
}
