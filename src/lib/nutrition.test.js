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
  doseLooksHigh,
  monthsSince,
  withAutoStage,
  ageText,
  formatBirthDate,
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

test('gatinha de 6 meses com 2,5 kg: ×2,0 ≈ 278 kcal, ≈ 70 g de ração seca', () => {
  const kcal = dailyKcal({ species: 'cat', weight: 2.5, stage: 'junior', ageMonths: 6 });
  near(kcal, 278, 1);
  near(gramsPerDay(kcal, 4000), 70, 1);
  near(dailyKcal({ species: 'cat', weight: 2, stage: 'junior', ageMonths: 3 }), restingEnergy(2) * 3, 0.01);
});

test('avisa quando a dose parece exagerada', () => {
  assert.equal(doseLooksHigh(465, 3, 'dry', 'junior'), true);
  assert.equal(doseLooksHigh(70, 2.5, 'dry', 'junior'), false);
  assert.equal(doseLooksHigh(300, 2.5, 'wet', 'junior'), false);
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

test('idade e fase a partir da data de nascimento', () => {
  const now = new Date(2026, 10, 18); // 18 nov 2026
  assert.equal(monthsSince('2026-03-18', now), 8);
  assert.equal(monthsSince('2026-03-19', now), 7);
  assert.equal(monthsSince('2025-11-18', now), 12);
  const kitten = withAutoStage({ species: 'cat', birthDate: '2026-03-18', stage: 'adult' }, now);
  assert.equal(kitten.stage, 'junior');
  assert.equal(kitten.ageMonths, 8);
  // um ano depois já é adulto, sem mexer em nada
  assert.equal(withAutoStage({ species: 'cat', birthDate: '2025-11-01' }, now).stage, 'adult');
  assert.equal(withAutoStage({ species: 'cat', stage: 'senior' }, now).stage, 'senior');
  assert.equal(ageText(8), '8 meses');
  assert.equal(ageText(12), '1 ano');
  assert.equal(ageText(26), '2 anos e 2 meses');
  assert.equal(formatBirthDate('2023-03-03'), '3 de março de 2023');
});

test('fatores por idade (base científica)', () => {
  const R = restingEnergy(4);
  const f = (a) => dailyKcal({ species: 'cat', weight: 4, neutered: true, ...a }) / R;
  near(f({ stage: 'adult' }), 1.2, 0.001);
  near(f({ stage: 'mature' }), 1.0, 0.001);
  near(f({ stage: 'senior' }), 1.2, 0.001);
  near(f({ stage: 'adult', neutered: false }), 1.4, 0.001);
  const d = (a) => dailyKcal({ species: 'dog', weight: 10, neutered: true, ...a }) / restingEnergy(10);
  near(d({ stage: 'adult' }), 1.6, 0.001);
  near(d({ stage: 'junior', ageMonths: 2 }), 3.0, 0.001);
  near(d({ stage: 'junior', ageMonths: 6 }), 2.0, 0.001);
  near(d({ stage: 'senior' }), 1.4, 0.001);
});
