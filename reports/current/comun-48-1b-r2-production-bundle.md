# 48.1B-R2 — bundle novo de Production

## Estado

`COMUN_48_1B_R2_PRODUCTION_BUNDLE_READY_FOR_EXACT_DRY_RUN`

O baseline CLI da R1B foi comprovado vazio antes da criação deste bundle. A
R2 usa migration nova e aditiva; não reutiliza migrations local-only antigas.

Migration:

`supabase/migrations/20260805130000_comun_production_pilot_core_bundle.sql`

SHA-256:

`fefb9149bd549362f5533bcc0b77730803f1285823ba133d174fcc8d2c4e8c98`

Manifesto:

`supabase/releases/20260805130000-comun-production-pilot-core-bundle.json`

## Escopo

- conta e Carteira privadas;
- Relata V2 privado;
- evidências privadas e localização criptografada;
- RLS habilitada e forçada;
- revogação explícita para `public`, `anon` e `authenticated`;
- grants somente para `service_role`;
- nenhum RPC público, publicação, forwarding ou dado sintético.

`requiresPromotion=true` e `remotePromotionAllowed=true` descrevem uma
possibilidade futura; nenhuma promoção foi executada. A flag
`COMUN_PRODUCTION_PILOT_CORE_ENABLED` permanece desligada.

Validação estática do bundle: `2/2`. O dry-run exato read-only, com as
migrations local-only em quarentena restaurável, propôs somente a migration
R2 acima; seeds e roles ficaram vazios. Nenhuma escrita ocorreu. Próximo gate:
auditoria remota de RLS/grants antes de qualquer promoção.
