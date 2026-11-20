// Pesquisa de rações em todas as lojas (servidor de preços) e preço por saco / por lata.
// As funções puras (packInfo, groupResults, …) não dependem do React Native e têm testes.

const API_URL = (typeof process !== 'undefined' && process.env?.EXPO_PUBLIC_PRICES_API_URL ? process.env.EXPO_PUBLIC_PRICES_API_URL : '').replace(/\/$/, '');
const TOKEN = (typeof process !== 'undefined' && process.env?.EXPO_PUBLIC_PRICES_TOKEN) || '';

export const searchEnabled = !!API_URL;

const STOP = new Set([
  'de', 'da', 'do', 'das', 'dos', 'com', 'para', 'e', 'em', 'a', 'o', 'racao', 'comida', 'alimento', 'gato', 'gatos', 'cao', 'caes',
  'seca', 'humida', 'pack', 'embalagem', 'kg', 'g', 'gr', 'un', 'x', 'saco', 'saqueta', 'saquetas', 'lata', 'latas', 'cat', 'dog',
]);

function words(text = '') {
  return String(text)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/(\d)[.,](\d)/g, '$1_$2')
    .replace(/[^a-z0-9_ ]+/g, ' ')
    .split(/\s+/)
    .filter((w) => w && !STOP.has(w) && !/^\d+(_\d+)?(kg|g|gr|x)?$/.test(w));
}

// Embalagens de comida húmida: "12 x 85 g" → { count: 12, unitG: 85 }; "lata 400 g" → { count: 1, unitG: 400 }.
export function packInfo(name = '', kg = null) {
  const t = String(name).toLowerCase().replace(/,/g, '.');
  const multi = /(\d+)\s*[x×]\s*(\d+(?:\.\d+)?)\s*(g|gr|kg)\b/.exec(t);
  if (multi) {
    const unit = Number(multi[2]) * (multi[3] === 'kg' ? 1000 : 1);
    return { count: Number(multi[1]), unitG: unit };
  }
  const packOf = /(?:pack|caixa|multipack)\s*(?:de\s*)?(\d+)\b/.exec(t) || /(\d+)\s*(?:saquetas|latas|unidades|un)\b/.exec(t);
  const single = /(\d+(?:\.\d+)?)\s*(g|gr)\b/.exec(t);
  if (packOf && single) return { count: Number(packOf[1]), unitG: Number(single[1]) };
  if (packOf && kg) return { count: Number(packOf[1]), unitG: Math.round((kg * 1000) / Number(packOf[1])) };
  if (single) return { count: 1, unitG: Number(single[1]) };
  return null;
}

// Preço que se mostra: saco na seca, lata/saqueta na húmida.
export function unitPrice(offer, type) {
  if (type === 'wet') {
    const pack = packInfo(offer.name, offer.kg);
    if (pack && pack.count >= 1) return { value: offer.price / pack.count, unit: pack.count > 1 ? 'por unidade' : 'por unidade', pack };
  }
  return { value: offer.price, unit: 'por saco', pack: null };
}

// Chave de agrupamento: as mesmas palavras e o mesmo tamanho = a mesma ração em lojas diferentes.
export function productKey(item) {
  const w = [...new Set(words(`${item.brand || ''} ${item.name}`))].sort().join(' ');
  const size = item.kg ? Math.round(item.kg * 100) / 100 : item.desde ? 'varios' : '?';
  return `${w}|${size}`;
}

// Palavras que, se forem diferentes, querem dizer que é outra ração (fase, sabor, gama).
const CONFLICTS = [
  { junior: ['junior', 'kitten', 'puppy', 'cachorro', 'gatinho', 'baby'], adult: ['adult', 'adulto', 'adultos'], senior: ['senior', 'mature', 'ageing', '7', '11'] },
  { frango: ['frango', 'chicken', 'pollo'], salmao: ['salmao', 'salmon'], atum: ['atum', 'tuna'], peru: ['peru', 'turkey'], vaca: ['vaca', 'beef', 'vitela'], borrego: ['borrego', 'lamb', 'cordeiro'], pato: ['pato', 'duck'], coelho: ['coelho', 'rabbit'], peixe: ['peixe', 'fish', 'oceano'] },
  { steril: ['sterilised', 'sterilized', 'esterilizado', 'esterilizados', 'castrado', 'neutered', 'steril'] },
  { light: ['light', 'weight', 'satiety', 'obesity'] },
];

