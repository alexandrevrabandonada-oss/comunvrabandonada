# COMUN 48.1B-P4 — preflight remoto de Calçadas

Data: 2026-08-08

## Resultado

`COMUN_P4_REMOTE_SCHEMA_PROMOTED_FLAGS_OFF`

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

## Promoção e postflight

- PR funcional #227 integrada em `96c05de6776c61c4034e02a75551646c04e44094`.
- O contrato canônico do manifesto foi corrigido pela PR #228, integrada em
  `b9bcb0be743a7e6e5a319d474709a07c15eaaac3`; os bytes e o SHA-256 da
  migration permaneceram imutáveis.
- Preflight remoto exato e sem escrita: run `31275553224`.
- Promoção da única migration planejada: run `31275588586`.
- Postflight independente: run `31275651342`.
- O histórico remoto contém a migration P4; a tabela adapter existe vazia,
  com RLS habilitada e forçada.
- `PUBLIC`, `anon` e `authenticated` têm zero CRUD direto; `service_role`
  preserva o acesso server-side esperado.
- As quatro RPCs do adapter estão presentes, são `security definer`, usam
  `search_path` fixado e concedem execução somente a `service_role`.
- Nenhuma fixture, seed, repair, reset ou migration adicional foi aplicada.
