# COMUN 48.1B-P4 — preflight remoto de Calçadas

Data: 2026-08-08

## Resultado

`COMUN_P4_REMOTE_PREFLIGHT_GREEN_ADAPTER_MIGRATION_REQUIRED`

- `origin/main`: `e9aded8f486843e888473172c59eb58a4d7e1335`.
- Projeto Supabase vinculado: estado `ACTIVE_HEALTHY`; PostgreSQL `17.6.1.084`.
- Supabase CLI: `2.113.0`.
- A leitura foi limitada a catálogo, grants, policies, metadados e contagens. Nenhum texto, coordenada, anexo ou identidade foi lido.
- O núcleo Relata/P3 está presente: reports, cases, locations, attachments e RPCs canônicas.
- RLS do núcleo: habilitada e forçada; RPCs de evidência sem execução por `PUBLIC`, `anon` ou `authenticated`; `service_role` preservada.
- Bucket `comun-relata-private`: contrato privado já comprovado no P3 e sem migration posterior de Storage.
- O adapter `private.comun_sidewalk_relata_intakes` e suas RPCs não existem remotamente.
- A pauta `calcadas-em-circulacao` existe; o mapa público possui um registro histórico revisado.
- O schema legado de `comun_sidewalk_records` aceita a nova projeção com `geometry_geojson=null`, `private_geometry_geojson=null` e `public_geometry_geojson=Point`.

## Plano reconciliado

O dry-run preservou a exceção externa de Calçadas, validou o SHA histórico
`6a2e69dcc66f760fa1828bb43249079e8db474ad8b175d3af6aa7c97ec05b1be`, isolou o arquivo apenas durante o planejamento e o restaurou com o mesmo SHA.

Plano remoto exato:

1. `20260808180246_comun_sidewalk_relata_real.sql`

Nenhuma fixture, seed, migration local-only, `--include-all`, repair ou reset foi usado.

Resultado: `COMUN_P4_REMOTE_PLAN_EXACT_ONE`.