function tagsOf(set) {
  return CONFLICTS.map((group) => {
    const found = Object.entries(group).filter(([, list]) => list.some((w) => set.has(w))).map(([k]) => k);
    return found;
  });
}

// A mesma ração em lojas diferentes? Mesmo tamanho (ou "vários tamanhos"), quase as mesmas palavras e nada em conflito.
export function sameProduct(a, b) {
  if (a.type && b.type && a.type !== b.type) return false;
  if (a.kg && b.kg && Math.abs(a.kg - b.kg) / Math.max(a.kg, b.kg) > 0.04) return false;
  const wa = new Set(words(`${a.brand || ''} ${a.name}`));
  const wb = new Set(words(`${b.brand || ''} ${b.name}`));
  if (!wa.size || !wb.size) return false;
  const ta = tagsOf(wa);
  const tb = tagsOf(wb);
  for (let i = 0; i < ta.length; i++) {
    if (i === 2 || i === 3) {
      if (ta[i].length !== tb[i].length) return false; // esterilizado / light: ou os dois ou nenhum
    } else if (ta[i].length && tb[i].length && !ta[i].some((t) => tb[i].includes(t))) return false;
  }
  const ignore = new Set(Object.values(Object.assign({}, ...CONFLICTS)).flat());
  const ca = [...wa].filter((w) => !ignore.has(w));
  const cb = [...wb].filter((w) => !ignore.has(w));
  const small = ca.length <= cb.length ? ca : cb;
  const big = new Set(ca.length <= cb.length ? cb : ca);
  if (small.length < 2) return false;
  const common = small.filter((w) => big.has(w)).length;
  return common / small.length >= 0.75;
}

// "+€5.99 shipping" → "+5,99 € portes"; "Free delivery" → "Portes grátis".
export function portesText(raw) {
  if (!raw) return null;
  const t = String(raw).toLowerCase();
  if (/free|gr[aá]tis|gratuit/.test(t)) return 'Portes grátis';
  const m = /(\d+(?:[.,]\d+)?)/.exec(t);
  return m ? `+${m[1].replace('.', ',')} € portes` : null;
}

function typeOf(it) {
  return it.type || (/(h[úu]mid|saqueta|lata|pat[êe]|mousse|molho|gelatina|terrina)/i.test(it.name) ? 'wet' : 'dry');
}

// Junta os resultados das lojas por ração. Cada ração fica com as ofertas ordenadas (mais barata primeiro).
export function groupResults(items = []) {
  const groups = [];
  for (const raw of items) {
    if (!(raw.price > 0) || !raw.name) continue;
    const it = { ...raw, type: typeOf(raw) };
    const sized = it.kg && !it.desde;
    // Mesmo tamanho com mesmo tamanho. "Vários tamanhos" (desde) junta-se a uma parecida.
    // Sem tamanho conhecido só se junta a outras sem tamanho (podia ser um saco pequeno).
    let g = groups.find((x) => sameProduct(x.ref, it) && (sized ? x.ref.kg && !x.ref.desde : it.desde ? true : !x.ref.kg));
    if (!g && it.desde) g = groups.find((x) => sameProduct({ ...x.ref, kg: null }, { ...it, kg: null }));
    if (!g) {
      g = { key: productKey(it), ref: it, name: it.name, brand: it.brand || '', image: it.image || null, type: it.type, species: it.species || null, kg: sized ? it.kg : null, offers: [] };
      groups.push(g);
    }
    if (!g.image && it.image) g.image = it.image;
    if (!g.kg && sized) g.kg = it.kg;
    const u = unitPrice(it, it.type);
    const offer = { store: it.store, name: it.name, price: it.price, kg: it.kg || null, perKg: it.perKg || null, desde: !!it.desde, portes: portesText(it.portes), link: it.link || null, unitValue: u.value, unit: u.unit, pack: u.pack };
    const same = g.offers.findIndex((o) => o.store === offer.store);
    if (same === -1) g.offers.push(offer);
    else if (offer.unitValue < g.offers[same].unitValue) g.offers[same] = offer;
  }
  for (const g of groups) {
    // As de tamanho exato primeiro; "desde" (outro tamanho) fica depois, para não enganar.
    g.offers.sort((a, b) => Number(a.desde) - Number(b.desde) || a.unitValue - b.unitValue);
    g.best = g.offers[0];
    g.pack = g.best.pack;
    delete g.ref;
  }
  // Primeiro as que estão em mais lojas (comparáveis), depois a mais barata por kg.
  return groups.sort((a, b) => b.offers.length - a.offers.length || (a.best.perKg || 1e9) - (b.best.perKg || 1e9));
}

