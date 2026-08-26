# COMUN 48.6-B0 — Rollout da fundação de projeção coletiva

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
