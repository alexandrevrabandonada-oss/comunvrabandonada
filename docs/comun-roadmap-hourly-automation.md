# ComunVR — Execução Autônoma do Roadmap / ORCH-V2

A mesma automação `comunvr-execu-o-aut-noma-do-roadmap` continua local, ACTIVE,
a cada **40 minutos**. Esta especificação substitui o bootstrap que criava
worktree em todo despertar. Não cria agendador ou processo residente.
A ativação real exige teste, instalação pinada e readback da configuração;
a presença deste documento não comprova ativação. Evidência: #555 e checkpoint.

## Entrada e seleção

O launcher instalado em `C:/Users/Micro/.codex/automations/comunvr-execu-o-aut-noma-do-roadmap/orch-v2/`
confere SHA256 de si, runtime e planejador contra o manifesto instalado e os blobs
de `refs/comun/roadmap-execution`. Executar `node <launcher> tick --repo
E:/COMUN-SEARCH-CONTEXT-20261015`; `--simulate` não escreve nem consulta rede.
`--budget 0` permite reconciliar uma sondagem vencida sem iniciar segunda entrega.
Na pasta original somente inspeção Git: o checkpoint vem de `git show <ref>:...`.
Remoto exato, fetch/push, common-dir e ref são obrigatórios. Nunca usar main antiga.

`orchV2` no checkpoint é o contrato versionado; schema em
`docs/comun-orch-v2-state.schema.json`. O ledger operacional
`<git-common-dir>/comun-orch-v2/state.json` persiste sondagens, leases e intenções
entre wakes sem commit de rotina. Escrita atômica, fsync, revisão/hash esperado,
lock compartilhado e validação da ref antes de salvar. Divergência de ancestralidade
ou CAS interrompe; candidato perdedor fica preservado em ref estável.
Migração adiciona somente `orchV2`; `exportV1` remove esse campo sem perder nenhum
campo V1, autorização, gate, histórico ou evidência. Não armazenar secrets/dados pessoais
nas tarefas. Não copiar conteúdo privado para relatórios ou serviços externos.

A fila contém **tarefas do roadmap canônico**, não um roadmap paralelo.
Prioridade numérica menor vence, desempate por ID, dependências exigem DONE com
prova no SHA/fingerprint próprios. READY pode executar; RUNNING exige owner.
WAIT_CI/WAIT_EXTERNAL só sondam quando `next_probe_at` vence; máximo uma sondagem
por wake, espera progressiva 15min/1h/4h/12h/24h no adaptador #556. WAIT_HUMAN não é sondado.
RETRY_BACKOFF limita a duas falhas equivalentes por fingerprint; depois espera
mudança pertinente, sem reabrir por relógio. Mudança de SHA/contrato invalida
somente a evidência pertinente. DONE não significa merge, Preview ou Production.
Falha de leitura remota também tem backoff/limite, não loop de diagnóstico.

Se existe tarefa independente elegível, tarefa bloqueada de maior prioridade não
impede seleção. Sem tarefa/sondagem vencida: NOOP, sem branch/worktree/commit/push,
relatório duplicado ou alerta repetido. Ledger já inicializado e inalterado sequer
é regravado. Memória da automação pode registrar resumo curto exigido pela plataforma.
Alertas humanos são deduplicados por fingerprint; bloqueios V1 já comunicados não
são anunciados novamente. Resultado pendente não é mudança material nem notificação.

## Ownership, interrupção e conclusão

O runtime adquire atomicamente `comun-roadmap-cycle.lock`; grava ID, PID, início,
host e sessão quando disponível. HELD_LIVE e ORPHAN_UNKNOWN não permitem escrita.
PID morto/reutilizado não autoriza recuperação. Lock sem proveniência exige
intervenção; emitir uma vez usando fingerprint na memória, sem alterar lock/ledger.
Recuperação manual exige protocolo original: identidade/bytes/PID/start/host,
ausência de concorrência e evidência da sessão encerrada; arquivo original preservado
por rename atômico com comparação do ID. Nenhum takeover por idade ou TTL.

