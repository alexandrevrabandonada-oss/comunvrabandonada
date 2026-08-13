# COMUN 48.3-C1 — Ações Coletivas canônicas

Data: 13/08/2026  
Baseline: `f6145af3addaa22e69ced2f32ea749dd403ac200`

## Decisão

`public.comun_collective_actions` permanece o único objeto canônico de Ação. A experiência C1 reutiliza participações, tarefas, assignments, atualizações, encaminhamentos e memória existentes; `public.comun_mobilization_actions` permanece apenas como compatibilidade legada, sem leitura ou escrita pelo caminho novo.

Não foi criada migration, API, raiz paralela, membership, papel, Grupo de Trabalho, Comunidade ou Pauta. A publicação de síntese de Roda não cria Ação automaticamente.

## Experiência pública

- `/comun/acoes` organiza ações por processo: abertas, em andamento, aguardando resultado e concluídas;
- `/comun/acoes/[slug]` prioriza objetivo, data/local/modo, uma CTA principal, tarefas, atualizações e resultado/memória;
- a Pauta Viva mostra `O que estamos fazendo` usando somente a FK `comun_collective_actions.pauta_id`;
- a leitura continua anônima; mutações preservam Auth com retorno à mesma ação;
- `Participar desta ação` grava `participating`; acompanhar usa `interested`; sair usa `withdrew`; a nota permanece em `contribution_note_private` e nunca é publicada automaticamente;
- tarefas lotadas, vencidas, fechadas ou vinculadas a ação não participável não oferecem claim; a capacidade segue protegida pelo guard transacional existente;
- Ação concluída deixa de ser chamada para participação e vira leitura de resultado e memória.

## Contrato público e privacidade

Os DTOs `PublicCollectiveActionSummaryV1` e `PublicCollectiveActionDetailV1` são allowlists explícitas. Estados não públicos são descartados; updates exigem `visibility=public`; forwarding exige `public_visible=true`; assets exigem `public_visible=true` e `reviewed_at`.

Linhas individuais de participantes, `member_user_id`, `contribution_note_private`, IDs administrativos, dados de Auth, localização privada e storage privado não entram no DTO. Contagens são agregadas e não ordenam, ranqueiam ou recomendam ações.

## Gates operacionais

- gate estrutural preservado: `COMUN_COLLECTIVE_ACTIONS_V1` e `getCollectiveActionsRelease()`;
- flag nova, fail-closed: `COMUN_COLLECTIVE_ACTIONS_CANONICAL_EXPERIENCE_ENABLED`;
- OFF preserva integralmente as rotas anteriores;
- ON ativa somente a composição C1;
- preflight remoto é metadata-only, em `begin read only`, e exige remote plan vazio;
- prova Supabase descartável valida participação, capacidade, tarefa vencida, liberação, zero membership/papel, zero legacy write, zero ação automática e rollback integral;
- rollout exige exact-main, flags-off antes de wave 1, rollback fail-closed e somente smoke `GET` em Production.

## Evidência de validação

Antes da PR:

- projeção focal: 12 testes verdes;
- contratos de workflows: 3 testes verdes;
- typecheck verde;
- lint verde;
- build verde;
- 920 testes unitários verdes;
- QA renderizada em `1440x1000` e `390x844`: sem overflow horizontal, overlay ou erro de console; filtros alteram o recorte e foco de teclado chega ao card;
- o Browser integrado falhou antes da navegação por indisponibilidade de assets locais; o fallback Playwright do repositório executou a prova renderizada;
- migration diff vazio.

Os campos de fechamento abaixo serão atualizados somente após os gates reais:

- functionalHead: `PENDING_PR`
- PR: `PENDING_PR`
- mergeSha/mainSha: `PENDING_MERGE`
- preflight remoto/remote plan: `PENDING_CI`
- descartável: `PENDING_CI`
- flags-off: `PENDING_ROLLOUT`
- wave 1: `PENDING_ROLLOUT`
- Production businessWrites: `PENDING_ROLLOUT`

Estado candidato, ainda não terminal:

`COMUN_48_3_C1_COLLECTIVE_ACTIONS_CANONICAL_EXPERIENCE_GREEN_MEMBER_PARTICIPATION`

Não foi iniciado 48.3-D1.
