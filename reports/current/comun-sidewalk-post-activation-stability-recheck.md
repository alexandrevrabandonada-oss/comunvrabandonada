# Tijolo 45.4 — estabilidade pós-ativação, repetição read-only

Resultado: `COMUN_SIDEWALK_POST_ACTIVATION_STABILITY_GREEN`

Checkpoint: `sidewalk-post-activation-checkpoint-20260729-06`

Esta é uma nova auditoria exclusivamente read-only. O resultado bloqueado do
checkpoint `20260729-04` continua preservado como registro histórico: a sua
evidência runtime era verde, mas o renderer legado selecionava um pacote do
attempt 02. O renderer corrigido é usado aqui com fonte explícita do attempt
03, sem sobrescrever artifacts históricos.

## Evidência observada

- activation run/attempt/SHA: `30454192828` / `sidewalk-activate-20260729-03` / `9b07bcfb52c4a3b9d00c5e0fa263237f3e8b110c`;
- main atual: `e8dacb04a4a6628eba5c6ee1f9fbc73dd560a038`;
- Production: `READY`; as diferenças desde a ativação estão limitadas a processo, scripts e relatórios, sem arquivos de runtime em `app`, `components` ou `lib`;
- inventário read-only: run `30461347309`, chaves operacionais presentes em Production e nenhum valor persistido;
- diagnóstico protegido read-only: run `30461433004`, `database=reachable`, `ledger=exact`, `migrationRequired=false`, `flag=enabled` e `operationalState=OPERATIONAL_READY`;
- renderer corrigido: selecionou exclusivamente o attempt 03 e gerou `COMUN_SIDEWALK_POST_ACTIVATION_RENDERER_CORRECTED_RUNTIME_UNCHANGED`, sem selecionar o artifact histórico;
- smoke público somente GET: mapa e contribuição responderam `200`; o mapa real respondeu Range válido; a interface de contribuição foi renderizada sem a mensagem de pausa, sem preenchimento ou submissão;
- navegador: zero erros de console; não houve método mutável usado pelo checkpoint;
- histórico do workflow: há exatamente uma ativação bem-sucedida, no run `30454192828`; `migrate` não foi executado com sucesso e o attempt 03 não foi reutilizado.

## Segurança e integridade

Os artifacts do inventário e diagnóstico passaram na leitura sanitizada: não
persistem respostas brutas, valores de ambiente ou credenciais. O checksum da
migration canônica permanece
`6a2e69dcc66f760fa1828bb43249079e8db474ad8b175d3af6aa7c97ec05b1be`; o do
manifesto canônico permanece
`ceb7002f9a7069cbe82c4e6b16032bef1cd3619f12271a260dbca37fb5bc1335`.

Não foram executados `activate`, `migrate` ou rollback por este checkpoint.
Não houve escrita em banco ou Storage, alteração de ambiente, promoção manual
de deployment, envio de contribuição ou criação de outro activation attempt.

## Limite conhecido

O consumo do attempt continua `process_controlled_consistent`: não há nonce
remoto persistente. A auditoria apenas confirmou que não houve reutilização do
attempt 03; ela não declara essa limitação resolvida.

## Próximo gate permitido

Somente após autorização humana separada, preparar uma validação controlada da
primeira contribuição em produção: uma única escrita previamente definida,
actor identificado, dados não sensíveis, evidência antes/depois, verificações
de banco e Storage e procedimento explícito de preservação ou remoção. Esta
auditoria não iniciou essa etapa.
