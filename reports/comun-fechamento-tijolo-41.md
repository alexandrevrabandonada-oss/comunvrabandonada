# Fechamento do Tijolo 41 — hardening aplicável pelo modo solo

Atualizado em 23 de julho de 2026.

## Resultado

O bloqueio impossível de `SET ROLE supabase_admin` foi removido sem esconder
risco. Defaults pertencentes a `postgres` continuam bloqueantes e são
corrigidos; defaults internos de `supabase_admin` ficam em snapshot informativo
com quantidade e hash monitorados.

## Release

- migration:
  `supabase/migrations/20260723220112_comun_canonical_security_hardening.sql`;
- ledger: `public.comun_schema_releases`;
- pré:
  `b4d66ad06d1aba22930609f58b0ea1696fbfe5747a21f141dcedc97766d672de`;
- pós esperado:
  `82989755711d63a14d209cc2074fd3656288e74fb030331dac282acac7a8265b`;
- achados bloqueantes esperados: 0;
- observações de plataforma permitidas: sim.

O ledger é criado na mesma transação, tem RLS, não concede acesso público e
recusa checksum ou fingerprints divergentes. O runner não altera
`supabase_migrations.schema_migrations`, não usa `db push` e não usa migration
repair.

## CI anterior

O run `30049509881`, job `89348409696`, falhou em
`supabase db reset --local --yes`: depois de aplicar migrations e seed, o
restart dos containers retornou HTTP 502. Código de saída 1. Não foi falha de
SQL, lint, RLS ou fixtures.

O CI agora separa start, reset, lint, RLS, ledger, onboarding, view e fixtures.
Somente o erro textual `Error status 502` permite uma repetição técnica.

## Declarações

- migration remota: não executada;
- promoção: não executada;
- merge: não executado;
- domínio e produção: inalterados;
- dados reais: não utilizados;
- decisão após os gates do HEAD final:
  `COMUN_SECURITY_HARDENING_READY_TO_PROMOTE`.
