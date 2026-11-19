import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sachetGrams, splitPlan } from './household.js';

const near = (a, b, tol = 0.6) => assert.ok(Math.abs(a - b) <= tol, `${a} ≈ ${b}`);
const dry = { id: 'd', kcalPerKg: 3900, type: 'dry', name: 'Ração Júnior 2 kg' };
const wet = { id: 'w', kcalPerKg: 900, type: 'wet', name: 'Mousse Gatinhos 85 g' };

test('tamanho da saqueta pelo nome', () => {
  assert.equal(sachetGrams({ name: 'Purina One Júnior 4x85g' }), 85);
  assert.equal(sachetGrams({ name: 'Lata 400 g' }), 400);
  assert.equal(sachetGrams({ name: 'Sem tamanho' }), 85);
});

test('só seca: todas as calorias na seca', () => {
  const p = splitPlan({ kcal: 278, dry });
  near(p.dry.grams, 71.3);
  assert.equal(p.wet, null);
});

test('só húmida: todas as calorias na húmida', () => {
  const p = splitPlan({ kcal: 278, wet });
  near(p.wet.grams, 308.9);
  near(p.wet.sachets, 3.63, 0.02);
});

test('mista: 1 saqueta por dia e a seca completa o resto', () => {
  const p = splitPlan({ kcal: 278, dry, wet, wetPerDay: 1 });
  near(p.wet.grams, 85);
  near(p.wet.kcal, 76.5);
  near(p.dry.grams, 51.7);
  near(p.wet.kcal + p.dry.kcal, 278, 0.01);
});

test('mista: saquetas a mais nunca passam das calorias do dia', () => {
  const p = splitPlan({ kcal: 278, dry, wet, wetPerDay: 10 });
  near(p.wet.kcal, 278, 0.01);
  near(p.dry.grams, 0, 0.01);
});
