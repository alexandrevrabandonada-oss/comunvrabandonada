# Local image crash — open finding

Never run this case on Production or a shared database. It intentionally crashes
the backend in the pinned disposable image. No School code or data is required.

Image: `docker.io/supabase/postgres@sha256:8002645276dc3431d55a5049721a879e4d11c34177086dc0f13b61d98cff1e52`.
Use a new, uniquely named container with `--network none`, no ports, no host
mounts, a run-specific ownership label and synthetic `POSTGRES_PASSWORD=postgres`.
Wait for the entrypoint's final initialization completion, not its temporary
initialization server. Check image, network and ownership before every mutation.

With psql inside that container, `PGPASSWORD=postgres`, `-X -At`,
`-v ON_ERROR_STOP=1`, `-v VERBOSITY=verbose`, user `supabase_admin`, DB `postgres`:

1. Execute `setup.sql`. Confirm `has_function_privilege = false`.
2. Capture only version and allowlisted settings: session/shared/local preload,
   `supautils.hint_roles`, search_path and jit. Do not dump secrets/config files.
3. Execute `probe.sql`. Default image: connection loss plus server log signal 11.
4. After automatic recovery, reconnect with
   `PGOPTIONS=-c session_preload_libraries=` and execute the identical probe.
   Expected: SQLSTATE `42501`, not connection loss. This is a diagnostic control,
   not a proposed Production workaround or an accepted substitute for the failure.
5. Preserve local raw logs privately; publish only the fixed probe/error excerpts.
   Remove only the owned lab container after checking its identity again.

Separate controlled experiment already executed: same PG17.6 binary in a new
initdb cluster, unix socket only, same minimal function and anon role. With the
same supautils library loaded and hint_roles empty: 42501. After restarting with
hint_roles=anon: signal 11. Restarting with hint_roles empty again: 42501.
The library hash/config/result matrix is in
`reports/current/comun-escola-crash-review.json`.

The PGOPTIONS hint_roles experiment emitted "cannot be changed now"; it is NOT
the causal control. File configuration and restart in the disposable cluster were.
No patch, upgrade or Production equivalent was tested. No stack trace/source
commit is claimed. The finding remains open; the recovery PASS in a different
cluster does not close it. Comparable primary report:
[supautils issue 214](https://github.com/supabase/supautils/issues/214).
