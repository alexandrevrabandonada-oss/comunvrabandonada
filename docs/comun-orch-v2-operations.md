# COMUN ORCH-V2 — resiliência, backstops e integração controlada

## Contratos adicionais de ativação — candidato de 17/10/2026

Tier L tem avaliação pura `assessLowRiskMerge`, OFF sem política humana específica.
Mesmo uma admissão válida retorna `mutation_enabled=false`: o endpoint real
continua exclusivo Tier D. A avaliação exige diff completo de até três arquivos
explicitamente permitidos, até100 linhas, todos os checks próprios, COST-02,
Preview Git READY exato, contratos focais/qualidade e prova do efeito em Production.
Paths sensíveis, grants genéricos e Preview ancestral/cancelado são recusados.

Tier D exclui também roadmap canônico, instruções da automação e Escola.
Antes de qualquer intenção/PUT, `merge_policy.production_effect` precisa provar
`NO_PRODUCTION`, hash da evidência e `base_sha` idêntico ao main observado.
Um diff documental não prova que um merge deixa de acionar Production. Ausência
dessa prova é bloqueio específico; nenhuma configuração de deploy é alterada.

A descoberta BUILD lê `roadmap_backlog.items` do **mesmo checkpoint canônico** e
confere a seção real em `docs/comun-product-objective-and-roadmap.md`. Não existe
arquivo de backlog paralelo. Cada item READY precisa de task_id, prioridade,
PR/branch/SHA existentes, até três paths seguros, test_criteria e dependências.
O ledger vivo precisa conter `roadmap_discovery` humano, enabled, com escopo
`EXISTING_PR_ROADMAP`, evidence_sha e grants por task_id/criteria_sha. criteria_sha
é o hash do item integral; documentação nova ou critérios alterados não concedem
permissão. Grants revogados são recusados tanto na admissão quanto no claim.
Dependência só satisfaz com PASS no SHA/fingerprint próprio. Outra frente
independente pode avançar. Sem critérios estruturados ou grant, informar a razão
tipada e não inventar uma entrega. A tarefa usa PR_HEAD, lease, candidate, intent,
push normal restrito aos paths e reconciliação APPLIED existentes.

Estes contratos não demonstram instalação. CI no SHA exato, canário, readback do
scheduler original e os dois wakes reais do protocolo continuam obrigatórios.

## Recuperação da fila vazia — 17/10/2026

A instalação é identificada pelo manifesto e pelo prompt, nunca pelo HEAD da
#556. O diagnóstico desta intervenção encontrou revisão106, 25 tarefas:
0 READY, 19 DONE, 2 WAIT_EXTERNAL, 1 RETRY_BACKOFF, 1 WAIT_HUMAN e
2 BLOCKED_PROTECTED. Sete observadores fechados não alimentavam a fila.

`comun-orch-discovery.mjs` repõe no máximo uma tarefa quando não há EXECUTE
elegível. A autorização humana desta intervenção fica no ledger, com hash da
fonte e escopo `existing-pr-code-repair`; sua ausência impede descoberta.
Uma página completa de até99 PRs abertas e a triagem de um único HEAD por
ciclo limitam as consultas. A primeira triagem é #551; as demais rotacionam.
Cooldown40min entre triagens, 4h ao completar a volta, duas falhas equivalentes
de leitura abrem circuito de24h. Cursor, alertas deduplicados e métricas de
ciclos ficam no mesmo `ORCH_OBSERVER_CONTROL`, sem outro arquivo/agendador.

A primeira receita automática é `PRETTIER_TEST_ONLY`: workflow atual falho,
job/attempt/log próprios, até três arquivos de teste não sensíveis e readback
do HEAD. O executor deve reproduzir o erro, formatar somente esses arquivos,
comparar tokens sem trivia e executar a verificação própria. Não mudar
assertivas, gerar build/deploy ou declarar outras falhas resolvidas. Reparos
fora dessa receita e consolidações com dependências precisam de evidência
de escopo revisada; o motor não inventa integração segura a partir de CI vermelho.

PR/SHA/receita/caminhos definem a deduplicação; nova consulta/run/log não
renova tentativas. DONE não é reaberto pela descoberta. Gates humanos,
protegidos, autorização falsa, forks e operação UNCERTAIN impedem admissão.
A gravação conjunta de admissão e claim usa lock original, ledger-hash e ref
CAS. A tarefa segue o EXECUTE comum, com lease25min e worktree detached no
HEAD da PR existente. Mudança de HEAD durante fetch aborta; falha após
persistir lease preserva lock e evidências para reconciliação.

Antes de um push material, validar novamente HEAD remoto e o diff restrito
aos caminhos admitidos. Testes são código material, formatação vazia não.
Um push por lease, intenção UNCERTAIN antes do efeito e reconciliação APPLIED
depois. Só APPLIED de normal-code-push conta em `delivery_metrics`, com
instante/SHA/tarefa próprios. Observações, testes e transições de estado não
são entregas; horários históricos desconhecidos continuam desconhecidos.

