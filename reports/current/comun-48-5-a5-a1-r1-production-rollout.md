# 48.5-A5-A1-R1 — rollout Production da proveniência cultural especializada

## Closeout GREEN — 48.1B-R1C bridge e ativação A5-A1 (23/08/2026)

Estado terminal: `COMUN_48_5_A5_A1_R1_SPECIALIZED_PROVENANCE_GREEN_PRODUCTION_ACTIVE_NO_BUSINESS_WRITES`.

- Main de verificação: `c850590b7fa169ea5391ea7dc11d4bfbc54d0885`; o merge funcional A5-A1 `382a215e2828827596ed68bf2a7dfe1c2645361d` permanece ancestral.
- O bridge [32672159693](https://github.com/alexandrevrabandonada-oss/comunvrabandonada/actions/runs/32672159693) validou manifest e SHA da exceção de Calçadas, confirmou o ledger externo `APPLIED_EXACT_SCOPED`, isolou apenas a migration excepcional durante o planejamento e exigiu o plano contendo exclusivamente `20260823003249_comun_cultural_specialized_provenance_readiness.sql`. Terminal: `COMUN_48_1B_R1C_EXTERNAL_LEDGER_PLANNER_BRIDGE_GREEN_ZERO_REMOTE_WRITES`; artifact `9501673842`.
- O apply [32672217287](https://github.com/alexandrevrabandonada-oss/comunvrabandonada/actions/runs/32672217287) aplicou exatamente uma vez a migration cultural SHA-256 `771975081046474022764a8e69743cc6015ebb4a817c614719fa7d6dfc74bdfb`. Todos os postflights de schema, RLS, grants, bridge externo e delta de negócio passaram. O único bloqueio posterior foi um falso positivo no smoke: `story_summary` é um campo público do formulário de História Oral, não um marcador privado.
- A verificação pós-apply [32672612144](https://github.com/alexandrevrabandonada-oss/comunvrabandonada/actions/runs/32672612144) executou sem caminho de apply: schema/grants/RLS GREEN, `legacyBackfill=false`, planner reconciliado `planned=[]`, e nove GET/HEAD culturais retornaram 200 sem marcadores internos. Artifact sanitizado `9501789311`.
- Ledger A5: `0 → 1`; CLI ledger da migration externa de Calçadas: `absent → absent`; ledger externo de Calçadas: `exact → exact`.
- A3 e A4 continuam encrypted, Production-only e ON. Não houve alteração de env.
- `ProductionBusinessWrites=0`, `ProductionEnvWrites=0`, `ProductionSchemaWrites=1_migration_only`, `privateRootsCreated=0`, `publications=0`, `SearchWrites=0`, `publicAssetPromotions=0`, `collectionWrites=0`.

Não iniciar nova infraestrutura neste closeout. O próximo tijolo autorizado volta à funcionalidade cultural A5-A2.

## Histórico — bloqueio inicial

## Estado terminal

`COMUN_48_5_A5_A1_R1_BLOCKED_NONEXACT_MIGRATION_PLAN`

O rollout encerrou fail-closed antes da única escrita autorizada. A migration A5-A1 não foi aplicada.

## Evidência autoritativa

- Main executado: `477b301e1a8ac8c473d01b143cb602e9a9e00d04`.
- Merge funcional A5-A1: `382a215e2828827596ed68bf2a7dfe1c2645361d`, comprovadamente ancestral do deployment Production READY.
- Migration autorizada: `20260823003249_comun_cultural_specialized_provenance_readiness.sql`.
- SHA-256 conferido: `771975081046474022764a8e69743cc6015ebb4a817c614719fa7d6dfc74bdfb`.
- Projeto Supabase conferido por fingerprint: `nvmdszymrtacfehdynpg`.
- Run bloqueado: [32636667277](https://github.com/alexandrevrabandonada-oss/comunvrabandonada/actions/runs/32636667277).
- Artifact sanitizado: `9492496443`, SHA-256 `b351b0f53294b0df5d1b46b70eedb4e765921131b404222667f97d290a599cfa`.

O deployment Production identificado no preflight estava READY no commit `fd6069621a35fcf5b1eb4e44394a33b785de0ff3`, descendente do merge funcional. A3 e A4 estavam únicas, encrypted, Production-only e ON, sem shared env, duplicatas, branch override ou custom environment override.

## Motivo do bloqueio

O snapshot prévio foi executado dentro de `BEGIN READ ONLY` e confirmou A3/A4 aplicadas, A5-A1 ausente e schema A5-A1 inteiramente ausente. O `supabase migration list` e o dry-run identificaram uma migration local anterior pendente:

`20260724233256_comun_sidewalk_operational_hardening.sql`

O CLI recusou prosseguir sem `--include-all`. A5-A1-R1 autoriza somente a migration cultural exata e proíbe `--include-all`, repair, reset, seed, alteração manual de ledger ou quarentena de migration de outra lane. Nenhuma dessas ações foi executada.

## Deltas e segurança

- Ledger A5-A1: antes `0`; depois `0`.
- Schema A5-A1: antes ausente; depois ausente.
- `legacyBackfill=false` por ausência de apply.
- `ProductionSchemaWrites=0` neste run bloqueado.
- `ProductionBusinessWrites=0`.
- `ProductionEnvWrites=0`.
- `privateRootsCreated=0`, `publications=0`, `SearchWrites=0`, `publicAssetPromotions=0`.
- Nenhum smoke foi executado: o bloqueio aconteceu antes da migration e os smokes pós-schema seriam enganadores.
- Nenhuma mudança de RLS, grants, storage, asset, coleção, Search ou publicação ocorreu.

## Runs anteriores de tooling

Os runs `32636218580` e `32636496690` também pararam antes do plano/aplicação: respectivamente por uma expansão Bash sob `set -u` e por um cast ausente em fingerprint read-only. Ambos receberam correções mínimas, CI/COST-02/Preview verdes nas PRs #367 e #368. O run `32636667277` é a primeira execução que alcançou o plano remoto; ele comprovou o bloqueio de lane acima.

## Próximo boundary

Resolver `20260724233256_comun_sidewalk_operational_hardening.sql` dentro da lane proprietária, com seu próprio contrato e rollout. Depois, iniciar uma nova execução limpa de A5-A1-R1 e exigir novamente que o dry-run contenha exclusivamente `20260823003249_comun_cultural_specialized_provenance_readiness.sql`.

`A3=ON/preserved`; `A4=ON/preserved`; `autoPublication=false`; `ProductionMigrationApplied=false`.
