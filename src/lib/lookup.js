// Procura um produto real pelo código de barras nas bases abertas
// Open Pet Food Facts (rações) e, se não estiver lá, Open Food Facts.
// Devolve { ean, name, brand, quantity, imageUrl, kcalPerKg } ou null.

const SOURCES = [
  'https://world.openpetfoodfacts.org/api/v2/product/',
  'https://world.openfoodfacts.org/api/v2/product/',
];
const FIELDS = 'code,product_name,product_name_pt,brands,quantity,image_front_small_url,image_front_url,nutriments';
const HEADERS = { 'User-Agent': 'RacaoCerta/1.0 (app de doses de ração)' };

function kcalPerKgFrom(nutriments = {}) {
  const kcal100 = Number(nutriments['energy-kcal_100g']);
  if (kcal100 > 0) return Math.round(kcal100 * 10);
  const kj100 = Number(nutriments.energy_100g || nutriments['energy-kj_100g']);
  if (kj100 > 0) return Math.round((kj100 / 4.184) * 10);
  return null;
}

async function fetchWithTimeout(url, ms = 8000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(url, { headers: HEADERS, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

export async function lookupBarcode(ean) {
  const code = String(ean).replace(/\D/g, '');
  if (!code) return null;
  for (const base of SOURCES) {
    try {
      const res = await fetchWithTimeout(`${base}${code}.json?fields=${FIELDS}`);
      if (!res.ok) continue;
      const data = await res.json();
      if (data.status !== 1 || !data.product) continue;
      const p = data.product;
      const name = (p.product_name_pt || p.product_name || '').trim();
      if (!name) continue;
      return {
        ean: code,
        name,
        brand: (p.brands || '').split(',')[0].trim(),
        quantity: p.quantity || '',
        imageUrl: p.image_front_small_url || p.image_front_url || null,
        kcalPerKg: kcalPerKgFrom(p.nutriments),
      };
    } catch (e) {
      console.warn('Falha a procurar o código', code, e?.message);
    }
  }
  return null;
}

// Pesquisa de preços na web (Google Shopping, Portugal) para um produto.
export function priceSearchUrl(name) {
  return `https://www.google.com/search?tbm=shop&gl=pt&hl=pt-PT&q=${encodeURIComponent(name)}`;
}