Instalação exige módulos+manifesto verificados, consolidação descendente por
CAS, canário diagnose/hold reversível e atualização/readback da mesma
automação com40min preservados. Canário controlado não prova disparo nativo.
Nenhuma nova PR, merge, Production ou permissão é autorizada.

## Diagnóstico tipado e revisão independente — candidato de 17/10

`comun-orch-ci-diagnostics.mjs` classifica sintomas comprovados dos jobs falhos
em CODE, INFRASTRUCTURE, EXTERNAL_DEPENDENCY, QUOTA e CONFIGURATION. Logs ausentes,
parciais ou contraditórios ficam INSUFFICIENT_EVIDENCE/INDETERMINATE; sintomas
múltiplos não viram uma causa raiz inventada. O run39032295155/ad6fb854 tem
quota Docker e HTTP502 durante preparação Supabase; isso não é prova de falha
de código nem de sucesso dos testes que não chegaram a executar.

O reconciliador lê somente jobs de um workflow já rastreado no HEAD/attempt
exatos, até100 jobs e seis jobs falhos, com logs limitados. Valida run/HEAD e
relê o HEAD depois. Persiste identificadores de regras, passos e hashes; não
persiste conteúdo bruto de logs. O diagnóstico do mesmo attempt é reutilizado.
Enriquecer metadados não altera inputs, não limpa tentativas e não transforma
SKIPPED/PENDING/NOT_RUN em PASS. Resultado operacional continua sob o único lock,
owner e CAS; não há segundo escritor. Falha ao ler logs usa o mesmo circuit breaker
da memória: duas falhas iguais, sondagem após24h e recuperação no mesmo HEAD,
sem nova tentativa de execução. Causa inconclusiva com log completo aguarda input
pertinente; não se repete a coleta do mesmo attempt para tentar outra conclusão.

Recuperação é uma decisão condicionada: quota/infra/dependência com sintoma
isolado admite apenas observação após24h; código/configuração propõe reparo na
branch existente, a selecionar separadamente; causa indeterminada aguarda prova.
Efeito incerto exige reconciliação e humano/protegido continua protegido. Nenhuma
decisão autoriza rerun, dispatch, gasto, credencial ou terceiro build equivalente.
O circuit breaker existente pode detectar recuperação do serviço com mesmo HEAD;
não executa workflow para fabricar verde.

`diagnose` acrescenta saúde: último wake registrado na memória (não inventa wake
nativo), última transição, último push APPLIED conhecido, bloqueios/dependências,
causas, próxima ação e motivo do NOOP. Falta de wake após dois intervalos é
MISSED_WAKE;24h sem transição com trabalho elegível sem avanço, ou orçamento de
ciclos sem progresso esgotado, é STALLED. Espera humana/protegida ou cooldown
legítimo continua WAITING, com tempo sem progresso informado. Horário exato do progresso material que
não esteja registrado é UNKNOWN, não substituído pelo horário de uma sondagem.
`comun-orch-review-cli.mjs verify` recebe provas por stdin e verifica conclusão
sem rede nem escrita. Exige SHA/fingerprint próprios, dependências próprias,
snapshot completo e fresco, workflows/COST-02 e Preview Git exato. Checks
ignorados por política versionada são exclusões documentadas, nunca PASS.
Falha/pendência/Preview cancelado impede certificação; saída PENDING tem exit2.

`portfolio` nesse CLI reavalia somente branches existentes de um inventário
completo/fresco. A pilha511→515 exige deltas únicos e dependências, depois vêm
falhas a diagnosticar e revisões. O resultado referencia o roadmap único; não
adiciona tarefas automaticamente, não fecha PR por idade, não concede merge e
mantém no_new_prs=true e tetos2 implementações/1 integração.

Instalação não decorre de push: os dez módulos do manifesto precisam de hashes
canônicos, CI/Preview próprios, canário instalado e readback do mesmo agendador.
Enquanto gates do novo SHA estiverem pendentes, preservar a instalação ad6fb854,
o intervalo40min e a ref operacional. Rollback continua por commit descendente
sob owner/CAS e restauração do prompt pela ferramenta; nunca rebobinar ledger/V1.
Provas desta missão: `reports/current/comun-orch-intelligence-20261017.json`.

Contradição real no primeiro candidato016b28bf: V1/run39073207133 falhou no
`git diff --check`, por CRLF no relatório novo. O log exibiu o diff contendo
“toomanyrequests”; isso não prova quota no passo falho. O classificador agora
isola o comando que terminou com erro, remove payload de diff e reconhece
whitespace como CODE. Grupo estruturado sem comando falho comprovado permanece
indeterminado. O relatório usa LF. Regressões reproduzem essa fonte nova; não
há dispensa do gate nem rerun cego do mesmo código.

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
