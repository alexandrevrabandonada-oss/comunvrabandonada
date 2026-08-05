# 48.1B-R2A-F2 — correção da RPC Carteira–conta

## Resultado

`COMUN_48_1B_R2A_BLOCKED_CI_STARTUP_CANCELLED_BEFORE_HEALTH_RESULT`

A correção forward-only foi implementada e publicada na branch da PR #174. O
defeito era a referência ambígua em `ON CONFLICT(wallet_id,user_id)` na RPC
`public.comun_participation_wallet_link_account`. A função agora usa
`v_wallet_id`, a constraint explícita
`comun_participation_wallet_account_links_wallet_id_user_id_key` e mantém
`service_role` como único executor.

## Integridade

- candidata: `20260805130000_comun_production_pilot_core_bundle.sql`;
- SHA candidata: `0648404b49be00b2d46dc5431c1bde4cb0072bf0f27a1c8f42075bb522cdd4f9`;
- hotfix anexos: `20260805201000_comun_production_pilot_attachment_rpc_fix.sql`;
- SHA hotfix: `f092f26df14fe9f724be9b3a6ad9d46fb5d73145d8cf2072933ac0c5917addcc`;
- nova migration: `20260805212659_comun_production_pilot_wallet_account_rpc_fix.sql`;
- SHA nova migration: `0d4b9a271a169184d45020bdad3ef11c8e1a01bd6d256848787b98b5d04a3382`;
- cadeia v2 contém exatamente as três migrations, em ordem;
- commit da correção do teste: `9e51e5cb6d2bfa0c36a89a82102a0beb56e0e60f`.

## Verificação

Topology, release, privilégios, typecheck, lint, build e testes de contrato
passaram. A primeira execução CI aplicou a cadeia e revelou que o teste focal
tratava `array_agg` textual do driver PostgreSQL como array JavaScript; o teste
foi corrigido sem alterar o produto.

Na execução anterior, o job foi cancelado enquanto iniciava, sem resultado de
health, sem erro do Postgres e sem E2E funcional. Isso não prova que Docker ou
Supabase estivessem indisponíveis. O harness CI1 foi corrigido para criar
artifacts antes do start, diagnosticar o runner, iniciar somente a stack
necessária e aguardar até 12 minutos com heartbeat de 20 segundos.

O novo attempt ainda precisa ser executado no SHA deste patch; não há
classificação de saúde ou E2E funcional disponível neste momento.

## Estado remoto

Não houve consulta ou escrita no Supabase remoto, aplicação de migration,
alteração de flags, Google, piloto ou deployment de ativação. A PR #174
permanece draft; não é seguro marcar READY ou mesclar sem uma lane de runtime
verde.
