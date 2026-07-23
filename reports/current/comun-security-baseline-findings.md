# Achados do baseline de segurança

Captura read-only: 23 de julho de 2026. Nenhum objeto remoto foi alterado.

Resultado: `COMUN_BASELINE_SECURITY_FINDINGS`

## Resumo

| Classificação | Quantidade | Objetos |
| --- | ---: | --- |
| `EXCESS_PRIVILEGE` | 4 | grants `TRUNCATE` e `TRIGGER` da view `comun_public_reports` para `anon` e `authenticated` |
| `DEFAULT_PRIVILEGE_RISK` | 5 | defaults de tabelas, sequences e funções para `anon`/`authenticated` |
| `VIEW_SECURITY_RISK` | 1 | `comun_public_reports` sem `security_invoker=true` |
| `FUNCTION_SECURITY_RISK` | 2 | funções definer com `search_path=public` |

Não foram encontrados:

- tabelas públicas expostas com RLS desabilitada;
- `CREATE` em `public` para `PUBLIC`, `anon` ou `authenticated`;
- bucket privado marcado como público;
- `EXECUTE` atual das duas funções definer para papéis públicos;
- policy de Storage expondo localizador privado.

Os quatro buckets do COMUN foram capturados; os buckets de originais permanecem
privados. A ausência de policies internas de Storage é informativa neste
contrato server-side e não concede acesso por si só.

## Achados

### `comun_public_reports`

- `anon`: `TRUNCATE`, `TRIGGER`;
- `authenticated`: `TRUNCATE`, `TRIGGER`;
- view exposta sem `security_invoker=true`.

Classificação: `EXCESS_PRIVILEGE` e `VIEW_SECURITY_RISK`.
Tratamento: `REQUIRES_FORWARD_ONLY_MIGRATION`.

### Funções definer

- `public.claim_next_archive_processing_job(text)`: `search_path=public`;
- `public.handle_new_user()`: `search_path=public`.

O `EXECUTE` atual está restrito a `postgres` e `service_role`, mas o
`search_path` não satisfaz a assertiva fail-closed.

Classificação: `FUNCTION_SECURITY_RISK`.
Tratamento: `REQUIRES_FORWARD_ONLY_MIGRATION`.

### Default privileges

Foram observados defaults perigosos de `postgres` e `supabase_admin` no schema
`public`, incluindo privilégios automáticos de tabelas, sequences e funções
para `anon` e `authenticated`.

Classificação: `DEFAULT_PRIVILEGE_RISK`.
Tratamento: `REQUIRES_FORWARD_ONLY_MIGRATION`.

## Plano mínimo para o próximo tijolo

O próximo tijolo deve criar uma migration forward-only, revisada separadamente:

```sql
alter default privileges for role postgres in schema public
  revoke all on tables from anon, authenticated;
alter default privileges for role postgres in schema public
  revoke all on sequences from anon, authenticated;
alter default privileges for role postgres in schema public
  revoke execute on functions from public, anon, authenticated;

alter default privileges for role supabase_admin in schema public
  revoke all on tables from anon, authenticated;
alter default privileges for role supabase_admin in schema public
  revoke all on sequences from anon, authenticated;
alter default privileges for role supabase_admin in schema public
  revoke execute on functions from public, anon, authenticated;

revoke all privileges on table public.comun_public_reports
  from public, anon, authenticated;
alter view public.comun_public_reports set (security_invoker = true);
grant select on table public.comun_public_reports to anon, authenticated;
```

As duas funções devem ter referências qualificadas e `search_path` fixado em
`pg_catalog`; seus corpos precisam ser revisados antes do SQL definitivo.

Assertions da migration:

- ausência de grants perigosos;
- defaults sem concessões automáticas;
- view `security_invoker`;
- funções definer com `search_path` seguro;
- RLS preservada;
- contratos públicos de leitura preservados.

Rollback lógico forward-compatible: nova migration que restaure somente os
grants explicitamente justificados, nunca rollback destrutivo ou
`migration repair`.

Impacto esperado: nenhum dado alterado; permissões futuras ficam deny-by-default
e a view passa a respeitar RLS das relações subjacentes.

