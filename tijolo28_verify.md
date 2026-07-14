# Tijolo 28 - Verify

Data: 2026-07-08
Ambiente: local
Deploy: nao executado
Checks em producao: nao executados

## Comandos executados

- `npm run lint` - passou
- `npm run typecheck` - passou
- `npm run build` - passou
- `npm run verify` - passou
- `NEXT_PUBLIC_SITE_URL=http://localhost:3000 npm run smoke:public-dossier-index` - passou
- `NEXT_PUBLIC_SITE_URL=http://localhost:3000 npm run smoke:public-dossier-navigation` - passou
- `NEXT_PUBLIC_SITE_URL=http://localhost:3000 npm run smoke:public-dossier-features` - bloqueado por migration nao aplicada

## Falha conhecida

`smoke:public-dossier-features` falhou com:

`Could not find the table 'public.comun_public_dossier_features' in the schema cache`

## Banco

- Migration local criada: `20260708163526_public_dossier_features.sql`.
- Supabase local indisponivel por Docker/Postgres local nao ativo.
- Migration nao aplicada em banco remoto vinculado por regra local-first.
