# TIJOLO 45.3M — pacote de autorização da URL operacional do banco

- merge_sha: `5758a0bd05b54caba418b25d3e09149e19c21104`
- project_id: `prj_BNUDaIwZKzt7IQ1PZUjo8c6Ljc3X`
- configuration_attempt_id: `sidewalk-db-env-20260729-02`
- variável permitida: `COMUN_SIDEWALK_OPERATIONAL_DATABASE_URL`
- target permitido: `production`
- origem permitida: secret GitHub Actions `SUPABASE_DB_URL` (valor não registrado)
- ledger_hash: `e36b508762b19da01afa91ff810c18c8d5d3a000c20618793eafc25c7a012793`

## Resultado do attempt autorizado

- O attempt `sidewalk-db-env-20260729-02` foi executado pelo run `30417723973`.
- A variável operacional de banco foi criada somente em Production.
- O deployment ficou READY, a conexão ficou alcançável e o ledger foi confirmado
  como exato.
- `COMUN_SIDEWALK_OPERATIONAL_V2` está presente em Production e permanece `disabled`.
- O estado público permanece `paused`.
- Não houve escrita em banco ou Storage; `activate` não foi executado e attempt 03
  não foi criado.
- O resultado terminal foi
  `COMUN_SIDEWALK_DATABASE_ENV_CONFIGURED_RUNTIME_GREEN_FLAG_DISABLED`.
- Rollback não foi necessário.

## Attempt anterior consumido

- O attempt `sidewalk-db-env-20260729-01` foi consumido pelo run `30416713899`.
- A autorização foi rejeitada antes do preflight e antes de qualquer escrita porque
  o workflow comparava `MANTER_FLAG_DESABILITADA`, enquanto o helper e o contrato
  versionado usam `MANTER_FLAG_DISABLED`.
- `variableConfigured=false`, `rollbackAttempted=false` e
  `rollbackResult=not_required`.
- O hotfix foi integrado na PR #66, merge
  `5758a0bd05b54caba418b25d3e09149e19c21104`.
- O inventário read-only pós-hotfix, run `30417062556`, confirmou novamente a
  variável ausente e a flag desabilitada.

## Validação independente pós-configuração

- O inventário read-only, run `30417862859`, confirmou a chave presente e com
  target Production, sem persistir valores.
- O diagnóstico protegido read-only, run `30417917181` attempt 2, confirmou
  `databaseUrl=present`, `database=reachable`, `ledger=exact`,
  `flag=disabled` e `operationalState=FLAG_DISABLED`.
- O primeiro attempt desse diagnóstico recebeu HTTP 500 da API Vercel; apenas o
  job read-only falho foi reexecutado.

## Rollback limitado

Se o deployment ou o diagnóstico falhar depois da criação, o gate remove somente
`COMUN_SIDEWALK_OPERATIONAL_DATABASE_URL`, faz um deployment de rollback e exige
que o inventário volte a indicar a chave ausente e a contribuição continue pausada.
Nenhuma outra variável, a flag, banco, ledger ou Storage entram no rollback.

Este registro não autoriza ativação pública. Migration, ledger, banco e Storage
permaneceram inalterados durante a configuração.
