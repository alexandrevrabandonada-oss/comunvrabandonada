# Fechamento do Tijolo 41 — hardening aplicável pelo modo solo

Atualizado em 24 de julho de 2026.

## Resultado

O bloqueio impossível de `SET ROLE supabase_admin` foi removido sem esconder
risco. Defaults pertencentes a `postgres` continuam bloqueantes e são
corrigidos; defaults internos de `supabase_admin` ficam em snapshot informativo
com quantidade e hash monitorados.

## Release

- migration:
  `supabase/migrations/20260723220112_comun_canonical_security_hardening.sql`;
- checksum:
  `8e97a8c1fbb45f4143894294cf52289795d4461e58b33c72034e0ccb1a0c5dae`;
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

## Fechamento dos gates

- HEAD técnico:
  `9ea9cc8b2cfaee6303fcd1ee8abe15e65c609107`;
- captura sanitizada em dois ensaios: run `30054188587`, sucesso;
- FAST: run `30054740000`, sucesso;
- FULL: run `30054740000`, sucesso;
- Vercel Preview: sucesso;
- unitários locais: 256/256;
- npm audit geral e produção: zero vulnerabilidades.

O primeiro FULL intermediário revelou que o postflight legado aceitava apenas
`search_path=public`. A asserção foi corrigida para aceitar os caminhos
explícitos seguros `public` e `pg_catalog`. No HEAD final, os dois ensaios de
reconciliação, fingerprints, idempotência, regressões, no-leak e cleanup
passaram.

## Declarações

- migration remota: não executada;
- promoção concluída: não; tentativa interrompida antes da migration;
- merge: não executado;
- domínio e produção: inalterados;
- dados reais: não utilizados;
- decisão após os gates do HEAD final:
  `COMUN_SECURITY_HARDENING_READY_TO_PROMOTE`.

## Tentativa de promoção final

Em 24 de julho de 2026, a label `comun:promover` iniciou o run
`30057245879` no HEAD imutável
`9ea9cc8b2cfaee6303fcd1ee8abe15e65c609107`.

O checkpoint sanitizado foi criado com sucesso no artefato `8583227864`. O
runner forward-only falhou em seguida com o marcador sanitizado
`SOLO_FORWARD_ONLY_FAILED`, antes do merge. Nenhuma repetição automática foi
executada.

A captura read-only pós-falha, run `30057335078`, comprovou:

- fingerprint remoto ainda no pré:
  `b4d66ad06d1aba22930609f58b0ea1696fbfe5747a21f141dcedc97766d672de`;
- 9 achados bloqueantes;
- 1 observação de plataforma e 3 defaults gerenciados preservados;
- `public.comun_schema_releases` ausente;
- main ainda em `b2f6733dacd15ec21601ed6b6837b42213b87d70`;
- PR aberta e label de promoção removida;
- nenhum merge, deployment de main ou alteração de domínio.

Decisão operacional da tentativa: `SOLO_PROMOTION_FAILED`.

## Correção final do runner

A falha foi reproduzida localmente com PostgreSQL 17. O `psql` sem formato
canônico devolvia cabeçalho, separador, JSON e `(1 row)`; o runner tentava
interpretar todo esse bloco com `JSON.parse`. A exceção nativa também não
ganhava marcador específico antes de chegar ao fallback do workflow.

O runner agora:

- separa transação (`executeSql`), JSON (`queryJson`) e escalar
  (`queryScalar`);
- usa `--no-psqlrc`, `ON_ERROR_STOP=1`, `--tuples-only`, `--no-align` e
  `--quiet` nas consultas;
- rejeita saída vazia, tabular, múltiplas linhas, ledger divergente e falhas de
  processo com marcadores sanitizados;
- oferece `--read-only-preflight`, sem `BEGIN`, migration, ledger, policy,
  cleanup, merge ou domínio;
- cobre transporte, fingerprint e ledger em PostgreSQL 17 real.

A migration permanece byte a byte idêntica, com checksum
`8e97a8c1fbb45f4143894294cf52289795d4461e58b33c72034e0ccb1a0c5dae`.
O novo HEAD só será declarado pronto para nova autorização depois de FAST,
FULL, Vercel e preflight remoto read-only verdes. Nenhuma nova tentativa de
promoção faz parte deste lote.

## Validação final do runner

O primeiro preflight read-only (`30061056715`) identificou uma segunda causa
local: o baseline compacto restringe triggers ao escopo canônico público, mas a
validação procurava nele o trigger `auth.on_auth_user_created`. A correção usa
uma consulta escalar separada a `pg_catalog`, exige contagem exatamente `1` e
mantém a projeção compacta inalterada.

No HEAD técnico `12fbb437324086f92d8beefc586d335b5652f8ed`:

- FAST e FULL: run `30061223511`, sucesso;
- Vercel Preview: sucesso;
- preflight read-only: run `30062302321`, sucesso;
- fingerprint pré: `b4d66ad06d1aba22930609f58b0ea1696fbfe5747a21f141dcedc97766d672de`;
- 9 bloqueantes, 1 observação de plataforma e ledger ausente;
- marcador final: `COMUN_CANONICAL_RELEASE_REMOTE_READY`;
- FULL, cleanup, worker, health de produção e captura foram ignorados no
  preflight.

Decisão: `COMUN_SECURITY_HARDENING_READY_TO_RETRY_PROMOTION`. Esta decisão não
autoriza automaticamente a promoção; a label permanece ausente.
