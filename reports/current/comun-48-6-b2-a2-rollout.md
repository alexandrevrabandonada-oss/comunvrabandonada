# COMUN 48.6-B2-A2 — rollout e closeout R6/R7

## Terminal

`COMUN_48_6_B2_A2_PRIVATE_COLLECTIVE_MATCHING_GREEN_MAP_OFF`

## Linha de execução

- R5 preservou a location key `sensitive` e provisionou uma única spatial HMAC key `sensitive`, Production-only e write-only. Não houve readback de segredos.
- R6 executou o preflight `33188064971`, a promoção `33188221233` e o postflight independente `33188568844` no main `d56412929053ae288082c0a9db29ee633503af7c`.
- A promoção aplicou somente `20260827120000_comun_denuncias_private_collective_matching.sql`; o postflight confirmou `migrationCount=1`, RLS/FORCE RLS, RPCs server-only e `projectionRows=0` / `confirmationRows=0`.
- R6 ativou somente `COMUN_RELATA_COLLECTIVE_ENABLED`, já após schema GREEN. A location flag continuou ON; o mapa permaneceu ausente/OFF.
- O R6 encontrou uma ambiguidade de HTTP: ausência de carteira recebia o mesmo 404 do feature cloak. A PR #422 corrigiu apenas essa fronteira e foi mergeada em `8926a78080aeae9ebca7fdbe3df3f83f19a83e2f`.
- O deployment Production desse merge ficou READY. O smoke sem cookie e sem `walletItemId` retornou exatamente `401 {"code":"wallet_authority_required"}`; 404 continua reservado à feature fechada ou a resultados holder-only opacos.
- O postflight read-only R7 `33196364701` confirmou novamente migration única, flags canônicas, chaves `sensitive` sem readback, RLS/FORCE RLS, `serviceRoleExecute=true`, mapa OFF e zero projeções/confirmações.

## Limites preservados

- Nenhum relato real, consentimento, matcher manual, membership, projeção, confirmação, Pauta, Ação ou envio oficial foi criado.
- O DTO continua limitado a `waiting` ou `matched`; não entrega IDs de caso, relato, membership ou coletivo, nem texto, localização ou identidade.
- Mapa e API pública permanecem 404/cloaked. A3/A4/A5 continuam preservados.

## Accounting

- R5 histórico: `ProductionEnvWrites=1_spatial_sensitive_key_only`.
- R6: `ProductionSchemaWrites=1_migration_only`; `ProductionEnvWrites=1_collective_enable_only`; `ProductionBusinessWrites=0`.
- R7: `ProductionSchemaWrites=0`; `ProductionEnvWrites=0`; `ProductionBusinessWrites=0`; `externalOfficialSends=0`.

## Próximo limite

`48.6-B2-A3 — primeiro ciclo real de problema coletivo`, zero-code por padrão. Não iniciado neste closeout.
