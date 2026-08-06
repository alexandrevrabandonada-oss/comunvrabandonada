# 48.1B-R2A — plano remoto após F2

Estado: **não executado**.

A cadeia pretendida para promoção continua exatamente:

1. `20260805130000_comun_production_pilot_core_bundle.sql` — `0648404b49be00b2d46dc5431c1bde4cb0072bf0f27a1c8f42075bb522cdd4f9`;
2. `20260805201000_comun_production_pilot_attachment_rpc_fix.sql` — `f092f26df14fe9f724be9b3a6ad9d46fb5d73145d8cf2072933ac0c5917addcc`;
3. `20260805212659_comun_production_pilot_wallet_account_rpc_fix.sql` — `0d4b9a271a169184d45020bdad3ef11c8e1a01bd6d256848787b98b5d04a3382`.

Nenhum dry-run remoto, push remoto ou postflight foi executado porque o E2E
descartável não atingiu o banco. Flags, Google, piloto e `launch_publicly`
continuam desligados.
