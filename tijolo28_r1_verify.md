# Tijolo 28-R1 - Verify

Data: 2026-07-08
Ambiente: local
Supabase: local Docker
Next local: `http://localhost:3002`

## Comandos executados

- `npx supabase status` - falhou antes da criacao/subida dos containers locais.
- `npx supabase init` - passou.
- `npx supabase start` - passou apos ajuste de portas locais.
- `npx supabase db push --local` - passou.
- Verificacao SQL de schema - `PUBLIC_DOSSIER_FEATURES_SCHEMA_OK`.
- `npm run lint` - passou.
- `npm run typecheck` - passou.
- `npm run build` - passou.
- `npm run verify` - passou.

## Ambiente dos smokes

Variaveis usadas:

- `NEXT_PUBLIC_SITE_URL=http://localhost:3002`
- `NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:55431`
- chaves locais padrao do Supabase CLI.

Nao houve deploy, Vercel ou smoke contra `https://comunvrabandonada.vercel.app`.
