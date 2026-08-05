# 48.1B-R1 — dry-run reconciliado do CLI

## Resultado

`COMUN_48_1B_R1A_BLOCKED_PENDING_MIGRATION_CLASSIFICATION`

O comando read-only executado foi:

```text
npx supabase migration list --linked
npx supabase db push --linked --dry-run
```

Após a quarentena comprovada, `migration list --linked` não propôs a migration
excepcional nem as migrations local-only isoladas. O dry-run terminou com
sucesso e propôs somente:

`20260805090000_comun_member_profile_territory_selection.sql`

Essa migration não tem manifesto de promoção nem declaração local-only. Ela não
foi isolada e bloqueia a emissão de baseline vazio.

## Baseline vazio

Não foi emitido `COMUN_48_1B_R1A_CLI_BASELINE_RECONCILED_EMPTY`. A exceção
externa foi validada, mas o plano ainda contém a migration sem classificação.

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
passaram: diagnóstico/classificador, exceção e runner (`105/105` no agregado
`solo:test`, além de `2/2` no contrato da exceção). O contrato de inventário de
workflows foi atualizado para exigir os canônicos e permitir apenas adicionais
conhecidos; agora a suíte agregada está verde.
