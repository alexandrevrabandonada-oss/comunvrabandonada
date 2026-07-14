# Tijolo 25 - Verify

Data: 2026-07-08

Ambiente: local-first.  
Deploy: nao executado.  
Checks em producao: nao executados.

## Migration

- `npx supabase db push --linked --dry-run`: passou.
- `npx supabase db push --linked --yes`: passou.
- Migration aplicada: `20260708150335_public_dossier_page_metadata.sql`.

## Comandos locais

- `npm run lint`: passou.
- `npm run typecheck`: passou.
- `npm run build`: passou.
- `npm run verify`: passou.

## Servidor local

- URL usada para smokes HTTP: `http://localhost:3000`.
- Servidor local iniciado apenas para os smokes e encerrado ao final.
