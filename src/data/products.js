// ⚠️ CATÁLOGO DE DEMONSTRAÇÃO
// Marcas, códigos de barras e preços são FICTÍCIOS, só para testar a app.
// Antes de publicar, substitui por dados reais (por exemplo, Open Pet Food Facts
// para produtos e kcal, e feeds de afiliados das lojas para preços).
//
// Cada produto:
//   id, name, brand, species ('cat' | 'dog'), stages (fases a que se destina),
//   type ('dry' | 'wet'), kcalPerKg, ean (código de barras), tags,
//   offers: [{ store, kg, price }]  — preços em euros, SEM portes.

export const DEMO_PRICES_NOTICE = 'Preços de demonstração · sem portes';

export const PRODUCTS = [
  {
    id: 'nutrigato-adulto-frango',
    name: 'NutriGato Adulto Frango',
    brand: 'NutriGato',
    species: 'cat',
    stages: ['adult', 'mature'],
    type: 'dry',
    kcalPerKg: 3900,
    ean: '2000000000011',
    tags: ['Adulto'],
    offers: [
      { store: 'Zooplus', kg: 10, price: 42.99 },
      { store: 'Kiwoko', kg: 7.5, price: 36.5 },
      { store: 'Tiendanimal', kg: 10, price: 44.9 },
      { store: 'Continente', kg: 2, price: 11.49 },
      { store: 'Auchan', kg: 2, price: 10.99 },
    ],
  },
  {
    id: 'felinoplus-castrados-salmao',
    name: 'FelinoPlus Castrados Salmão',
    brand: 'FelinoPlus',
    species: 'cat',
    stages: ['adult', 'mature'],
    type: 'dry',
    kcalPerKg: 3600,
    ean: '2000000000028',
    tags: ['Para esterilizados'],
    offers: [
      { store: 'Zooplus', kg: 10, price: 49.99 },
      { store: 'Kiwoko', kg: 3, price: 18.95 },
      { store: 'Tiendanimal', kg: 10, price: 47.5 },
      { store: 'Continente', kg: 1.5, price: 9.99 },
    ],
  },
  {
    id: 'miau-premium-kitten',
    name: 'Miau Premium Kitten',
    brand: 'Miau',
    species: 'cat',
    stages: ['junior'],
    type: 'dry',
    kcalPerKg: 4100,
    ean: '2000000000035',
    tags: ['Kitten'],
    offers: [
      { store: 'Zooplus', kg: 4, price: 27.49 },
      { store: 'Kiwoko', kg: 2, price: 15.9 },
      { store: 'Tiendanimal', kg: 4, price: 26.95 },
    ],
  },
  {
    id: 'nutrigato-junior-frango',
    name: 'NutriGato Júnior Frango',
    brand: 'NutriGato',
    species: 'cat',
    stages: ['junior'],
    type: 'dry',
    kcalPerKg: 4000,
    ean: '2000000000042',
    tags: ['Kitten'],
    offers: [
      { store: 'Zooplus', kg: 7, price: 36.4 },
      { store: 'Continente', kg: 1.5, price: 8.99 },
    ],
  },
  {
    id: 'bigodes-light',
    name: 'Bigodes Light',
    brand: 'Bigodes',
    species: 'cat',
    stages: ['adult', 'mature', 'senior'],
    type: 'dry',
    kcalPerKg: 3300,
    ean: '2000000000059',
    tags: ['Controlo de peso'],
    offers: [
      { store: 'Zooplus', kg: 8, price: 34.99 },
      { store: 'Continente', kg: 3, price: 13.79 },
      { store: 'Auchan', kg: 3, price: 14.29 },
      { store: 'Mercadona', kg: 3, price: 12.5 },
    ],
  },
  {
    id: 'pura-natura-senior',
    name: 'Pura Natura Sénior Peru',
    brand: 'Pura Natura',
    species: 'cat',
    stages: ['senior', 'mature'],
    type: 'dry',
    kcalPerKg: 3700,
    ean: '2000000000066',
    tags: ['Sénior'],
    offers: [
      { store: 'Zooplus', kg: 7, price: 52.99 },
      { store: 'Kiwoko', kg: 7, price: 55.95 },
      { store: 'Tiendanimal', kg: 7, price: 51.9 },
    ],
  },
  {
    id: 'bigodes-saquetas-atum',
    name: 'Bigodes Saquetas Atum',
    brand: 'Bigodes',
    species: 'cat',
    stages: ['adult', 'mature', 'senior'],
    type: 'wet',
    kcalPerKg: 850,
    ean: '2000000000073',
    tags: ['Húmida'],
    offers: [
      { store: 'Continente', kg: 1.02, price: 5.49 },
      { store: 'Mercadona', kg: 1.02, price: 4.95 },
    ],
  },
  {
    id: 'canisano-puppy',
    name: 'Canisano Puppy Médio',
    brand: 'Canisano',
    species: 'dog',
    stages: ['junior'],
    type: 'dry',
    kcalPerKg: 3800,
    ean: '2000000000080',
    tags: ['Puppy'],
    offers: [
      { store: 'Zooplus', kg: 12, price: 54.99 },
      { store: 'Kiwoko', kg: 3, price: 17.95 },
      { store: 'Tiendanimal', kg: 12, price: 52.9 },
    ],
  },
  {
    id: 'canisano-adulto-borrego',
    name: 'Canisano Adulto Borrego',
    brand: 'Canisano',
    species: 'dog',
    stages: ['adult', 'mature'],
    type: 'dry',
    kcalPerKg: 3600,
    ean: '2000000000097',
    tags: ['Adulto'],
    offers: [
      { store: 'Zooplus', kg: 15, price: 49.99 },
      { store: 'Kiwoko', kg: 12, price: 45.5 },
      { store: 'Continente', kg: 4, price: 15.99 },
      { store: 'Auchan', kg: 4, price: 16.49 },
    ],
  },
  {
    id: 'patudo-light',
    name: 'Patudo Light & Sénior',
    brand: 'Patudo',
    species: 'dog',
    stages: ['mature', 'senior'],
    type: 'dry',
    kcalPerKg: 3200,
    ean: '2000000000103',
    tags: ['Sénior', 'Controlo de peso'],
    offers: [
      { store: 'Zooplus', kg: 12, price: 47.99 },
      { store: 'Mercadona', kg: 4, price: 13.5 },
      { store: 'Continente', kg: 4, price: 14.99 },
    ],
  },
];

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
