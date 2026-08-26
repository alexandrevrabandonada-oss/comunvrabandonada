# COMUN 48.6-B0 — Rollout da fundação de projeção coletiva

## Fechamento pós-merge — schema ativo, mapa OFF

- Main inicial: `d0da1bbfd75f7705890a5bb9a0dfb242b275ddb2`; PR #402 mergeada em `eb9cca290986332613044243d98a91c6843d34ba`.
- Disposable Supabase GREEN: run `32923817061`; preflight remoto GREEN: run `32923817049`.
- Wave 0 Production GREEN: run `32926957445`, deployment `6096559166` SUCCESS/READY, no SHA `eb9cca290986332613044243d98a91c6843d34ba`.
- Migration única aplicada: `20260826090000_comun_denuncias_public_collective_projection.sql`, SHA-256 `590fba97f44f549588b8e97b2dc88fc80a83844f4`; plano exato, sem include-all/repair/reset/seed.
- Postflight: RLS/FORCE RLS GREEN, `anon`/`authenticated` sem acesso direto, service role somente via RPC operacional; sem backfill.
- `projectionRows=0`, `confirmationRows=0`, `businessWrites=0`, `schemaWrites=1_migration_only`, `envWrites=0`, `fixtures=0`, `publications=0`; não houve env write.
- GET/HEAD: `/comun/denuncias` e `/comun/relatar` 200; `/comun/denuncias/mapa` e API 404/cloak enquanto a flag permanece OFF. HTML sem marcadores privados.
- O erro isolado do Quality Performance pós-merge (`32926934090`) foi Chromium headless SIGSEGV do runner; não há evidência de regressão B0.

**Terminal:** `COMUN_48_6_B0_SCHEMA_GREEN_MAP_OFF_NO_PROJECTION`

## Estado atual

`PRE-MERGE / SCHEMA PENDING / MAP OFF / ZERO PRODUCTION PROJECTION`

Parent confirmado: `d0da1bbfd75f7705890a5bb9a0dfb242b275ddb2`.

Branch: `codex/48-6-b0-public-collective-projection`.

PR em uso: #402.

## Preflight registrado

- run read-only: `32918355042`;
- job: `98026686732`;
- migration local 48.0D: ausente remotamente;
- collective roots Production: ausentes e previstos somente na nova migration;
- public snapshot histórico: presente e bloqueado;
- conteúdo de negócio: não lido;
- env writes: 0;
- schema writes Production: 0;
- business writes Production: 0.

## Gate de promoção futura

1. Confirmar o `origin/main` exato e o checksum do arquivo do main.
2. Confirmar A0–A3 preservados e `COMUN_DENUNCIAS_PUBLIC_MAP_ENABLED` ausente/OFF.
3. Fazer migration plan metadata-only e aceitar somente `20260826090000_comun_denuncias_public_collective_projection.sql`; migrations inesperadas bloqueiam.
4. Aplicar exclusivamente a migration B0, sem `--include-all`, repair, reset ou seed.
5. Fazer postflight read-only de histórico, schema, RLS, grants, funções e constraints.
6. Confirmar `projectionRows=0`, `confirmationRows=0`, ausência de backfill e zero writes de negócio.
7. Confirmar flag OFF e executar somente GET/HEAD sanitizados; `/comun/denuncias/mapa` permanece cloak/404 enquanto OFF.

O rollout de ativação do mapa, caso aprovado em tijolo posterior, é separado da instalação de schema e exigirá política própria. Nenhum env write é permitido neste B0.

## Terminal enquanto aguarda CI/merge

`COMUN_48_6_B0_FOUNDATION_READY_MAP_OFF_PENDING_PRODUCTION_PROMOTION`

Não é um closeout de Production: a migration ainda não foi aplicada e a flag ainda não foi criada nem ativada.
