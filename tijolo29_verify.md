# Tijolo 29 - Verify

Data: 2026-07-08
Ambiente: local
Supabase local: `http://127.0.0.1:55431`
Next local: `http://localhost:3000`

## Comandos executados

- `npm run lint` - passou
- `npm run typecheck` - passou
- `npm run build` - passou
- `npm run verify` - passou
- `npx supabase db lint --local` - passou

## Smokes executados

- `NEXT_PUBLIC_SITE_URL=http://localhost:3000 npm run smoke:official-protocol` - passou
- `NEXT_PUBLIC_SITE_URL=http://localhost:3000 npm run smoke:official-protocols-admin` - passou
- `NEXT_PUBLIC_SITE_URL=http://localhost:3000 npm run smoke:official-protocols-metrics` - passou
- `NEXT_PUBLIC_SITE_URL=http://localhost:3000 npm run smoke:no-leak-http` - passou
- `NEXT_PUBLIC_SITE_URL=http://localhost:3000 npm run smoke:rls-hardening` - passou

## Observacao

Foi necessario criar um fixture local sanitizado para o smoke legado `smoke:no-leak-http`, porque o Supabase local nao tinha o relato seedado esperado. O fixture foi removido apos os smokes.
