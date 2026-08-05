# 48.1B-R1 — quarentena local-only

## Estado

Nenhuma quarentena foi executada. O padrão de isolamento temporário só pode
ser usado depois de provar `APPLIED_EXACT_EXTERNAL_LEDGER` ou
`APPLIED_BY_DEDICATED_RUNNER`. O diagnóstico canônico terminou em
`INSUFFICIENT_READ_PERMISSION`; mover a migration excepcional neste estado
criaria uma exceção não comprovada.

## Inventário read-only

`supabase migration list --linked` mostrou a migration excepcional
`20260724233256` ausente do ledger do CLI e migrations posteriores presentes.
Também existem migrations posteriores sem linha remota, incluindo:

- `20260803161310` a `20260805090000` (Relata, evidências, mapa, Ônibus,
  captura, Carteira, forwarding, Fiscaliza, Calçadas/Relata, STMU e perfil de
  território);
- migrations de ensaio/fixtures do Ônibus e artefatos locais.

Essas entradas não foram removidas, renomeadas ou marcadas como promovíveis.
Onde não há manifesto explícito `requiresPromotion=false` /
`remotePromotionAllowed=false`, a ausência de manifesto é tratada como
`manifest_missing`/`unknown` e bloqueia qualquer plano.

## Regra de restauração

Nenhum arquivo foi movido. A migration histórica permanece no caminho original
e seu SHA-256 continua
`6a2e69dcc66f760fa1828bb43249079e8db474ad8b175d3af6aa7c97ec05b1be`.
Não houve `--include-all`, `repair`, `reset`, seed ou push mutável.
