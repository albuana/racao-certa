// Cálculo das necessidades energéticas e da dose diária.
//
// Fórmula de referência veterinária:
//   RER (energia em repouso) = 70 × peso^0,75   (kcal/dia)
//   Necessidade diária       = RER × fator (fase de vida, esterilização, atividade, objetivo)
//   Gramas por dia           = kcal ÷ (kcal por kg da ração ÷ 1000)
//
// São estimativas de referência. Não substituem o veterinário.

import { OTHER_GROUPS } from './otherAnimals.js';

export const SPECIES = {
  cat: { id: 'cat', label: 'Gato', plural: 'Gatos' },
  dog: { id: 'dog', label: 'Cão', plural: 'Cães' },
};

// "Gata", "Gato", "Cadela", "Cão" (conforme a espécie e o sexo).
export function speciesWord(animal) {
  const other = OTHER_GROUPS[animal?.species];
  if (other) return (other.kinds.find((k) => k.id === animal.kind) || other.kinds[0]).label;
  const f = animal?.sex === 'f';
  if (animal?.species === 'dog') return f ? 'Cadela' : 'Cão';
  return f ? 'Gata' : 'Gato';
}

// Problemas de saúde com rações próprias (dietas veterinárias).
// As palavras servem para reconhecer estas rações pelo nome (PT, EN, ES, FR).
export const HEALTH_CONDITIONS = [
  { id: 'renal', label: 'Renal', hint: 'rins', pattern: /\b(renal|kidney|k\/d|nf)\b|riñ[oó]n|rins?\b/i },
  { id: 'urinary', label: 'Urinário', hint: 'cálculos, cistite', pattern: /urin[aá]r|\b(s\/o|c\/d|ur)\b|struvit/i },
  { id: 'digestive', label: 'Digestivo', hint: 'estômago, intestino', pattern: /gastro|intestinal|\bdigest|\bi\/d\b/i },
  { id: 'weight', label: 'Peso', hint: 'obesidade', pattern: /obes|\bweight|satiety|saciedade|\br\/d\b|metabolic/i },
  { id: 'diabetes', label: 'Diabetes', hint: '', pattern: /diab[eé]t|\b(dm|w\/d)\b/i },
  { id: 'skin', label: 'Pele e alergias', hint: 'hipoalergénica', pattern: /hypoallerg|hipoal[eé]rg|anallerg|\bderm|\bskin\b|\bz\/d\b|\bha\b/i },
  { id: 'liver', label: 'Fígado', hint: 'hepático', pattern: /hep[aá]tic|\bl\/d\b/i },
  { id: 'joints', label: 'Articulações', hint: 'mobilidade', pattern: /mobility|mobilidade|\bjoint|articula|\bj\/d\b/i },
  { id: 'heart', label: 'Coração', hint: 'cardíaco', pattern: /card[ií]ac|\bheart\b/i },
];

export function conditionLabel(id) {
  return HEALTH_CONDITIONS.find((c) => c.id === id)?.label || id;
}

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

// Meses completos desde a data de nascimento (ISO "AAAA-MM-DD").
export function monthsSince(birthDate, now = new Date()) {
  if (!birthDate) return null;
  const [y, m, d] = String(birthDate).slice(0, 10).split('-').map(Number);
  if (!y || !m || !d) return null;
  let months = (now.getFullYear() - y) * 12 + (now.getMonth() + 1 - m);
  if (now.getDate() < d) months -= 1;
  return Math.max(0, months);
}

// Se o animal tem data de nascimento, a idade e a fase de vida são calculadas
// a partir dela (e atualizam-se sozinhas com o tempo).
export function withAutoStage(animal, now = new Date()) {
  if (!animal || !animal.birthDate) return animal;
  const ageMonths = monthsSince(animal.birthDate, now);
  const stage = stageFromAge(animal.species, animal.size, ageMonths) || animal.stage;
  return { ...animal, ageMonths, stage };
}

