# Tijolo 22 - Identidade real de revisores, responsaveis e permissoes admin

## Ambiente

- Ambiente usado: local para app e smokes HTTP.
- Banco usado: Supabase linkado/autorizado via CLI.
- Deploy executado: nao.
- Check em producao executado: nao.
- Envio externo executado: nao.

## Implementado

- Migration `supabase/migrations/20260708031446_reviewer_identity_permissions.sql`.
- Tabela `comun_admin_profiles`.
- Perfis administrativos com papeis:
  - `admin`;
  - `editor`;
  - `factual_reviewer`;
  - `editorial_reviewer`;
  - `publisher`;
  - `viewer`.
- Revisoes agora aceitam `reviewer_user_id`.
- Dossies agora aceitam:
  - `factual_reviewer_assigned_user_id`;
  - `editorial_reviewer_assigned_user_id`.
- Notificacoes agora aceitam `assigned_to_user_id`.
- UI do dossie mostra usuario logado e papel/permissao.
- Registro de revisao usa perfil autenticado e bloqueia nome manual para aprovacao.
- Responsaveis sao escolhidos por perfis ativos.
- Fila mostra quando responsavel ainda e legado/textual.
- Notificacoes suportam filtro `Minhas pendencias`.

## Bloqueios

- Sem perfil ativo: revisao bloqueada.
- Sem papel factual/admin/editor: aprovacao factual bloqueada.
- Sem papel editorial/admin/editor: aprovacao editorial bloqueada.
- Sem papel publisher/admin: publicacao bloqueada.
- Mesma conta nao pode aprovar factual e editorial do mesmo dossie.
- Publicacao nova exige revisores reais distintos.

## Auditoria

- `admin_profile_created`;
- `admin_profile_updated`;
- `reviewer_identity_bound`;
- `review_permission_denied`;
- `review_same_user_blocked`;
- `dossier_publication_blocked_missing_reviewer_identity`;
- `review_assignee_user_changed`.

## Status final

Aceito localmente.
