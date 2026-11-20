// Outros animais (além de cães e gatos): aves, pequenos mamíferos, peixes e répteis.
// Para estes não há fórmula de energia como a dos cães e gatos: a quantidade segue a recomendação
// de cada espécie (guias de veterinários de exóticos e das associações de bem-estar animal).
// Sem dependências de React Native, para dar para testar com node.

export const OTHER_GROUPS = {
  bird: {
    label: 'Ave',
    icon: 'bird',
    kinds: [
      { id: 'canario', label: 'Canário' },
      { id: 'periquito', label: 'Periquito' },
      { id: 'caturra', label: 'Caturra' },
      { id: 'agapornis', label: 'Agapornis' },
      { id: 'papagaio', label: 'Papagaio' },
    ],
  },
  small: {
    label: 'Pequeno mamífero',
    icon: 'rabbit',
    kinds: [
      { id: 'coelho', label: 'Coelho' },
      { id: 'porquinho', label: 'Porquinho-da-índia' },
      { id: 'hamster', label: 'Hamster' },
      { id: 'chinchila', label: 'Chinchila' },
      { id: 'rato', label: 'Rato ou gerbilo' },
    ],
  },
  fish: {
    label: 'Peixe',
    icon: 'fish',
    kinds: [
      { id: 'tropical', label: 'Peixes de aquário' },
      { id: 'dourado', label: 'Peixe dourado' },
      { id: 'lago', label: 'Peixes de lago (koi)' },
    ],
  },
  reptile: {
    label: 'Réptil',
    icon: 'turtle',
    kinds: [
      { id: 'tartaruga_agua', label: 'Tartaruga aquática' },
      { id: 'tartaruga_terra', label: 'Tartaruga terrestre' },
      { id: 'lagarto', label: 'Lagarto (gecko, dragão-barbudo)' },
    ],
  },
};

export const isCatOrDog = (animal) => !animal?.species || animal.species === 'cat' || animal.species === 'dog';
export const isOther = (animal) => !!OTHER_GROUPS[animal?.species];

export function kindOf(animal) {
  const g = OTHER_GROUPS[animal?.species];
  if (!g) return null;
  return g.kinds.find((k) => k.id === animal.kind) || g.kinds[0];
}

// Grupos em que se indica quantos animais há (o mesmo plano para todos) em vez do peso.
export const usesCount = (species) => species === 'bird' || species === 'fish';
// Grupos em que o peso conta para a quantidade.
export const usesWeight = (species) => species === 'small';

// O que se procura nas lojas para cada espécie. A primeira é a comida principal.
export const FOOD_SEARCHES = {
  canario: [{ label: 'Sementes', q: 'mistura sementes canário' }, { label: 'Pasta de ovo', q: 'pasta de ovo canário' }, { label: 'Snacks', q: 'snack canário' }],
  periquito: [{ label: 'Sementes', q: 'mistura sementes periquito' }, { label: 'Pasta de ovo', q: 'pasta de ovo periquito' }, { label: 'Snacks', q: 'barritas periquito' }],
  caturra: [{ label: 'Sementes', q: 'mistura sementes caturra' }, { label: 'Granulado', q: 'granulado caturra' }, { label: 'Snacks', q: 'snack caturra' }],
  agapornis: [{ label: 'Sementes', q: 'mistura sementes agapornis' }, { label: 'Snacks', q: 'snack agapornis' }],
  papagaio: [{ label: 'Mistura', q: 'comida papagaio' }, { label: 'Granulado', q: 'granulado papagaio' }, { label: 'Snacks', q: 'snack papagaio' }],
  coelho: [{ label: 'Feno', q: 'feno coelho' }, { label: 'Granulado', q: 'granulado coelho' }, { label: 'Snacks', q: 'snack coelho' }],
  porquinho: [{ label: 'Feno', q: 'feno porquinho da índia' }, { label: 'Granulado', q: 'granulado porquinho da índia' }, { label: 'Snacks', q: 'snack porquinho da índia' }],
  hamster: [{ label: 'Mistura', q: 'comida hamster' }, { label: 'Snacks', q: 'snack hamster' }],
  chinchila: [{ label: 'Feno', q: 'feno chinchila' }, { label: 'Granulado', q: 'granulado chinchila' }],
  rato: [{ label: 'Mistura', q: 'comida ratos gerbilos' }, { label: 'Snacks', q: 'snack roedores' }],
  tropical: [{ label: 'Flocos', q: 'flocos peixes tropicais' }, { label: 'Grânulos', q: 'granulado peixes tropicais' }, { label: 'Pastilhas de fundo', q: 'pastilhas fundo peixes' }],
  dourado: [{ label: 'Flocos', q: 'flocos peixe dourado' }, { label: 'Grânulos', q: 'granulado peixe dourado' }],
  lago: [{ label: 'Peixes de lago', q: 'comida peixes lago koi' }],
  tartaruga_agua: [{ label: 'Granulado', q: 'comida tartaruga aquática' }, { label: 'Camarão seco', q: 'gammarus tartaruga' }],
  tartaruga_terra: [{ label: 'Comida', q: 'comida tartaruga terrestre' }, { label: 'Feno e plantas', q: 'ervas tartaruga terrestre' }],
  lagarto: [{ label: 'Insetos', q: 'insetos répteis' }, { label: 'Cálcio', q: 'cálcio répteis' }],
};

