// A ração serve para este animal? Compara fase de vida e problemas de saúde.
// Devolve uma lista de frases com os problemas (vazia = serve).

import { inferConditions, inferStagesFor } from './lookup.js';
import { HEALTH_CONDITIONS, stagesFor } from './nutrition.js';

export function fitIssues(product, animal) {
  if (!product || !animal) return [];
  const text = `${product.brand || ''} ${product.name || ''} ${(product.tags || []).join(' ')}`;
  const pStages = product.stages?.length ? product.stages : inferStagesFor(text);
  const pConds = product.conditions?.length ? product.conditions : inferConditions(text);
  const who = animal.name || (animal.species === 'dog' ? 'o teu cão' : 'o teu gato');
  const labels = stagesFor(animal.species, animal.size);
  const lab = (id) => (labels.find((x) => x.id === id)?.label || id).toLowerCase();
  const issues = [];

  // Dietas sem fase indicada (4 fases) servem para todas as idades.
  if (animal.stage && pStages.length && pStages.length < 4 && !pStages.includes(animal.stage)) {
    const forStages = [...new Set(pStages.filter((x) => x !== 'mature' || !pStages.includes('senior')).map(lab))];
    issues.push(`É para ${forStages.join(' / ')} e ${who} é ${lab(animal.stage)}.`);
  }
  const missing = (animal.conditions || []).filter((c) => !pConds.includes(c));
  if (missing.length) {
    const names = missing.map((c) => HEALTH_CONDITIONS.find((h) => h.id === c)?.label.toLowerCase() || c).join(' e ');
    issues.push(`Não é própria para problema ${names}, que ${who} tem.`);
  }
  return issues;
}
