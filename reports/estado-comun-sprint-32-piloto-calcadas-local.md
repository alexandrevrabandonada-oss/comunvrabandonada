# Sprint 32 — Piloto local de Calçadas

Data: 16/07/2026

## Escopo

Validação local-first do piloto `Mapa Popular das Calçadas` em ambiente totalmente local: Next.js, Supabase local e testes smoke sem deploy remoto ou custo.

## Entregas e avanços

- Ambiente local configurado com `supabase` local e `NEXT_PUBLIC_SITE_URL=http://localhost:3000`.
- Script de smoke específico concluído: `scripts/smoke-comun-sidewalk-pilot.mjs`.
- Wrapper de ambiente local validou `ALLOW_LOCAL_TESTS=true`, `COMUN_BASE_URL` em `localhost` e bloqueio de destinos remotos.
- Helper `one()` corrigido e desestruturação de retornos Supabase ajustada.
- Schema de protocolo alinhado: smoke usa exclusivamente `comun_official_protocols`.
- Correção na consulta pública de rodas: `listPublicCircleSurface` especifica a foreign key correta (`comun_construction_circle_rounds_circle_id_fkey`).
- Testes E2E, acessibilidade e screenshots do piloto criados e aprovados em 5 viewports.
- Testes unitários do piloto adicionados em `lib/sidewalk-pilot-rules.test.ts`.
- Audit RLS corrigido para o formato JSON atual do CLI e aprovado (`RLS_MATRIX_OK`).
- Smoke `no-leak-http` adaptado para rodar localmente com fixture da pauta piloto.
- Regressão local aprovada para: sidewalk-pilot, central-experience, pauta-miniapp, community-radio, territorial-art-storage, community-auth:local, public-ui:local, no-leak-http.
- Reset duplo do banco local executado com sucesso.
- Build e start (`production-like`) executados; smoke e E2E reexecutados contra `next start`.

## Estado atual

- Supabase local disponível em `http://127.0.0.1:55431`.
- `npx supabase status -o env` retorna variáveis locais corretas.
- `scripts/comun-local-env.mjs` garante ambiente local sem destinos remotos.
- `smoke:sidewalk-pilot` passa integralmente e imprime `COMUN_TEST_FIXTURES_CLEAN`.
- `test:e2e:sidewalk-pilot` passa em 40 testes (5 viewports × 8 cenários).
- `test:a11y:sidewalk-pilot` passa com zero serious/critical.
- `test:visual:sidewalk-pilot` gera 20 screenshots revisados.
- `audit:rls-matrix` retorna `RLS_MATRIX_OK`.
- `npx supabase db lint --local` não encontra erros de schema.
- `npm run verify:local` (lint + typecheck + build) passa.

## Restrições preservadas

- Não houve push ou deploy remoto.
- Não houve alteração de Supabase remoto.
- Não houve uso de R2 remoto.
- Custo do trabalho local: R$ 0.

## Próximos passos

- Manter o piloto local como referência para integração futura.
- Nenhuma ação remota até nova sprint autorizar.
# Atualização Sprint 32.1 — 16/07/2026

A vertical foi fechada como release candidate local: smoke de 32 etapas, 151 unitários, 75/75 E2E, Axe sem violações serious/critical, RLS/DB lint, nove regressões, reset duplo, production-like, performance e cleanup aprovados. Detalhes em `reports/estado-comun-sprint-32-1-vertical-calcadas-local.md`.
