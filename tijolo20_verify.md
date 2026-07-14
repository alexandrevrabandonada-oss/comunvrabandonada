# Tijolo 20 - Verify

## Ambiente

- Ambiente usado: local.
- Deploy executado: nao.
- Check em producao executado: nao.
- Local-only: sim.

## Comandos executados

- `npm run lint`: passou.
- `npm run typecheck`: passou.
- `npm run build`: passou.
- `npm run verify`: passou e delegou para `verify:local`.
- `NEXT_PUBLIC_SITE_URL=http://localhost:3000 npm run smoke:pauta-dossier-review-queue`: passou.
- `NEXT_PUBLIC_SITE_URL=http://localhost:3000 npm run smoke:pauta-dossier-review-ops`: passou no fechamento R1.

## Conclusao

Build local aprovado. Smoke operacional aprovado no R1, sem deploy e sem tocar producao.
