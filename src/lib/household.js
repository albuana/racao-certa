// Plano de alimentação de cada animal: ração SECA e/ou HÚMIDA.
// As duas partilham as calorias do dia: a húmida em saquetas/latas por dia,
// a seca completa o resto. Daqui saem doses, custos e dias até acabar o saco.

import { findProduct } from '../data/products.js';
import { bagDaysLeft, cheapestOffer, costPerDay, dailyKcal, withAutoStage } from './nutrition.js';

// Tamanho de cada saqueta/lata a partir do nome ou quantidade (ex.: "4x85g", "85 g").
export function sachetGrams(product) {
  const t = `${product?.name || ''} ${product?.quantity || ''}`.toLowerCase();
  const m = /(\d+)\s*[x×]\s*(\d{2,3})\s*g/.exec(t) || /\b(\d{2,3})\s*g\b/.exec(t);
  if (!m) return 85;
  return Number(m[2] || m[1]);
}

// Ids das rações do animal (com compatibilidade com o campo antigo productId).
export function planIds(animal, customProducts = []) {
  let dryId = animal.dryProductId || null;
  let wetId = animal.wetProductId || null;
  if (!dryId && !wetId && animal.productId) {
    const p = findProduct(animal.productId, customProducts);
    if (p?.type === 'wet') wetId = animal.productId;
    else dryId = animal.productId;
  }
  return { dryId, wetId };
}

// Cálculo puro (testável): divide as calorias entre húmida e seca.
export function splitPlan({ kcal, dry, wet, wetPerDay, meals = 2 }) {
  const out = { kcal, meals, dry: null, wet: null };
  if (!kcal) return out;
  let dryKcal = kcal;
  if (wet?.kcalPerKg) {
    const sg = sachetGrams(wet);
    let grams;
    if (dry?.kcalPerKg) {
      const n = wetPerDay ?? 1;
      grams = Math.min(n * sg, (kcal / wet.kcalPerKg) * 1000); // nunca mais do que as calorias do dia
    } else {
      grams = (kcal / wet.kcalPerKg) * 1000; // só húmida: tudo
    }
    const wKcal = (grams * wet.kcalPerKg) / 1000;
    dryKcal = Math.max(0, kcal - wKcal);
    out.wet = { product: wet, grams, kcal: wKcal, sachetG: sg, sachets: grams / sg, perMeal: grams / meals };
  }
  if (dry?.kcalPerKg) {
    const grams = (dryKcal / dry.kcalPerKg) * 1000;
    out.dry = { product: dry, grams, kcal: dryKcal, perMeal: grams / meals };
  }
  return out;
}

export function animalStats(rawAnimal, customProducts = []) {
  const animal = withAutoStage(rawAnimal);
  const { dryId, wetId } = planIds(animal, customProducts);
  const dryProduct = dryId ? findProduct(dryId, customProducts) : null;
  const wetProduct = wetId ? findProduct(wetId, customProducts) : null;
  const kcal = dailyKcal(animal);
  const meals = animal.meals || 2;
  const plan = splitPlan({ kcal, dry: dryProduct, wet: wetProduct, wetPerDay: animal.wetPerDay, meals });

  for (const part of [plan.dry, plan.wet]) {
    if (!part) continue;
    part.offer = cheapestOffer(part.product);
    part.costDay = costPerDay(part.grams, part.offer);
  }
  const parts = [plan.dry, plan.wet].filter(Boolean);
  const missingPrice = parts.some((p) => p.costDay == null);
  const costDay = parts.length && !missingPrice ? parts.reduce((t, p) => t + p.costDay, 0) : null;
  const main = plan.dry || plan.wet;

  return {
    kcal,
    meals,
    dry: plan.dry,
    wet: plan.wet,
    costDay,
    // Compatibilidade: a ração "principal" (seca, se houver).
    product: main?.product || dryProduct || wetProduct || null,
    grams: main?.grams ?? null,
    perMeal: main?.perMeal ?? null,
    offer: main?.offer ?? null,
    // O saco (dias até acabar) é o da ração seca.
    daysLeft: animal.bag && plan.dry ? bagDaysLeft(animal.bag, plan.dry.grams) : null,
  };
}

// Gramas por dia que este animal come de uma ração (para o comparador).
export function gramsOfProduct(animal, productId, customProducts = []) {
  const s = animalStats(animal, customProducts);
  if (s.dry?.product?.id === productId) return s.dry.grams;
  if (s.wet?.product?.id === productId) return s.wet.grams;
  return 0;
}

export function householdTotals(animals, customProducts = []) {
  let cost = 0;
  let kcal = 0;
  let missingPrice = false;
  for (const a of animals) {
    const s = animalStats(a, customProducts);
    if (s.kcal) kcal += s.kcal;
    if (s.costDay != null) cost += s.costDay;
    else missingPrice = true;
  }
  return { kcalDay: kcal, costDay: cost, costMonth: cost * 30, missingPrice };
}

// Animal cujo saco acaba primeiro (para o aviso no Início).
export function nextToRunOut(animals, customProducts = [], withinDays = 7) {
  let pick = null;
  for (const a of animals) {
    const s = animalStats(a, customProducts);
    if (s.daysLeft != null && s.daysLeft <= withinDays && (!pick || s.daysLeft < pick.stats.daysLeft)) {
      pick = { animal: a, stats: { ...s, product: s.dry?.product, offer: s.dry?.offer } };
    }
  }
  return pick;
}

// Texto curto do plano: "52 g + 1 saqueta", "71 g", "3,6 saquetas".
export function planSummary(s, fmt) {
  const parts = [];
  if (s.dry) parts.push(`${fmt(s.dry.grams)} g`);
  if (s.wet) parts.push(`${fmt(s.wet.sachets, s.wet.sachets % 1 ? 1 : 0)} ${s.wet.sachets >= 1.05 || s.wet.sachets < 0.95 ? 'saquetas' : 'saqueta'}`);
  return parts.join(' + ');
}
