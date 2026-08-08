# COMUN 48.1B-P5 — preflight e promoção remota

Data: 2026-08-08

## Resultado

`COMUN_P5_REMOTE_PREFLIGHT_GREEN`

- baseline inicial: `6b037d6dd3ffc617c6c47d26adb466eaaf7639bd`;
- preflight read-only do candidato exato: run `31282672711`;
- merge funcional da PR #232: `87db9f7e5e76eed73a261fed5044393d719e42c4`;
- preflight pós-merge e plano exato de uma migration: run `31284013965`;
- promoção da migration e postflight embutido: run `31284042454`;
- postflight independente: run `31284102583`;
- migration promovida: `20260808220000_comun_bus_stmu_assisted.sql`;
- SHA-256: `88b5d6821edd3984e6c08eddfd924efc6c90dfe37dce45fd6f3c01a71d539a41`;
- plano: exatamente uma migration, sem `--include-all`, repair, reset ou seed;
- migration histórica de Calçadas reconciliada pelo ledger externo e restaurada após a quarentena temporária;
- migrations locais históricas 48.0E/H/K/L não foram promovidas;
- conteúdo de negócio lido no preflight: não;
- RLS forçada, grants e RPCs P5: verdes;
- flags durante toda a promoção: desligadas.

O schema remoto só foi escrito depois do merge, do dry-run exato e do preflight
read-only. Nenhuma fixture ou dado de ensaio integrou a migration.
