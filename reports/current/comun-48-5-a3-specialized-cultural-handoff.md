# 48.5-A3 — Handoff Especializado da Contribuição Cultural

## A3-R2 — Rollout controlado interrompido por drift de flag (19/08/2026)

### Estado terminal desta tentativa

- o SHA histórico esperado `826587f` não era mais o `origin/main` real: o preflight encontrou `88a096559471f84d2ea9aca794359ed15448d40b`, com o commit funcional A3 `a7a55861458be833048ecb20ec3b5d2ba7b4bb84` como ancestral; o fechamento operacional terminou em `origin/main=b456edc683b5b83cd3036a3afddc1283251d4ed3`;
- Production Vercel foi confirmado `READY` no SHA operacional final, em `dpl_BQhxMPJVCvFx1pUB29sZmmbq3PAy`, antes do runner; após a restauração da flag, o deployment final ficou `READY` em `dpl_4r8HCrjzNNVo71oXYUx47CvNFXVf`;
- o preflight remoto leu a configuração sanitizada e encontrou `COMUN_CULTURAL_SPECIALIZED_HANDOFF_ENABLED=enabled`, contrariando o estado de entrada esperado OFF. Por isso o plano Supabase não foi consultado e nenhuma migration foi aplicada;
- a ação focal `32296284347` executou somente a recuperação autorizada da flag: gravou `disabled`, fez novo deploy/promote e confirmou OFF por novo `env pull`; não alterou outras flags;
- smokes finais read-only nas superfícies `/comun/acervo`, `/comun/acervo/contribuir`, `/comun/acervo/arte`, `/comun/acervo/historias-orais` e `/comun/radio`: GET/HEAD `200`; nenhum marcador de ID/hash/identidade privada apareceu no HTML;
- `businessWrites=0`, `newIntakes=0`, `newTargets=0`, `newArchiveItems=0`, `newSearchDocuments=0`, `newAssets=0`, `newCollections=0`, `fixturesCreated=0` e `publicationsCreated=0`;
- Wave 0 não começou: migration A3 continua pendente conforme o estado de entrada e não foi promovida; Wave 1 não começou; A3 permanece OFF;
- checkpoint terminal: `COMUN_48_5_A3_R2_SCHEMA_GREEN_RUNTIME_ROLLED_BACK_FLAG_OFF`.

### Runs e diagnóstico operacional

- `32294800847` e `32295190923` falharam antes de qualquer ação remota mutável, durante o runner operacional; `32295455078` isolou checksum declarado incorreto; `32295948001` confirmou que o bloqueio restante era a flag já ON;
- o checksum foi corrigido para o conteúdo real da migration A3 e os testes do runner ficaram verdes; os quatro runs anteriores não chegaram ao plano/push Supabase;
- não houve tentativa de contornar branch protection, aplicar todas as migrations, criar fixture, chamar RPC com intake ou executar POST de contribuição;
- o próximo retry exige novo preflight independente e só pode avançar se a flag estiver OFF antes do plano exato. O drift de flag deve ser explicado/aceito operacionalmente antes de uma nova Wave 0.

## A3-R1 — Fechamento das provas Supabase e saneamento de preflights legados (18/08/2026)

### Diagnóstico e regra de lane ownership

- baseline remoto reconfirmado antes do R1: `origin/main=67b8fa9fcfd9adb07552d2a5776a3c7783f1a3a0`; head de entrada da PR #350: `27d1abc0e407b5f88bc536f3244dad811ea35498`;
- os false negatives eram de classe A/B: os gates 48.2-A, 48.3-A1, 48.3-B0, 48.4-A0, 48.5-A0 e P6C-C inferiam autoridade global a partir de qualquer migration futura ou eram ativados pelo relatório compartilhado;
- os triggers agora removem `supabase/migrations/**` e o `estado-atual-comun.md` dos lanes históricos quando não são parte do contrato específico; a prova manual continua protegida;
- `scripts/ci/classify-migration-lane.mjs` usa manifesto explícito versionado. Migration conhecida de outra lane resulta em `not_applicable`; migration desconhecida ou mistura de lanes resulta em bloqueio fail-closed. Nenhuma falha foi marcada manualmente ou ignorada;
- nenhuma evidência de conflito real C foi encontrada: a migration A3 só foi classificada como `culture-a3` e não altera contrato de observatório, economia solidária, social, Pautas ou forwarding sensível.
- a primeira execução real do workflow encontrou e isolou um defeito genuíno no RPC de rota (`status` ambíguo entre parâmetro de saída e coluna); a migration foi corrigida para usar `v.status`, e a reexecução posterior passou.
- a segunda execução avançou até o rollback e encontrou um erro de medição do harness: o baseline pós-rollback ainda era pré-handoff; o script agora captura o baseline depois dos quatro alvos esperados e mede somente o bloco rollback-only.
- no recheck dos lanes, o A1 revelou um bug operacional da própria etapa: `GITHUB_ENV` só fica disponível no passo seguinte; a etapa agora carrega explicitamente o resultado do classificador antes do `case`, preservando o N/A fail-closed.

