# 48.1B-R1 — quarentena local-only

## Estado

Após o replay corrigido, a quarentena foi executada somente para a migration
excepcional e as migrations com comentário explícito de local-only. Cada
arquivo foi validado dentro do checkout, movido para diretório temporário,
processado em `try/finally` e restaurado. O SHA da migration excepcional foi
confirmado após a restauração.

## Inventário read-only

`supabase migration list --linked` mostrou a migration excepcional
`20260724233256` ausente do ledger do CLI e migrations posteriores presentes.
Também existem migrations posteriores sem linha remota, incluindo:

- `20260803161310` a `20260805090000` (Relata, evidências, mapa, Ônibus,
  captura, Carteira, forwarding, Fiscaliza, Calçadas/Relata, STMU e perfil de
  território);
- migrations de ensaio/fixtures do Ônibus e artefatos locais.

As doze entradas com manifesto local-only exato foram isoladas temporariamente. A
migration `20260805090000_comun_member_profile_territory_selection.sql` possui
manifesto local-only exato em
`supabase/local-releases/20260805090000-comun-territory-neighborhood-catalog.json`;
seu SHA e seus campos de promoção proibida foram validados. Ela pode ser
isolada temporariamente durante o dry-run, mas nunca promovida.

## Regra de restauração

Todos os arquivos foram restaurados. A migration histórica permanece no caminho
original e seu SHA-256 continua
`6a2e69dcc66f760fa1828bb43249079e8db474ad8b175d3af6aa7c97ec05b1be`.
Não houve `--include-all`, `repair`, `reset`, seed ou push mutável.
