# 48.1B — inventário e plano remoto de migrations

## Status

`COMUN_48_1B_REMOTE_MIGRATION_INVENTORY_READY` não pode ser promovido a plano
executável: a reconciliação R1 terminou em
`COMUN_48_1B_R1_BLOCKED_SIDEWALK_REMOTE_STATE_UNPROVEN`.

## Migrations candidatas

Nenhuma migration foi autorizada para promoção neste checkpoint. As migrations
de Relata, evidências, Carteira, forwarding, Ônibus, STMU, Calçadas/Relata e
catálogo territorial posteriores ao baseline permanecem locais; entradas sem
manifesto explícito são `manifest_missing`/`unknown` e bloqueiam o plano.

## Drift encontrado

O histórico do CLI não contém `20260724233256_comun_sidewalk_operational_hardening.sql`,
embora migrations posteriores estejam presentes. A prova externa read-only
encontrou ledger próprio `PRESENT_ACCEPTED`, mas o classificador canônico foi
`INSUFFICIENT_READ_PERMISSION`; por isso a exceção externa não foi criada. O
dry-run recusou aplicar a fila e indicou `--include-all`; essa opção não foi
usada. Não há plano seguro sem permissão/evidência adicional.

## Operações executadas

- `supabase projects list` — read-only;
- `supabase link --project-ref ...` — apenas vínculo local;
- `supabase migration list --linked` — read-only;
- `supabase db push --linked --dry-run` — read-only, bloqueado pelo drift.
- workflow `comun-sidewalk-remote-diagnostic.yml` — run `31011836481`, read-only,
  artefato sanitizado.

Nenhuma migration remota foi aplicada.

## R1A

O classificador corrigido e o replay do artefato confirmaram
`APPLIED_EXACT_SCOPED_EXTERNAL_LEDGER`; a divergência global é evolução
esperada após a release escopada. A exceção externa foi validada.

A quarentena temporária deixou o dry-run limpo para a migration excepcional e
as migrations explicitamente local-only. O baseline ainda propôs
`20260805090000_comun_member_profile_territory_selection.sql`, sem manifesto ou
declaração local-only. Resultado: `COMUN_48_1B_R1A_BLOCKED_PENDING_MIGRATION_CLASSIFICATION`.
