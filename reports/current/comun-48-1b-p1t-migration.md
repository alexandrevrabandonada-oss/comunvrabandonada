# COMUN 48.1B-P1T — migration de território opcional

Migration: `supabase/migrations/20260806235454_comun_member_profile_optional_territory.sql`

SHA-256: `1173bbddeafdcb929bee4eb7594e74fa6465af87421c0b0fe7ca7c549f11a1f5`

Manifesto: `supabase/releases/20260806235454-comun-member-profile-optional-territory.json`

## Escopo

- três colunas `text`, nullable e sem default;
- comentários semânticos de privacidade;
- nenhuma alteração de RLS, policies ou grants;
- nenhum backfill ou dado sintético;
- nenhuma projeção pública, coordenada ou encaminhamento externo;
- dependência explícita das três migrations R2A já promovidas.

A migration local-only `20260805090000` permanece intocada em `supabase/local-migrations/`.

## Validação local

`npm run solo:sql:validate -- --release-manifest=supabase/releases/20260806235454-comun-member-profile-optional-territory.json` passou com `COMUN_CANONICAL_RELEASE_SQL_OK`.

O teste descartável `COMUN_P1T_DISPOSABLE_E2E_GREEN` passou na lane Quality Performance run `31134678742`.

CI adicional relevante passou:

- COMUN CI: run `31134678848`;
- Civic Intelligence: run `31134678913`;
- Security Resilience: run `31134678906`;
- Vercel Preview: verde.
