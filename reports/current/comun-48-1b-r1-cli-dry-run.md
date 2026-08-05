# 48.1B-R1B — dry-run reconciliado do CLI

## Resultado

`COMUN_48_1B_R1B_CLI_BASELINE_RECONCILED_EMPTY`

O comando read-only executado foi:

```text
npx supabase migration list --linked
npx supabase db push --linked --dry-run
```

Após a descoberta explícita em `supabase/local-releases/`, o manifesto de
território foi validado como `LOCAL_ONLY_MANIFEST_EXACT`. A migration
excepcional e todas as migrations local-only foram isoladas temporariamente,
sempre restauradas, e o dry-run terminou com arrays vazios.

## Baseline vazio

O baseline vazio foi comprovado: não há migration pendente, migration
excepcional, seed, role ou sugestão de `--include-all`.

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

Os testes de descoberta de manifestos passaram (`4/4`), além de diagnóstico,
exceção, runner forward-only (`105/105` no agregado `solo:test`, `31/31` no
runner e `2/2` no contrato da exceção). Typecheck, lint, build e diff-check
também estão verdes.
