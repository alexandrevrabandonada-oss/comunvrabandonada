# Tijolo 28-R1 - Auditoria de seguranca

Data: 2026-07-08
Ambiente: local

## Banco

`comun_public_dossier_features`:

- RLS habilitado;
- `anon` sem acesso direto;
- `authenticated` sem acesso direto;
- `service_role` com acesso server-side;
- tabela referencia snapshots publicos, nao rascunhos internos.

## Ausencia publica confirmada

O smoke confirmou que os fluxos publicos nao exibem:

- `internal_notes`;
- `review_notes_internal`;
- `unpublish_reason`;
- motivo interno;
- responsavel/revisor;
- `comun_admin_profiles`;
- e-mails;
- `storage_path`;
- `signed_url`;
- `private_contact`;
- `raw_text`;
- `response_text`;
- `checklist`;
- auditoria.

## Limites

Nao houve teste contra producao publica.

Advisor local apontou RLS desabilitado em `public.comun_official_protocols`. Essa pendencia e externa ao Tijolo 28-R1 e nao foi alterada automaticamente.
