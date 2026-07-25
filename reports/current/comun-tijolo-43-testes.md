# Tijolo 43 — testes

Atualizado em 25 de julho de 2026.

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
- no SHA `4ca09221`, `solo:test`: 14/14; runner local: 18/18; typecheck, lint,
  unitários 266/266 e validator SQL: aprovados;
- FAST do GitHub Actions: falhou no Ubuntu nos três testes de transporte do
  PostgreSQL temporário; 15/18 passaram. A falha sanitizada é
  `SOLO_CANONICAL_DATABASE_QUERY_FAILED`/transação, sem falha do contrato SQL;
- rehearsal da migration: checkout imutável e baseline completo confirmados;
  PRE real igual ao fingerprint esperado. A primeira passagem falhou com
  status `1` e `SOLO_CANONICAL_DATABASE_QUERY_FAILED`; POST e segunda passagem
  não foram alcançados. Não há ledger definitivo ou `ALREADY_APPLIED` a
  declarar;
- ambiente WSL preparado com Node, npm e Supabase CLI nativos; `npm ci` ainda
  concluiu nos dois worktrees, com typecheck verde e lockfiles intactos;
- tentativa de stack WSL bloqueada antes do reset: apenas o banco iniciou,
  enquanto Auth, Storage e PostgREST permaneceram parados;
- Vercel Preview: aprovado. FULL: pulado, sem disparo manual.

Testes humanos não foram preenchidos: gate humano permanece 0/3.

## Patch de transporte T43.1 — pendente de FAST

O diagnóstico do run Ubuntu `30141194406` foi reproduzido no nível de
topologia: o cliente `psql` também roda em container e, no Linux, não deve
tentar alcançar outro container pelo loopback publicado do host. O patch usa
uma rede Docker explícita, alias interno e porta `5432`; a porta efêmera de
loopback continua apenas verificada para assegurar que o container temporário
não fixa porta do host. O roteiro de rehearsal passou a descobrir a rede da
stack Supabase local e a usar `db:5432` nessa rede.

- runner PostgreSQL afetado: 18/18, duas execuções consecutivas;
- typecheck, lint, unitários 266/266, validator SQL, `solo:test` 14/14 e smoke
  operacional: aprovados;
- smoke runtime, matriz RLS e DB lint foram tentados em seguida, mas a stack
  local não estava em execução (`supabase_db_nvmdszymrtacfehdynpg` ausente);
  por isso não há novo resultado verde desses três gates nesta rodada;
- não houve migração, escrita remota, FULL, promoção ou alteração da
  migration/manifesto.

A decisão permanece `COMUN_CALCADAS_FAST_PATCH_REQUIRED` até o FAST e o
rehearsal no Ubuntu confirmarem o mesmo SHA.

## Segunda evidência remota

No run de PR `30142369944` do SHA `5503e02`, o FAST ficou verde, inclusive
reset, DB lint e RLS na stack Ubuntu. O handshake de rede do rehearsal também
passou (`db:5432 - accepting connections`), provando que a correção de
transporte resolveu o bloqueio inicial. A primeira passagem então revelou
`SOLO_CANONICAL_PRE_FINGERPRINT_MISMATCH`: o runner serializava o catálogo
com barra+t literal, diferente do verificador canônico que usa tabulação.
A serialização foi corrigida e protegida por teste; o runner passou 19/19 em
duas execuções locais. É necessária uma nova execução Ubuntu antes do FULL.
