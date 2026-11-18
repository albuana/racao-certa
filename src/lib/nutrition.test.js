import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  restingEnergy,
  dailyKcal,
  gramsPerDay,
  stageFromAge,
  ageInMonths,
  parseNumber,
  cheapestOffer,
  costPerDay,
  bagDaysLeft,
  describeAnimal,
  neuterQuestion,
} from './nutrition.js';

const near = (a, b, tol = 0.5) => assert.ok(Math.abs(a - b) <= tol, `${a} ≈ ${b}`);

test('RER de um gato de 4,2 kg', () => {
  near(restingEnergy(4.2), 205.4, 0.5);
});

test('gata adulta esterilizada de 4,2 kg: ≈246 kcal e 68 g com ração de 3600 kcal/kg', () => {
  const kcal = dailyKcal({ species: 'cat', weight: '4,2', stage: 'adult', neutered: true, sex: 'f' });
  near(kcal, 246.5, 0.6);
  near(gramsPerDay(kcal, 3600), 68.5, 0.5);
});

test('gato em dieta usa fator 0,8', () => {
  const kcal = dailyKcal({ species: 'cat', weight: 5.8, stage: 'adult', neutered: true, goal: 'lose' });
  near(kcal, restingEnergy(5.8) * 0.8, 0.01);
});

test('dieta não se aplica a júnior', () => {
  const a = dailyKcal({ species: 'cat', weight: 3, stage: 'junior', goal: 'lose' });
  near(a, restingEnergy(3) * 2.5, 0.01);
});

test('fases de vida a partir da idade', () => {
  assert.equal(stageFromAge('cat', null, 8), 'junior');
  assert.equal(stageFromAge('cat', null, 12), 'adult');
  assert.equal(stageFromAge('cat', null, 132), 'senior');
  assert.equal(stageFromAge('dog', 'giant', 16), 'junior');
  assert.equal(stageFromAge('dog', 'small', 16), 'adult');
  assert.equal(stageFromAge('dog', 'large', 110), 'senior');
  assert.equal(stageFromAge('cat', null, null), null);
});

test('números com vírgula', () => {
  assert.equal(parseNumber('3,5'), 3.5);
  assert.equal(parseNumber(''), null);
  assert.equal(ageInMonths('1', '6'), 18);
  assert.equal(ageInMonths('', ''), null);
});

test('oferta mais barata e custo por dia', () => {
  const p = { offers: [{ store: 'A', kg: 3, price: 13.79 }, { store: 'B', kg: 3, price: 12.5 }, { store: 'C', kg: 8, price: 34.99 }] };
  assert.equal(cheapestOffer(p).store, 'B');
  near(costPerDay(63, cheapestOffer(p)), 0.2625, 0.001);
  assert.equal(cheapestOffer({ offers: [] }), null);
});

test('dias que faltam no saco', () => {
  const now = new Date('2026-01-11T00:00:00Z');
  const bag = { kg: 1, openedAt: '2026-01-01T00:00:00Z' };
  assert.equal(bagDaysLeft(bag, 50, now), 10);
  assert.equal(bagDaysLeft({ kg: 0.1, openedAt: '2026-01-01T00:00:00Z' }, 50, now), 0);
});

test('descrição com concordância de género', () => {
  assert.equal(describeAnimal({ sex: 'f', stage: 'adult', neutered: true }), 'adulta · esterilizada');
  assert.equal(describeAnimal({ sex: 'm', stage: 'mature', neutered: true }), 'maduro · castrado');
  assert.equal(neuterQuestion('f'), 'Esterilizada?');
  assert.equal(neuterQuestion('m'), 'Castrado?');
});
