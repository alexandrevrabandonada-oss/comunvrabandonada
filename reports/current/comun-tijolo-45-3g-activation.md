# Tijolo 45.3G — ativação pública controlada das Calçadas

## Resultado

`COMUN_TIJOLO_45_3G_ACTIVATION_ROLLED_BACK`

O workflow original reconheceu a aprovação exata e confirmou o estado remoto por postflight somente leitura. A ativação foi bloqueada antes da alteração da flag. Os dois primeiros preflights Vercel somente leitura responderam HTTP `403`. Após a atualização da credencial, o GET seguinte avançou pela condição HTTP `200`, mas o parser tentou executar o arquivo temporário como JavaScript e falhou. O reparo de parser separou o arquivo de resposta do programa Node e a revalidação final confirmou o acesso protegido.

A primeira ativação autorizada passou pelo postflight, alterou a flag e iniciou o deploy canônico, mas o smoke falhou antes das rotas porque exigia contexto de deployment GitHub inexistente no job. O rollback devolveu a contribuição ao estado pausado. O reparo posterior removeu essa dependência.

Com uma nova autorização exata, a ativação final foi executada no SHA `b80428643db6042ff648aa49235e7422f524ae4a`. `validate-input` e o postflight somente leitura passaram; a migration foi corretamente ignorada. A flag foi habilitada e o deploy de produção foi iniciado. O novo smoke consultou as rotas sem contexto GitHub, mas encontrou a contribuição ainda pausada; falhou fechado com `SOLO_ACTIVATION_SMOKE_CONTRIBUTION_STILL_PAUSED`. O workflow executou o rollback automático e a leitura pública confirmou novamente a pausa. Não houve retry.

## Evidência verificada

- Workflow: [COMUN Sidewalk Activate — run 30283137271](https://github.com/alexandrevrabandonada-oss/comunvrabandonada/actions/runs/30283137271)
- Preflight somente leitura: [run 30284379657](https://github.com/alexandrevrabandonada-oss/comunvrabandonada/actions/runs/30284379657) — HTTP `403`; todos os jobs mutáveis foram ignorados.
- Revalidação somente leitura: [run 30285022945](https://github.com/alexandrevrabandonada-oss/comunvrabandonada/actions/runs/30285022945), em `2026-07-27T16:30:49Z` — HTTP `403`; `validate-input` verde e todos os jobs mutáveis ignorados.
- Revalidação com acesso HTTP confirmado: [run 30286251608](https://github.com/alexandrevrabandonada-oss/comunvrabandonada/actions/runs/30286251608) — o GET avançou pela condição HTTP `200`; falha posterior no parser Node. O corpo da resposta foi impresso acidentalmente no log do run, não foi copiado para este relatório e o cabeçalho de credencial não foi impresso.
- Revalidação corrigida: [run 30287408311](https://github.com/alexandrevrabandonada-oss/comunvrabandonada/actions/runs/30287408311), em `2026-07-27T17:01:52Z` — HTTP `200`, projeto correspondente, time correspondente e nome correspondente. O parser leu apenas o caminho protegido por `PROJECT_JSON`; nenhum corpo de resposta foi impresso.
- Ativação e rollback: [run 30292000244](https://github.com/alexandrevrabandonada-oss/comunvrabandonada/actions/runs/30292000244) — aprovação exata aceita, postflight verde, job de flag/deploy inicial verde e smoke falho por contexto GitHub ausente. O rollback devolveu a contribuição ao estado pausado.
- Ativação final e rollback: [run 30294542396](https://github.com/alexandrevrabandonada-oss/comunvrabandonada/actions/runs/30294542396) — autorização nova reconhecida, postflight verde, `migrate` ignorado, flag/deploy inicial verdes e smoke falho fechado porque a contribuição permaneceu pausada. O rollback devolveu a flag a `disabled`.
- SHA imutável da ativação final: `b80428643db6042ff648aa49235e7422f524ae4a`
- SHA imutável executor: `b0beb869dfe055ff506bf5ba54c7c52c73d2d3fb`
- Project ref: allowlisted e mascarado.
- Contrato: `sidewalk-operational-safer-pre-v2` (`d916a99153c8e29a10833c4ff7c0efc5b765bdab54e08ee671ad9a1ee3e58858`)
- Ledger hash: `e36b508762b19da01afa91ff810c18c8d5d3a000c20618793eafc25c7a012793`
- Postflight: verde, somente leitura, com ledger `PRESENT_ACCEPTED`, POST escopado exato e zero findings bloqueantes.
- Scoped POST: `4bebf4c1db4da58fd9710c7f9478bb2837b171aa4620de2d376e19d5a99b66d8`

## Estado operacional

| Item               | Antes                     | Depois                                                                       |
| ------------------ | ------------------------- | ---------------------------------------------------------------------------- |
| Flag operacional   | desabilitada              | habilitada e revertida para desabilitada, confirmada pela superfície pública |
| Migration          | aplicada anteriormente    | inalterada                                                                   |
| Ledger             | `PRESENT_ACCEPTED`        | inalterado                                                                   |
| Storage            | inalterado                | inalterado                                                                   |
| Deploy de produção | não iniciado por este run | um deploy de ativação e um deploy de rollback                                |
| Smoke de ativação  | não iniciado              | falho fechado: contribuição ainda pausada após o deploy                      |
| Rollback           | não aplicável             | concluído: contribuição pública voltou a pausada                             |

O comando de alteração da flag foi executado somente na ativação autorizada. Após a falha do smoke, o rollback devolveu a flag ao estado desabilitado. A contribuição continua pausada e o mapa público continua disponível.

## Segurança

- Nenhuma migration, alteração de ledger ou escrita em Storage foi tentada neste checkpoint. O modo `migrate` foi ignorado no run final.
- O preflight usou apenas `GET` à API da Vercel; o novo run não imprimiu corpo de resposta, cabeçalho de credencial ou valor protegido.
- Nenhum domínio, outra flag, migration, ledger ou Storage foi alterado. A flag operacional foi habilitada e revertida pelo rollback automático.
- Nenhum valor de conexão, token, chave ou project ref completo é registrado neste relatório.
- Não houve contribuição técnica de teste nem escrita pública de dados.

## Próximo bloqueio humano

O run sensível `30286251608` foi removido mediante aprovação explícita, depois da preservação da evidência sanitizada. O próximo checkpoint precisa fazer o smoke aguardar a propagação pós-deploy antes de decidir que a contribuição segue pausada; depois disso será necessária outra autorização humana exata. Não há ativação autorizada nesta execução.
