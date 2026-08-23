# 48.1B-R1C — bridge de planejamento do ledger externo de Calçadas

## Contrato

O planejador A5-A1-R1 agora reconhece exclusivamente a exceção canônica
`20260724233256_comun_sidewalk_operational_hardening.sql`. Antes de qualquer
uso do CLI, ele valida o manifest, o SHA-256 da migration e a prova remota
somente-leitura `COMUN_SIDEWALK_EXTERNAL_LEDGER_EVOLVED_SCOPE_GREEN`.

A exclusão é temporária e limitada ao arquivo declarado em
`supabase/migration-exceptions/20260724233256-sidewalk-external-ledger.json`.
O arquivo é movido para diretório temporário apenas durante `migration list`,
`db push --dry-run` e, no fluxo A5 autorizado, o único `db push` exato. Um
`trap` restaura o arquivo e exige o mesmo checksum e worktree limpo antes de
prosseguir ou sair.

O bridge dedicado executa em `planner-bridge`: não alcança o apply, não faz
write de schema/dados/env, não usa `--include-all`, repair, reset ou seed, e
aceita somente o plano formado por
`20260823003249_comun_cultural_specialized_provenance_readiness.sql`.

## Estado de integração

Esta mudança ainda requer a execução Production read-only do workflow
`COMUN 48.1B-R1C external ledger planner bridge` no SHA integrado. Só depois
do terminal GREEN o retry A5-A1-R1 poderá aplicar a migration cultural única.
