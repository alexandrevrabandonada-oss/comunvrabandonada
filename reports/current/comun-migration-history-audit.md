# Auditoria do histórico de migrations

Data: 23 de julho de 2026. Operação exclusivamente read-only.

## Matriz

| Classificação | Quantidade | Interpretação |
| --- | ---: | --- |
| `CURRENT_CANONICAL` | 41 | Timestamp presente no repositório e em `supabase_migrations.schema_migrations`. |
| `SEMANTICALLY_APPLIED_BY_RECONCILIATION` | 20 | Arquivo local ausente do histórico remoto, mas o pacote forward-only e o postflight reconciliaram o schema final. |
| `LOCAL_ONLY` | 0 | Nenhuma migration foi classificada apenas pela presença local. |
| `REMOTE_HISTORY_ONLY` | 0 | Nenhum timestamp remoto está ausente do repositório. |
| `FUTURE_ONLY` | 0 | Nenhuma migration posterior ao fechamento existe nesta captura. |
| `UNKNOWN` | 0 | Nenhuma divergência ficou sem classificação. |

As 20 migrations reconciliadas semanticamente são:

`20260715025948`, `20260715032613`, `20260715151922`,
`20260715155802`, `20260715170058`, `20260715174723`,
`20260715185344`, `20260715192935`, `20260716000000`,
`20260716120000`, `20260717013709`, `20260717022301`,
`20260718031145`, `20260719180751`, `20260719202300`,
`20260720161117`, `20260720185530`, `20260721155914`,
`20260721164415` e `20260722003105`.

Essa classificação não altera o histórico remoto e não equivale a executar
`migration repair`.

## Estratégia para os próximos tijolos

1. Novas migrations partem do schema remoto capturado neste baseline.
2. Cada migration recebe timestamp posterior ao fechamento.
3. O histórico antigo não será reaplicado.
4. Equivalência será comprovada por baseline, fingerprint e postflight.
5. Qualquer alinhamento formal futuro será explícito, revisado e separado.

