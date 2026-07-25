# Tijolo 43 — testes

Atualizado em 24 de julho de 2026.

## Comandos canônicos

- `npm run test:e2e:comun-calcadas-operacional`
- `npm run test:a11y:comun-calcadas-operacional`
- `npm run smoke:comun-calcadas-operacional`
- `npm run smoke:comun-calcadas-operacional-runtime`

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
- smoke runtime: aprovado (`COMUN_CALCADAS_OPERATIONAL_RUNTIME_OK`), com
  fixture sintética, decisão `DISTINCT`, limpeza e negação de leitura anônima
  da tabela operacional;
- E2E operacional: 8 cenários em dois viewports, sem multiplicar a mesma
  narrativa por cinco telas; inclui localização manual por teclado e no-leak
  estático da superfície pública;
- Axe/overflow: 2/2, sem violações sérias ou críticas;
- RLS matrix: `RLS_MATRIX_OK`;
- DB lint local: sem erros;
- reconciliação SQL: duas rodadas locais de fingerprint equivalentes;
- validator SQL: aprovado; teste do runner: 18/18 em duas execuções
  consecutivas, usando porta Docker efêmera, com JSON, escalar e ledger;
- rehearsal da migration pelo runner real: pendente no job Ubuntu
  `RELEASE / COMUN_RELEASE_REHEARSAL`; portanto ainda não há ledger definitivo
  ou `ALREADY_APPLIED` a declarar;
- ambiente WSL preparado com Node, npm e Supabase CLI nativos; `npm ci` ainda
  concluiu nos dois worktrees, com typecheck verde e lockfiles intactos;
- tentativa de stack WSL bloqueada antes do reset: apenas o banco iniciou,
  enquanto Auth, Storage e PostgREST permaneceram parados;
- FAST, rehearsal e Vercel: aguardam o SHA final deste checkpoint. FULL não
  será disparado antes da análise do rehearsal.

Testes humanos não foram preenchidos: gate humano permanece 0/3.
