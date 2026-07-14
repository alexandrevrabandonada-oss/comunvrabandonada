# Tijolo 29 - Hardening RLS de protocolos oficiais

Data: 2026-07-08
Ambiente: local-first
Banco: Supabase local via Docker
Deploy: nao executado
Smoke contra producao: nao executado
Banco remoto: nao tocado

## Implementado

- Criada migration `supabase/migrations/20260708173035_harden_official_protocols_rls.sql`.
- `public.comun_official_protocols` agora tem RLS habilitado.
- Grants diretos de `anon` e `authenticated` foram revogados.
- `service_role` manteve acesso server-side para rotas e funcoes administrativas.
- Criado smoke `scripts/smoke-comun-rls-hardening.mjs`.
- Adicionado comando `npm run smoke:rls-hardening`.

## Resultado principal

`OFFICIAL_PROTOCOLS_RLS_OK`

`RLS_HARDENING_SMOKE_OK`

## Escopo

O hardening corrigiu a tabela sensivel obrigatoria `comun_official_protocols`. A auditoria tambem encontrou grants herdados em outras tabelas publicas, mas muitas estao protegidas por RLS/policies publicas intencionais ou bloqueadoras. Elas foram registradas no relatorio de auditoria sem mudanca automatica.

## Sem producao

Nao houve deploy, Vercel, smoke contra `https://comunvrabandonada.vercel.app` ou `db push` remoto.
