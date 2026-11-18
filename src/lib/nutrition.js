// Cálculo das necessidades energéticas e da dose diária.
//
// Fórmula de referência veterinária:
//   RER (energia em repouso) = 70 × peso^0,75   (kcal/dia)
//   Necessidade diária       = RER × fator (fase de vida, esterilização, atividade, objetivo)
//   Gramas por dia           = kcal ÷ (kcal por kg da ração ÷ 1000)
//
// São estimativas de referência. Não substituem o veterinário.

export const SPECIES = {
  cat: { id: 'cat', label: 'Gato', plural: 'Gatos' },
  dog: { id: 'dog', label: 'Cão', plural: 'Cães' },
};

// Portes dos cães (o porte muda as idades de cada fase de vida).
export const DOG_SIZES = [
  { id: 'small', label: 'Pequeno', hint: 'até 10 kg' },
  { id: 'medium', label: 'Médio', hint: '10 a 25 kg' },
  { id: 'large', label: 'Grande', hint: '25 a 45 kg' },
  { id: 'giant', label: 'Gigante', hint: 'mais de 45 kg' },
];

// Fases de vida, com o intervalo em meses: [início, fim) — fim null = sem limite.
const STAGE_TABLE = {
  cat: [
    { id: 'junior', label: 'Júnior', range: 'até 12 meses', from: 0, to: 12 },
    { id: 'adult', label: 'Adulto', range: '1 a 6 anos', from: 12, to: 84 },
    { id: 'mature', label: 'Maduro', range: '7 a 10 anos', from: 84, to: 132 },
    { id: 'senior', label: 'Sénior', range: '11 anos ou mais', from: 132, to: null },
  ],
  small: [
    { id: 'junior', label: 'Júnior', range: 'até 10 meses', from: 0, to: 10 },
    { id: 'adult', label: 'Adulto', range: '10 meses a 7 anos', from: 10, to: 96 },
    { id: 'mature', label: 'Maduro', range: '8 a 11 anos', from: 96, to: 144 },
    { id: 'senior', label: 'Sénior', range: '12 anos ou mais', from: 144, to: null },
  ],
  medium: [
    { id: 'junior', label: 'Júnior', range: 'até 12 meses', from: 0, to: 12 },
    { id: 'adult', label: 'Adulto', range: '1 a 6 anos', from: 12, to: 84 },
    { id: 'mature', label: 'Maduro', range: '7 a 10 anos', from: 84, to: 132 },
    { id: 'senior', label: 'Sénior', range: '11 anos ou mais', from: 132, to: null },
  ],
  large: [
    { id: 'junior', label: 'Júnior', range: 'até 15 meses', from: 0, to: 15 },
    { id: 'adult', label: 'Adulto', range: '15 meses a 5 anos', from: 15, to: 72 },
    { id: 'mature', label: 'Maduro', range: '6 a 8 anos', from: 72, to: 108 },
    { id: 'senior', label: 'Sénior', range: '9 anos ou mais', from: 108, to: null },
  ],
  giant: [
    { id: 'junior', label: 'Júnior', range: 'até 18 meses', from: 0, to: 18 },
    { id: 'adult', label: 'Adulto', range: '18 meses a 4 anos', from: 18, to: 60 },
    { id: 'mature', label: 'Maduro', range: '5 a 7 anos', from: 60, to: 96 },
    { id: 'senior', label: 'Sénior', range: '8 anos ou mais', from: 96, to: null },
  ],
};

export function stagesFor(species, size) {
  if (species === 'dog') return STAGE_TABLE[size || 'medium'];
  return STAGE_TABLE.cat;
}

export function stageLabel(animal) {
  const s = stagesFor(animal.species, animal.size).find((x) => x.id === animal.stage);
  return s ? s.label : '';
}

// Idade (meses) → fase de vida. Devolve null se a idade não for conhecida.
export function stageFromAge(species, size, ageMonths) {
  if (ageMonths == null || Number.isNaN(ageMonths)) return null;
  const list = stagesFor(species, size);
  const found = list.find((s) => ageMonths >= s.from && (s.to == null || ageMonths < s.to));
  return found ? found.id : null;
}

