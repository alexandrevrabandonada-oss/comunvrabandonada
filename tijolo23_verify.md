# Tijolo 23 - Verify

## Ambiente

- Ambiente usado: local.
- Banco usado: Supabase linkado/autorizado via CLI.
- Deploy executado: nao.
- Check em producao executado: nao.
- URL dos smokes: `http://localhost:3000`.

## Comandos

- `npm run lint`: passou.
- `npm run typecheck`: passou.
- `npm run build`: passou.
- `npm run verify`: passou.
- `NEXT_PUBLIC_SITE_URL=http://localhost:3000 npm run smoke:pauta-dossier-review-queue`: passou.
- `NEXT_PUBLIC_SITE_URL=http://localhost:3000 npm run smoke:pauta-dossier-review-ops`: passou.
- `NEXT_PUBLIC_SITE_URL=http://localhost:3000 npm run smoke:admin-notifications`: passou.
- `NEXT_PUBLIC_SITE_URL=http://localhost:3000 npm run smoke:reviewer-identity`: passou.
- `NEXT_PUBLIC_SITE_URL=http://localhost:3000 npm run smoke:admin-team`: passou.

## Build

O build confirmou a rota:

```text
/comun/admin/equipe
```

## Conclusao

Verificacao local aprovada.
