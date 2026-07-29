# TIJOLO 45.3M — pacote de autorização da URL operacional do banco

- merge_sha: `49620b70cf98cd9ded01818756754acf9f41360d`
- project_id: `prj_BNUDaIwZKzt7IQ1PZUjo8c6Ljc3X`
- configuration_attempt_id: `sidewalk-db-env-20260729-01`
- variável permitida: `COMUN_SIDEWALK_OPERATIONAL_DATABASE_URL`
- target permitido: `production`
- origem permitida: secret GitHub Actions `SUPABASE_DB_URL` (valor não registrado)
- ledger_hash: `e36b508762b19da01afa91ff810c18c8d5d3a000c20618793eafc25c7a012793`

## Estado antes da autorização futura

- A variável operacional de banco está ausente em Production.
- `COMUN_SIDEWALK_OPERATIONAL_V2` está presente em Production e permanece `disabled`.
- O estado público permanece `paused`.
- O ledger está `PRESENT_ACCEPTED` e o scoped POST está confirmado.
- Preflight de metadados e diagnóstico protegido foram executados somente para leitura.
- Não houve escrita em banco ou Storage; `activate` não foi executado e attempt 03 não foi criado.

## Operação futura limitada

Uma autorização humana futura e exata poderá permitir somente criar a variável
operacional de banco em Production com o secret de origem fixo. Antes da escrita,
o gate exige SHA integrado, contrato v2, ledger e scoped POST exatos, variável
ainda ausente, flag desabilitada e contribuição pública pausada.

Depois da configuração, o gate exige um deployment Production e um diagnóstico
protegido com URL de banco presente, conexão alcançável, ledger exato e flag ainda
desabilitada. O alias público deve continuar pausado.

## Rollback limitado

Se o deployment ou o diagnóstico falhar depois da criação, o gate remove somente
`COMUN_SIDEWALK_OPERATIONAL_DATABASE_URL`, faz um deployment de rollback e exige
que o inventário volte a indicar a chave ausente e a contribuição continue pausada.
Nenhuma outra variável, a flag, banco, ledger ou Storage entram no rollback.

Este pacote não é uma autorização e não executa configuração, migration ou
ativação pública.
