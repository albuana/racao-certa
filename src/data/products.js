// Rações guardadas na app.
// Já não há catálogo fictício: todas as rações vêm de dados reais
// (código de barras e pesquisa nas bases abertas, ou sites dos supermercados)
// e ficam guardadas em store.customProducts.
//
// Cada produto:
//   id, name, brand, species ('cat' | 'dog'), stages, conditions,
//   type ('dry' | 'wet'), kcalPerKg, ean, imageUrl, tags,
//   offers: [{ store, kg, price, link }]  — preços em euros, SEM portes.

export const PRODUCTS = [];

export function findProduct(id, customProducts = []) {
  return PRODUCTS.find((p) => p.id === id) || customProducts.find((p) => p.id === id) || null;
}

export function findByEan(ean, customProducts = []) {
  const all = [...PRODUCTS, ...customProducts];
  return all.find((p) => p.ean && p.ean === ean) || null;
}

export function productsFor(species, customProducts = []) {
  return [...customProducts, ...PRODUCTS].filter((p) => p.species === species);
}