// Refeições por dia recomendadas (WSAVA / AAHA): dependem da idade, e nos cães grandes de peito fundo
// convém dividir em mais refeições (menos risco de torção gástrica). A quantidade do dia não muda.
export function recommendedMeals(rawAnimal) {
  const a = withAutoStage(rawAnimal || {});
  const m = a.ageMonths;
  const bigDog = a.species === 'dog' && (a.size === 'large' || a.size === 'giant');
  if (a.species === 'dog') {
    if (m != null && m < 3) return { value: 4, min: 4, max: 4, reason: 'Cachorros até aos 3 meses: 4 refeições por dia.' };
    if ((m != null && m < 6) || (m == null && a.stage === 'junior')) return { value: 3, min: 3, max: 3, reason: 'Cachorros dos 3 aos 6 meses: 3 refeições por dia.' };
    if (m != null && m < 12) return { value: 2, min: 2, max: bigDog ? 3 : 2, reason: 'Dos 6 aos 12 meses: 2 refeições por dia.' };
    if (bigDog) return { value: 2, min: 2, max: 3, reason: 'Cães grandes: 2 a 3 refeições e sem exercício intenso logo a seguir (menos risco de torção gástrica).' };
    return { value: 2, min: 2, max: 2, reason: 'Cães adultos: 2 refeições por dia.' };
  }
  if ((m != null && m < 6) || (m == null && a.stage === 'junior')) return { value: 3, min: 3, max: 4, reason: 'Gatinhos até aos 6 meses: 3 a 4 refeições por dia (estômago pequeno, crescem depressa).' };
  if (m != null && m < 12) return { value: 2, min: 2, max: 3, reason: 'Gatos dos 6 aos 12 meses: 2 a 3 refeições por dia.' };
  if (a.stage === 'senior' || a.stage === 'mature') return { value: 2, min: 2, max: 3, reason: 'Gatos mais velhos: 2 a 3 porções pequenas por dia.' };
  return { value: 2, min: 2, max: 4, reason: 'Gatos adultos: pelo menos 2; várias porções pequenas também são boas.' };
}

export function ageText(ageMonths) {
  if (ageMonths == null) return '';
  const y = Math.floor(ageMonths / 12);
  const m = ageMonths % 12;
  const parts = [];
  if (y) parts.push(`${y} ${y === 1 ? 'ano' : 'anos'}`);
  if (m || !y) parts.push(`${m} ${m === 1 ? 'mês' : 'meses'}`);
  return parts.join(' e ');
}

const MONTHS_PT = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];

export function formatBirthDate(birthDate) {
  if (!birthDate) return '';
  const [y, m, d] = String(birthDate).slice(0, 10).split('-').map(Number);
  return `${d} de ${MONTHS_PT[m - 1]} de ${y}`;
}

// Date → "AAAA-MM-DD" na hora local (sem problemas de fuso horário).
export function toISODate(date) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
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

// Fator multiplicador sobre o RER (energia de manutenção = RER × fator).
// Base científica (ver ENERGY_SOURCES):
//  • RER = 70 × peso^0,75 — igual para cães e gatos (Pet Nutrition Alliance; NRC 2006).
//  • Gato adulto: esterilizado ×1,2, inteiro ×1,4; propenso a obesidade ×1,0 (Merck/MSD; PNA).
//  • Gatinhos: crescimento ×2–3 (PNA); ×2,5 em média (Merck/MSD) — aqui: <4 meses ×3,0,
//    4–6 meses ×2,5, 6–12 meses ×2,0.
//  • Gato maduro (7–10 anos): pode ser ≈ RER (AAHA/AAFP 2021) → ×1,0 (inteiro ×1,1).
//  • Gato sénior (11+ anos): a energia volta a subir depois dos ~11–12 anos (AAHA 2023) → ×1,2 (inteiro ×1,3).
//  • Cão adulto: esterilizado ×1,6, inteiro ×1,8; propenso a obesidade ×1,4 (Merck/MSD; PNA).
//  • Cachorros: <4 meses ×3,0, >4 meses ×2,0 (Merck/MSD).
//  • Cão maduro/sénior: a energia baixa com a idade (AAHA 2023) → ×1,4.
//  • Perder peso: gato ×0,8, cão ×1,0. Atividade alta: cão ×1,2, gato que vai à rua ×1,15.
export const ENERGY_SOURCES = [
  'Pet Nutrition Alliance — Calculating Calories Based on Pet Needs (MER/RER)',
  'Merck/MSD Veterinary Manual — Daily Maintenance Energy Requirements for Dogs and Cats',
  'AAHA 2021 Feline Life Stage Guidelines — Mature Adult and Senior Cats',
  'AAHA 2023 Senior Care Guidelines for Dogs and Cats — Nutrition',
  'NRC (2006) Nutrient Requirements of Dogs and Cats',
];

