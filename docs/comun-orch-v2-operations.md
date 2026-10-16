# COMUN ORCH-V2 — resiliência, backstops e integração controlada

**Estado: CANDIDATO EM PR, NÃO ATIVADO NA AUTOMAÇÃO LOCAL.** Especificação: [Issue #555](https://github.com/alexandrevrabandonada-oss/comunvrabandonada/issues/555). Este contrato é subordinado ao roadmap único em `docs/comun-product-objective-and-roadmap.md`.

## Escopo entregue

`scripts/roadmap/orch-v2.mjs` é um **motor puro de decisão**: seleciona no máximo uma tarefa elegível por ciclo, propõe uma sondagem por janela, distingue bloqueios, limita falhas repetidas, decide alertas únicos e classifica provas de Preview. O adaptador `scripts/roadmap/orch-v2-cli.mjs` recebe JSON por stdin e emite JSON por stdout. **Não consulta GitHub, não adquire/remove lock, não atualiza Git, não envia mensagens e não programa execuções.** Isso continua exclusivamente sob o launcher local existente.

```sh
node --test scripts/roadmap/orch-v2.node-test.mjs
printf '%s\n' '{"operation":"plan","args":{"now":"2026-10-16T16:00:00Z","lock":{"status":"OWNED","ownerId":"cycle-123","verified":true},"tasks":[{"taskId":"search","status":"READY","priority":10,"authorized":true,"prEffect":"NONE","dependencies":[]}]}}' | node scripts/roadmap/orch-v2-cli.mjs
```

O CLI só aceita `plan`, `preview`, `fingerprint`, `notify`, `failure`, `observe`, `cycle`, `probe` e `external`. O inventário remoto e a classificação de PR devem ser providos pelo launcher, e operações de escrita nunca são expostas por esse CLI. Input inválido é erro fechado (exit 2), sem plano de execução.

## Estados e ledger

Estados: `READY`, `RUNNING`, `WAIT_CI`, `WAIT_EXTERNAL`, `WAIT_HUMAN`, `RETRY_BACKOFF`, `BLOCKED_PROTECTED`, `DONE`.

Para cada tarefa: `taskId`, `status`, `priority`, `authorized`, `dependencies[]`, e opcionalmente `action`, `inputFingerprint`, `failureFingerprint`, `attemptsForFingerprint`, `lastAttemptId`, `nextProbeAt`, `lastNotifiedFingerprint`, `evidenceSha`, `noProgressCycles`, `stalledOnFingerprint`, `lastCycleId`, `observationFingerprint`, `probeNoChangeCount`, `lastProbeId`.

Os `inputFingerprint`s devem refletir alterações reais nas entradas pertinentes — SHA, check/run, contrato, autorização, dependências e identificador de owner — **não** a hora da consulta. Uma mudança de fingerprint limpa o orçamento de retry, mas **não** supera gates `WAIT_HUMAN` ou `BLOCKED_PROTECTED`.

## Backstops obrigatórios

| Evento | Ação/garantia |
| --- | --- |
| Outro owner ativo ou lock órfão sem proveniência verificável | `PROTECTED_NOOP`; nunca remover lock apenas porque PID morreu |
| Tarefa prioritária bloqueada e outra independente READY | `EXECUTE_ONE` para a elegível; uma entrega por ciclo |
| Dois ciclos distintos sem mudança de evidência em tarefa READY | `WAIT_EXTERNAL` e seleção de outra frente; não repetir indefinidamente a mesma tarefa |
| Sondagem CI sem mudança | Backoff progressivo 15 min, 1 h, 4 h, 12 h e máximo diário; sem rerun/novo build |
| Primeira falha transitória | `RETRY_BACKOFF`, próxima tentativa só após janela |
| Segunda falha equivalente | `WAIT_EXTERNAL` sem retry até mudança material |
| Todas as tarefas aguardando | `QUIET_NOOP`: zero worktree, commit, push, build, rerun e alerta duplicado |
| CI ainda em andamento | `WAIT_CI` e `nextProbeAt`: sonda uma vez quando vencer a janela |
| CAPTCHA, permissão ou segredo | `WAIT_HUMAN`, notificação única por bloqueio |
| Timeout de operação remota com resultado incerto | Reconciliar no provedor; jamais repetir cegamente |
| Lock/ref/checkpoint inválido | Parar protegido; nenhuma substituição silenciosa pela main antiga |
| `COST-02=SUCCESS` com Preview cancelado pela política de economia | `DEPLOY_INTENTIONALLY_IGNORED`, não `READY` |
| Preview READY em ancestral + diff completo sem impacto runtime | `EQUIVALENT_RUNTIME_PREVIEW_PROVEN` apenas como prova distinta; se SHA exato é exigido, gate continua pendente |
| Falhas de schema/migration da Escola | Não dispensar gates, não aplicar migration automaticamente |

A prova de equivalência exige ancestralidade comprovada, diff completo, mesmo projeto/branch/target Preview/origem Git, COST-02 verde e alterações **somente** em caminhos build-safe. Não atribuir sucesso a check `SKIPPED` ou `PENDING`, nem reutilizar PASS entre SHAs.

**Backstops adicionais a cargo do launcher:** preservar `refs/comun/roadmap-execution` com CAS do SHA previamente observado; validar ownership do lock e de worktree; limitar o ciclo a 25 minutos, uma entrega, até duas tentativas equivalentes, um push material; interromper ao atingir orçamento; registrar ações externas por idempotency key; notificar somente em transição material.

## Integração local — sem criar automação adicional

1. Verificar por readback o agendador ativo `comunvr-execu-o-aut-noma-do-roadmap`, sua frequência e o projeto `E:/COMUN-SEARCH-CONTEXT-20261015`. A branch remota **não altera** o launcher local.
2. Fazer diagnóstico e eventual recuperação do lock pelo protocolo atual. Criar worktree isolado e preservar a árvore original.
3. Testar o motor em simulação com cenários de ausência de progresso, colisão de lock, CAS concorrente, crash antes/depois de escrita, efeito remoto incerto e gates humanos/sensíveis.
4. Implementar um **adaptador local** que alimente as observações reais no motor. Até a migração V1/V2 ser testada, preservar o checkpoint V1 íntegro. Persistir ledger V2 aditivamente, sem perder campos legados, somente por CAS sob ownership válido.
5. Em `QUIET_NOOP`, zero gravação por mudança de timestamp. Em `PROTECTED_NOOP`, nenhuma alteração.
6. Simular dois ciclos sucessivos com os mesmos fingerprints e provar zero novo trabalho. Executar depois um único canário local, reversível e não sensível.
7. Atualizar **a mesma** automação, sem trocar frequência nem criar residente paralelo; fazer readback do prompt e configuração; em falha, restaurar prompt antigo. Só declarar `ATIVADO_LOCAL` após prova real.

O motor não altera Production, schema, migrations, flags, permissões, indexação, secrets, recursos pagos ou PRs protegidos. Todos esses gates permanecem no launcher. Não supor que êxito unitário substitui teste real de CAS/processos simultâneos.

## Teste de aceitação para encerramento da integração

- Seleção de trabalho independente apesar do bloqueio #553/Escola.
- Duas execuções `NOOP` consecutivas, zero novas operações e zero avisos repetidos.
- Orfandade incerta e concorrência no lock nunca geram exclusão ou escrita indevida.
- Failures equivalentes não geram terceiro retry cego.
- Resultado remoto incerto nunca gera operação duplicada.
- `CANCELED` intencional e `READY` exato são classificados diferentemente.
- Ledger e ref canônica sobrevivem a interrupção; ausência de CAS aborta com segurança.
- Somente uma automação ativa; configuração relida e estado original preservado.

**Situação de 16/10/2026:** #553 tem COST-02 aprovado no HEAD `bbb533ad`, mas deployment exato `CANCELED` por `COMUN_VERCEL_BUILD_IGNORED:no-runtime-allowlist`; ancestral `f2aaea03` tinha Preview `READY`. Os sete preflights da Escola continuam separados e bloqueantes. Registro detalhado: [Issue #555, evidência complementar](https://github.com/alexandrevrabandonada-oss/comunvrabandonada/issues/555#issuecomment-6219018776).

**Relatório obrigatório:** ENTREGUE / VERIFICADO / PENDENTE / PRÓXIMO MOVIMENTO. Nunca confundir especificado, codificado, testado localmente, PR draft, integrado localmente ou Production.


## WIP e admissibilidade de PRs — backstop aplicado ao planejador

Antes de executar qualquer tarefa `READY`, declarar `prEffect` obrigatoriamente: `NONE`, `EXISTING_PR` com `targetPr` numérico, ou `NEW_PR` com ação explícita `CREATE_PR`/`NEW_FEATURE_PR`/`OPEN_PULL_REQUEST`. Efeito não declarado bloqueia a candidatura, sem impedir reparos e revisões independentes devidamente classificados. Nunca informar `NONE` numa tarefa que possa abrir PR; a CLI é um motor de decisão e não substitui a auditoria das ações reais.

Uma tarefa de `NEW_PR` exige inventário `portfolio` verificado, do repositório canônico, com `observedAt` há até 30 minutos, `openCount`, todos os `openPrNumbers` sem duplicação, `activeImplementationCount`, `activeIntegrationCount` e `newPrCredits` quando sob o limiar. Com **mais de 5 PRs abertos**, o modo `INTEGRATION_DEBT_MODE` proíbe novos PRs funcionais. Exceção somente de segurança urgente ou reparo indispensável à integração existente, comprovada como impossível na branch atual e explicitamente aprovada por humano; o executor deve verificar autorização real, e não confiar cegamente num booleano recebido.

Com 5 ou menos PRs, novos PRs só são elegíveis se houver no máximo uma implementação e nenhuma integração ativa no momento da criação, e um crédito confirmado por merge/encerramento justificado. `newPrCredits` nunca deriva de simples passagem de tempo, troca de SHA ou fechamento desconhecido; consumir crédito uma vez com CAS. As 2 implementações e 1 integração são limites **de trabalho em progresso**, não autorização de mesclar PRs.

**Importante:** não há transação atômica com GitHub na decisão do motor. Antes da ação real `CREATE_PR`, o launcher deve **consultar novamente o inventário remoto e reexecutar a admissão**, confirmar ausência de PR existente de mesmo escopo e registrar intenção idempotente na ref canônica via CAS. Se o inventário estiver parcial, inacessível, defasado ou se houver corrida, abortar com proteção. Sem limite contornado por novos IDs de tarefa, branches ou worktrees.

No momento da inspeção, havia 22 PRs abertos, incluindo a pilha #511–#515; não marcar todos como integráveis. #545 é candidato para revisão, mas não tem reviews humanos registrados e não está autorizado a merge automático. #556 deve receber correções no próprio PR. O limite deve entrar **também no executor de operações GitHub**, não apenas no planejador declarativo.
