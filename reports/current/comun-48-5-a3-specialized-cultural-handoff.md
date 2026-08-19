# 48.5-A3 — Handoff Especializado da Contribuição Cultural

## A3-R1 — Fechamento das provas Supabase e saneamento de preflights legados (18/08/2026)

### Diagnóstico e regra de lane ownership

- baseline remoto reconfirmado antes do R1: `origin/main=67b8fa9fcfd9adb07552d2a5776a3c7783f1a3a0`; head de entrada da PR #350: `27d1abc0e407b5f88bc536f3244dad811ea35498`;
- os false negatives eram de classe A/B: os gates 48.2-A, 48.3-A1, 48.3-B0, 48.4-A0, 48.5-A0 e P6C-C inferiam autoridade global a partir de qualquer migration futura ou eram ativados pelo relatório compartilhado;
- os triggers agora removem `supabase/migrations/**` e o `estado-atual-comun.md` dos lanes históricos quando não são parte do contrato específico; a prova manual continua protegida;
- `scripts/ci/classify-migration-lane.mjs` usa manifesto explícito versionado. Migration conhecida de outra lane resulta em `not_applicable`; migration desconhecida ou mistura de lanes resulta em bloqueio fail-closed. Nenhuma falha foi marcada manualmente ou ignorada;
- nenhuma evidência de conflito real C foi encontrada: a migration A3 só foi classificada como `culture-a3` e não altera contrato de observatório, economia solidária, social, Pautas ou forwarding sensível.

### Alterações R1

- criado `.github/workflows/comun-48-5-a3-disposable.yml`, com `actions/checkout`, `supabase/setup-cli`, Supabase local no runner, `supabase db reset --local --yes`, prova SQL A3 e cleanup; não aceita `SUPABASE_DB_URL`, project link, access token ou service-role remoto;
- a prova A3 passou a verificar grants service-role-only dos alvos, autorização por token/conta já exercida no RPC, retry, 1:1, rota unknown, as quatro especializações, imutabilidade, ausência de archive/Search/asset/coleção/relação pública e rollback;
- o workflow também reproduz duas sessões concorrentes contra o mesmo intake e exige um único `target_id`, além do marker `COMUN_48_5_A3_DISPOSABLE_SPECIALIZED_HANDOFF_GREEN` e dos quatro contadores de escrita zero;
- contratos de lane ownership cobrem A3 fora dos lanes históricos, migration própria como candidate, unknown fail-closed e mistura de lanes. Execução local do contrato R1: `6 passed`;
- A2/A2-R1 e o contrato funcional A3 não foram redesenhados. Música permanece fora, a flag A3 permanece OFF e nenhuma migration foi aplicada em Production.

### Evidência remota R1

- disposable run ID: pendente até o workflow dedicado executar no SHA candidato;
- Preview SHA/freshness: pendente até o novo checkpoint `[comun-preview]` do candidato R1;
- CI IDs, Cultural Deliverability e preflights aplicáveis: pendentes de execução exact-head;
- merge SHA e Production SHA: não existem neste R1; a migration A3 ainda não foi promovida e o rollout não foi iniciado;
- checkpoint pré-merge reservado: `COMUN_48_5_A3_R1_SPECIALIZED_HANDOFF_PROOFS_GREEN_LEGACY_LANES_SCOPED`.

## Baseline e escopo

- Repositório: `alexandrevrabandonada-oss/comunvrabandonada`.
- `origin/main` confirmado em `67b8fa9fcfd9adb07552d2a5776a3c7783f1a3a0` antes do trabalho.
- Worktree original sujo preservado; implementação isolada em worktree limpo.
- A3 não altera Música, publicação, Search, coleção, feed, território, Pauta, Comunidade, notificações ou ranking.

## Inventário dos quatro pipelines

| route_kind | raiz especializada real | entrada existente | estado inicial do handoff | gates que permanecem fora do handoff |
|---|---|---|---|---|
| `photo_or_document` | `public.comun_archive_submissions` + `comun_archive_submission_assets` | `/comun/acervo/contribuir` e APIs de upload/confirm | `draft`, sem asset criado | autoria, campos fotográficos, upload validado, rights, revisão e derivados |
| `art` | `public.comun_archive_artwork_submissions` | `/comun/acervo/arte/contribuir` + `submitArtworkContribution` | `pending`, autoria/autorização ainda não declaradas | autoria, licença, direitos, imagem, identificação, safety e curadoria |
| `oral_history` | `public.comun_archive_oral_history_suggestions`; item/áudio/transcrição são etapas posteriores | `/comun/acervo/historias-orais/contribuir` + API de sugestões | `pending`, apenas sugestão privada de triagem | entrevista, identidade, consentimento, bruto, transcrição, anonimização e publicação |
| `radio` | `public.comun_radio_contributions`; programa/episódio/grade são raízes editoriais distintas | `/comun/radio/contribuir` + `submitRadioContribution` | `pending`, proposta editorial | direitos, voz, música, safety, programa/episódio, grade e publicação |

