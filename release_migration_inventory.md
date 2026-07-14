# Release migration inventory

| Migration | Estrutural | RLS/grants | Cria tabelas | Publicacao publica | Atencao em producao |
| --- | --- | --- | --- | --- | --- |
| `202605070001_initial_comun.sql` | sim | sim | sim | sim | base inicial e policies publicas |
| `202605200001_admin_auth.sql` | sim | sim | sim | nao | admin auth/auditoria |
| `202605270002_protocol_follow_rate_limit.sql` | sim | sim | sim | sim | rate limit e consulta publica |
| `202605280001_quick_report_photo_location.sql` | sim | sim | sim | sim | localizacao/anexos privados |
| `202605310001_attachment_curation.sql` | sim | nao | nao | sim | curadoria de anexos |
| `202607070001_official_protocols.sql` | sim | parcial | sim | sim | protocolos oficiais e respostas |
| `20260707182045_pauta_spaces.sql` | sim | sim | sim | sim | pautas e contribuicoes |
| `20260707191614_pauta_contribution_safety.sql` | sim | nao | nao | sim | hashes/rate limit de contribuicao |
| `20260707201244_pauta_editorial_quality.sql` | sim | sim | sim | sim | historico editorial/evidencias |
| `20260707203422_pauta_dossier_drafts.sql` | sim | sim | sim | nao | rascunhos internos de dossies |
| `20260707213246_pauta_dossier_publication_workflow.sql` | sim | nao | nao | sim | campos publicos revisados |
| `20260707232209_pauta_dossier_double_review.sql` | sim | sim | sim | sim | dupla revisao |
| `20260708024032_pauta_dossier_review_ops.sql` | sim | nao | nao | nao | responsaveis, prioridade e prazo |
| `20260708030426_admin_notifications.sql` | sim | sim | sim | nao | notificacoes internas |
| `20260708031446_reviewer_identity_permissions.sql` | sim | sim | sim | nao | perfis reais e permissoes |
| `20260708140650_admin_team_management.sql` | sim | sim | nao | nao | gestao de equipe |
| `20260708141916_dossier_publication_snapshots.sql` | sim | sim | sim | sim | snapshots, rollback e despublicacao |
| `20260708150335_public_dossier_page_metadata.sql` | sim | nao | nao | sim | metadados publicos |
| `20260708163526_public_dossier_features.sql` | sim | sim | sim | sim | destaques publicos via servidor |
| `20260708173035_harden_official_protocols_rls.sql` | nao | sim | nao | nao | fecha protocolos oficiais |
| `20260708174621_harden_pauta_contributions_rls.sql` | nao | sim | nao | nao | fecha contribuicoes diretas |
| `20260708175500_harden_internal_comun_rls_matrix.sql` | nao | sim | nao | nao | fecha tabelas internas sensiveis |
| `20260708181116_harden_pauta_synthesis_versions_rls.sql` | nao | sim | nao | nao | remove ultimo `needs_review` |
| `20260708182545_restore_public_safe_api_grants.sql` | nao | sim | nao | sim | restaura grants publicos minimos |
| `20260708182643_restore_service_role_comun_table_grants.sql` | nao | sim | nao | nao | preserva operacao server-side |
| `20260708182724_restore_public_reports_view_grants.sql` | nao | sim | nao | sim | libera view sanitizada |

## Atencao especial

- Confirmar backup antes das migrations remotas.
- Aplicar migrations em ordem exata.
- Confirmar buckets privados antes de aceitar relatos com anexos.
- Confirmar matriz RLS apos migrations remotas antes de qualquer divulgacao publica.
