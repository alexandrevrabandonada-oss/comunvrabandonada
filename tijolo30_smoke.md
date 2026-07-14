# Tijolo 30 - Smoke

Ambiente: local.

Site usado: `http://localhost:3000`.

Supabase usado: local via Docker, `http://127.0.0.1:55431`.

Deploy: nao houve.

Checks contra producao: nao houve.

## Smokes executados

- `NEXT_PUBLIC_SITE_URL=http://localhost:3000 npm run smoke:rls-hardening` - passou com `RLS_HARDENING_SMOKE_OK`.
- `NEXT_PUBLIC_SITE_URL=http://localhost:3000 npm run smoke:rls-matrix` - passou com `RLS_MATRIX_SMOKE_OK`.
- `NEXT_PUBLIC_SITE_URL=http://localhost:3000 npm run smoke:no-leak-http` - passou.
- `NEXT_PUBLIC_SITE_URL=http://localhost:3000 npm run smoke:public-dossier-index` - passou.
- `NEXT_PUBLIC_SITE_URL=http://localhost:3000 npm run smoke:public-dossier-features` - passou.

## Fixture local

Para `smoke:no-leak-http`, foi criado um fixture local temporario em `comun_pauta_spaces` com slug `trabalho-burnout-volta-redonda`.

O fixture foi removido apos o smoke.
