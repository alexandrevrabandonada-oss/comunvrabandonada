# Tijolo 23 - Security audit

## Ambiente

- Ambiente usado: local.
- Banco usado: Supabase linkado/autorizado via CLI.
- Deploy executado: nao.
- Check em producao executado: nao.
- Envio externo executado: nao.

## Controles

- `/comun/admin/equipe` exige `requireComunAdminRole(["admin"])`.
- Usuario sem perfil ativo e redirecionado em helpers centrais para acoes criticas.
- Perfis inativos nao passam como responsaveis novos.
- Revisao por perfil inativo segue bloqueada pela exigencia de perfil ativo.
- Publicacao por perfil inativo segue bloqueada pela exigencia de perfil ativo.
- Papel invalido e normalizado para `viewer`.
- Ultimo admin ativo nao pode ser desativado nem perder papel admin.
- Notas operacionais sao curtas e admin-only.

## Auditoria

- `admin_profile_created`;
- `admin_profile_updated`;
- `admin_profile_role_changed`;
- `admin_profile_deactivated`;
- `admin_profile_reactivated`;
- `admin_profile_auth_link_changed`;
- `admin_team_access_denied`;
- `admin_last_admin_protection_triggered`;
- `admin_permission_matrix_denied`.

## Publico

Rota publica nao foi alterada. Smoke confirmou que e-mails, perfis, papeis internos e nota operacional de teste nao aparecem publicamente.

## Conclusao

Sem vazamento publico detectado no escopo do Tijolo 23.
