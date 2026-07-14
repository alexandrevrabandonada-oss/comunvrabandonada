# Release candidate manifest

Versao/codename: `COMUN-RC-local-2026-07-08`

Data: 2026-07-08

Commit atual: `b905aeb`

Ambiente de validacao: local-first, Supabase local via Docker, Next local em `http://localhost:3000`.

Deploy: nao executar neste pacote.

Banco remoto: nao tocar neste pacote.

## Migrations incluidas

- `202605070001_initial_comun.sql`
- `202605200001_admin_auth.sql`
- `202605270002_protocol_follow_rate_limit.sql`
- `202605280001_quick_report_photo_location.sql`
- `202605310001_attachment_curation.sql`
- `202607070001_official_protocols.sql`
- `20260707182045_pauta_spaces.sql`
- `20260707191614_pauta_contribution_safety.sql`
- `20260707201244_pauta_editorial_quality.sql`
- `20260707203422_pauta_dossier_drafts.sql`
- `20260707213246_pauta_dossier_publication_workflow.sql`
- `20260707232209_pauta_dossier_double_review.sql`
- `20260708024032_pauta_dossier_review_ops.sql`
- `20260708030426_admin_notifications.sql`
- `20260708031446_reviewer_identity_permissions.sql`
- `20260708140650_admin_team_management.sql`
- `20260708141916_dossier_publication_snapshots.sql`
- `20260708150335_public_dossier_page_metadata.sql`
- `20260708163526_public_dossier_features.sql`
- `20260708173035_harden_official_protocols_rls.sql`
- `20260708174621_harden_pauta_contributions_rls.sql`
- `20260708175500_harden_internal_comun_rls_matrix.sql`
- `20260708181116_harden_pauta_synthesis_versions_rls.sql`
- `20260708182545_restore_public_safe_api_grants.sql`
- `20260708182643_restore_service_role_comun_table_grants.sql`
- `20260708182724_restore_public_reports_view_grants.sql`

## Comandos de validacao local

- `npm run lint`
- `npm run typecheck`
- `npm run build`
- `npm run verify`
- `npm run audit:rls-matrix`
- `npm run verify:rc-local`

## Status dos smokes

Baseado no Tijolo 32: todos os smokes principais passaram em `verify:rc-local`, incluindo `RLS_MATRIX_OK` e `RLS_MATRIX_SMOKE_OK`.

## Riscos restantes

- Usuario admin real de producao precisa existir no Supabase Auth antes do deploy.
- Backup de banco remoto precisa ser confirmado antes de migrations remotas.
- Validacao de producao so pode ocorrer com autorizacao humana explicita e `ALLOW_PRODUCTION_CHECKS=1`.

## Decisao recomendada

Recomendacao tecnica: `GO_CONDICIONAL`.

Condicao: decisao humana deve confirmar backup, admin real preparado, janela de release e autorizacao explicita para producao.
