# Testes visuais do acervo musical

Instale o Chromium uma vez com `npx playwright install chromium`. Execute `npm run test:e2e:music`, `npm run test:visual:music` e `npm run test:a11y:music`.

A suíte cobre índices públicos em 360, 390, 768 e 1366 px, navega para detalhes publicados quando existentes, verifica overflow, landmarks e títulos, e usa axe para violações sérias/críticas. Screenshots ficam em `reports/visual/sprint-23-2`. Dados administrativos reais não devem ser versionados.
