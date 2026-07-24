# Tijolo 43 — testes

Atualizado em 24 de julho de 2026.

## Comandos canônicos

- `npm run test:e2e:comun-calcadas-operacional`
- `npm run test:a11y:comun-calcadas-operacional`
- `npm run smoke:comun-calcadas-operacional`

O conjunto cobre mapa e lista, filtros, pauta, captura por câmera/arquivo,
localização manual após GPS negado, upload privado em duas fases, rotas de
prioridade/mobilização/resultados, no-leak e Axe. O smoke estrutural verifica
consentimento, idempotência, publicação aproximada, acompanhamento e ausência
de marcadores privados.

## Resultado local

- typecheck: aprovado;
- lint: aprovado;
- unitários: 266/266;
- smoke operacional: aprovado;
- E2E operacional: 15/15 em cinco viewports;
- Axe/overflow: 5/5, sem violações sérias ou críticas.

Testes humanos não foram preenchidos: gate humano permanece 0/3.
