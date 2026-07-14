# Tijolo 32 - Smoke matrix

Ambiente: local.

Site usado: `http://localhost:3000`.

Supabase usado: local via Docker.

Deploy: nao houve.

Checks contra producao: nao houve.

## Smokes aprovados

- `smoke:comun`
- `smoke:admin-auth`
- `smoke:no-leak-http`
- `smoke:quick-report`
- `smoke:attachment-curation`
- `smoke:official-protocol`
- `smoke:official-protocols-admin`
- `smoke:official-protocols-metrics`
- `smoke:pauta-spaces`
- `smoke:pauta-contribution-safety`
- `smoke:pauta-editorial-quality`
- `smoke:pauta-dossier-draft`
- `smoke:pauta-dossier-publication`
- `smoke:pauta-dossier-double-review`
- `smoke:pauta-dossier-review-queue`
- `smoke:pauta-dossier-review-ops`
- `smoke:admin-notifications`
- `smoke:reviewer-identity`
- `smoke:admin-team`
- `smoke:dossier-publication-snapshots`
- `smoke:public-dossier-page`
- `smoke:public-dossier-index`
- `smoke:public-dossier-navigation`
- `smoke:public-dossier-features`
- `smoke:rls-hardening`
- `smoke:rls-matrix`

## Observacoes

O fixture de `smoke:no-leak-http` e criado e removido pelo agregador local.

`storage:setup` e parte da RC local para garantir buckets privados antes dos smokes de anexo.
