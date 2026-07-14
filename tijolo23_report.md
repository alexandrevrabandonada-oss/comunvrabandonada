# Tijolo 23 - Gestao de equipe admin e matriz de permissoes

## Ambiente

- Ambiente usado: local para app e smokes HTTP.
- Banco usado: Supabase linkado/autorizado via CLI.
- Deploy executado: nao.
- Check em producao executado: nao.
- Envio externo executado: nao.

## Implementado

- Rota admin `/comun/admin/equipe`.
- Link `Equipe` no shell admin.
- Filtros por papel, status ativo/inativo e busca por nome/e-mail.
- Indicador de perfis sem `auth_user_id`.
- Criacao e edicao de perfil administrativo.
- Edicao de nome publico, e-mail, papel, status ativo, vinculo `auth_user_id` e nota operacional curta.
- Helper central:
  - `requireComunAdminProfile`;
  - `requireComunAdminRole`;
  - `canReviewFactual`;
  - `canReviewEditorial`;
  - `canPublishDossier`;
  - `canManageAdminTeam`.
- Protecao contra remover/desativar o ultimo admin ativo.
- Smoke novo `npm run smoke:admin-team`.

## Migration

Aplicada:

```text
supabase/migrations/20260708140650_admin_team_management.sql
```

Confirmacao:

```text
ADMIN_TEAM_SCHEMA_OK
```

## Status final

Aceito localmente.
