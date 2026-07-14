# Tijolo 30 - Matriz RLS completa e security gate do COMUN

Data: 2026-07-08

Ambiente usado: local-first, Supabase local via Docker.

Deploy: nao houve.

Checks contra producao: nao houve.

Banco remoto: nao tocado.

## Implementacao

- Criada matriz RLS automatica em `docs/comun-rls-matrix.md`.
- Criado auditor `scripts/audit-comun-rls-matrix.mjs`.
- Criado comando `npm run audit:rls-matrix`.
- Criado security gate `scripts/smoke-comun-rls-matrix.mjs`.
- Criado comando `npm run smoke:rls-matrix`.
- Criada migration `supabase/migrations/20260708175500_harden_internal_comun_rls_matrix.sql`.

## Correcao aplicada

A auditoria local inicial encontrou grants diretos de `SELECT` para `anon`/`authenticated` em tabelas internas e uma policy publica legada em `comun_pauta_contributions`.

A migration local:

- removeu `SELECT` publico de `comun_admin_audit_log`;
- removeu `SELECT` publico de `comun_admin_users`;
- removeu grants publicos de `comun_pauta_contributions`;
- removeu a policy publica legada de leitura de `comun_pauta_contributions`;
- removeu `SELECT` publico de `comun_public_lookup_events`;
- removeu `SELECT` publico de `comun_report_attachments`;
- manteve `service_role` para acesso server-side.

## Resultado

`npm run audit:rls-matrix` terminou com `RLS_MATRIX_OK`.

`npm run smoke:rls-matrix` terminou com `RLS_MATRIX_SMOKE_OK`.

## Observacao

`comun_pauta_synthesis_versions` ficou classificada como `needs_review`: RLS esta ligado e nao ha policy publica, mas existem grants herdados. Nao foi revogado neste tijolo por nao haver smoke especifico de fluxo publico dessa tabela.
