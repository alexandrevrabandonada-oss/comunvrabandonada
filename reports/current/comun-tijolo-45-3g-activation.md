# Tijolo 45.3G — ativação pública controlada das Calçadas

## Resultado

`COMUN_TIJOLO_45_3G_VERCEL_ACCESS_STILL_BLOCKED`

O workflow original reconheceu a autorização exata e confirmou o estado remoto por postflight somente leitura. A ativação foi bloqueada antes da alteração da flag. Dois preflights Vercel separados e somente leitura responderam HTTP `403`; a revalidação após a rotação humana não confirmou acesso ao projeto canônico. Não houve retry de ativação.

## Evidência verificada

- Workflow: [COMUN Sidewalk Activate — run 30283137271](https://github.com/alexandrevrabandonada-oss/comunvrabandonada/actions/runs/30283137271)
- Preflight somente leitura: [run 30284379657](https://github.com/alexandrevrabandonada-oss/comunvrabandonada/actions/runs/30284379657) — HTTP `403`; todos os jobs mutáveis foram ignorados.
- Revalidação somente leitura: [run 30285022945](https://github.com/alexandrevrabandonada-oss/comunvrabandonada/actions/runs/30285022945), em `2026-07-27T16:30:49Z` — HTTP `403`; `validate-input` verde e todos os jobs mutáveis ignorados.
- SHA imutável executor: `b0beb869dfe055ff506bf5ba54c7c52c73d2d3fb`
- Project ref: allowlisted e mascarado.
- Contrato: `sidewalk-operational-safer-pre-v2` (`d916a99153c8e29a10833c4ff7c0efc5b765bdab54e08ee671ad9a1ee3e58858`)
- Ledger hash: `e36b508762b19da01afa91ff810c18c8d5d3a000c20618793eafc25c7a012793`
- Postflight: verde, somente leitura, com ledger `PRESENT_ACCEPTED`, POST escopado exato e zero findings bloqueantes.
- Scoped POST: `4bebf4c1db4da58fd9710c7f9478bb2837b171aa4620de2d376e19d5a99b66d8`

## Estado operacional

| Item               | Antes                     | Depois                                           |
| ------------------ | ------------------------- | ------------------------------------------------ |
| Flag operacional   | desabilitada              | desabilitada, confirmada pela superfície pública |
| Migration          | aplicada anteriormente    | inalterada                                       |
| Ledger             | `PRESENT_ACCEPTED`        | inalterado                                       |
| Storage            | inalterado                | inalterado                                       |
| Deploy de produção | não iniciado por este run | não iniciado                                     |
| Smoke de ativação  | não iniciado              | não iniciado                                     |
| Rollback           | não aplicável             | não aplicável: a mutação não foi aceita          |

O comando de alteração da flag foi recusado por acesso à conta Vercel antes de sucesso, deploy ou smoke. A verificação HTTP posterior confirmou que a contribuição continua pausada e que o mapa público continua disponível.

## Segurança

- Nenhuma migration, alteração de ledger ou escrita em Storage foi tentada neste checkpoint.
- O preflight usou apenas `GET` à API da Vercel; a resposta e o token não foram publicados.
- Nenhum deploy, domínio ou outra flag foi alterado.
- Nenhum valor de conexão, token, chave ou project ref completo é registrado neste relatório.
- Não houve contribuição técnica de teste nem escrita pública de dados.

## Próximo bloqueio humano

Uma pessoa responsável deve revisar a injeção e o escopo da credencial protegida para que ela tenha acesso ao time e projeto canônicos, sem fornecer o valor no chat. Depois de um preflight HTTP `200`, será necessária uma nova autorização exata para uma nova tentativa de `mode=activate`. Esta execução não autoriza retry automático.
