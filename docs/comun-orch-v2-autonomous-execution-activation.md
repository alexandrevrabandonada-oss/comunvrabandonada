# COMUN ORCH-V2 — ativação do executor de entregas contínuas (decisão 17/10/2026)

**Status:** protocolo de implementação; **não instalado nem ativado** pelo simples commit.
**Fonte da decisão:** solicitação direta de que a única automação Codex entregue evolução de produto, faça merges elegíveis e autocorrija falhas; rastreabilidade em #555 (comentário 6244473925). O comentário é transcrição da decisão, não substitui a comprovação da fonte humana no ledger.

## Objetivo de produto

O sucesso de um wake é um efeito material verificável: PR existente reparada com código e testes vinculados ao novo SHA; PR elegível integrada com merge-SHA na ancestralidade de main; ou tarefa READY do roadmap entregue e testada. OBSERVE, NOOP, diagnósticos, alterações do cursor, marcadores de backoff e reexecução de testes inalterados **nunca** contam como entrega.

O worker é o **mesmo** `comunvr-execu-o-aut-noma-do-roadmap`, no Windows, com cadência atual de 40 minutos, janela operacional 25 minutos, uma entrega material e um push material por wake. Não criar segundo scheduler, residente, daemon ou repositório/fila paralelos. Preservar o projeto em `E:/COMUN-SEARCH-CONTEXT-20261015`, o manifesto de release, o Git common-dir e `refs/comun/roadmap-execution` por compare-and-swap.

## Ordem de serviço por wake

1. **RECOVER:** verificar launcher instalado, source hashes, state/lock/lease; resolver operações UNCERTAIN somente por leitura autoritativa e intent do próprio owner. Lock desconhecido não pode ser apagado. Não repetir ação remota sem conclusão comprovada.
2. **MERGE:** consumir uma PR existente em estado ready-for-review, autorizada pela política do ledger **e** elegível no instante do PUT com `expected_head_sha`. Fazer readback de PR fechada, SHA de merge descendente de main e checks pós-merge. A admissão `DOCS_ONLY` implementada no #556 é apenas o primeiro estágio; não alegar que integra código.
3. **REPAIR:** diante de CI de código verdadeiramente reproduzível no HEAD existente, selecionar a causa, executar reparo mínimo em worktree exclusivo, reproduzir teste falho + teste focal e entregar um SHA. A receita `PRETTIER_TEST_ONLY` já existe; para outras causas, implementar classificador/admissor versionado, com escopo de arquivos, evidência de log/step, proteção de auth/Escola/RLS/migration e limites de tentativas. Falhas de quota/infra/API não viram "fix" de código nem rerun de verde.
4. **BUILD:** se não há merge nem reparo elegível, selecionar entrega de produto READY do roadmap canônico. Quando a fila operacional não contém READY, descobrir e admitir um item **realmente autorizado**, com ID, prioridade, dependências e critérios de teste; evitar que `0 READY` seja tratado como roadmap concluído. Enquanto `no_new_prs=true`, avançar frentes de PRs existentes. Criar nova PR somente após reduzir dívida de integração e mediante gate específico.
5. **VERIFY:** registrar `APPLIED` apenas depois de prova no próprio SHA; marcar PASS com escopo preciso; reconciliar CI/Preview e continuar para outra entrega no wake seguinte.
6. **QUIET:** se, e somente se, todas as lanes estão genuinamente bloqueadas, produzir `NO_ELIGIBLE_WORK` tipado com contagem de bloqueios, dependência responsável e próxima condição verificável. Após 2 wakes sem entrega ou janela prolongada, girar descoberta por outra lane, sem contornar permissões nem esgotar orçamento em polling.

Cada lane tem cursor/backoff por fingerprint para evitar starvation, e existe **um orçamento de entrega, não um orçamento apenas de observação**. Uma observação rotineira não pode impedir indefinidamente a descoberta de novo trabalho quando não existe tarefa READY.

## Política de integração que deve ser implementada

