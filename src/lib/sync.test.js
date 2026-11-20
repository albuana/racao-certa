import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mergeHouseData, syncedPart } from './sync.js';

const cat = (id, updatedAt, name = id) => ({ id, name, updatedAt });

test('conta nova: fica tudo o que está no telemóvel', () => {
  const local = { account: { mode: 'guest' }, house: { name: 'Casa' }, animals: [cat('a1', '1')], customProducts: [] };
  assert.deepEqual(mergeHouseData(local, null), syncedPart(local));
});

test('junta animais dos dois lados e fica a versão mais recente', () => {
  const local = { house: { name: 'Casa' }, animals: [cat('a1', '2026-01-02', 'Melita nova'), cat('a2', '2026-01-01')] };
  const remote = { house: { name: 'Casa da Ana' }, animals: [cat('a1', '2026-01-01', 'Melita velha'), cat('a3', '2026-01-01')] };
  const m = mergeHouseData(local, remote);
  assert.equal(m.house.name, 'Casa da Ana');
  assert.deepEqual(m.animals.map((a) => a.id).sort(), ['a1', 'a2', 'a3']);
  assert.equal(m.animals.find((a) => a.id === 'a1').name, 'Melita nova');
});

test('um animal apagado noutro telemóvel não volta', () => {
  const local = { animals: [cat('a1', '1'), cat('a2', '1')] };
  const remote = { animals: [cat('a2', '1')], deleted: [{ id: 'a1', at: '2026-02-01' }] };
  const m = mergeHouseData(local, remote);
  assert.deepEqual(m.animals.map((a) => a.id), ['a2']);
  assert.equal(m.deleted.length, 1);
});

test('casa sem nome na conta fica com o nome do telemóvel', () => {
  const m = mergeHouseData({ house: { name: 'Lar' } }, { house: null, animals: [] });
  assert.equal(m.house.name, 'Lar');
});
