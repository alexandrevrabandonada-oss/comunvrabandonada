# Achados do baseline de segurança

Atualizado em 24 de julho de 2026. Nenhuma escrita remota de banco ou produção
foi executada.

## Classificação canônica

O baseline agora separa o que o COMUN controla do que pertence à plataforma:

- `APP_BLOCKING_FINDINGS`: entram no fingerprint bloqueante e impedem promoção;
- `PLATFORM_MANAGED_OBSERVATIONS`: permanecem no snapshot informativo e geram
  alerta de drift, mas não exigem privilégios impossíveis do operador.

Antes do hardening, os achados bloqueantes do COMUN eram:

| Grupo | Quantidade | Correção |
|---|---:|---|
| grants perigosos na view | 4 | `REVOKE ALL` e somente `SELECT` |
| defaults pertencentes a `postgres` | 2 | revogação no schema `public` |
| view sem `security_invoker` | 1 | `security_invoker=true` |
| funções definer com search path inseguro | 2 | `search_path=pg_catalog` |

O contrato também verifica RLS, policy sanitizada, grants de coluna, funções,
trigger de onboarding, buckets privados e ledger. Resultado esperado após a
release: `COMUN_APP_SECURITY_OK`, com zero achados bloqueantes.

## Observações gerenciadas pela plataforma

Três default privileges cujo owner é `supabase_admin` permanecem observados:
tabelas, sequences e funções no schema `public`. O operador `postgres` não pode
assumir esse papel; a migration do COMUN não tenta alterá-los.

Snapshot informativo:

- owner: `supabase_admin`;
- quantidade: 3;
- hash sanitizado:
  `496707ca590762a609d53e2a592b79bf4307d2a7d4b99e1dbe504464197a610b`;
- estado: `COMUN_PLATFORM_DEFAULTS_OBSERVED`.

Mudança inesperada nesse hash continua falhando no verificador de drift. Toda
migration futura do COMUN, a partir de `20260723220112`, deve neutralizar
privilégios implícitos no próprio arquivo e passa por
`npm run db:privileges:lint`.

## Resultado comprovado

- bloqueantes antes: 9 no escopo controlável atual;
- bloqueantes depois: 0;
- observações de plataforma: 3 defaults, documentados e monitorados;
- captura sanitizada em dois ensaios: run `30054188587`, hashes coincidentes;
- FAST e FULL: run `30054740000`, sucesso no HEAD
  `9ea9cc8b2cfaee6303fcd1ee8abe15e65c609107`;
- dados alterados: nenhum;
- promoção remota: ainda não executada.
