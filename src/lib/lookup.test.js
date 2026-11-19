import { test } from 'node:test';
import assert from 'node:assert/strict';
import { inferConditions, inferStagesFor, estimateKcalPerKg, energyFrom, inferSpecies, inferStages, looksWet, normalize, typicalKcalPerKg } from './lookup.js';

test('Atwater modificado: ração seca típica de gato ≈ 3620 kcal/kg', () => {
  assert.equal(estimateKcalPerKg({ protein: 32, fat: 15, fiber: 2.5, ash: 7.5, moisture: 8 }), 3620);
});

test('sem cinza/humidade usa valores típicos de ração seca', () => {
  const v = estimateKcalPerKg({ protein: 30, fat: 12 });
  assert.ok(v > 3300 && v < 3700, String(v));
});

test('ração húmida dá valores baixos', () => {
  const v = estimateKcalPerKg({ protein: 9, fat: 5 }, true);
  assert.ok(v > 600 && v < 1100, String(v));
});

test('sem proteína ou gordura não estima', () => {
  assert.equal(estimateKcalPerKg({ protein: 30 }), null);
});

test('usa a energia declarada quando existe', () => {
  assert.deepEqual(energyFrom({ nutriments: { 'energy-kcal_100g': 380 } }), { kcalPerKg: 3800, estimated: false });
  assert.deepEqual(energyFrom({ nutriments: { 'energy-kj_100g': 1590 } }), { kcalPerKg: 3800, estimated: false });
});

test('estima quando só há composição', () => {
  const e = energyFrom({ product_name: 'Adult Chicken', quantity: '2 kg', nutriments: { proteins_100g: 32, fat_100g: 15, fiber_100g: 2.5, ash_100g: 7.5, moisture_100g: 8 } });
  assert.deepEqual(e, { kcalPerKg: 3620, estimated: true });
});

test('deteta ração húmida', () => {
  assert.equal(looksWet('Saquetas de atum em gelatina', '12 x 85 g'), true);
  assert.equal(looksWet('Adult Salmon', '85 g'), true);
  assert.equal(looksWet('Adult Salmon', '1.5 kg'), false);
});

test('normaliza um produto da base', () => {
  const p = normalize({ code: 123, product_name: 'Gato Adulto', brands: 'Marca, Outra', quantity: '3 kg', nutriments: { 'energy-kcal_100g': 390 } });
  assert.equal(p.name, 'Gato Adulto');
  assert.equal(p.brand, 'Marca');
  assert.equal(p.kcalPerKg, 3900);
  assert.equal(p.type, 'dry');
  assert.equal(normalize({ product_name: '' }), null);
});

test('valor típico quando não há dados', () => {
  assert.equal(typicalKcalPerKg({ type: 'dry', name: 'Purina Junior' }), 4000);
  assert.equal(typicalKcalPerKg({ type: 'dry', name: 'Adult Sterilised' }), 3400);
  assert.equal(typicalKcalPerKg({ type: 'dry', name: 'Adult Chicken' }), 3700);
  assert.equal(typicalKcalPerKg({ type: 'dry', name: 'X', stage: 'junior' }), 4000);
  assert.equal(typicalKcalPerKg({ type: 'wet', name: 'Pâté' }), 900);
});

test('fases e espécie pelo nome', () => {
  assert.deepEqual(inferStages('Purina One Junior'), ['junior']);
  assert.deepEqual(inferStages('Senior 11+ frango'), ['senior', 'mature']);
  assert.deepEqual(inferStages('Adult salmão'), ['adult', 'mature']);
  assert.equal(inferSpecies('Dry cat food, Purina'), 'cat');
  assert.equal(inferSpecies('Ração para cães adultos'), 'dog');
  assert.equal(inferSpecies('Pet food'), null);
  assert.equal(looksWet('Kitten dry food', '85 g'), false);
});

test('dietas veterinárias pelo nome', () => {
  assert.deepEqual(inferConditions('Royal Canin Renal Feline'), ['renal']);
  assert.deepEqual(inferConditions("Hill's Prescription Diet k/d Kidney Care"), ['renal']);
  assert.deepEqual(inferConditions('Purina Pro Plan Veterinary Diets UR Urinary'), ['urinary']);
  assert.deepEqual(inferConditions('Royal Canin Gastrointestinal'), ['digestive']);
  assert.deepEqual(inferConditions('Advance Veterinary Diets Diabetes Colitis'), ['diabetes']);
  assert.deepEqual(inferConditions('Ração Hipoalergénica Salmão'), ['skin']);
  assert.deepEqual(inferConditions('Purina One Junior Frango'), []);
  // sem fase indicada → serve todas as idades
  assert.deepEqual(inferStagesFor('Royal Canin Renal Feline'), ['junior', 'adult', 'mature', 'senior']);
  assert.deepEqual(inferStagesFor('Royal Canin Renal Senior').sort(), ['mature', 'senior']);
});

test('ração que não serve para o animal', async () => {
  const { fitIssues } = await import('./fit.js');
  const animal = { name: 'Melita', species: 'cat', stage: 'senior', conditions: ['renal'] };
  const junior = { name: 'Purina Junior', brand: 'Purina one' };
  const issues = fitIssues(junior, animal);
  assert.equal(issues.length, 2);
  assert.match(issues[0], /júnior.*Melita é sénior/);
  assert.match(issues[1], /renal/);
  assert.deepEqual(fitIssues({ name: 'Royal Canin Renal Feline' }, animal), []);
  assert.deepEqual(fitIssues({ name: 'Senior 7+ Renal' }, animal), []);
});
