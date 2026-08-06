# 48.1B-R2A — candidato de Production

- migration: `20260805130000_comun_production_pilot_core_bundle.sql`;
- SHA-256: `0648404b49be00b2d46dc5431c1bde4cb0072bf0f27a1c8f42075bb522cdd4f9`;
- local-only: migrations permanecem em `supabase/local-migrations`;
- dry-run remoto: somente a candidata, sem `--include-all`, repair ou escrita;
- flags: inalteradas e desligadas;
- schema remoto: não aplicado;
- PR #174: draft.

O candidato só poderá ser integrado depois do E2E privado reproduzível e das
lanes obrigatórias verdes. O merge será dormente e não promoverá schema.
