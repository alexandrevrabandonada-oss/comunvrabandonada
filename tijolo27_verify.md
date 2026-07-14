# Tijolo 27 - Verify

Data: 2026-07-08
Ambiente: local
Deploy: nao executado
Checks em producao: nao executados

## Comandos executados

- `npm run lint` - passou
- `npm run typecheck` - passou
- `npm run build` - passou
- `npm run verify` - passou
- `NEXT_PUBLIC_SITE_URL=http://localhost:3000 npm run smoke:dossier-publication-snapshots` - passou
- `NEXT_PUBLIC_SITE_URL=http://localhost:3000 npm run smoke:public-dossier-page` - passou
- `NEXT_PUBLIC_SITE_URL=http://localhost:3000 npm run smoke:public-dossier-index` - passou
- `NEXT_PUBLIC_SITE_URL=http://localhost:3000 npm run smoke:public-dossier-navigation` - passou

## Observacoes

- `npm run verify` aponta para `verify:local`, preservando a regra local-first.
- Nenhum comando de deploy foi executado.
- Nenhum smoke foi executado com `NEXT_PUBLIC_SITE_URL` apontando para producao.
