# Tijolo 29 - Auditoria RLS

Data: 2026-07-08
Ambiente: Supabase local

## Auditoria inicial

Tabela com RLS desabilitado:

- `public.comun_official_protocols`

Risco:

- Critico, porque a tabela armazena `response_text`, `internal_notes`, status operacional, numero oficial e vinculo com relato.
- Com RLS desabilitado e grants herdados, `anon` e `authenticated` tinham potencial de acesso direto pela Data API.

## Grants herdados observados

Varias tabelas publicas antigas ainda possuem grants diretos para `anon`/`authenticated`, mas estao com RLS habilitado. Algumas policies publicas sao intencionais, como leitura de comunidades/pautas publicas e insercao de relatos; outras sao bloqueadoras (`USING false`).

Tabelas internas ja sem acesso direto observadas:

- `comun_admin_notifications`
- `comun_admin_profiles`
- `comun_pauta_dossiers`
- `comun_pauta_dossier_reviews`
- `comun_pauta_dossier_evidence`
- `comun_pauta_dossier_publication_snapshots`
- `comun_public_dossier_features`

## Correcao aplicada

Migration:

- `20260708173035_harden_official_protocols_rls.sql`

SQL efetivo:

- `alter table public.comun_official_protocols enable row level security;`
- `revoke all on table public.comun_official_protocols from anon;`
- `revoke all on table public.comun_official_protocols from authenticated;`
- `grant select, insert, update, delete on table public.comun_official_protocols to service_role;`

## Auditoria final

Resultado:

`OFFICIAL_PROTOCOLS_RLS_OK`

Estado final:

- `rls_enabled`: true
- `anon_select`: false
- `authenticated_select`: false
- `service_role_select`: true
