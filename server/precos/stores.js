// Leitores dos sites dos supermercados: pesquisam a ração e leem os preços.
// Cada leitor devolve uma lista de { store, name, brand, price, perKg, kg, url, category }.
// Afinados com páginas reais guardadas em ./amostras (ver recolher.sh).

const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36';

const ENTITIES = {
  quot: '"', amp: '&', apos: "'", lt: '<', gt: '>', nbsp: ' ', euro: '€',
  aacute: 'á', agrave: 'à', acirc: 'â', atilde: 'ã', ccedil: 'ç', eacute: 'é', ecirc: 'ê', iacute: 'í',
  oacute: 'ó', ocirc: 'ô', otilde: 'õ', uacute: 'ú', uuml: 'ü',
  Aacute: 'Á', Agrave: 'À', Acirc: 'Â', Atilde: 'Ã', Ccedil: 'Ç', Eacute: 'É', Ecirc: 'Ê', Iacute: 'Í',
  Oacute: 'Ó', Ocirc: 'Ô', Otilde: 'Õ', Uacute: 'Ú',
};

export function decode(s = '') {
  return String(s).replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (m, e) => {
    if (e[0] === '#') {
      const code = e[1].toLowerCase() === 'x' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : m;
    }
    return ENTITIES[e] ?? m;
  });
}

const num = (s) => {
  const n = Number(String(s).replace(/\s|€/g, '').replace(',', '.'));
  return Number.isFinite(n) && n > 0 ? n : null;
};

function parseAttrJson(chunk, attr) {
  const re = new RegExp(`${attr}=(['"])(.*?)\\1`, 's');
  const m = re.exec(chunk);
  if (!m) return null;
  try {
    return JSON.parse(decode(m[2]));
  } catch {
    return null;
  }
}

function perKgFrom(text) {
  const m = /(\d+(?:[.,]\d+)?)\s*(?:€|&euro;)\s*\/\s*kg/i.exec(text);
  return m ? num(m[1]) : null;
}