// Recomendação de quantidade por espécie: { headline, lines[] }. count = n.º de animais; weight em kg.
export function feedingGuide(animal) {
  const k = kindOf(animal);
  if (!k) return null;
  const n = Math.max(1, Number(animal.count) || 1);
  const w = Number(String(animal.weight || '').replace(',', '.')) || null;
  const per = (min, max, unit) => (n > 1 ? `${min * n} a ${max * n} ${unit} por dia (${min} a ${max} ${unit} por ave)` : `${min} a ${max} ${unit} por dia`);
  switch (k.id) {
    case 'canario':
      return { headline: per(5, 8, 'g'), lines: ['≈ 1 a 2 colheres de chá de mistura de sementes por ave.', 'Verdura fresca todos os dias (alface, agrião) e osso de choco para o cálcio.', 'Pasta de ovo 1 a 2 vezes por semana (todos os dias na muda e na criação).'] };
    case 'periquito':
      return { headline: per(6, 10, 'g'), lines: ['≈ 1 a 2 colheres de chá de sementes ou granulado por ave.', 'Legumes frescos todos os dias (cenoura, brócolos, pimento).', 'Milho painço só como guloseima.'] };
    case 'caturra':
      return { headline: per(15, 20, 'g'), lines: ['≈ 1 colher de sopa de mistura ou granulado por ave.', 'Fruta e legumes todos os dias (sem abacate nem chocolate, que são tóxicos).'] };
    case 'agapornis':
      return { headline: per(10, 15, 'g'), lines: ['≈ 1 colher de sopa rasa de mistura por ave.', 'Fruta e verdura frescas todos os dias.'] };
    case 'papagaio':
      return { headline: per(30, 50, 'g'), lines: ['Depende do tamanho: um papagaio-cinzento come ≈ 30 a 50 g de granulado ou mistura.', 'Fruta e legumes frescos todos os dias (sem abacate, chocolate nem café).'] };
    case 'coelho': {
      const g = w ? Math.round(25 * w) : null;
      return {
        headline: 'Feno à vontade, sempre disponível',
        lines: [
          'O feno é ≈ 80% da alimentação e gasta os dentes.',
          g ? `Granulado: ≈ ${g} g por dia (25 g por kg de peso).` : 'Granulado: ≈ 25 g por kg de peso por dia.',
          'Verdura fresca: ≈ 1 chávena por kg de peso por dia.',
        ],
      };
    }
    case 'porquinho':
      return { headline: 'Feno à vontade, sempre disponível', lines: ['Granulado próprio: ≈ 20 a 30 g por dia (1 a 2 colheres de sopa).', 'Vitamina C todos os dias: não a fabricam (pimento, couve, salsa).'] };
    case 'hamster':
      return { headline: '10 a 15 g por dia', lines: ['≈ 1 colher de sopa de mistura ou granulado.', 'Guarda comida no ninho: confirma que não fica comida estragada.'] };
    case 'chinchila':
      return { headline: 'Feno à vontade, sempre disponível', lines: ['Granulado próprio: ≈ 20 a 30 g por dia (1 a 2 colheres de sopa).', 'Poucas guloseimas: têm o intestino sensível.'] };
    case 'rato':
      return { headline: '5 a 15 g por dia', lines: ['≈ 1 colher de sopa de mistura por animal (rato ≈ 15 g; gerbilo ≈ 5 a 10 g).', 'Legumes frescos em pequenas quantidades.'] };
    case 'tropical':
    case 'dourado':
      return { headline: 'O que comem em 2 a 3 minutos', lines: ['1 a 2 vezes por dia, em pouca quantidade (a comida que sobra suja a água).', 'Um dia sem comida por semana faz bem.'] };
    case 'lago':
      return { headline: 'O que comem em 5 minutos', lines: ['Só com a água acima de 10 °C; no inverno quase não comem.', '1 a 3 vezes por dia no verão.'] };
    case 'tartaruga_agua':
      return { headline: 'Quantidade do tamanho da cabeça', lines: ['Jovens: todos os dias. Adultas: 2 a 3 vezes por semana.', 'Granulado próprio, com camarão seco ou verdura como complemento.'] };
    case 'tartaruga_terra':
      return { headline: 'Verdura e plantas todos os dias', lines: ['Dente-de-leão, trevo, rúcula, chicória; pouca fruta.', 'Granulado só como complemento; cálcio em pó 2 a 3 vezes por semana.'] };
    case 'lagarto':
      return { headline: 'Insetos que comam em 10 a 15 minutos', lines: ['Jovens: todos os dias. Adultos: 2 a 3 vezes por semana.', 'Polvilha os insetos com cálcio; dragões-barbudos comem também verdura.'] };
    default:
      return null;
  }
}
