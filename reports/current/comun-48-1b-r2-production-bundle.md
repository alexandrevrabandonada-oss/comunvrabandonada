# 48.1B-R2A — contrato canônico runtime/schema

## Estado

`COMUN_48_1B_R2A_RUNTIME_SCHEMA_ALIGNMENT_REQUIRED`

O baseline CLI da R1B foi comprovado vazio antes da criação deste bundle. A
R2 usa migration nova e aditiva; não reutiliza migrations local-only antigas.

Migration:

`supabase/migrations/20260805130000_comun_production_pilot_core_bundle.sql`

SHA-256 atual:

`68013621f106c12d5a46b84b5d99fb64e6a69ab494d84891a31c216bfdf42d79`

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
e rollback por flags. O dry-run final e o rehearsal em bancos descartáveis
continuam sendo o gate antes de qualquer promoção.
