# 48.1B — inventário e plano remoto de migrations

## Status

`COMUN_48_1B_REMOTE_MIGRATION_INVENTORY_READY` não pode ser promovido a plano
executável: o inventário revelou drift histórico e terminou em
`COMUN_48_1B_BLOCKED_REMOTE_MIGRATION_PLAN_DRIFT`.

## Migrations candidatas

Nenhuma migration foi autorizada para promoção neste checkpoint. As migrations
de Relata, evidências, Carteira, forwarding, Ônibus, STMU, Calçadas/Relata e
catálogo territorial posteriores ao baseline estão marcadas nos manifestos como
`requiresPromotion=false` e `remotePromotionAllowed=false`.

## Drift encontrado

O histórico remoto não contém `20260724233256_comun_sidewalk_operational_hardening.sql`,
embora migrations posteriores estejam presentes. O dry-run recusou aplicar a
fila e indicou `--include-all`; essa opção não foi usada. Não há plano seguro
sem decidir se a migration ausente deve ser recuperada, substituída ou
formalmente reconciliada — decisão que exige evidência adicional, não retry.

## Operações executadas

- `supabase projects list` — read-only;
- `supabase link --project-ref ...` — apenas vínculo local;
- `supabase migration list --linked` — read-only;
- `supabase db push --linked --dry-run` — read-only, bloqueado pelo drift.

Nenhuma migration remota foi aplicada.