### Alterações R1

- criado `.github/workflows/comun-48-5-a3-disposable.yml`, com `actions/checkout`, `supabase/setup-cli`, Supabase local no runner, `supabase db reset --local --yes`, prova SQL A3 e cleanup; não aceita `SUPABASE_DB_URL`, project link, access token ou service-role remoto;
- a prova A3 passou a verificar grants service-role-only dos alvos, autorização por token/conta já exercida no RPC, retry, 1:1, rota unknown, as quatro especializações, imutabilidade, ausência de archive/Search/asset/coleção/relação pública e rollback;
- o workflow também reproduz duas sessões concorrentes contra o mesmo intake e exige um único `target_id`, além do marker `COMUN_48_5_A3_DISPOSABLE_SPECIALIZED_HANDOFF_GREEN` e dos quatro contadores de escrita zero;
- contratos de lane ownership cobrem A3 fora dos lanes históricos, migration própria como candidate, unknown fail-closed e mistura de lanes. Execução local do contrato R1: `6 passed`;
- A2/A2-R1 e o contrato funcional A3 não foram redesenhados. Música permanece fora, a flag A3 permanece OFF e nenhuma migration foi aplicada em Production.

### Evidência remota R1

- disposable run IDs: `32207385217`/`95933132305` (recheck) e `32208583635`/`95936534370` (checkpoint final), ambos GREEN; o último resumo remoto confirmou o marker A3 e `businessWritesAfterRollback=0`, `autoPublication=false`, `publicAssetWrites=0`, `searchWrites=0`, além de `concurrentRace=one-target`;
- preflights históricos reexecutados no checkpoint final: 48.2-A `32208583761`, 48.3-A1 `32208583742`, 48.3-B0 `32208583663`, 48.4-A0 `32208583756`, 48.5-A0 `32208583747` e P6C-C `32208583644`, todos GREEN/N/A conforme lane ownership;
- Preview exato/freshness: checkpoint `a0b3bc93092ee2571d8ca9f05ba2887bc7f40d2b`, deployment Vercel READY `dpl_Ftb4qzP4YiVoDG5B9AsudPyw3Uip` (`comunvrabandonada-ov1fpnelj-alexandrevrabandonada-oss-projects.vercel.app`); o gate COST-02 `32208583833/95936537057` ficou GREEN;
- CI remoto: COMUN CI `32208583833` GREEN; Cultural Deliverability `32208583751` GREEN;
- CI local: `npm run test:unit` verde, 205 arquivos/1.100 testes; contratos R1 locais `6 passed`; typecheck, lint, build, privileges lint e diff check verdes;
- as suítes gerais de entregabilidade ainda estavam em execução no momento deste registro; nenhuma falha foi observada;
- merge SHA: `a7a55861458be833048ecb20ec3b5d2ba7b4bb84`; `origin/main` confirmado no mesmo SHA;
- Production SHA/deployment: `a7a55861458be833048ecb20ec3b5d2ba7b4bb84` em `dpl_DS9hJjsh8g5DUzoojm4CHMxuA96q`, READY (`comunvrabandonada-dwx8xqsie-alexandrevrabandonada-oss-projects.vercel.app`);
- CI pós-merge: COMUN CI `32210155889` e `32210215010` GREEN; Cultural Deliverability `32210156007` GREEN;
- a migration A3 não foi promovida/aplicada em Production, a flag `COMUN_CULTURAL_SPECIALIZED_HANDOFF_ENABLED` permanece OFF e o rollout Wave 0/1 não foi iniciado;
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
