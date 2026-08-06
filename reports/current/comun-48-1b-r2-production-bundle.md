# 48.1B-R2A — contrato canônico runtime/schema

## Estado

`COMUN_48_1B_R2A_R2_BLOCKED_RUNTIME_E2E_SCOPE`

O baseline CLI da R1B foi comprovado vazio antes da criação deste bundle. A
R2 usa migration nova e aditiva; não reutiliza migrations local-only antigas.

Migration:

`supabase/migrations/20260805130000_comun_production_pilot_core_bundle.sql`

SHA-256 atual:

`0648404b49be00b2d46dc5431c1bde4cb0072bf0f27a1c8f42075bb522cdd4f9`

Manifesto:

`supabase/releases/20260805130000-comun-production-pilot-core-bundle.json`

## Escopo

- conta e Carteira privadas, usando `private.comun_participation_*`;
- Relata V2 privado, usando `private.comun_relata_reports` e
  `public.comun_relata_cases`;
- evidências privadas e localização criptografada, usando os RPCs canônicos;
- vínculo explícito e idempotente Conta–Carteira;
- RLS habilitada e forçada;
- revogação explícita para `public`, `anon` e `authenticated`;
- grants somente para `service_role`;
- nenhum RPC público, publicação, forwarding ou dado sintético.

`requiresPromotion=true` e `remotePromotionAllowed=true` descrevem uma
possibilidade futura; nenhuma promoção foi executada. A flag
`COMUN_PRODUCTION_PILOT_CORE_ENABLED` permanece desligada.

O bundle anterior `COMUN_48_1B_R2_PRODUCTION_BUNDLE_READY_FOR_EXACT_DRY_RUN`
fica preservado como histórico. Ele foi substituído porque criava
`comun_production_*`, desconectado do runtime. O bundle atual usa nomes e
assinaturas canônicos, PRE fail-closed, RLS/grants explícitos, Storage privado
e rollback por flags. Os rehearsals A/B, o smoke runtime do núcleo e o dry-run
read-only do SHA atual estão verdes, mas o E2E completo de foto/localização/conta
ainda não foi provado. O dry-run propôs somente a migration candidata após
quarentena temporária da exceção externa e das migrations explicitamente
local-only; tudo foi restaurado. O primeiro ensaio HTTP revelou uma
incompatibilidade de allowlist de respostas na RPC de criação; ela foi
corrigida na migration candidata e seu checksum/manifests foram atualizados.
O daemon Docker falhou ao reiniciar durante a repetição do E2E privado, por
isso a PR permanece draft e nenhuma promoção é permitida.
