import assert from 'node:assert/strict';
import { test } from 'node:test';
import { FOOD_SEARCHES, OTHER_GROUPS, feedingGuide, isCatOrDog, kindOf } from './otherAnimals.js';

test('cada espécie tem recomendação e pesquisa de comida', () => {
  for (const [species, g] of Object.entries(OTHER_GROUPS)) {
    for (const k of g.kinds) {
      assert.ok(feedingGuide({ species, kind: k.id }), `${k.id} sem recomendação`);
      assert.ok(FOOD_SEARCHES[k.id]?.length, `${k.id} sem pesquisa`);
    }
  }
});

test('coelho: granulado pelo peso (25 g por kg)', () => {
  const g = feedingGuide({ species: 'small', kind: 'coelho', weight: '2,4' });
  assert.ok(g.lines.some((l) => l.includes('60 g')));
});

test('periquitos: a quantidade multiplica pelo número de aves', () => {
  assert.match(feedingGuide({ species: 'bird', kind: 'periquito', count: 2 }).headline, /12 a 20 g/);
});

test('cães e gatos continuam como antes; espécie desconhecida usa a primeira', () => {
  assert.ok(isCatOrDog({ species: 'cat' }) && isCatOrDog({ species: 'dog' }));
  assert.equal(kindOf({ species: 'bird' }).id, 'canario');
});
