# Tijolo 32 - Verify

Ambiente: local, Supabase local via Docker.

Deploy: nao houve.

Checks contra producao: nao houve.

## Comandos executados

- `npx supabase start` - passou.
- `npx supabase db reset --local` - passou.
- `npm run lint` - passou.
- `npm run typecheck` - passou.
- `npm run build` - passou.
- `npm run verify` - passou.
- `npm run audit:rls-matrix` - passou com `RLS_MATRIX_OK`.
- `npm run verify:rc-local` - passou com codigo 0.

## Comando agregado

Foi criado:

```bash
npm run verify:rc-local
```

O comando aborta se `NEXT_PUBLIC_SITE_URL` nao apontar para `localhost` ou `127.0.0.1`, roda checks locais, sobe Next local, executa smokes principais e encerra o servidor ao final.
