# 48.1B-R1 — dry-run reconciliado do CLI

## Resultado

`COMUN_48_1B_R1_BLOCKED_SIDEWALK_REMOTE_STATE_UNPROVEN`

O comando read-only executado foi:

```text
npx supabase migration list --linked
npx supabase db push --linked --dry-run
```

`migration list --linked` confirmou que `20260724233256` está local e sem
linha correspondente no ledger do CLI, enquanto migrations posteriores estão
remotas. O dry-run terminou com `LegacyDbPushMissingRemoteError` e sugeriu
`--include-all` para a migration excepcional. A sugestão foi registrada, mas
não foi executada.

## Baseline vazio

Não foi emitido `COMUN_48_1B_R1_CLI_BASELINE_RECONCILED_EMPTY`. Esse resultado
exigiria uma exceção externa comprovada e uma quarentena temporária segura. Como
o runner canônico classificou o estado remoto como
`INSUFFICIENT_READ_PERMISSION`, o plano não pode ser alterado para aparentar
vazio.

## Proteções

- sem `--include-all`;
- sem `migration repair`;
- sem `db reset --linked`;
- sem `db pull`;
- sem seed;
- sem inserção manual no ledger;
- sem escrita remota;
- arquivos restaurados/nunca removidos;
- SHA-256 da migration preservado.

Os testes focais de diagnóstico, contrato de promoção e runner forward-only
passaram (`87/87`). A suíte agregada `npm run solo:test` teve uma falha
preexistente e não relacionada: o teste de automação espera somente seis
workflows, enquanto o checkout contém workflows adicionais. Nenhuma alteração
foi feita para mascarar essa falha.