- **Tier D — documentos:** execução sem worktree somente para caminhos `docs/**/*.md[x]` já admitidos pelo executor #556, excluindo documentos sensíveis/canônicos definidos no verificador. Autorizar somente por política humana gravada com evidência no ledger.
- **Tier L — código de baixo risco (a implementar, OFF por padrão):** PR existente, não draft, mesmo repositório/base main, HEAD e base estáveis, diff completo e pequeno sob paths explicitamente permitidos, sem mudanças em Auth, autorização, pagamentos, dados pessoais, migrations, RLS, permissões, CI/gates, secrets, env, release, produção ou proteção da Escola. Exigir conjunto completo de checks aplicáveis no SHA, COST-02 exato e Preview Git exato, testes focais, nenhuma revisão bloqueadora, contrato de qualidade, risco/escopo versionados e autorização humana específica para esta classe. Sem esses elementos: `WAIT_HUMAN` ou `WAIT_EXTERNAL`, nunca PUT.
- **Tier H — sensível:** sempre revisão e autorização humana específica por PR/SHA; a automação só prepara provas e corrige o que é seguro.
- Nenhum tier desabilita proteções de branch nem interpreta `SKIPPED/PENDING/NOT_RUN` como PASS. Verificar se merge em main aciona Production; não mesclar sem compreender esse efeito e a autorização correspondente. Revogação no ledger impede novas intenções; merge incerto requer reconciliação, não segundo PUT.
- Post-merge: registrar SHA, status e contagem de PRs abertas; falha de CI pós-merge vira tarefa de reparo do HEAD correto, sem reverter silenciosamente.

## Instalação na mesma automação, não apenas no GitHub

1. Ler `automation.toml` existente e o resumo de memória; registrar ID, status, intervalo, diretório, modelo, prompt, arquivos SHA256, `refs/comun/roadmap-execution` e hash integral do ledger. Acesso local real é obrigatório.
2. Verificar a nova política humana diretamente na mensagem de origem antes de gravar qualquer autorização `queue_discovery` ou `merge_policy`. Não converter comentário de bot, documentação ou intenção genérica em token de autorização. Alterar ledger com lock próprio e CAS, nunca editar JSON diretamente enquanto concorrência for possível. Na ativação inicial, priorizar `existing-pr-code-repair` e Tier D; Tier L só após implementação e testes.
3. Instalar a release versionada somente após os contratos Node e CI no commit exato; validar hashes do manifesto local versus Git canônico.
4. Testar `diagnose`, `tick --simulate`, `tick --hold` e depois **dois wakes reais da automação original**. Provar um percurso `OBSERVE -> EXECUTE -> operation-intent -> APPLIED -> verify`; provar que um PR bloqueado permite trabalho independente e não causa loops.
5. Atualizar o prompt e a configuração **do mesmo agendador** com readback; preservar frequência e ambiente, não assumir que commit no GitHub mudou o scheduler Windows.
6. Se qualquer CAS, prova, owner ou check falhar: preservar intenção, lock, ledger, worktree e evidência, retornar erro protegido acionável e seguir apenas lanes comprovadamente independentes. Não chamar um bloqueio de sucesso.

## Testes de aceite mínimos

- 2 ciclos com fila vazia e PR reparável na origem: primeiro admite uma tarefa, segundo obtém worktree próprio e execução real, sem PR nova.
- PR documental totalmente certificada e política ativa: exatamente um PUT com SHA esperado e readback; segundo wake não repete merge.
- PR com CI pendente, comentário inline, mudança de HEAD, Preview só ancestral, migration ou draft: zero merge.
- Falha CODE reproduzível: uma correção limitada e testes focal/CI; falha QUOTA ou INFRA: backoff externo sem modificar testes/código.
- Sem READY mas backlog autorizado: rediscovery deve localizar próxima frente, sem substituir backlog por relatório.
- Crash/timeout após push/PUT: estado UNCERTAIN preservado; readback determina APPLIED/NOT_APPLIED/UNKNOWN sem retry cego.
- Concorrência CAS/lock, vencimento de 25 min, revogação de autorização, revisão bloqueadora, branch alterada e dois NOOPs sem trabalho verificável: todos fail-closed.
- Métricas separadas: `observations`, `admitted`, `repairs_applied`, `merges_applied`, `material_deliveries`, `cycles_without_material_delivery` e `blocked_by_reason`. Nenhum timestamp histórico deve ser inventado.

## Aceite de encerramento

**Não declarar "automação resiliente e autônoma"** até mostrar: ID original/readback da configuração instalada; hashes versão Git/local; testes do commit; pelo menos uma execução material real sem ordem do usuário; merge automático Tier D comprovado ou bloqueio específico e reproduzível; capacidade de avançar outra tarefa quando uma PR está travada; evidência de integração e métricas de throughput. Se o ambiente Windows não estiver acessível, relatar explicitamente `NOT_INSTALLED`, sem atribuir ao produto um efeito de documentação.
