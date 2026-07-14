# Tijolo 24 - Verify

Data: 2026-07-08

Ambiente: local-first.  
Deploy: nao executado.  
Checks em producao: nao executados.

## Migration

- `npx supabase db push --linked --dry-run`: passou.
- `npx supabase db push --linked --yes`: passou.
- Migration aplicada: `20260708141916_dossier_publication_snapshots.sql`.
- Observacao: Postgres truncou o nome de uma constraint longa, sem bloquear a aplicacao.

## Comandos

- `npm run lint`: passou.
- `npm run typecheck`: passou.
- `npm run build`: passou.
- `npm run verify`: passou.

## Servidor local

- URL usada para smokes HTTP: `http://127.0.0.1:3001`.
- A porta `3000` estava ocupada, entao foi usada `3001`.

## Fechamento R1

- `npm run lint`: passou.
- `npm run typecheck`: passou.
- `npm run build`: passou.
- `npm run verify`: passou.
- URL usada no aceite R1: `http://localhost:3000`.
- A porta `3000` foi reiniciada localmente porque o processo Next anterior respondia 500 apos build.
- Deploy: nao executado.
- Checks em producao: nao executados.