// Imagem do produto: data-src (imagens com carregamento diferido) ou src; tamanho ~300 px.
function imageFrom(chunk) {
  const m = /<img[^>]*?\sdata-src="(https:[^"]+)"/.exec(chunk) || /<img[^>]*?\ssrc="(https:[^"]+)"/.exec(chunk);
  if (!m) return null;
  return decode(m[1]).replace(/([?&])sw=\d+/, '$1sw=300').replace(/([?&])sh=\d+/, '$1sh=300');
}

function finish(item) {
  if (!item.price || !item.name) return null;
  if (!item.kg && item.perKg) item.kg = Math.round((item.price / item.perKg) * 100) / 100;
  if (!item.perKg && item.kg) item.perKg = item.price / item.kg;
  return item.perKg ? item : null;
}

// ---------- Continente (Salesforce Commerce Cloud) ----------
export function parseContinente(html) {
  const out = [];
  for (const chunk of html.split('class="productTile"').slice(1)) {
    const j = parseAttrJson(chunk, 'data-product-tile-impression');
    if (!j) continue;
    const url = (/data-pdp-url="([^"]+)"/.exec(chunk) || /href="(https:\/\/www\.continente\.pt\/produto\/[^"]+)"/.exec(chunk) || [])[1];
    const sec = /pwc-tile--price-secondary[^>]*>([^<]+)</.exec(chunk);
    const item = finish({
      store: 'Continente',
      name: decode(j.name),
      brand: decode(j.brand || ''),
      category: decode(j.category || ''),
      price: num(j.price),
      perKg: sec ? perKgFrom(decode(sec[1])) : null,
      url: url ? decode(url) : null,
      image: imageFrom(chunk),
      from: /price-starting-label/.test(chunk), // "Desde": há vários tamanhos
    });
    if (item) out.push(item);
  }
  return out;
}

// Página de produto do Continente: preço e €/kg do tamanho mostrado, e código EAN.
export function parseContinenteProduct(html) {
  const ld = /<script type="application\/ld\+json">([\s\S]*?)<\/script>/.exec(html);
  let data = null;
  try {
    data = ld ? JSON.parse(ld[1]) : null;
  } catch {
    data = null;
  }
  const sec = /pwc-tile--price-secondary[^>]*>([^<]+)</.exec(html);
  const price = num(data?.offers?.price);
  const perKg = sec ? perKgFrom(decode(sec[1])) : null;
  if (!price) return null;
  return finish({ price, perKg, ean: data?.gtin13 || null, name: data?.name || '' });
}

// ---------- Auchan (Salesforce Commerce Cloud) ----------
export function parseAuchan(html) {
  const out = [];
  for (const chunk of html.split('class="product-tile auc-product-tile').slice(1)) {
    const j = parseAttrJson(chunk, 'data-gtm');
    const urls = parseAttrJson(chunk, 'data-urls');
    if (!j) continue;
    const ppu = /auc-measures--price-per-unit">([^<]+)</.exec(chunk);
    const value = /class="value"\s+content="([\d.]+)"/.exec(chunk);
    const item = finish({
      store: 'Auchan',
      name: decode(j.name),
      brand: decode(j.brand || ''),
      category: decode(j.category || ''),
      price: num(value?.[1] || j.price),
      perKg: ppu ? perKgFrom(decode(ppu[1])) : null,
      url: urls?.absoluteProductUrl || null,
      image: imageFrom(chunk),
    });
    if (item) out.push(item);
  }
  return out;
}

// ---------- Pingo Doce (Salesforce Commerce Cloud) ----------
export function parsePingoDoce(html) {
  const out = [];
  for (const chunk of html.split('class="product-tile-pd"').slice(1)) {
    const j = parseAttrJson(chunk, 'data-gtm-info');
    const it = j?.items?.[0];
    if (!it) continue;
    const unit = /class="product-unit">([^<]+)</.exec(chunk);
    const unitText = unit ? decode(unit[1]) : '';
    const kgM = /(\d+(?:[.,]\d+)?)\s*(kg|g)\b/i.exec(unitText);
    const href = /href="(\/home\/produtos\/[^"]+)"/.exec(chunk);
    const item = finish({
      store: 'Pingo Doce',
      name: decode(it.item_name),
      brand: decode(it.item_brand || ''),
      category: decode(it.item_category || ''),
      price: num(it.price ?? j.value),
      perKg: perKgFrom(unitText),
      kg: kgM ? (kgM[2].toLowerCase() === 'kg' ? num(kgM[1]) : num(kgM[1]) / 1000) : null,
      url: href ? `https://www.pingodoce.pt${decode(href[1])}` : null,
      image: imageFrom(chunk),
    });
    if (item) out.push(item);
  }
  return out;
}

export const STORE_SEARCH = {
  Continente: { url: (q) => `https://www.continente.pt/pesquisa/?q=${encodeURIComponent(q)}`, parse: parseContinente },
  Auchan: { url: (q) => `https://www.auchan.pt/pt/pesquisa?q=${encodeURIComponent(q)}`, parse: parseAuchan },
  'Pingo Doce': {
    url: (q) => `https://www.pingodoce.pt/on/demandware.store/Sites-pingo-doce-Site/default/Search-Show?q=${encodeURIComponent(q)}`,
    parse: parsePingoDoce,
  },
};

export async function fetchHtml(url, ms = 12000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': UA, 'Accept-Language': 'pt-PT,pt;q=0.9', Accept: 'text/html' },
      signal: controller.signal,
    });
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

// Pesquisa a mesma coisa em todos os supermercados ao mesmo tempo.
export async function searchStores(query) {
  const entries = Object.entries(STORE_SEARCH);
  const pages = await Promise.all(entries.map(([, s]) => fetchHtml(s.url(query))));
  const items = [];
  pages.forEach((html, i) => {
    if (!html) return;
    try {
      items.push(...entries[i][1].parse(html));
    } catch {
      /* site mudou: ignora esta loja */
    }
  });
  return items;
}

// Espécie e tipo pela categoria do site (ex.: "Animais/Gato/Ração Seca").
export function classify(item) {
  const c = `${item.category} ${item.name}`.toLowerCase();
  const species = /\bc[ãa]es?\b|\bc[ãa]o\b|dog/.test(c) ? 'dog' : /gato|cat\b/.test(c) ? 'cat' : null;
  const type = /h[úu]mid|saqueta|lata|pat[êe]/.test(c) ? 'wet' : /seca|ra[çc][ãa]o/.test(c) ? 'dry' : null;
  return { ...item, species, type };
}
