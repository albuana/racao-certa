// Procura rações reais nas bases abertas Open Pet Food Facts (e Open Food Facts)
// por código de barras ou por nome, e obtém a energia (kcal/kg) automaticamente.
//
// Se a base não tiver a energia, estima-a pela composição do rótulo com a
// fórmula de Atwater modificada (NRC), a usada para rações de cães e gatos:
//   EM (kcal/100 g) = 3,5 × proteína + 8,5 × gordura + 3,5 × ENN
//   ENN = 100 − proteína − gordura − fibra − cinza − humidade

import { HEALTH_CONDITIONS } from './nutrition.js';

const PET = 'https://world.openpetfoodfacts.org';
const FOOD = 'https://world.openfoodfacts.org';
const FIELDS = [
  'code',
  'product_name',
  'product_name_pt',
  'brands',
  'quantity',
  'categories',
  'image_front_small_url',
  'image_front_url',
  'nutriments',
].join(',');
const HEADERS = { 'User-Agent': 'RacaoCerta/1.0 (app de doses de ração)' };

const num = (v) => {
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? n : null;
};

export function looksWet(text = '', quantityText = '') {
  const t = `${text} ${quantityText}`.toLowerCase();
  if (/(dry|seca|seco|croquet|kibble|grão|graos|grãos|pienso|trocken)/.test(t)) return false;
  if (/(húmid|humid|wet|pat[êé]|mousse|saqueta|sachet|lata|\bcan\b|gelatina|gel[ée]e|jelly|molho|gravy|terrine)/.test(t)) return true;
  const g = /(\d+(?:[.,]\d+)?)\s*g\b/.exec(quantityText || '');
  return !!g && Number(g[1].replace(',', '.')) <= 400 && !/kg/i.test(quantityText);
}

// Estimativa da energia metabolizável a partir da composição (valores em %).
export function estimateKcalPerKg({ protein, fat, fiber, ash, moisture }, wet = false) {
  if (protein == null || fat == null) return null;
  const fib = fiber ?? (wet ? 0.5 : 2.5);
  const ashV = ash ?? (wet ? 2.5 : 7);
  const moist = moisture ?? (wet ? 80 : 9);
  const nfe = Math.max(0, 100 - protein - fat - fib - ashV - moist);
  const per100 = 3.5 * protein + 8.5 * fat + 3.5 * nfe;
  if (per100 <= 0) return null;
  return Math.round(per100 * 10);
}

// Energia do produto: a declarada, ou estimada pela composição.
export function energyFrom(product) {
  const n = product.nutriments || {};
  const kcal100 = num(n['energy-kcal_100g']);
  if (kcal100) return { kcalPerKg: Math.round(kcal100 * 10), estimated: false };
  const kj100 = num(n['energy-kj_100g']) || num(n.energy_100g);
  if (kj100) return { kcalPerKg: Math.round((kj100 / 4.184) * 10), estimated: false };
  const wet = looksWet(`${product.product_name || ''} ${product.categories || ''}`, product.quantity || '');
  const estimate = estimateKcalPerKg(
    {
      protein: num(n.proteins_100g),
      fat: num(n.fat_100g),
      fiber: num(n.fiber_100g),
      ash: num(n.ash_100g) ?? num(n['crude-ash_100g']),
      moisture: num(n.moisture_100g) ?? num(n.water_100g),
    },
    wet
  );
  return estimate ? { kcalPerKg: estimate, estimated: true } : { kcalPerKg: null, estimated: false };
}

// Problemas de saúde a que a ração se destina, pelo nome e categorias.
export function inferConditions(text = '') {
  const t = String(text);
  return HEALTH_CONDITIONS.filter((c) => c.pattern.test(t)).map((c) => c.id);
}

// Fases a que a ração se destina, pelo nome e categorias.
export function inferStages(text = '') {
  const t = text.toLowerCase();
  if (/(junior|júnior|kitten|puppy|chaton|chiot|cachorro|gatinho|baby|growth|crescimento)/.test(t)) return ['junior'];
  if (/(senior|sénior|mature|ageing|aging|\b(7|8|10|11|12)\s?\+)/.test(t)) return ['senior', 'mature'];
  return ['adult', 'mature'];
}

