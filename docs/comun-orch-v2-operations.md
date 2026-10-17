# COMUN ORCH-V2 — resiliência, backstops e integração controlada

## Reconciliação limitada de instalação — 17/10/2026

O launcher instalado deve ser identificado pelo prompt da única automação e pelo
manifesto; HEAD remoto da #556 não implica atualização local. `diagnose` só existe
nas revisões posteriores a `976243dc`. Na versão antiga um comando desconhecido
podia executar tick: nunca testar diagnose nela. Depois de verificar os blobs,
`diagnose` mostra lock, revisão do ledger, fila, dependências, entrada que falta
e próxima observação, sem rede, lock novo ou escrita. Erro fatal retorna
`PROTECTED_STOP`, exit1 e `error_fingerprint`; o agente compara com a memória e
alerta uma vez por fingerprint. Nunca comunicar esse erro como NOOP saudável.

`comun-orch-reconcile.mjs` mantém um registro fechado dos workflows já rastreados
da #556 (Contract, Quality, Security) e das revisões existentes #511/#545/#550/#554.
Quando não há entrega elegível, tick lê no máximo uma observação pertinente.
Uma observação de workflow inclui PR/HEAD, o run exato e readback do mesmo HEAD.
Não faz inventário geral, dispatch, rerun, criação, fechamento, merge ou deploy.
Ausência de workflow no HEAD novo significa espera, nunca PASS do HEAD anterior.
Mudança comprovada de HEAD/run/attempt/conclusion preserva histórico, atualiza
inputs por CAS e pode tornar elegível uma revisão independente. Dependências
da mesma PR precisam do mesmo SHA antes de permitir certificação.

O cursor `observer_control.cursors[task_id]` é controle da memória já obrigatória
da automação, separado do ledger/provas/tarefas: backoff15min/1h/4h/12h/24h; duas falhas equivalentes de API
suspendem a leitura até mudança pertinente de input. A sondagem é `OBSERVE`, não
NOOP nem entrega material. Evidência igual não muda inputs, provas, ledger ou ref;
somente devolve o próximo cursor ao agente. O agente conserva esse bloco no mesmo
resumo de memória que a plataforma já exige escrever, sem arquivo/agendador extra.
O launcher lê o bloco `ORCH_OBSERVER_CONTROL` antes de decidir; corrupção é erro
protegido, nunca reset silencioso. Somente evidência nova usa lock/hash/ref CAS.
Fora da janela, NOOP não escreve
nem cria lock/worktree. Esse cursor não reabre humano, migration ou efeito incerto.
Alertas de API são deduplicados no cursor da memória; erros de launcher e lock incerto são
deduplicados pela memória da mesma automação, sem escrever em lock alheio.

`pr552-cost-publication` exige COST-02 do job117036307632/run38919753803 **e**
Preview Git exato normalizado em14596e75. Sem nova fonte exata não há consulta
agregada capaz de satisfazer esse gate. `pr554-domain` não se torna integrado
por temporizador: review-pr554 já concluiu triagem e a Home ainda exige preservar
#552/#553 e Jogos/#550, além da evidência humana real pertinente. Sete preflights
da Escola e todos os gates sensíveis permanecem intactos.

`comun-orch-release.mjs` prepara os oito módulos e manifesto em diretório novo,
consolida apenas caminhos de release na ref por CAS descendente e executa canário
diagnose/hold. A ativação da mesma automação exige backup integral, readback e
prova no computador. Em falha, restaura prompt anterior pela ferramenta e os
blobs anteriores por **outro commit descendente**; jamais retrocede ref/checkpoint
ou ledger. CAS concorrente preserva candidato e exige reconciliação. Repositórios
descartáveis testam processos/Git reais, mas não substituem readback instalado e
observação real de uma mudança externa. Disparo controlado não prova wake nativo.

