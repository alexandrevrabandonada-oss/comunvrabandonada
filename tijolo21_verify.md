# Tijolo 21 - Verify

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

## Build

O build confirmou a rota:

```text
/comun/admin/notificacoes
```

## Conclusao

Verificacao local aprovada.
