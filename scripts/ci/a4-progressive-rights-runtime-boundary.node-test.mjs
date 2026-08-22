import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const art = fs.readFileSync('app/comun/acervo/arte/contribuir/page.tsx', 'utf8');
const radio = fs.readFileSync('app/comun/radio/contribuir/page.tsx', 'utf8');
const photo = fs.readFileSync('app/comun/acervo/contribuir/page.tsx', 'utf8');
const artForm = fs.readFileSync('app/comun/acervo/arte/contribuir/contribution-form.tsx', 'utf8');
const radioForm = fs.readFileSync('app/comun/radio/contribuir/contribution-form.tsx', 'utf8');

test('only the A4-dependent Art and Radio contribution routes force runtime rendering', () => {
  assert.match(art, /export const dynamic = "force-dynamic"/);
  assert.match(radio, /export const dynamic = "force-dynamic"/);
  assert.doesNotMatch(photo, /export const dynamic = "force-dynamic"/);
});

test('ON contracts expose progressive markers while retained safety copy remains explicit', () => {
  for (const marker of ['Relação com a autoria', 'Identificação pública', 'Escopo nesta etapa', 'Reutilização', 'Licença, se houver', 'não vira pública automaticamente']) assert.match(artForm, new RegExp(marker));
  for (const marker of ['De quem é a voz?', 'Origem do material', 'Escopo nesta etapa', 'Reutilização', 'Identidade pública', 'não concede licença musical']) assert.match(radioForm, new RegExp(marker));
  assert.match(artForm, /progressiveRightsEnabled \?/);
  assert.match(radioForm, /progressiveRightsEnabled \?/);
});
