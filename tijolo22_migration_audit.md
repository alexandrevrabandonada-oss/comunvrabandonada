# Tijolo 22 - Migration audit

## Ambiente

- Banco usado: Supabase linkado/autorizado via CLI.
- Deploy executado: nao.
- Check em producao executado: nao.

## Migration

Arquivo:

```text
supabase/migrations/20260708031446_reviewer_identity_permissions.sql
```

Dry-run:

```text
Would push these migrations:
 • 20260708031446_reviewer_identity_permissions.sql
```

Aplicacao:

```text
Applying migration 20260708031446_reviewer_identity_permissions.sql...
```

Confirmacao:

```text
REVIEWER_IDENTITY_SCHEMA_OK
```

## Compatibilidade

- Revisões antigas nao sao removidas.
- `reviewer_name` e `reviewer_role` continuam como snapshot historico.
- `reviewer_user_id` fica nulo para legado.
- Publicacao nova exige identidade real; legado sem `reviewer_user_id` nao fecha o criterio.
- Responsaveis textuais antigos continuam visiveis como fallback, marcados como legado quando nao ha perfil vinculado.

## Seguranca

`comun_admin_profiles` foi criada com RLS habilitado, acesso revogado de `anon/authenticated` e grant para `service_role`.