export function ageInMonths(years, months) {
  const y = parseNumber(years);
  const m = parseNumber(months);
  if (y == null && m == null) return null;
  return (y || 0) * 12 + (m || 0);
}

// Aceita "3,5" e "3.5".
export function parseNumber(value) {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(String(value).replace(',', '.').trim());
  return Number.isFinite(n) ? n : null;
}

export function restingEnergy(weightKg) {
  return 70 * Math.pow(weightKg, 0.75);
}

// Fator multiplicador sobre o RER.
export function energyFactor(animal) {
  const { species, stage, neutered, goal, active } = animal;
  const ageMonths = animal.ageMonths;
  const lose = goal === 'lose' && stage !== 'junior';

  if (species === 'dog') {
    if (stage === 'junior') return ageMonths != null && ageMonths < 4 ? 3.0 : 2.0;
    if (lose) return 1.0;
    let f;
    if (stage === 'senior') f = 1.4;
    else if (stage === 'mature') f = neutered ? 1.4 : 1.6;
    else f = neutered ? 1.6 : 1.8;
    return active ? f * 1.2 : f;
  }

  // Gatos
  if (stage === 'junior') return ageMonths != null && ageMonths < 4 ? 3.0 : 2.5;
  if (lose) return 0.8;
  let f;
  if (stage === 'senior') f = neutered ? 1.1 : 1.2;
  else f = neutered ? 1.2 : 1.4;
  return active ? f * 1.15 : f;
}

export function dailyKcal(animal) {
  const w = parseNumber(animal.weight);
  if (!w || w <= 0) return null;
  return restingEnergy(w) * energyFactor(animal);
}

export function gramsPerDay(kcalPerDay, kcalPerKg) {
  if (!kcalPerDay || !kcalPerKg) return null;
  return kcalPerDay / (kcalPerKg / 1000);
}

// Oferta mais barata por kg (os preços não incluem portes).
export function cheapestOffer(product) {
  if (!product || !product.offers || product.offers.length === 0) return null;
  return product.offers.reduce((best, o) => (o.price / o.kg < best.price / best.kg ? o : best));
}

export function pricePerKg(offer) {
  return offer ? offer.price / offer.kg : null;
}

export function costPerDay(grams, offer) {
  if (!grams || !offer) return null;
  return (grams / 1000) * pricePerKg(offer);
}

// Quantos dias faltam para acabar o saco aberto.
export function bagDaysLeft(bag, grams, now = new Date()) {
  if (!bag || !grams) return null;
  const opened = new Date(bag.openedAt);
  const daysSince = Math.max(0, (now - opened) / 86400000);
  const totalDays = (bag.kg * 1000) / grams;
  return Math.max(0, Math.round(totalDays - daysSince));
}

// Texto curto que descreve o animal, com concordância de género.
export function describeAnimal(animal) {
  const female = animal.sex === 'f';
  const words = {
    junior: ['júnior', 'júnior'],
    adult: ['adulto', 'adulta'],
    mature: ['maduro', 'madura'],
    senior: ['sénior', 'sénior'],
  };
  const parts = [];
  if (animal.stage && words[animal.stage]) parts.push(words[animal.stage][female ? 1 : 0]);
  if (animal.neutered) parts.push(female ? 'esterilizada' : 'castrado');
  if (animal.goal === 'lose' && animal.stage !== 'junior') parts.push('em dieta');
  return parts.join(' · ');
}

export function neuterQuestion(sex) {
  return sex === 'f' ? 'Esterilizada?' : 'Castrado?';
}

export function neuterYesLabel(sex) {
  return sex === 'f' ? 'Sim, esterilizada' : 'Sim, castrado';
}

// Formatação em português de Portugal.
export function formatEuro(value) {
  if (value == null) return '—';
  return value.toLocaleString('pt-PT', { style: 'currency', currency: 'EUR' });
}

export function formatNumber(value, decimals = 0) {
  if (value == null) return '—';
  return value.toLocaleString('pt-PT', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}
