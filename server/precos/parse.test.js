import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cleanReport, isWetTitle, matches, parseKg, productKey, storeName, toOffers } from './parse.js';

test('peso do saco a partir do título', () => {
  assert.equal(parseKg('Purina One Junior 2,8 kg'), 2.8);
  assert.equal(parseKg('Ração 1.5kg'), 1.5);
  assert.equal(parseKg('Saqueta 85 g'), 0.085);
  assert.equal(parseKg('Felix 12 x 85 g'), 1.02);
  assert.equal(parseKg('Sem peso'), null);
});

test('reconhece a mesma ração', () => {
  assert.equal(matches('Purina ONE Junior Frango Ração Gato 2,8kg', 'Purina Junior', 'Purina one'), true);
  assert.equal(matches('Royal Canin Kitten 2kg', 'Purina Junior', 'Purina one'), false);
  assert.equal(matches('Purina ONE Adult Salmão', 'Purina Junior', 'Purina one'), false);
});

test('nome das lojas', () => {
  assert.equal(storeName('Continente.pt'), 'Continente');
  assert.equal(storeName('auchan.pt'), 'Auchan');
  assert.equal(storeName('El Corte Ingles'), 'El Corte Inglés');
  assert.equal(storeName('Loja Exemplo'), 'Loja Exemplo');
});

test('ofertas: a mais barata por loja, ordenadas por €/kg', () => {
  const results = [
    { title: 'Purina ONE Junior 2,8 kg', source: 'Continente.pt', extracted_price: 22.99, product_link: 'https://a' },
    { title: 'Purina ONE Junior 800 g', source: 'Continente.pt', extracted_price: 7.49 },
    { title: 'Purina ONE Junior 2,8 kg', source: 'auchan.pt', extracted_price: 20.49 },
    { title: 'Royal Canin Kitten 2 kg', source: 'Zooplus', extracted_price: 25 },
    { title: 'Purina ONE Junior', source: 'Zooplus', extracted_price: 21.9 },
  ];
  const offers = toOffers(results, { name: 'Purina Junior', brand: 'Purina one', defaultKg: 2.8 });
  assert.deepEqual(offers.map((o) => o.store), ['Auchan', 'Zooplus', 'Continente']);
  assert.equal(offers[2].price, 22.99); // 2,8 kg é mais barato por kg que 800 g
  assert.equal(offers[1].kg, 2.8); // sem peso no título usa o do produto
});

test('casos reais da pesquisa "Purina One Junior" (seca)', () => {
  const results = [
    { title: 'PURINA ONE Junior Salmon(Economy Pack: 6 x 1.5kg)', source: 'timmykanforduitzon', extracted_price: 27.2 },
    { title: 'Comida Húmida para Gato Júnior Salmão Purina One emb.4x85g', source: 'Eupoupo', extracted_price: 2.58 },
    { title: '8x85g Junior PURINA ONE comida húmida gatos', source: 'Zooplus', extracted_price: 6.69 },
    { title: 'Purina Pro Plan Feline Junior Pavo 26x85g', source: 'Farma2go', extracted_price: 29.47 },
    { title: 'PURINA ONE Junior Nassfutter mit Huhn für Kätzchen 4x85g', source: 'eBay DE', extracted_price: 6 },
    { title: 'PURINA ONE Junior Cat 1 to 12 Months Salmon 1.5 kg - Kibble for Kittens', source: 'GoSupps', extracted_price: 72.93 },
    { title: 'Purina ONE Junior Frango e Cereais 1,5 kg', source: 'Continente', extracted_price: 11.99 },
    { title: 'Purina One Junior Ração Gato 3 kg', source: 'Auchan', extracted_price: 21.49 },
  ];
  const offers = toOffers(results, { name: 'Purina Junior', brand: 'Purina one', defaultKg: 2.8, type: 'dry' });
  assert.deepEqual(offers.map((o) => o.store), ['Auchan', 'Continente']);
});

test('ração húmida pelo título', () => {
  assert.equal(isWetTitle('8x85g Junior PURINA ONE comida húmida gatos'), true);
  assert.equal(isWetTitle('Purina Pro Plan Feline Junior Pavo 26x85g'), true);
  assert.equal(isWetTitle('Purina One Junior 2,8 kg'), false);
});

test('chave do produto', () => {
  assert.equal(productKey({ ean: '7613036 54321 0', name: 'X' }), 'ean-7613036543210');
  assert.equal(productKey({ name: 'Purina Junior', brand: 'Purina one' }), 'nome-junior-one-purina');
  assert.equal(productKey({ name: 'Junior Purina', brand: 'One' }), 'nome-junior-one-purina');
});

test('preço visto na loja: validação', () => {
  assert.deepEqual(cleanReport({ store: 'lidl', price: '12.494', kg: 2 }), { store: 'Lidl', price: 12.49, kg: 2 });
  assert.deepEqual(cleanReport({ store: 'ALDI', price: 9.99, kg: 3 }), { store: 'Aldi', price: 9.99, kg: 3 });
  assert.equal(cleanReport({ store: 'Loja Falsa', price: 10, kg: 2 }), null);
  assert.equal(cleanReport({ store: 'Lidl', price: 0, kg: 2 }), null);
  assert.equal(cleanReport({ store: 'Lidl', price: 10, kg: 99 }), null);
});

test('preço errado: a mesma oferta dá sempre a mesma chave, outro preço dá outra', async () => {
  const { offerHash, checkItem } = await import('./index.js');
  assert.equal(offerHash('Kiwoko', 'Purina One Junior 2,8 kg', 23.15), offerHash('Kiwoko', 'purina one junior 2,8kg', 23.15));
  assert.notEqual(offerHash('Kiwoko', 'Purina One Junior', 23.15), offerHash('Kiwoko', 'Purina One Junior', 21.99));
  assert.deepEqual(checkItem({ price: 10, perKg: 5, url: 'https://www.kiwoko.pt/x', image: 'https://img/x.jpg' }), []);
  assert.ok(checkItem({ price: 10, perKg: 5, url: 'https://www.google.pt/shopping/1', image: 'https://img/x.jpg' }).includes('link não abre a loja'));
});
