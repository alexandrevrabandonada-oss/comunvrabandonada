# Tijolo 45.3F — migration remota escopada das Calçadas

## Decisão

`COMUN_TIJOLO_45_3F_SCOPED_MIGRATION_APPLIED_FLAG_DISABLED`

Uma autorização humana exata foi reconhecida pelo workflow canônico. A migration foi aplicada uma vez após preflight remoto, e o postflight confirmou o estado escopado esperado. Esta evidência não autoriza `mode=activate`.

## Executor e contrato

- Workflow: [COMUN Sidewalk Activate — run 30281552982](https://github.com/alexandrevrabandonada-oss/comunvrabandonada/actions/runs/30281552982)
- SHA imutável executor: `b0beb869dfe055ff506bf5ba54c7c52c73d2d3fb`
- Main que hospedou o dispatch: `ad188f54c7b6b4d7d79dd8277c9cc86a04484f78`
- Project ref: allowlisted e mascarado
- Contrato: `sidewalk-operational-safer-pre-v2`
- SHA-256 do contrato: `d916a99153c8e29a10833c4ff7c0efc5b765bdab54e08ee671ad9a1ee3e58858`
- Migration: `supabase/migrations/20260724233256_comun_sidewalk_operational_hardening.sql`
- SHA-256 da migration: `6a2e69dcc66f760fa1828bb43249079e8db474ad8b175d3af6aa7c97ec05b1be`
- Manifesto canônico preservado: `supabase/releases/20260724233256-comun-sidewalk-operational-hardening.json`
- SHA-256 do manifesto canônico: `ceb7002f9a7069cbe82c4e6b16032bef1cd3619f12271a260dbca37fb5bc1335`

## Evidência da execução

| Etapa                    | Resultado                                                             |
| ------------------------ | --------------------------------------------------------------------- |
| Autorização              | reconhecida e exata no job de migration                               |
| Preflight imediato       | verde; PRE escopado exato, ledger `ABSENT`, zero findings bloqueantes |
| Transação da migration   | concluída uma vez, entre 15:47:34Z e 15:48:03Z (aprox. 29 s)          |
| Ledger depois            | `PRESENT_ACCEPTED`, com contrato estrutural v2 e PRE/POST validados   |
| Postflight               | verde e somente leitura                                               |
| Scoped PRE               | `501f75609e3ed0d1edea63f26076d3b05ab9767f71ef12794ac22d1929b7e875`    |
| Scoped POST              | `4bebf4c1db4da58fd9710c7f9478bb2837b171aa4620de2d376e19d5a99b66d8`    |
| Findings bloqueantes     | `0` antes e depois                                                    |
| Observação de plataforma | uma observação de privilégios padrão geridos, sem bloqueio            |
| Contribuição pública     | pausada                                                               |

O segundo controle foi o postflight dedicado, em modo somente leitura: ele confirmou o fingerprint POST e o ledger sem executar novamente DDL ou DML da migration. O marcador emitido por esse modo é `COMUN_CANONICAL_RELEASE_POST_READY`; o workflow não emite `COMUN_SIDEWALK_OPERATIONAL_HARDENING_ALREADY_APPLIED` nesse caminho read-only.

## Segurança e operação

- Auditoria RLS/grants: verde no diagnostic sanitizado, sem acesso público indevido detectado.
- Flag operacional: `COMUN_SIDEWALK_OPERATIONAL_V2=disabled` confirmada pelo smoke do workflow.
- Activate: não executado; job `activate` ficou `skipped`.
- Storage: inalterado.
- Vercel: inalterada por este checkpoint.
- Escritas remotas: somente a aplicação autorizada da migration canônica e o registro de ledger associado; nenhuma escrita em Storage, configuração Vercel ou flag.

## Artifacts e sanitização

- Artifact de preflight: `comun-sidewalk-scoped-preflight-b0beb869dfe055ff506bf5ba54c7c52c73d2d3fb-30281552982`
- Inspeção independente: JSON válido e scanner sem URL de conexão, senha, token, role sensível, cookie, coordenadas ou dados privados.

## Próximo bloqueio humano

Uma autorização humana separada, vinculada ao ledger POST, é necessária antes de qualquer `mode=activate`. A flag permanece desabilitada.
