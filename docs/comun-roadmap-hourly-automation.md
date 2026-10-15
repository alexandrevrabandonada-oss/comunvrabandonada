# Automação horária COMUN — pacote de ativação

Nome: **ComunVR — Execução Autônoma do Roadmap**.
Cadência autorizada: uma execução por hora. Projeto Git local:
`alexandrevrabandonada-oss/comunvrabandonada`. Execução: worktree isolado.
Estado: **NOT_CREATED_NOT_ACTIVE**. Piloto local executado; ativação bloqueada
porque list_projects não retorna projeto local COMUN e Computer Use não inicializa
(kernel assets/path, erro 3). Não há automação existente para duplicar.

## Prompt preparado para o agendador

Execute um ciclo limitado do roadmap canônico COMUN. Primeiro confirme o remoto
exato alexandrevrabandonada-oss/comunvrabandonada e o worktree isolado do ciclo.
Se o agendador abrir a árvore principal ou não houver projeto local acessível,
pare sem escrita e registre o impedimento. Leia AGENTS.md, o roadmap
`docs/comun-product-objective-and-roadmap.md`, o checkpoint
`reports/current/comun-execution-checkpoint.json` e GitHub vivo.

Leia o checkpoint mais novo da ref local compartilhada
`refs/comun/roadmap-execution` neste mesmo git-common-dir. A cópia do arquivo no
worktree pode ser antiga. Ausência/mudança de repositório/ref exige reconciliação,
nunca substituição silenciosa por main antiga. Não exportar dados privados.

Adquira atomicamente o diretório de lock `<git-common-dir>/comun-roadmap-cycle.lock`
antes de qualquer trabalho. Grave identificador próprio e processo. Se existir,
registe execução sobreposta e pare; não remova lock de outro processo. Solte apenas
o lock cujo identificador ainda seja o desta execução, em finally. Lock órfão sem
proveniência verificável exige intervenção, nunca roubo automático.

Priorize a conclusão de Quality/Civic do PR #553. Confira SHA antes de atribuir
resultados. Preserve os sete preflights de schema/Escola. No piloto, navegador,
Auth/Postgres e COST-02 estavam verdes em f2aaea03; Experience Coherence job
116631876941 mostrou document-title sério em 768x1024, ainda não reproduzido
localmente. Investigue somente falhas novas ou contraditórias. Não repetir teste
aprovado sem diff relevante; SKIPPED/PENDING/NOT_RUN não são PASS. Não renomear
CI anterior como aprovação de outro head; Preview não é Production.

Quando a etapa atual estiver resolvida, selecione somente a próxima entrega
independente elegível de maior prioridade do mesmo roadmap. Implemente a menor
alteração suficiente, teste regressões pertinentes, investigue causas e registre
commit/evidência/SHA. Uma entrega por ciclo, no máximo duas tentativas equivalentes
por finding e um push material de código. Sem push vazio/documental para provocar
CI, workflow_dispatch ou rerun de verde. Não reduzir assertivas/timeouts de testes.
Orçamento operacional de 25 minutos: não iniciar operação que não caiba; CI pode
continuar assíncrono, com estado PENDING para o próximo ciclo. Não criar recursos
pagos, comprar créditos ou alterar planos. Limites são instruções operacionais,
não quotas duras certificadas do agendador.

Compare o fingerprint de base, tarefa, dependências e resultados com o ciclo
anterior. Três ciclos sem mudança material entram em diagnóstico somente: consulta
mínima e nenhuma repetição de implementação/testes/CI até mudança externa. Não
criar outra automação, alterar frequência ou desativar esta sem autorização.

Ao consolidar, capture o SHA da ref canônica antes de editar. Crie o commit do
checkpoint como descendente desse SHA e valide JSON, autorizações, hashes e
proveniência. Atualize `refs/comun/roadmap-execution` somente por compare-and-swap
`git update-ref <ref> <novo> <anterior-observado>`. Se outro ciclo avançou, preserve
seu commit, releia o estado e reconcilie sem sobrescrever; no máximo uma nova
reconciliação. Não atualizar árvores de terceiros. Publicação remota só por push
normal após conferir o head remoto e escopo; conflito não autoriza force-push.
Atualizar checkpoint não autoriza merge em main. Cada ciclo seguinte retoma pela
ref e pelo arquivo, mantendo evidências anteriores com seus SHAs.

Não fazer merge, deploy Production, migration remota/destrutiva, alteração de
permissões, flags, indexação, secrets ou dados Production, nem gastos. Não buscar
chaves, consumir o lote Gmail 0/6, renovar backup ou emitir permit neste escopo.
Escola continua condicionada aos requisitos existentes, sem novos gates fictícios.
Bloqueio externo/ausência de tarefa/limite exige estado recuperável e parada.

Finalize com **ENTREGUE**, **VERIFICADO**, **PENDENTE** e **PRÓXIMO MOVIMENTO**.
Não alegar conclusão global sem os critérios canônicos demonstrados.

## Piloto e ativação

Piloto manual em `E:/COMUN-ROADMAP-PILOT-20261015`, partindo de 78c50928,
sem dependências instaladas, testes verdes repetidos ou CI disparado. Verificações:
JSON e autorizações/hashes históricos preservados; lock exclui segundo ciclo;
commit recuperável em ref compartilhada; escrita stale recusada por Git CAS.
A ref é local ao repositório, não backup remoto nem armazenamento entre clones.

Para ativar, o projeto precisa aparecer como projeto local no catálogo do app e
permitir worktree. Usar a ferramenta oficial automation_update para uma única
configuração com o nome acima, horário de uma vez por hora e prompt preparado;
reler a configuração criada e confirmar projeto, worktree, frequência e status.
Até essa verificação, não marcar scheduledAutomationCreated=true.
