# Tijolo 20-R1 - Verify

## Ambiente

- Ambiente usado: local para app e smokes HTTP.
- Banco usado: Supabase linkado/autorizado via CLI.
- Deploy executado: nao.
- Check em producao executado: nao.
- `NEXT_PUBLIC_SITE_URL` dos smokes: `http://localhost:3000`.

## Comandos

- `npm run lint`: passou.
- `npm run typecheck`: passou.
- `npm run build`: passou.
- `npm run verify`: passou.
- `NEXT_PUBLIC_SITE_URL=http://localhost:3000 npm run smoke:pauta-dossier-review-queue`: passou.
- `NEXT_PUBLIC_SITE_URL=http://localhost:3000 npm run smoke:pauta-dossier-review-ops`: passou.

## Observacao

Uma primeira tentativa de `typecheck` foi executada em paralelo com `build` e falhou por corrida em `.next/types`. Reexecutado sozinho apos o build, passou.

## Conclusao

Verificacao final aprovada sem deploy e sem smoke contra producao.
