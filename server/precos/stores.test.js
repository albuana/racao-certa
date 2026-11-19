import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { classify, decode, parseAuchan, parseContinente, parsePingoDoce } from './stores.js';

const dir = new URL('./amostras/', import.meta.url);
const sample = (f) => {
  try {
    return fs.readFileSync(new URL(f, dir), 'utf8');
  } catch {
    return null;
  }
};

test('descodifica entidades HTML', () => {
  assert.equal(decode('Ra&ccedil;&atilde;o J&uacute;nior &quot;x&quot; 7,49&euro;'), 'Ração Júnior "x" 7,49€');
});

test('classifica espécie e tipo pela categoria', () => {
  assert.deepEqual(
    [classify({ category: 'Animais/Gato/Ração Seca', name: '' }).species, classify({ category: 'Animais/Gato/Ração Seca', name: '' }).type],
    ['cat', 'dry']
  );
  assert.equal(classify({ category: 'animais/cães/comida-para-cães/comida-húmida', name: '' }).species, 'dog');
  assert.equal(classify({ category: 'Comida Húmida Gato', name: '' }).type, 'wet');
});

// Testes com páginas reais (só correm se as amostras existirem: bash amostras/recolher.sh)
test('Continente: lê preço e €/kg', { skip: !sample('continente-pesquisa.html') }, () => {
  const items = parseContinente(sample('continente-pesquisa.html'));
  const big = items.find((i) => i.price === 24.29);
  assert.ok(big);
  assert.equal(big.kg, 2.8);
  assert.ok(Math.abs(big.perKg - 8.68) < 0.01);
});

test('Auchan: lê preço e €/kg', { skip: !sample('auchan-pesquisa.html') }, () => {
  const items = parseAuchan(sample('auchan-pesquisa.html'));
  const p = items.find((i) => /PURINA ONE JUNIOR 2\.8KG/.test(i.name));
  assert.equal(p.price, 15.79);
  assert.ok(Math.abs(p.perKg - 5.64) < 0.01);
});

test('Pingo Doce: lê preço, peso e €/kg', { skip: !sample('pingodoce-pesquisa2.html') }, () => {
  const items = parsePingoDoce(sample('pingodoce-pesquisa2.html'));
  const p = items.find((i) => i.price === 13.29);
  assert.equal(p.kg, 1.5);
  assert.equal(p.brand, 'Purina One');
});
