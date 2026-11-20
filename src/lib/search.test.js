import assert from 'node:assert/strict';
import { test } from 'node:test';
import { addHistory, findSame, groupResults, packInfo, productKey, savingPct } from './search.js';

test('embalagens de húmida', () => {
  assert.deepEqual(packInfo('Felix Saquetas 12 x 85 g'), { count: 12, unitG: 85 });
  assert.deepEqual(packInfo('Royal Canin Exigent 85 gr'), { count: 1, unitG: 85 });
  assert.deepEqual(packInfo('Whiskas pack 4 saquetas 100g'), { count: 4, unitG: 100 });
  assert.equal(packInfo('Ração seca 2 kg'), null);
});

test('a mesma ração em lojas diferentes fica junta', () => {
  const a = { store: 'Continente', name: 'Ração para Gato Royal Canin Sterilised 37 2 kg', brand: 'Royal Canin', price: 24.99, kg: 2 };
  const b = { store: 'Zooplus', name: 'Royal Canin Sterilised 37 2kg', brand: '', price: 22.49, kg: 2 };
  assert.equal(productKey(a), productKey(b));
  const [g] = groupResults([a, b]);
  assert.equal(g.offers.length, 2);
  assert.equal(g.best.store, 'Zooplus');
  assert.equal(savingPct(g), 10);
});

test('húmida compara por unidade', () => {
  const [g] = groupResults([
    { store: 'Pingo Doce', name: 'Felix Saquetas Carne 12 x 85 g', price: 8.99, kg: 1.02, type: 'wet' },
    { store: 'Auchan', name: 'Felix saquetas carne 12x85g', price: 9.6, kg: 1.02, type: 'wet' },
  ]);
  assert.equal(g.best.store, 'Pingo Doce');
  assert.ok(Math.abs(g.best.unitValue - 0.749) < 0.01);
  assert.equal(g.pack.count, 12);
});

test('favorita encontra-se outra vez pelas palavras', () => {
  const groups = groupResults([{ store: 'Kiwoko', name: 'Royal Canin Sterilised 37 ração gato 2 kg', price: 23, kg: 2 }]);
  const fav = { key: productKey({ name: 'Royal Canin Sterilised 37 2 kg', kg: 2 }) };
  assert.ok(findSame(groups, fav));
});

test('histórico: um preço por dia, fica o mais baixo', () => {
  let h = addHistory([], 25, 'A', '2026-11-18');
  h = addHistory(h, 24, 'B', '2026-11-19');
  h = addHistory(h, 26, 'C', '2026-11-19');
  assert.deepEqual(h.map((x) => x.price), [25, 24]);
});

test('Purina One Junior em lojas diferentes = a mesma ração (nomes muito diferentes)', () => {
  const groups = groupResults([
    { store: 'Pingo Doce', name: 'Ração para Gato Júnior Frango Purina One', price: 15.74, kg: 2.8, perKg: 5.62 },
    { store: 'Continente', name: 'Ração Para Gato Purina One Junior 2.8kg', price: 24.29, kg: 2.8 },
    { store: 'Auchan', name: 'PURINA ONE JUNIOR 2.8KG', price: 15.79, kg: 2.8 },
    { store: 'Zooplus', name: '2,8kg Junior Bifensis PURINA ONE ração gatos', price: 23.49, kg: 2.8 },
    { store: 'Tiendanimal', name: 'Purina One Junior Bifensis Frango ração para gatos', price: 14.39, desde: true, perKg: 9.59 },
    { store: 'Continente', name: 'Ração Para Gato Purina One Adulto Frango 2.8kg', price: 23.99, kg: 2.8 },
    { store: 'Auchan', name: 'PURINA ONE JUNIOR SALMÃO 2.8KG', price: 16.5, kg: 2.8 },
  ]);
  const junior = groups.find((g) => g.offers.some((o) => o.store === 'Pingo Doce'));
  assert.deepEqual(junior.offers.map((o) => o.store).sort(), ['Auchan', 'Continente', 'Pingo Doce', 'Tiendanimal', 'Zooplus']);
  assert.equal(junior.best.store, 'Pingo Doce');
  assert.ok(!junior.offers.some((o) => /Adulto/.test(o.name)));
  assert.ok(!junior.offers.some((o) => /SALM/.test(o.name)));
});
