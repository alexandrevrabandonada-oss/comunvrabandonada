# Tijolo 31 - Smoke

Ambiente: local.

Site usado: `http://localhost:3000`.

Supabase usado: local via Docker, `http://127.0.0.1:55431`.

Deploy: nao houve.

Checks contra producao: nao houve.

## Smokes executados

- `NEXT_PUBLIC_SITE_URL=http://localhost:3000 npm run smoke:rls-matrix` - passou com `RLS_MATRIX_SMOKE_OK`.
- `NEXT_PUBLIC_SITE_URL=http://localhost:3000 npm run smoke:no-leak-http` - passou.
- `NEXT_PUBLIC_SITE_URL=http://localhost:3000 npm run smoke:pauta-spaces` - passou.
- `NEXT_PUBLIC_SITE_URL=http://localhost:3000 npm run smoke:pauta-editorial-quality` - passou.

## Fixture local

Para `smoke:no-leak-http`, foi criado um fixture temporario em `comun_pauta_spaces` com slug `trabalho-burnout-volta-redonda`.

O fixture foi removido apos o smoke.