**Estado: candidato draft #556 com adaptador operacional versionado.** A ativação local anterior (`d36d0574`) está preservada; a instalação desta revisão exige provas próprias e readback. A ref local `refs/comun/roadmap-execution` mantém o histórico de ativação e inventário. Não confundir motor remoto com versão instalada nem ticks controlados com disparo nativo. Especificação: [Issue #555](https://github.com/alexandrevrabandonada-oss/comunvrabandonada/issues/555). Este contrato é subordinado ao roadmap único em `docs/comun-product-objective-and-roadmap.md`.

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

**Circuit breaker de leitura remota:** duas falhas idênticas suspendem consultas frequentes. O observer conserva o fingerprint e agenda uma única sondagem *read-only* após 24 horas; falha persistente volta a esperar 24 horas sem repetir alertas nem gravar o ledger. Recuperação do serviço limpa o contador mesmo que o HEAD seja o mesmo. Cursor antigo com `suspended=true` e `next_probe_at=null` permite uma leitura de migração e passa a usar cooldown; o intervalo só existe na memória do observer, não aciona CI, build ou operações mutáveis.

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

## Executor local e dívida de integração — revisão de 16/10

O adaptador em scripts/process conecta o motor publicado à automação existente.
O manifesto do launcher fixa seis módulos, remoto, common-dir e blobs canônicos.
Ledger V2 é aditivo: preserve V1, campos desconhecidos, provas, leases e intenções.
Persistir somente sob bytes do owner, hash esperado e ref observada. Um snapshot
antigo do checkpoint nunca reabre prova operacional mais recente. Recuperação
explícita exige owner/bytes/PID/start/host, sessão comprovadamente encerrada e
nenhuma concorrência; idade ou PID morto não autorizam takeover.

INTEGRATION_DEBT: acima de cinco PRs, priorizar revisão/reparo em branches
existentes, sem branches para contorno. Nesta missão no_new_prs=true proíbe
qualquer abertura, inclusive quando a fila diminuir. Máximo duas implementações
e uma integração; o lock compartilhado e a lease atual tornam a execução local
serial, dentro desses tetos. pr_effect e target_pr são persistidos por tarefa.

O executor real é comun-orch-github-executor.mjs, chamado pelo launcher somente
em create-pr explícito. Ele consulta GitHub sem cache dentro da chamada, valida
fila/WIP/crédito/PR existente, grava intenção UNCERTAIN por CAS e consulta outra
vez imediatamente antes do efeito. Mudança da fila cancela com NOT_APPLIED;
timeout mantém UNCERTAIN e impede duplicação. Nesta missão o caminho de criação
é bloqueado e não será chamado. Só testes usam provedores mutáveis sintéticos.
Não há criação de PR fora desse executor no runtime local autorizado.

Os testes de processos/Git, interrupção, CAS, retomada e canário instalado são
separados dos 54 testes puros do candidato cda454e9. O workflow ORCH-V2 executa
ambos. Nenhum resultado de CI de cda454e9 é transportado para seu descendente.
A fronteira de criação testa corrida após planejamento e após intenção, fila
parcial/desatualizada, timeout e idempotência; nenhuma API real é criada em teste.

Suspensão reversível: tick --hold preserva estado; atualizar somente o prompt da
mesma automação pela ferramenta, sem mudar frequência. Retomar removendo --hold.
Ao sair sem resultado usar record cycle-complete; dois ciclos sem progresso
suspendem. Antes de push registrar operation-intent, depois reconciliar o HEAD
remoto com o SHA esperado. Um push material por ciclo; não criar commit vazio,
rerun ou deployment para tornar status verde. No máximo duas falhas equivalentes.

Certificação de revisão não é integração: #545 em 0eb41ec4 tem checks próprios
aprovados e nenhuma thread/review pendente, mas Preview exato CANCELED intencional.
Ancestral 2d965ea3 READY e diff completo apenas docs/testes provam equivalência
separada; exigência de Preview exato continua pendente. READY_FOR_REVIEW permite
revisão humana, nunca merge/Production automático. #550 é documental; #554 deve
preservar o action submitPublicSearch de #553 e os trechos Jogos de #550. Sete
preflights da Escola continuam obrigatórios em #552/#553; nenhuma dispensa.
