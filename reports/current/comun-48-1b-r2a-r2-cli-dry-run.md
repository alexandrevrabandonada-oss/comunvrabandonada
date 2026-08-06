# R2A-R2 CLI dry-run

The linked read-only inventory and `supabase db push --linked --dry-run` were
run after temporarily isolating only the exceptional external-ledger migration.
All local-only migrations are now outside `supabase/migrations` and were not
included. The only planned item is the current R2A production candidate:

`20260805130000_comun_production_pilot_core_bundle.sql`

No `--include-all`, `migration repair`, reset, seed, or mutable push was used.
The exceptional file was restored and its SHA-256 remains
`6a2e69dcc66f760fa1828bb43249079e8db474ad8b175d3af6aa7c97ec05b1be`.