Nenhuma dessas raízes é exposta a `anon`/`authenticated`; o acesso operacional segue service-role e os gates especializados existentes. Não foi criado pipeline improvisado.

## Arquitetura e vínculo

O handoff é um orquestrador entre o envelope privado A2 e as raízes já existentes. A migration `20260818120000_comun_cultural_specialized_handoff.sql`:

1. adiciona `handoff_pending`, `handed_off` e `completed` sem rename destrutivo;
2. bloqueia troca de `route_kind` depois da primeira escolha;
3. usa `SELECT ... FOR UPDATE` no intake;
4. se `target_id` já existe, devolve o mesmo resultado sem inserir novamente;
5. para rotas conhecidas cria exatamente uma raiz especializada em `draft`/`pending` e salva `target_kind/target_id` apenas no intake privado;
6. para `unknown` não cria alvo e mantém `routing`/`handoff_pending`;
7. não cria archive item público, asset, bucket, Search, coleção, relação, feed ou notificação.

O RPC `comun_prepare_cultural_contribution_handoff_v1` é service-role-only. A API nunca devolve o `target_id`, hash de retomada ou `member_user_id`; devolve apenas protocolo, estado, tipo de alvo e caminho do pipeline canônico.

## Autorização e idempotência

O handoff reutiliza o cookie opaco `comun_cultural_resume_v1` por hash ou conta vinculada. Protocolo isolado, cookie incorreto e conta diferente permanecem sem acesso indistinguível. O lock do intake torna double-click, reload, retry, duas abas e POST concorrente 1:1; a rota é imutável após escolha.

## Feature flag e UI

`COMUN_CULTURAL_SPECIALIZED_HANDOFF_ENABLED` é específica, default OFF, independente da ativação da publicação. OFF mantém A2 intacto. ON apresenta “Continuar no fluxo especializado” para os quatro destinos reais; a copy afirma que nada foi publicado. Música e `unknown` não recebem caminho fabricado.

As páginas canônicas são preservadas em 390×844 e 1440×900 como gate de verificação; o link de continuidade não expõe IDs internos.

## Direitos, consentimento e storage

O handoff não presume autoria, licença, consentimento, localização, data, programa ou episódio. Não cria upload nem URL; Foto conserva upload privado separado. História Oral mantém texto bruto/triagem separados de entrevista, áudio e transcrição consentidos. Arte e Rádio continuam sob seus child-gates de rights, safety, consentimento e revisão.

## Testes e disposable proof

O contrato unitário cobre flag fail-closed, mapeamento dos quatro destinos e ausência de caminho para `unknown`/Música. O workflow SQL descartável A3 foi adicionado para executar em banco local/branch descartável, cobrindo autorização, grants, target 1:1, retries/race, imutabilidade, ausência de publicação e `businessWritesAfterRollback=0`. Nenhuma fixture deve ser criada em Production.

Gates locais executados nesta etapa: contratos A3 `10 passed`, `npm run typecheck` verde, `npm run lint` verde, `npm run build` verde e `git diff --check` verde. `npm run db:privileges:lint` também passou (`COMUN_EXPLICIT_PRIVILEGE_CONTRACT_OK migrations=39`). Não houve script JavaScript alterado que exigisse `node --check`; a prova SQL é deliberadamente um artefato SQL.

`npm run solo:sql:validate` foi executado e parou no erro baseline `SOLO_RELEASE_MANIFEST_COUNT_INVALID`; ele não apontou para a migration A3 e não foi mascarado. O CLI Supabase não está instalado, o daemon Docker não está disponível e não há projeto remoto compatível conectado para executar a prova. Portanto a prova A3 continua pendente e nenhum banco remoto foi tocado.

## Preview, rollout e rollback

Ainda pendentes: PR draft, checkpoint único `[comun-preview]`, Preview exato do SHA, freshness gate e CI remoto. Pós-merge deve confirmar main exato, promover migration com flag OFF em Wave 0, validar metadata-only, e somente então habilitar A3 em Wave 1. Business writes devem permanecer zero durante rollout; falha de qualquer invariante exige flag OFF e STOP.

## Gaps/deferimentos

- os formulários especializados legados ainda não recebem todos os campos A2 como edição contextual; o handoff preserva o contexto no alvo privado e encaminha para o formulário canônico;
- não há alvo musical neste A3;
- publicação, projeção no Acervo, Search, coleções, relações territoriais, pauta, comunidade, feed e notificações permanecem fora do tijolo;
- autorização de contribuição continua separada da revisão editorial e não é convertida em publicação.
