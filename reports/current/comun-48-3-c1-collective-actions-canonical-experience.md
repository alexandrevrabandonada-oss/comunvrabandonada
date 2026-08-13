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

Fechamento promovido:

- functionalHead: `b9c9f35af3816aa42845c89213b9f2949cc14aef`;
- PR funcional: `#309`, merge exact-head `d69c2b851a84e5936b2a073b955384ded1ff3c1c`;
- preflight remoto: run `31747677539`, metadata-only e `COMUN_48_3_C1_REMOTE_PLAN_EMPTY_GREEN`;
- prova descartável: run `31747677643`, jornada de participação/tarefas e rollback integral;
- flags-off final: run `31751592047`, exact-main `e735bf4723231943bee63137aecf27c4e3572dc3`;
- wave 1: run `31751732584`, `parentGateRuntimeReady=true` e composição canônica ativa;
- Production: `/comun/acoes=200`, DTO sem marcadores privados, empty state público legítimo e `businessWrites=0`.

Durante a primeira onda, o gate estrutural permaneceu fechado porque `COMUN_COLLECTIVE_ACTIONS_DATABASE_URL` não estava materializada no projeto Vercel. O rollback restaurou C1 desativado sem ativação parcial. As PRs operacionais `#310`, `#311` e `#312` acrescentaram diagnóstico sanitizado, blocker explícito e o binding sensível da conexão já estabelecida em `secrets.SUPABASE_DB_URL`, sem alterar `COMUN_COLLECTIVE_ACTIONS_V1`. A wave final criou a variável server-only com `--sensitive`; nenhum valor apareceu em logs ou no repositório.

Estado terminal:

`COMUN_48_3_C1_COLLECTIVE_ACTIONS_CANONICAL_EXPERIENCE_GREEN_MEMBER_PARTICIPATION`

Não foi iniciado 48.3-D1.
