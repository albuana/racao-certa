// Junta o animal, a ração e os preços: dose, custo e dias até acabar o saco.

import { findProduct } from '../data/products';
import { bagDaysLeft, cheapestOffer, costPerDay, dailyKcal, gramsPerDay, withAutoStage } from './nutrition';

export function animalStats(rawAnimal, customProducts = []) {
  const animal = withAutoStage(rawAnimal);
  const product = animal.productId ? findProduct(animal.productId, customProducts) : null;
  const kcal = dailyKcal(animal);
  const grams = product ? gramsPerDay(kcal, product.kcalPerKg) : null;
  const meals = animal.meals || 2;
  const offer = cheapestOffer(product);
  return {
    product,
    kcal,
    grams,
    meals,
    perMeal: grams ? grams / meals : null,
    offer,
    costDay: costPerDay(grams, offer),
    daysLeft: animal.bag ? bagDaysLeft(animal.bag, grams) : null,
  };
}

export function householdTotals(animals, customProducts = []) {
  let grams = 0;
  let cost = 0;
  let missingPrice = false;
  for (const a of animals) {
    const s = animalStats(a, customProducts);
    if (s.grams) grams += s.grams;
    if (s.costDay != null) cost += s.costDay;
    else missingPrice = true;
  }
  return { gramsDay: grams, costDay: cost, costMonth: cost * 30, kgMonth: (grams * 30) / 1000, missingPrice };
}

// Animal cujo saco acaba primeiro (para o aviso no Início).
export function nextToRunOut(animals, customProducts = [], withinDays = 7) {
  let pick = null;
  for (const a of animals) {
    const s = animalStats(a, customProducts);
    if (s.daysLeft != null && s.daysLeft <= withinDays && (!pick || s.daysLeft < pick.stats.daysLeft)) {
      pick = { animal: a, stats: s };
    }
  }
  return pick;
}