// Diferença em % entre o mais barato e o mais caro.
export function savingPct(group) {
  if (!group?.offers || group.offers.length < 2) return 0;
  const lo = group.offers[0].unitValue;
  const hi = group.offers[group.offers.length - 1].unitValue;
  return hi > 0 ? Math.round(((hi - lo) / hi) * 100) : 0;
}

// Últimos grupos vistos, para o ecrã da ração os abrir sem pesquisar outra vez.
const recent = new Map();
export function rememberGroups(groups, { overwrite = true } = {}) {
  for (const g of groups) if (overwrite || !recent.has(g.key)) recent.set(g.key, g);
}
export function getGroup(key) {
  return recent.get(key) || null;
}

// Pesquisa em todas as lojas. species: 'cat' | 'dog' | null; type: 'dry' | 'wet' | null.
// remember: 'overwrite' (pesquisa normal) ou 'keep' (alternativas: não mexe nas rações já abertas).
export async function searchStores(query, { species = null, type = null, remember = 'overwrite' } = {}) {
  if (!API_URL) throw new Error('Servidor de preços não configurado');
  const params = new URLSearchParams({ q: query });
  if (species) params.set('especie', species);
  if (type) params.set('tipo', type);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 25000);
  try {
    const res = await fetch(`${API_URL}/precos/sugestoes?${params}`, {
      headers: TOKEN ? { 'x-app-token': TOKEN } : {},
      signal: controller.signal,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.erro || `Erro ${res.status}`);
    const groups = groupResults(data.sugestoes || []);
    rememberGroups(groups, { overwrite: remember !== 'keep' });
    return groups;
  } finally {
    clearTimeout(timer);
  }
}

// Encontra, nos resultados de uma pesquisa, a mesma ração que uma favorita (pela chave, ou pelas palavras).
export function findSame(groups, fav) {
  const exact = groups.find((g) => g.key === fav.key);
  if (exact) return exact;
  const want = new Set(fav.key.split('|')[0].split(' '));
  let best = null;
  let bestScore = 0;
  for (const g of groups) {
    const have = g.key.split('|')[0].split(' ');
    const common = have.filter((w) => want.has(w)).length;
    const score = common / Math.max(want.size, have.length);
    const sameSize = g.key.split('|')[1] === fav.key.split('|')[1];
    if (sameSize && score > bestScore) {
      best = g;
      bestScore = score;
    }
  }
  return bestScore >= 0.6 ? best : null;
}

// Junta um preço ao histórico (um por dia; fica o mais baixo do dia). Guarda os últimos 120 dias.
export function addHistory(history = [], price, store, day = new Date().toISOString().slice(0, 10)) {
  const list = history.filter((h) => h.d !== day);
  const today = history.find((h) => h.d === day);
  const entry = today && today.price <= price ? today : { d: day, price, store };
  return [...list, entry].sort((a, b) => a.d.localeCompare(b.d)).slice(-120);
}

// "Preço errado?": avisa o servidor; a oferta deixa de aparecer para toda a gente.
export async function reportWrongPrice(offer) {
  if (!API_URL) return;
  await fetch(`${API_URL}/precos/erro`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...(TOKEN ? { 'x-app-token': TOKEN } : {}) },
    body: JSON.stringify({ store: offer.store, name: offer.name, price: offer.price, link: offer.link || '' }),
  });
}