// Condição corporal (como fazem os veterinários, escala de 1 a 9 resumida em 3).
// 'thin' (1–3), 'ideal' (4–5), 'over' (6–9). Animais antigos: goal 'lose' conta como 'over'.
export const BODY_CONDITIONS = [
  { id: 'thin', label: 'Magro', labelF: 'Magra', hint: 'Vês as costelas e os ossos da anca; quase sem gordura ao toque.' },
  { id: 'ideal', label: 'Ideal', labelF: 'Ideal', hint: 'Sentes as costelas sem as ver; tem cintura vista de cima.' },
  { id: 'over', label: 'Com peso a mais', labelF: 'Com peso a mais', hint: 'Custa a sentir as costelas; sem cintura, barriga redonda.' },
];

export function bodyCondition(animal) {
  if (animal.bcs) return animal.bcs;
  return animal.goal === 'lose' ? 'over' : 'ideal';
}

export function energyFactor(animal) {
  // Magro: mais 10% para recuperar peso (em todas as idades).
  const base = energyFactorBase(animal);
  return bodyCondition(animal) === 'thin' ? base * 1.1 : base;
}

function energyFactorBase(animal) {
  const { species, stage, neutered, goal, active } = animal;
  const ageMonths = animal.ageMonths;
  // Com peso a mais: plano de perda de peso (nos júnior não se corta o crescimento).
  const lose = (goal === 'lose' || animal.bcs === 'over') && stage !== 'junior';

  if (species === 'dog') {
    if (stage === 'junior') return ageMonths != null && ageMonths < 4 ? 3.0 : 2.0;
    if (lose) return 1.0;
    let f;
    if (stage === 'senior' || stage === 'mature') f = neutered ? 1.4 : 1.6;
    else f = neutered ? 1.6 : 1.8;
    return active ? f * 1.2 : f;
  }

  // Gatos
  if (stage === 'junior') {
    if (ageMonths == null) return 2.5;
    if (ageMonths < 4) return 3.0;
    if (ageMonths < 6) return 2.5;
    return 2.0;
  }
  if (lose) return 0.8;
  let f;
  if (stage === 'mature') f = neutered ? 1.0 : 1.1;
  else if (stage === 'senior') f = neutered ? 1.2 : 1.3;
  else f = neutered ? 1.2 : 1.4;
  return active ? f * 1.15 : f;
}

export function dailyKcal(animal) {
  // A fórmula de energia é só para cães e gatos; os outros animais seguem a recomendação da espécie.
  if (animal.species && animal.species !== 'cat' && animal.species !== 'dog') return null;
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
  if (OTHER_GROUPS[animal?.species]) {
    const n = Number(animal.count) || 1;
    if (animal.species === 'bird') return n > 1 ? `${n} aves` : '';
    if (animal.species === 'fish') return `${n} ${n === 1 ? 'peixe' : 'peixes'}`;
    return '';
  }
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
  const bcs = bodyCondition(animal);
  if (bcs === 'over' && animal.stage !== 'junior') parts.push('em dieta');
  if (bcs === 'thin') parts.push('a ganhar peso');
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

// O valor parece exagerado? (para avisar: peso ou kcal/kg provavelmente errados)
// Ração seca raramente passa 5% do peso por dia; húmida 15% (gatinhos um pouco mais).
export function doseLooksHigh(grams, weightKg, type, stage) {
  const w = parseNumber(weightKg);
  if (!grams || !w) return false;
  const limit = (type === 'wet' ? 0.15 : 0.05) * (stage === 'junior' ? 1.4 : 1);
  return grams / (w * 1000) > limit;
}
