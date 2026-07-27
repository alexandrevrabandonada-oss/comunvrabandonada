# Tijolo 45.3E — contrato escopado estrutural das Calçadas

## Decisão

`COMUN_TIJOLO_45_3E_SCOPED_PROMOTION_CONTRACT_READY`

O contrato v1 foi substituído por `sidewalk-operational-safer-pre-v2` porque o
ledger da própria release tornava o fingerprint v1 autorreferente. O escopo v2
preserva todos os objetos estruturais das Calçadas e exclui apenas a linha do
ledger da release; o ledger é validado separadamente.

## Evidência read-only

- main diagnosticada: `b0beb869dfe055ff506bf5ba54c7c52c73d2d3fb`;
- run de diagnóstico estrutural: `30278733804`;
- run de preflight remoto: `30279794600`;
- artifact: `comun-sidewalk-scoped-preflight-b0beb869dfe055ff506bf5ba54c7c52c73d2d3fb-30279794600`;
- scanner independente: verde, sem termos proibidos;
- ledger remoto: `ABSENT`;
- findings bloqueantes: `0`;
- contribuição pública: pausada;
- escritas remotas: `none`.

O PRE estrutural local e o remoto coincidiram exatamente. A divergência global
permanece fora do escopo da release e não é aceita como evidência de POST.

| Evidência                     | SHA-256                                                            |
| ----------------------------- | ------------------------------------------------------------------ |
| Contrato v2                   | `d916a99153c8e29a10833c4ff7c0efc5b765bdab54e08ee671ad9a1ee3e58858` |
| Scoped PRE estrutural         | `501f75609e3ed0d1edea63f26076d3b05ab9767f71ef12794ac22d1929b7e875` |
| Scoped POST esperado          | `4bebf4c1db4da58fd9710c7f9478bb2837b171aa4620de2d376e19d5a99b66d8` |
| Migration canônica            | `6a2e69dcc66f760fa1828bb43249079e8db474ad8b175d3af6aa7c97ec05b1be` |
| Manifesto canônico preservado | `ceb7002f9a7069cbe82c4e6b16032bef1cd3619f12271a260dbca37fb5bc1335` |

## PRE exato aceito

A fixture local reproduz exatamente 72 ausências de grants públicos: as
combinações de `REFERENCES`, `TRIGGER` e `TRUNCATE` para `anon` e
`authenticated` nas 12 relações legadas do escopo. Não aceita um PRE canônico
mais permissivo, qualquer grant público adicional, perda do CRUD de
`service_role`, ledger presente incompatível ou drift em outro objeto escopado.

## Separação de responsabilidades

1. `preflight`: leitura somente; exige PRE estrutural, ledger ausente, alvo
   allowlisted e contribuição pública pausada.
2. `migrate`: requer autorização exclusiva; aplica apenas a migration, confirma
   o POST estrutural e o ledger exato, mantendo a flag desabilitada.
3. `activate`: não aplica migration; exige POST e ledger já válidos, além de
   autorização distinta antes de habilitar a flag e fazer smoke.

## Impacto, interrupção e recuperação

A migration permanece transacional e não destrutiva pelo contrato. A previsão
operacional é de uma execução curta, com locks de DDL/grants limitados aos
objetos da release; a duração não foi medida no remoto. Interromper em qualquer
mismatch antes de `migrate`. Se houver estado parcial, não repetir: executar
novo diagnóstico read-only e aguardar decisão humana.

## Autorização futura — modelo, não autorização

`AUTORIZO_MIGRATION_CALCADAS_<PROJECT_REF_ALLOWLISTED>_b0beb869dfe055ff506bf5ba54c7c52c73d2d3fb_d916a99153c8e29a10833c4ff7c0efc5b765bdab54e08ee671ad9a1ee3e58858_MANTER_FLAG_DESABILITADA`

O `project ref` não é registrado neste relatório. A frase acima não autoriza
`migrate`; ela somente descreve a autorização humana exata exigida pelo
workflow. A ativação pública continua sendo outro checkpoint, com outra
autorização e a flag permanece desabilitada.
