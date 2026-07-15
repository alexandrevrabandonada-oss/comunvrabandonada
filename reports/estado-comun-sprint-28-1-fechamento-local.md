# Fechamento local — Sprint 28.1

Data: 2026-07-15

## Resultado confirmado

- Docker/WSL2 e Supabase local ativos.
- `supabase db reset --local`: aprovado desde zero; migration `20260715151922_comun_pauta_miniapps_relational_guards.sql` aplicada.
- Inventário das tabelas da Sprint 28: PKs, FKs, checks, unique constraints, defaults, timestamps e índices confirmados.
- `RLS_MATRIX_OK`: RLS habilitada e grants de anon/authenticated negados para as novas tabelas internas; `service_role` mantém acesso de servidor.
- Gate SQL local: valida tipo/status/config/posição de módulo, duplicidade, uma rodada aberta, contribuição em rodada fechada, síntese entre rodas, membership duplicada/papel inválido e grants. Fixtures são removidas por cascade-delete.
- Production-like: `npm run build`, `npm run start`, smoke de rotas públicas e smoke de não vazamento passaram em `localhost:3000`.

## Limitações restantes

- O script `smoke:public-ui` mantém uma expectativa de conteúdo editorial que não é recriada pelo reset local; esse único cenário visual falhou por fixture ausente.
- Não foi criado E2E autenticado completo de admin/membro nesta sprint de fechamento. Portanto, a RC está aprovada para schema, RLS e rotas públicas locais, mas não está declarada pronta para promoção.

## Declarações operacionais

- Vercel deploy: **NÃO EXECUTADO**.
- Git push: **NÃO EXECUTADO**.
- Supabase remoto: **NÃO ALTERADO**.
- R2 real: **NÃO UTILIZADO**.
- Smoke remoto: **NÃO EXECUTADO**.
- Custo externo: **R$ 0**. O CLI registrou apenas uma tentativa de telemetria PostHog que expirou; não foi acesso a Supabase/Vercel/R2 e não houve custo.
