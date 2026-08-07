# COMUN 48.1B-P1T — plano remoto

Resultado: `COMUN_P1T_REMOTE_PLAN_EXACT_ONE`.

Estado antes da promoção: migration nova ainda não aplicada.

Plano permitido, exatamente um item:

`20260806235454_comun_member_profile_optional_territory.sql`

Itens proibidos no plano:

- `20260805090000_comun_member_profile_territory_selection.sql`;
- migration histórica de Calçadas;
- qualquer migration R2A já aplicada;
- fixtures, seeds ou migrations local-only.

Nenhuma migration remota foi aplicada durante a leitura inicial.

Dry-run executado em 2026-08-06, com a release histórica de Calçadas temporariamente isolada e restaurada byte a byte:

```text
20260806235454_comun_member_profile_optional_territory.sql
```

Não apareceram migrations R2A, fixtures, seeds ou a migration local-only histórica.
