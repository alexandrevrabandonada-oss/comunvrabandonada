# COMUN ORCH-V2 — resiliência, backstops e integração controlada

**Estado: CANDIDATO EM PR, NÃO ATIVADO NA AUTOMAÇÃO LOCAL.** Especificação: [Issue #555](https://github.com/alexandrevrabandonada-oss/comunvrabandonada/issues/555). Este contrato é subordinado ao roadmap único em `docs/comun-product-objective-and-roadmap.md`.

## Escopo entregue

`scripts/roadmap/orch-v2.mjs` é um **motor puro de decisão**: seleciona no máximo uma tarefa elegível por ciclo, propõe uma sondagem por janela, distingue bloqueios, limita falhas repetidas, decide alertas únicos e classifica provas de Preview. O adaptador `scripts/roadmap/orch-v2-cli.mjs` recebe JSON por stdin e emite JSON por stdout. **Não consulta GitHub, não adquire/remove lock, não atualiza Git, não envia mensagens e não programa execuções.** Isso continua exclusivamente sob o launcher local existente.

```sh
node --test scripts/roadmap/orch-v2.node-test.mjs
printf '%s\n' '{"operation":"plan","args":{"now":"2026-10-16T16:00:00Z","lock":{"status":"OWNED","ownerId":"cycle-123","verified":true},"tasks":[{"taskId":"search","status":"READY","priority":10,"authorized":true,"dependencies":[]}]}}' | node scripts/roadmap/orch-v2-cli.mjs
```

O CLI só aceita `plan`, `preview`, `fingerprint`, `notify`, `failure`, `observe`, `cycle`, `probe` e `external`. Input inválido é erro fechado (exit 2), sem plano de execução.

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
