# ComunVR — Execução Autônoma do Roadmap

Estado: **ACTIVE**, uma vez por hora; ID `comunvr-execu-o-aut-noma-do-roadmap`.
Projeto local: `E:/COMUN-SEARCH-CONTEXT-20261015`, Git repository confirmado;
projectId `fcb5d1eb-7d51-4c73-aab3-fad5c68c0b50`.

O agendador oferece execução local, sem opção nativa worktree nesta ferramenta.
A inicialização obrigatória cria e verifica um worktree exclusivo antes de qualquer
trabalho de código; falha de isolamento interrompe o ciclo. Não confundir configuração
local do agendador com execução autorizada na árvore principal.

Pilotos PASS: isolamento/recuperação/lock/CAS em fef06bf7 e inicialização do prompt
final em E:/COMUN-ROADMAP-CYCLES/pilot-45e55fcffa2648f18808251d583b45e7. JSON recuperado
idêntico, segundo lock e escrita stale recusados, projeto original intacto. Nenhum
CI ou operação Production disparado pelo piloto. Configuração ACTIVE relida e validada.

Estado canônico local: `refs/comun/roadmap-execution`, contendo
`reports/current/comun-execution-checkpoint.json`. Compare-and-swap obrigatório na
consolidação; não sobrescrever árvore ou branch concorrente. Ref local não é backup
remoto nem sincronização entre clones. Máquina e app devem permanecer disponíveis.

Limites operacionais: 25 minutos/ciclo, uma entrega, duas tentativas equivalentes
por finding, um push material; após três ciclos sem mudança, somente diagnóstico
mínimo. Não alterar frequência/criar outra automação. Esses limites são instruções
ao agente, não quotas duras certificadas da plataforma. Sem merge, deploy Production,
migration remota, destruição, permissões sensíveis ou gastos sem autorização específica.

## Prompt ativo verificado

Execute um ciclo limitado do roadmap canônico COMUN. O agendador inicia no projeto local E:/COMUN-SEARCH-CONTEXT-20261015. Nessa pasta, faça somente inspeção Git e preparação do isolamento, sem editar arquivos ou trocar sua branch. Confirme o remoto exato https://github.com/alexandrevrabandonada-oss/comunvrabandonada.git e resolva git-common-dir. Adquira atomicamente o lock compartilhado descrito abaixo; sobreposição deve parar. Leia o SHA de refs/comun/roadmap-execution e preserve esse SHA como versão observada do estado. Crie um worktree novo e exclusivo com git worktree add --detach em E:/COMUN-ROADMAP-CYCLES/<identificador-unico>, a partir desse SHA. Confirme que o novo caminho é diferente do projeto original, que está limpo e que compartilha o mesmo git-common-dir e remoto. Todas as leituras de projeto, edições, testes e commits seguintes devem usar explicitamente esse worktree como diretório de trabalho. Se qualquer verificação ou criação falhar, solte somente seu lock e pare sem editar o projeto original. Não substituir essa etapa por execução na árvore principal.

Leia AGENTS.md, o roadmap
`docs/comun-product-objective-and-roadmap.md`, o checkpoint
`reports/current/comun-execution-checkpoint.json` e GitHub vivo.

Leia o checkpoint mais novo da ref local compartilhada
`refs/comun/roadmap-execution` neste mesmo git-common-dir. A cópia do arquivo no
worktree pode ser antiga. Ausência/mudança de repositório/ref exige reconciliação,
nunca substituição silenciosa por main antiga. Não exportar dados privados.

Use o lock já adquirido na inicialização. Seu protocolo é adquirir atomicamente o diretório de lock `<git-common-dir>/comun-roadmap-cycle.lock`
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

Esta é a única automação autorizada, com frequência de uma vez por hora. O piloto local já comprovou isolamento, lock e CAS em fef06bf74132d16a9eb42c0c292607d18b24b51c. Use o estado mais novo de refs/comun/roadmap-execution. Não altere esta automação nem crie outras. Sem mudança material ou ação possível, evite consultas repetidas e reporte sucintamente os quatro estados pedidos.

Não manter worktrees limpos concluídos indefinidamente: só remover o worktree criado pela própria execução depois de confirmar ausência de alterações não commitadas e preservação de seu commit numa ref estável. Preserve worktrees com candidato não consolidado ou evidência pendente. Nunca limpar worktree alheio nem usar reset destrutivo. A configuração do agendador é local; o isolamento é criado e verificado pela inicialização acima, não presumido como opção nativa.
