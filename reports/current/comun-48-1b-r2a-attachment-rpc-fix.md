# 48.1B-R2A-F1 — hotfix forward-only da RPC de anexos

## Estado atual

`COMUN_48_1B_R2A_ATTACHMENT_RPC_FORWARD_FIX_IN_CI`

O hotfix foi adicionado no commit `7f120522ac65d9bea3ce5ec559f63367bc7bac05`,
na branch `codex/tijolo-48-1b-production-domain-pilot`, mantendo a PR #174
draft. A migration candidata original continua byte a byte imutável:

- candidata: `supabase/migrations/20260805130000_comun_production_pilot_core_bundle.sql`;
- SHA: `0648404b49be00b2d46dc5431c1bde4cb0072bf0f27a1c8f42075bb522cdd4f9`;
- hotfix: `supabase/migrations/20260805201000_comun_production_pilot_attachment_rpc_fix.sql`;
- SHA do hotfix: `f092f26df14fe9f724be9b3a6ad9d46fb5d73145d8cf2072933ac0c5917addcc`.

`public.comun_relata_begin_attachment` agora usa `v_context`, `v_label_index`,
`a.label_index` e lock somente na linha do relatório autorizado. O contrato da
assinatura e o limite de três fotografias foram preservados. Os privilégios
foram reafirmados para `service_role`, com execução negada a `public`, `anon` e
`authenticated`.

Validator forward-only, topology, typecheck, lint e build estão verdes. Docker
Desktop local permanece indisponível (`Docker Desktop is unable to start`),
portanto o SQL focal e o E2E aguardam a lane CI descartável `31043986822`.

Ainda não houve migration remota, `db push` mutável, flag, Google, allowlist,
deployment de piloto, envio externo ou `launch_publicly`.