// Espécie pelo nome e categorias: 'cat', 'dog' ou null se não der para saber.
// Dietas veterinárias sem fase indicada servem para todas as idades.
export function inferStagesFor(text = '') {
  const t = text.toLowerCase();
  const explicit = /(junior|júnior|kitten|puppy|senior|sénior|mature|adult|adulto)/.test(t);
  if (!explicit && inferConditions(text).length) return ['junior', 'adult', 'mature', 'senior'];
  return inferStages(text);
}

export function inferSpecies(text = '') {
  const t = text.toLowerCase();
  const dog = /(\bdog|\bcão|\bcaes|\bcães|chien|perro|puppy|canin|\bhund)/.test(t);
  const cat = /(\bcat\b|\bcats\b|gato|\bchat\b|chaton|kitten|felin|katze)/.test(t);
  if (dog && !cat) return 'dog';
  if (cat && !dog) return 'cat';
  return null;
}

export function normalize(p) {
  const name = (p.product_name_pt || p.product_name || '').trim();
  if (!name) return null;
  const { kcalPerKg, estimated } = energyFrom(p);
  return {
    ean: p.code ? String(p.code) : null,
    name,
    brand: (p.brands || '').split(',')[0].trim(),
    quantity: p.quantity || '',
    imageUrl: p.image_front_small_url || p.image_front_url || null,
    kcalPerKg,
    kcalEstimated: estimated,
    type: looksWet(`${name} ${p.categories || ''}`, p.quantity || '') ? 'wet' : 'dry',
    conditions: inferConditions(`${name} ${p.categories || ''}`),
    stages: inferStagesFor(`${name} ${p.categories || ''}`),
    species: inferSpecies(`${name} ${p.categories || ''}`),
  };
}

async function getJSON(url, ms = 9000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    const res = await fetch(url, { headers: HEADERS, signal: controller.signal });
    if (!res.ok) return null;
    return await res.json();
  } catch (e) {
    console.warn('Pedido falhou', url, e?.message);
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export async function lookupBarcode(ean) {
  const code = String(ean).replace(/\D/g, '');
  if (!code) return null;
  for (const base of [PET, FOOD]) {
    const data = await getJSON(`${base}/api/v2/product/${code}.json?fields=${FIELDS}`);
    if (data?.status === 1 && data.product) {
      const p = normalize({ ...data.product, code });
      if (p) return p;
    }
  }
  return null;
}

// Pesquisa por nome nas rações da base aberta (prefere as vendidas em Portugal).
export async function searchProducts(query) {
  const q = query.trim();
  if (q.length < 3) return [];
  const url = `${PET}/cgi/search.pl?search_terms=${encodeURIComponent(q)}&search_simple=1&json=1&page_size=50&sort_by=unique_scans_n&fields=${FIELDS}`;
  const data = await getJSON(url);
  const seen = new Set();
  return (data?.products || [])
    .map(normalize)
    .filter((p) => p && p.kcalPerKg && !seen.has(p.ean) && seen.add(p.ean));
}

// Valor típico quando não há energia nem composição em lado nenhum.
// Rações secas: júnior ≈ 4000, adulto ≈ 3700, light/sénior ≈ 3400 kcal/kg.
// Húmidas ≈ 900 kcal/kg.
export function typicalKcalPerKg({ type, stage, name = '' }) {
  if (type === 'wet') return 900;
  const n = name.toLowerCase();
  if (stage === 'junior' || /(junior|júnior|kitten|puppy|cachorro|gatinho)/.test(n)) return 4000;
  if (stage === 'senior' || /(light|senior|sénior|sterili|esteriliz|castrad|weight|peso)/.test(n)) return 3400;
  return 3700;
}

// Garante sempre uma energia para um produto encontrado:
// 1) a da base, 2) a de um produto semelhante (mesma marca e nome), 3) valor típico.
export async function ensureEnergy(product, stage) {
  if (product.kcalPerKg) return product;
  const similar = await searchProducts([product.brand, product.name].filter(Boolean).join(' '));
  const match = similar.find((p) => p.type === product.type) || similar[0];
  if (match?.kcalPerKg) return { ...product, kcalPerKg: match.kcalPerKg, kcalEstimated: true };
  return { ...product, kcalPerKg: typicalKcalPerKg({ ...product, stage }), kcalEstimated: true };
}

// Pesquisa de preços na web (Google Shopping, Portugal) para um produto.
export function priceSearchUrl(name) {
  return `https://www.google.com/search?tbm=shop&gl=pt&hl=pt-PT&q=${encodeURIComponent(name)}`;
}
