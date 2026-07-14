# Supabase

## Migrations

A migration inicial cria:

- `comun_reports`
- `comun_communities`
- `comun_issues`
- `comun_dossiers`
- `comun_actions`
- `comun_admin_users`
- `comun_admin_audit_log`
- view `comun_public_reports`

Execute:

```bash
supabase login
supabase link --project-ref <SUPABASE_PROJECT_ID>
supabase db push
```

Se preferir via `npm`, use `npm run db:push` depois do `supabase link`.

Observacoes:

- a migration `supabase/migrations/202605070001_initial_comun.sql` e idempotente para comunidades, pautas e dossies iniciais via `on conflict do update`;
- ela pode ser aplicada com seguranca no projeto remoto sem duplicar seeds;
- se faltar token, projeto linkado ou acesso interativo, rode os tres comandos acima manualmente.

## RLS

Regras principais:

- visitantes podem inserir relatos;
- visitantes nao leem `comun_reports` diretamente;
- leitura publica usa `comun_public_reports`;
- `raw_text`, `private_contact` e `internal_notes` nao aparecem na view;
- admin usa `SUPABASE_SERVICE_ROLE_KEY` apenas em server actions/pages do servidor.
- admin de runtime usa Supabase Auth com cookies SSR;
- acesso interno exige usuario autenticado e allowlist ativa em `comun_admin_users`;
- tabelas de admin e auditoria ficam fechadas por RLS para chave anon.

## Seeds

A migration inclui comunidades, pautas e dossie inicial. `npm run seed` executa `supabase db reset`, entao use com cuidado em ambiente local.

## Storage

Storage fica preparado como decisao arquitetural, mas upload complexo nao entra no MVP para nao atrasar o fluxo relato -> curadoria -> publicacao sanitizada.

## Primeiro admin

1. Crie o usuario no painel Supabase Auth.
2. Rode localmente ou em ambiente administrativo:

```bash
npm run bootstrap:admin -- --email email@exemplo.com
```

O script usa `SUPABASE_SERVICE_ROLE_KEY`, nao imprime segredos e ativa `role=admin` em `comun_admin_users`.
