# Public search disposable integration

The `disposable-integration` job in `comun-public-search-contract.yml` starts a
new Supabase CLI project under the runner temporary directory. It does not copy
repository migrations, seed, `.env` files or linked project configuration. The
preparation script rejects non-loopback URLs and supplies only the local
server-side `service_role` key to the real application client factory. Containers
and volumes are removed with `supabase stop --no-backup` even after failures.

The SQL fixture is a reduced search projection, **not** a complete migration or
RLS rehearsal. Territory visibility/status, archive publication/visibility and
the artwork `archive_item_id` primary/foreign key reflect the repository schema.
The other eight sources contain synthetic healthy rows. RLS is enabled and
anon/authenticated have no grants, so public-search exclusions must be enforced
by application filters with service-role access rather than hidden by RLS.

The integration suite runs the complete `unifiedPublicSearch` function and real
PostgREST queries. Unfiltered service-role controls prove all nine territory
combinations and all twenty artwork/root combinations exist and can be read.
The function must expose only public active/monitoring territories and published
artworks with published public roots, with correct result URLs.

Each of the eleven sources has two failure cases: a real PostgREST HTTP error
from a missing table, and fault injection at the result boundary preserving the
real query's rows while adding an error. This latter case is deliberately injected:
PostgREST's normal HTTP errors return null data. Both cases must discard the
failed source exactly while preserving every healthy source. A separate case
preserves the canonical map fallback alongside healthy data.

CI records JSON reports, then temporarily runs the same suite against the pre-fix
implementation at `74cc0ed1779f5432496c3f852ce92bed3524a3a1`. The negative control
requires exactly thirteen disclosure/partial-data failures and twelve passing
HTTP-error/fallback cases; the corrected implementation must pass all 25. The
current file is restored on exit. Test reports contain synthetic data only;
startup/status logs and credentials are not uploaded.

Existing head `20d68c104e29a6f97752504ffa3c39dba32999cb` evidence was checked before
implementation: public search contract 37555450826, CI 37555450500, Quality
37555450538, Security 37555450587, Core Journeys 37555450527, Launch 37555450570
and Civic Graph 37555450443 all completed successfully. No reruns of those runs
were requested. They establish the previous implementation's state, not success
of this new integration job.

This closes a focused relational/query-result proof gap only. It does not prove
historical absence of leaks or audit all source schemas, grants, RLS or production.
