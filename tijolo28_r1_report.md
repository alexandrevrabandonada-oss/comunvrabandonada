# Tijolo 28-R1 - Fechamento do banco e aceite dos destaques publicos

Data: 2026-07-08
Ambiente: local-first
Deploy: nao executado
Vercel: nao executado
Smoke contra producao publica: nao executado

## Banco usado

Foi usada a opcao A, Supabase local via Docker.

- `npx supabase status` inicialmente falhou porque os containers locais nao existiam.
- `npx supabase init` criou `supabase/config.toml`.
- Portas locais foram ajustadas para evitar bloqueio da faixa `5432x`:
  - API: `55431`
  - DB: `55432`
  - Studio: `55433`
  - Mailpit: `55434`
  - Analytics: `55437`
- `npx supabase start` subiu o ambiente local.
- `npx supabase db push --local` aplicou as migrations locais, incluindo `20260708163526_public_dossier_features.sql`.
- O stack local foi parado no final com `npx supabase stop`.

## Schema confirmado

Resultado da verificacao explicita:

`PUBLIC_DOSSIER_FEATURES_SCHEMA_OK`

Confirmado:

- tabela `comun_public_dossier_features` existe;
- `snapshot_id` existe;
- `active` existe;
- `public_label` existe;
- `public_note` existe;
- `priority` existe;
- RLS esta habilitado;
- `anon` nao tem `select`;
- `authenticated` nao tem `select`;
- `service_role` tem acesso server-side.

## Resultado

Tijolo 28 aceito localmente. O smoke principal `smoke:public-dossier-features` passou usando Supabase local e Next local.

## Observacao de seguranca fora do escopo

O advisor local do Supabase apontou RLS desabilitado em `public.comun_official_protocols`. Nao alterei essa tabela porque o Tijolo 28-R1 tinha escopo restrito a `comun_public_dossier_features`.