Somente EXECUTE cria worktree novo, exclusivo, detached da ref observada, limpo,
com mesmo remoto/common-dir, fora da árvore original. Lease RUNNING é persistida
antes da criação. O comando termina, sem daemon; lock é retido com o mesmo owner
para o agente executar o ciclo. Não iniciar outro owner ou outra entrega nesse wake.
RUNNING interrompido retorna RECONCILE, nunca refaz ações às cegas.
O owner original pode retomar com seu ID; terceiros precisam das provas originais.
Criação de worktree falha preserva a lease e bloqueia reexecução até reconciliação.

Antes de normal-code-push, registrar `operation-intent` por `record --event <json>`:
owner_id, task_id, event com operation_id único, expected_sha e action.
A intenção UNCERTAIN é gravada antes da ação; se o processo interromper, observar
head remoto em read-only e usar `reconcile-operation` APPLIED/NOT_APPLIED/UNKNOWN
com SHA esperado e hash da evidência. UNKNOWN mantém bloqueio. Nunca reenviar email,
push ou outra ação com resultado incerto. A CLI não executa ações remotas mutáveis.

O mesmo `record` aplica `result` com SHA, input_fingerprint, owner, escopo e hash da
prova: PASS só com prova executada; PENDING continua WAIT_CI; FAIL usa causa estável,
sem timestamp no fingerprint. Resultado de outro SHA é recusado. Ao sair de RUNNING,
solta somente o próprio lock. Para validar testes aprovados usar `needsProof`.
Checkpoint material: commit descendente da ref capturada, JSON/hash/proveniência,
ref estável e `canonicalCAS`; no máximo uma reconciliação adicional sem sobrescrever.
Preservar trabalho pendente; remover só o próprio worktree limpo depois de commit
em ref estável e preservação das provas. Não usar reset/force-push/limpeza alheia.

## Proteções e integração atual

Uma entrega material e um push material por ciclo, 25 minutos operacionais, duas
tentativas equivalentes/finding. Nada de push vazio/documental para CI, dispatch,
rerun de verde, assertiva/timeout reduzidos, merge, Production, migration remota,
permissões, flags, indexação, secrets, lote Gmail, backup, permit, custo ou plano.
Escola mantém requisitos já existentes; nenhuma nova barreira fictícia.
O planejador nega classes protegidas mesmo se marcadas READY.

#553: preservar Quality/Civic no head bbb533ad e sete preflights obrigatórios.
#552: Quality b92bdf1c concluiu SUCCESS em 16/10/2026 13:56:29Z; runtime ainda
reconcilia esse resultado exato antes de concluir a tarefa. COST-02 checkpoint-stale
permanece separado, resolvido somente junto à próxima publicação material legítima.
Rádio/data é a lacuna auditada U0/SOC-D06, depois da dependência Quality, usando
published_at/UTC e ausência/data inválida explícitas, sem schema novo.
#554 mantém 7ad06aaf draft; integração de Home/busca/Rádio continua plano protegido,
sem merge. Atualizar tarefas somente por evidência/mudança pertinente do mesmo roadmap.

## Validação e reversão

`node --test scripts/process/comun-orch-v2.node-test.mjs` usa cenários puros e
repositórios Git descartáveis reais: bloqueios independentes, duas horas sem mudança,
duas falhas/terceiro wake, SHA novo, humano, lock ativo/órfão incerto, interrupção,
operação incerta, CAS perdedor, escrita atômica, retomada após horas e isolamento real.
Não é CI do produto nem prova de Production. Não precisa de Next/browser/credenciais.

Antes de alterar a configuração: salvar cópia integral/hash de automation.toml,
instalar cinco módulos testados e manifesto, simular e executar ticks controlados.
Atualizar **o ID existente** pela ferramenta automation_update, preservando nome,
status, modelo, reasoning, ambiente, projeto e frequência; readback pela ferramenta
e pelo TOML. Não alegar um disparo real do agendador sem tê-lo observado.
Reversão: restaurar prompt anterior pela mesma ferramenta, preservar ledger/ref/leases;
`exportV1` fornece vista reversível. Nunca voltar a ref canônica à força ou apagar provas.
