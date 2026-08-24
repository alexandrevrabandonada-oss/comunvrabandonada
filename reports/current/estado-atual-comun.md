## Estado atual — 48.5-A5-A1-R1: proveniência cultural especializada ativa em Production (23/08/2026)

Estado terminal: `COMUN_48_5_A5_A1_R1_SPECIALIZED_PROVENANCE_GREEN_PRODUCTION_ACTIVE_NO_BUSINESS_WRITES`.

- O bridge de planejamento [32672159693](https://github.com/alexandrevrabandonada-oss/comunvrabandonada/actions/runs/32672159693) validou a exceção externa canônica de Calçadas (`cliHistory=absent`, ledger externo exato), isolou somente o arquivo excepcional durante o uso do CLI e confirmou o plano cultural único, sem write remoto;
- a migration A5-A1 `20260823003249_comun_cultural_specialized_provenance_readiness.sql` foi aplicada uma única vez com SHA-256 `771975081046474022764a8e69743cc6015ebb4a817c614719fa7d6dfc74bdfb`; o run de verificação [32672612144](https://github.com/alexandrevrabandonada-oss/comunvrabandonada/actions/runs/32672612144) confirmou schema/RLS/grants, `legacyBackfill=false`, planner reconciliado vazio e GET/HEAD GREEN;
- A3 e A4 permanecem encrypted/ON e Production-only. `ProductionBusinessWrites=0`, `ProductionEnvWrites=0`, `ProductionSchemaWrites=1_migration_only`, sem private roots, publicação, Search, promoção de asset ou coleção;
- o próximo slice permitido é funcional: A5-A2. Não iniciar infraestrutura adicional neste estado.

Relatório: `reports/current/comun-48-5-a5-a1-r1-production-rollout.md`.

## Estado histórico — 48.5-A4-C0: baseline pós-ativação GREEN, A4 fechada (22/08/2026)

Estado terminal: `COMUN_48_5_A4_C0_POST_ACTIVATION_BASELINE_GREEN_A4_CLOSED`.

- A4 está encrypted/ON, única e Production-only; A3 permanece encrypted/ON, única e Production-only. Não há shared env, duplicata, branch ou custom-environment override para A4;
- o baseline C0 [32593036170](https://github.com/alexandrevrabandonada-oss/comunvrabandonada/actions/runs/32593036170) passou em transação explícita READ ONLY: migration A4 uma vez, schema/RLS/grants verdes, direitos legados não inferidos e consentimento granular de História Oral preservado;
- o snapshot não teve delta funcional: intakes/submissions especializados permanecem zero; assets, Search, coleções, itens publicados e fingerprint de storage foram apenas registrados. Os oito GET/HEAD culturais retornaram HTTP 200 sem marcador privado no HTML;
- `businessWrites=0`, `schemaWrites=0`, `envWrites=0`, `fixtures=0`, `publications=0`, `rollback=false`. A4 completa `SCHEMA_APPLIED → FLAG_OFF_VALIDATED → WAVE1_ACTIVATED → PRODUCTION_GREEN → CLOSED_BASELINE`; A5 não foi iniciada.

Relatório: `reports/current/comun-48-5-a4-c0-post-activation-closeout.md`.

## Estado histórico — 48.5-A4-R2-Wave1-R1: correção de runtime/rollback em preparação, A4 continua OFF (21/08/2026)

- a correção local limita `force-dynamic` às rotas de contribuição de Arte e Rádio, acrescenta artifact sanitizado por marcador ao smoke e torna o rollback pós-enable determinístico, com receipt anterior ao PATCH de disable;
- a implementação ainda aguarda os gates completos e integração; portanto Production não foi alterada. A4 permanece encrypted/OFF, única e Production-only, enquanto A3 permanece encrypted/ON;
- sem migration, write Supabase, fixture, intake, target, asset, Search, coleção ou publicação.

## Estado histórico — 48.5-A4-R2-Wave1: runtime smoke bloqueado, flag restaurada OFF (21/08/2026)

Estado terminal: `COMUN_48_5_A4_R2_WAVE1_RUNTIME_SMOKE_BLOCKED_ROLLED_BACK_FLAG_OFF`.

- Wave 1 `32470001808` passou preflight read-only, A4 OFF→ON por PATCH no ID canônico e deployment `dpl_3z947n9D67xc5kJJ5CYnUMxuthYd` READY, mas falhou no smoke pós-write antes do terminal;
- os receipts comprovam identidade A4 preservada e A3 ON inalterada. O rollback automático não materializou recibo, por isso o modo canônico `disable-only` `32470635477` foi executado imediatamente;
- recuperação GREEN: A4 está novamente encrypted/OFF, única e Production-only; A3 encrypted/ON; deployment `dpl_GeC3TXJxrhCgGe1kk8a9k4rePD2t` READY e smoke baseline GREEN;
- sem migration, business write, fixture, intake, target, asset, Search, coleção ou publicação. Não repetir Wave 1 até corrigir o rollback automático e diagnosticar o marcador de smoke.

Relatório detalhado: `reports/current/comun-48-5-a4-progressive-cultural-rights.md`.

## Estado histórico — 48.5-A4-R2-Wave0-G0: schema A4 GREEN, flag OFF (20/08/2026)

Estado terminal: `COMUN_48_5_A4_R2_SCHEMA_GREEN_PROGRESSIVE_RIGHTS_FLAG_OFF`.

- Wave 0 `32430306663` GREEN no SHA `f239fcc4244ef3eb4272ae9f0632f11c878b0342`, após bridge E1 terminal GREEN e Production READY;
- a migration A4 já constava uma vez no histórico remoto antes do run final. O plano estava vazio, o runner registrou `migrationApply=noop_already_applied` e não reaplicou schema; a proveniência histórica permanece não determinada;
- postflight read-only confirmou schema/RLS/grants e `legacyRightsInferred=false`; deltas de negócio, Search, assets, coleções, fixtures e publicações permaneceram zero;
- A4 continua encrypted/OFF e única; A3 continua encrypted/ON e única. Os oito smokes read-only passaram. Wave 1 não foi executada.

Relatório detalhado: `reports/current/comun-48-5-a4-progressive-cultural-rights.md`.

## Estado histórico — 48.5-A4-R2-D0-R3: A4 encrypted OFF recuperada (20/08/2026)

Estado terminal: `COMUN_48_5_A4_R2_FLAG_RECOVERED_ENCRYPTED_EXPLICIT_OFF_READY_FOR_WAVE0`.

- a recuperação `32394666050` criou uma única env Production A4 `encrypted` com valor efetivo OFF após a barreira runtime no deployment Production READY do SHA `927b11ead665b7569460fb32dfdcd79441c7d5e3`;
- o POST único retornou `HTTP 201`; não há shared env, duplicata, branch ou custom override. A3 permanece encrypted e ON;
- os oito smokes GET/HEAD passaram. `businessWrites=0`; não houve Supabase, migration A4, Wave 0/1, fixture, publicação, Search, asset, target ou coleção;
- a migration `20260819130000_comun_cultural_progressive_rights.sql` ainda está pendente. O próximo slice permitido é Wave 0 limpa; A4 permanece explicitamente OFF até lá.

Relatório detalhado: `reports/current/comun-48-5-a4-progressive-cultural-rights.md`.

## Estado atual — 48.5-A4-R2-D0-R1: transição de tipo proibida (20/08/2026)

Estado terminal: `COMUN_48_5_A4_R2_FLAG_TYPE_TRANSITION_BLOCKED_NEEDS_ATOMIC_REPLACEMENT_DESIGN`.

- o único PATCH por ID do run `32359749167` recebeu `HTTP 400 / BAD_REQUEST`: `You cannot change the type of a Sensitive Environment Variable.` A evidência sanitizada preserva request ID, content-type e formato do payload;
- a A4 continua como única env Production `sensitive`, sem shared/duplicata/override. A3 continua `encrypted` e enabled. Não houve retry, delete, recriação, deployment manual, Supabase, migration ou Wave 0;
- o próximo passo requer desenho separado para eventual substituição atômica. A4 continua fail-closed e a migration `20260819130000_comun_cultural_progressive_rights.sql` permanece pendente.

Relatório detalhado: `reports/current/comun-48-5-a4-progressive-cultural-rights.md`.

## Estado atual — 48.5-A4-R2-D0-R1 bloqueado por prova Vercel insuficiente (20/08/2026)

Estado terminal preservado: `COMUN_48_5_A4_R2_FLAG_BOOTSTRAP_BLOCKED_SAFE_ABSENT`.

- o diagnóstico Vercel-only `32318723234`, no SHA `d0f7f07afff9b04d12844d3ae244d08124375dc8`, confirmou uma única chave A4 Production `sensitive`, sem shared/duplicata/branch/custom override, e A3 `encrypted` ON;
- o HTTP 400 anterior é recuperável apenas como status: `curl -f` e cleanup apagaram o corpo antes do artifact. A política de sensitive do time não é classificável pela metadata API disponível e a leitura da env sensível está mascarada, então ambos permanecem `unknown` e bloqueiam o PATCH canônico;
- nenhum PATCH adicional, deployment, migration, Supabase, fixture ou business write ocorreu. A4 continua OFF/fail-closed operacionalmente; A3 permanece intacta. Não executar Wave 0.

Relatório detalhado: `reports/current/comun-48-5-a4-progressive-cultural-rights.md`.

## Estado atual — 48.5-A4-R2-D0 bloqueado com chave A4 sensível sem resolução efetiva (20/08/2026)

Estado terminal: `COMUN_48_5_A4_R2_FLAG_BOOTSTRAP_BLOCKED_SAFE_ABSENT`.

- bootstrap D0 criou uma única chave A4 Production assinada, sem shared env, duplicata, branch ou custom override, mas ela retornou como `type=sensitive` e estado efetivo `ABSENT` no mecanismo Production usado pelo projeto;
- o reparo único por ID `32317096418`, limitado a `disabled`/`encrypted`, recebeu HTTP 400 da Vercel. Não houve segunda chave, delete, alteração de A3, migration, deployment manual, fixture ou business write;
- A3 continua ON e intacto; a migration `20260819130000_comun_cultural_progressive_rights.sql` continua pendente. Não executar Wave 0, Wave 1 ou qualquer novo POST/PATCH A4 até diagnosticar de modo sanitizado o erro de payload da API;
- os runs de auditoria `32316619914` e `32316811934` são read-only e confirmam o escopo seguro da chave existente. Relatório detalhado: `reports/current/comun-48-5-a4-progressive-cultural-rights.md`.

## Estado atual — 48.5-A4-R2-Wave0 bloqueada com flag ausente (19/08/2026)

Estado terminal: `COMUN_48_5_A4_R2_FLAG_ABSENT_BLOCKED_SAFE_OFF`.

- `origin/main=01d28b1e942736d7db0909c86cbb23d2e4ab34fb`; o baseline esperado `9074f132c48ad58cd34c06f73bf74f4f24aa3583` foi confirmado antes dos patches operacionais; o A4 funcional `27c441a4fa03857ece2e022f6f64516d5188989d` continua ancestral;
- Production Vercel está `READY` no deployment `dpl_Cc7WCKjdLPQUC4ZRCgHGjwphG7Nr`, SHA `01d28b1e`;
- Wave 0 A4 não avançou: o diagnóstico `32314228096` confirmou que `COMUN_CULTURAL_PROGRESSIVE_RIGHTS_ENABLED` está ausente em Production, em vez de existir como uma chave project-level única `disabled`;
- nenhuma migration Supabase foi aplicada, nenhum comando Supabase de leitura ou escrita foi alcançado após o bloqueio, e nenhuma flag foi alterada. A3 continua ativo e fora do escopo;
- não criar a chave automaticamente nesta execução. Não executar Wave 0 novamente, não habilitar A4 e não iniciar A5 até a ausência ser explicada/regularizada em diagnóstico focal.

Relatório detalhado: `reports/current/comun-48-5-a4-progressive-cultural-rights.md`.

## Estado atual — 48.5-A3-R2-Wave1 ativa em Production (19/08/2026)

Estado terminal: `COMUN_48_5_A3_SPECIALIZED_CULTURAL_HANDOFF_GREEN_PRODUCTION_ACTIVE_NO_AUTO_PUBLICATION`.

- precheck inicial confirmou `origin/main=e0486ea28c0f7810f37be103ff5cf9d59e894619`; o modo seguro `wave1-only` foi publicado no SHA operacional `ce2743c2fab32e1926a4ae2724fc3f67ab9c47c5`, com A3 funcional ancestral presente;
- CI `32311310860` GREEN e Production READY antes da ativação;
- D1 antes `32311512590` GREEN: flag OFF, uma chave Production, zero shared, zero duplicatas e zero overrides;
- Wave 1 `32311576931` GREEN: schema postflight read-only GREEN, transição exclusiva OFF→enabled, deployment pós-write SUCCESS `5992585536` e runtime servido no SHA esperado;
- D1 depois `32311824447` GREEN: flag efetiva ON, chave única, sem shared env, duplicata, branch ou custom override;
- migration A3 continua instalada e consistente; nenhuma migration foi aplicada durante a Wave 1;
- oito superfícies GET/HEAD passaram com HTTP 200; bundle confirmou Foto/Documento, Arte, História Oral e Rádio, manteve Música ausente e copy de não publicação;
- delta read-only: `businessWrites=0`, `newIntakes=0`, `newTargets=0`, `newArchiveItems=0`, `newSearchDocuments=0`, `newAssets=0`, `newCollections=0`, `publications=0`, `fixtures=0`;
- nenhum upload, POST, RPC funcional, intake, target, Search, asset público, coleção, feed, notificação ou publicação foi criado;
- flag `COMUN_CULTURAL_SPECIALIZED_HANDOFF_ENABLED=enabled`; as demais flags e ambientes não foram alterados.

A3 está ativo somente como continuidade para os pipelines especializados. Publicação continua separada e fail-closed; não executar submissão real em Production para teste.

## Estado atual — 48.5-A3-R2-Retry1 Wave 0 concluída (19/08/2026)

Estado terminal: `COMUN_48_5_A3_R2_SCHEMA_GREEN_FLAG_OFF`.

- `origin/main=106913e9fc9c5f41f263f38940fac4a607657e8d`; A3 funcional ancestral confirmado;
- runner operacional com lock de rollout e modo `wave0-only`; não houve Wave 1;
- D1 final `32303796951` GREEN, CI `32303736046` GREEN e Wave 0 `32303958299` GREEN;
- o plano Supabase retornou `Remote database is up to date.`; postflight confirmou a migration A3 e todos os RPCs/grants/RLS esperados. O receipt registra `migrationA3=already_applied`, portanto nenhum `supabase db push` foi executado nesta Retry1;
- a origem do write que colocou a migration no histórico antes do run final não foi determinada; não há evidência de que tenha sido qualquer tentativa Retry1;
- flag `COMUN_CULTURAL_SPECIALIZED_HANDOFF_ENABLED` continua OFF, única project-level Production, sem shared env, duplicata ou override;
- `businessWrites=0`, `fixtures=0`, `publications=0`; nenhum intake, target, asset, Search ou coleção foi criado;
- oito smokes GET/HEAD passaram com HTTP 200 e as respostas não expuseram IDs, hashes, identidade privada ou traces SQL;
- Production Vercel está READY no deployment `dpl_Ez2dfM6Mybf6HUHotaaY8Yd7Qohs` do SHA `106913e9`.

Próximo passo: Wave 1 em execução separada, com flag ainda OFF até novo preflight deliberado.

## Estado atual — 48.5-A3-R2-D1 proveniência do drift (19/08/2026)

Estado terminal do D1: `COMUN_48_5_A3_R2_FLAG_DRIFT_PROVENANCE_GREEN_READY_TO_RETRY_WAVE0`.

- baseline inicial confirmado: `origin/main=94849abef55a1592b2112cd9c26b229ec62ae1c4`; o diagnóstico foi executado no main posterior `21893f89d8d20c743688d96c8fa530f449510a8f` e o hardening final está em `26173e37ed99d38ca56a0312a912e4cbfa937f47`, divergências causadas somente pelo D1;
- o drift ON não veio de nenhuma execução A3-R2: `32295948001` parou antes de `flag_enabled`; `32296284347` foi a recuperação OFF, com metadata `updatedAt` compatível;
- a variável Production é única, project-level, sem branch/custom env, sem shared env; `createdAt=2026-08-19T11:22:08.363Z`, autor Vercel `alexandrevrabandonada-oss`, e deployment CLI correlato em `11:22:22Z` no SHA `826587f`;
- causa classificada como `ROOT_CAUSE_HIGH_CONFIDENCE` para ação externa ao runner A3-R2, mantendo residual apenas a distinção CLI manual versus automação externa no mesmo contexto;
- workflow D1 read-only e contrato de writer foram adicionados; duplicatas/shared env e transições inesperadas agora falham fechadas, com receipts sanitizados;
- auditoria D1 `32299571546` GREEN; flag Production OFF; deployment final `dpl_85ZWuNG4XDEd3tKfRwYGTTWAXkYF` READY no SHA `26173e37`; COMUN CI `32300089793`/`32300177137` GREEN; `businessWrites=0`, fixtures/targets/publicações=0;
- migration `20260818120000_comun_cultural_specialized_handoff.sql` continua pending em Production; nenhuma Wave 0/Wave 1 foi executada;
- próximo passo: nova tentativa limpa do A3-R2, sem executar rollout dentro do D1.

Relatório detalhado: `reports/current/comun-48-5-a3-specialized-cultural-handoff.md`.

## Estado atual — 48.5-A3-R2 rollout controlado (19/08/2026)

Estado terminal desta tentativa: `COMUN_48_5_A3_R2_SCHEMA_GREEN_RUNTIME_ROLLED_BACK_FLAG_OFF`.

- `origin/main` foi confirmado em `b456edc683b5b83cd3036a3afddc1283251d4ed3`; o esperado histórico `826587f` divergiu legitimamente por fechamentos posteriores, e o commit funcional A3 `a7a55861458be833048ecb20ec3b5d2ba7b4bb84` permanece ancestral;
- Production final está `READY` em `dpl_4r8HCrjzNNVo71oXYUx47CvNFXVf`, no código de `main` `b456edc6` e com a flag A3 restaurada para OFF;
- o preflight encontrou `COMUN_CULTURAL_SPECIALIZED_HANDOFF_ENABLED` previamente ON, embora o estado de entrada declarasse OFF. O rollout parou fail-closed; a ação `32296284347` desligou somente essa flag e confirmou o estado OFF;
- a migration `20260818120000_comun_cultural_specialized_handoff.sql` não foi aplicada em Production nesta tentativa; nenhum plano remoto foi aceito, nenhuma RPC foi chamada e nenhum dado funcional foi criado;
- smokes GET/HEAD das superfícies culturais canônicas passaram, sem IDs, hashes ou identidade privada no HTML; `businessWrites=0`, fixtures e publicações continuam zero;
- Wave 0 e Wave 1 permanecem não executadas. Não declarar A3 ativo nem rollout concluído; o próximo passo é revalidar a origem do drift da flag e repetir o preflight somente com OFF confirmado.

Relatório detalhado: `reports/current/comun-48-5-a3-specialized-cultural-handoff.md`.

## A4-R1 — Provisionamento Chromium de CI fechado, aguardando rollout A4 (19/08/2026)

Estado atual: `COMUN_48_5_A4_R1_PROGRESSIVE_RIGHTS_GREEN_BROWSER_CI_STABLE_AWAITING_ROLLOUT`.

- PR #351 foi mesclada funcionalmente em `27c441a4fa03857ece2e022f6f64516d5188989d`; o deployment Production correspondente `dpl_AdzYY7S6VrhmUTNypfm3LoXpCtdr` ficou `READY`; o fechamento documental posterior não altera o runtime;
- a action compartilhada de Chromium usa cache exato por OS/arquitetura/versão real Playwright/lockfile, retry limitado e cleanup de grupo, descendentes e locks apt/dpkg; nenhum teste foi removido ou relaxado;
- Preview exato `dpl_73czMy9gNUAxAV9mmTsXZnY1EssX` e os gates do candidato ficaram verdes; pós-merge COMUN CI, Cultural, Quality, Experience, Core, Civic Graph e CAPTCHA também ficaram verdes;
- a migration `20260819130000_comun_cultural_progressive_rights.sql` continua pendente em Production; `COMUN_CULTURAL_PROGRESSIVE_RIGHTS_ENABLED` continua OFF; nenhuma fixture, publicação, Search, asset ou escrita funcional foi criada;
- próximo passo único: rollout controlado A4 em Wave 0/Wave 1, fora deste R1.

## A3-R1 — Provas Supabase locais e lanes históricas saneadas (18/08/2026)

Estado atual: `COMUN_48_5_A3_R1_MERGED_GREEN_AWAITING_CONTROLLED_ROLLOUT`.

- baseline remoto reconfirmado: `origin/main=67b8fa9fcfd9adb07552d2a5776a3c7783f1a3a0`; entrada do R1 em `27d1abc0e407b5f88bc536f3244dad811ea35498`;
- workflow disposable A3 dedicado executa somente Supabase local no runner, aplica a cadeia A2/A2-R1/A3 por reset local e publica marker sanitizado; nenhum remoto, fixture Production, publicação ou ativação de flag foi usado;
- os seis preflights históricos agora usam paths/manifesto de lane ownership: known-other é N/A, unknown e mistura continuam FAIL CLOSED; não houve remoção de required check nem bypass de branch protection;
- A3 continua transacional 1:1 para Foto/Documento, Arte, História Oral e Rádio; `unknown` não cria alvo, Música fica fora, alvos permanecem draft/pending e a flag `COMUN_CULTURAL_SPECIALIZED_HANDOFF_ENABLED` continua OFF;
- contrato R1 local: `6 passed`; prova disposable Supabase, exact Preview/freshness, CI remoto, merge e Production continuam pendentes até execução no SHA candidato;
- a primeira prova CI local-only foi executada no run `32206329698` e encontrou um defeito real de compilação do RPC de rota (`status` ambíguo); a correção foi aplicada e a reexecução GREEN `32207385217` confirmou o handoff descartável, sem aplicar nada em Production;
- a segunda prova `32206689457` alcançou o rollback e encontrou uma falha de baseline do harness, não do produto; o baseline agora é capturado após os quatro handoffs esperados para medir exclusivamente o rollback-only;
- A1 também revelou um defeito operacional de leitura de `GITHUB_ENV`; a correção foi aplicada e o preflight `32207385183` ficou GREEN/N/A. Os demais lanes históricos aplicáveis ficaram GREEN/N/A no mesmo ciclo;
- checkpoint final `a0b3bc93092ee2571d8ca9f05ba2887bc7f40d2b` tem Preview Vercel READY e COST-02 GREEN; A3 disposable `32208583635`, COMUN CI `32208583833`, Cultural Deliverability `32208583751` e preflights de lane estão GREEN;
- merge #350 confirmado em `a7a55861458be833048ecb20ec3b5d2ba7b4bb84`; `origin/main` e Production Vercel READY estão no mesmo SHA;
- CI pós-merge COMUN CI `32210155889`/`32210215010` e Cultural Deliverability `32210156007` GREEN; as suítes gerais pós-merge restantes seguem independentes do gate R1;
- migration A3 ainda não foi aplicada em Production, a flag `COMUN_CULTURAL_SPECIALIZED_HANDOFF_ENABLED` continua OFF e o rollout controlado não começou.

Checkpoint pré-merge reservado: `COMUN_48_5_A3_R1_SPECIALIZED_HANDOFF_PROOFS_GREEN_LEGACY_LANES_SCOPED`.

# Estado atual — 48.5-A3 Handoff especializado da contribuição cultural (18/08/2026)

Estado de implementação local: `COMUN_48_5_A3_SPECIALIZED_HANDOFF_CANDIDATE_PENDING_VERIFY`.

- baseline remoto confirmado: `origin/main=67b8fa9fcfd9adb07552d2a5776a3c7783f1a3a0`; a divergência histórica dos blocos A2 abaixo permanece registrada e não foi reescrita;
- o A3 reutiliza as raízes `comun_archive_submissions`, `comun_archive_artwork_submissions`, `comun_archive_oral_history_suggestions` e `comun_radio_contributions`; não cria entidade cultural genérica, bucket, `comun_archive_items`, Search, coleção, feed ou publicação;
- a migration `20260818120000_comun_cultural_specialized_handoff.sql` estende somente estados do envelope A2, torna a escolha de rota imutável após seleção e adiciona RPC service-role-only transacional com lock do intake;
- o RPC cria no máximo um alvo especializado por intake, registra `target_kind/target_id` somente no envelope privado, retorna apenas `target_kind`/estado e mantém os alvos em `draft` ou `pending`; `target_id`, hashes, identidade, consentimento e rights não entram em DTO/HTML;
- `unknown` continua sem alvo; Música permanece fora do seletor; flag nova `COMUN_CULTURAL_SPECIALIZED_HANDOFF_ENABLED` nasce OFF e, desligada, preserva o comportamento A2;
- a UI devolve continuidade para os formulários canônicos de Foto/Documento, Arte, História Oral e Rádio, sem promessa de publicação; direitos, consentimento, storage e revisão continuam nos pipelines especializados;
- disposable proof, testes A1/A2, gates locais, CI/Preview e rollout ainda estão pendentes. Nenhum write remoto, fixture Production, ativação de flag ou publicação foi realizado.

Detalhes: `reports/current/comun-48-5-a3-specialized-cultural-handoff.md`.

O estado só poderá ser terminal após prova descartável, exact Preview/freshness, CI e rollout controlado.

# Estado anterior — 48.5-A0 Reconciliação de cultura, memória e rádio (17/08/2026)

## 48.5-A0 — Inventário antes de construir

- `comun_archive_items` foi comprovado como substrato canônico compartilhado;
  Arte, Música, História Oral, Programa e Episódio de Rádio são
  especializações com gates próprios;
- `/comun/acervo` é a superfície canônica de memória;
  `/comun/acervo/arte` é a superfície canônica de Arte e `/comun/arte`
  permanece rota de compatibilidade até merge futuro explícito;
- Rádio é superfície editorial cultural canônica: programa, episódio e grade
  continuam semanticamente distintos;
- direitos, licença de reutilização, consentimento, storage e publicação são
  fronteiras independentes e fail-closed;
- História Oral mantém material bruto/transcrição privada separados de
  trechos, áudio e identidade consentidos;
- pesquisa acadêmica reutiliza `document` com extensão bibliográfica futura;
- Civic Search permanece derivado; Pauta memory, território, comunidade e
  ação só se ligam por relação explícita, sem IA ou join textual;
- child-gate gaps de Arte, Rádio, facets de Música e claims de identificação
  estão registrados para A1, sem correção silenciosa;
- zero migration, schema, UI, API, flag, deploy funcional, upload, publicação,
  alteração de rights ou business write;
- próximo slice decidido: `48.5-A1 — Acervo Vivo, núcleo público canônico de
memória`.

Detalhes:
`reports/current/comun-48-5-a0-culture-memory-radio-reconciliation.md`.

Estado terminal condicionado ao merge e preflight remoto verde:
`COMUN_48_5_A0_CULTURE_MEMORY_RADIO_RECONCILIATION_CONTRACT_GREEN`.

A1 não foi iniciado.

# Estado anterior — 48.4-A7 Fechamento da economia solidária (17/08/2026)

## 48.4-A7 — Coerência ponta a ponta, sem novo domínio

- decisão arquitetural: `48.4_FIRST_CYCLE_CLOSED`;
- a jornada canônica é Participar → Feirinha → Organização →
  Oferta/Necessidade → Interesse/Ajuda → conexão consentida → Minha
  participação;
- a matriz A7 versiona oito grupos de rota e os comportamentos de visitante,
  pessoa autenticada sem vínculo, `pending`, `editor` e `facilitator`;
- onboarding aprovado continua diretamente na organização, com fallback seguro
  para Minha participação;
- manutenção da organização, vínculo e conexões possuem fronteira privada
  explícita; estados internos desconhecidos não vazam como copy pública;
- empty states não confundem zero publicações no COMUN com ausência do
  fenômeno;
- zero entidade, migration, API, pagamento, pedido, chat, ranking, avaliação,
  seller account ou propagação social;
- produtores individuais, busca econômica e mutação de identidade permanecem
  deferidos sem bloquear o primeiro ciclo;
- rollout é exact-main, sem mudança de flags ou schema, com GET/HEAD e
  `businessWrites=0`.

Detalhes:
`reports/current/comun-48-4-a7-solidarity-economy-integrated-experience.md`.

Estado terminal condicionado ao merge e Production green:
`COMUN_48_4_A7_SOLIDARITY_ECONOMY_INTEGRATED_EXPERIENCE_GREEN_FIRST_CYCLE_CLOSED`.

# Estado anterior — 48.4-A6 Autogestão segura do perfil (16/08/2026)

## 48.4-A6 — Campos cotidianos, sem mutação de identidade

- acesso A2 ativo `editor` ou `facilitator` pode manter apresentação, serviços,
  território de atuação textual e contato público autorizado;
- nome, tipo, status, verificação, `last_verified_at`, contato privado,
  território e proveniência continuam protegidos;
- uma única migration estende o ledger privado A3 e adiciona a RPC atômica
  service-role-only, sem nova entidade econômica;
- contato público novo exige consentimento explícito; remoção não exige; nunca
  existe fallback por conta, `private_contact`, A5, Wallet ou Relata;
- idempotência, concorrência otimista, rate limit e snapshots privados bounded
  são impostos no banco;
- rota única `/comun/cooperativas/[slug]/editar-perfil`, uma tela, draft local,
  `returnTo` e flag fail-closed dependente somente de A1+A2;
- PR funcional `#340`, head exato
  `6ebb894ae99a6c2a4e75c4318689814ce93a9200`, integrada no merge/main
  `3d974b0d610425469a473a8d2a10e384fd898002`;
- preflight metadata-only `31986701720` e prova Supabase descartável
  `31986701685` verdes; 1.069 testes, typecheck, lint, build e gates aplicáveis
  do head funcional verdes;
- Wave 0 `31988907854` promoveu somente a migration A6, comprovou o postflight
  e manteve a flag desligada; Wave 1 `31989059174` habilitou somente a
  autogestão do perfil;
- smokes Production `GET/HEAD` verdes, `businessWrites=0`, zero fixture e
  empty state real por ausência de organização pública elegível;
- QA visual 390×844 e 1440×900 confirmou Feirinha íntegra, sem overflow nem
  campos privados no HTML; o fluxo autenticado foi validado no descartável,
  sem fabricar sujeito em Production;
- A1–A5, piloto Motorola pausado e `launch_publicly=false` permanecem
  preservados.

Detalhes: `reports/current/comun-48-4-a6-organization-profile-self-management.md`.

Estado terminal:
`COMUN_48_4_A6_ORGANIZATION_PROFILE_SELF_MANAGEMENT_GREEN_LOW_RISK_FIELDS_NO_IDENTITY_MUTATION`.

A7 não foi iniciado.

# Estado anterior — 48.4-A5 Conexão privada e consentida (16/08/2026)

## 48.4-A5 — Interesse em Oferta e ajuda em Necessidade, sem marketplace

- o contrato funcional usa uma única migration forward-only e reutiliza
  `comun_territorial_need_interests`, criando somente o root privado ausente
  para interesses em Ofertas;
- o contato é protegido por consentimento versionado e somente fica visível
  após aceite por acesso A2 ativo da mesma organização;
- rejeição e retirada removem o contato protegido; nenhum pedido, pagamento,
  chat, reserva, contrato, rating ou vínculo social é criado;
- a UI inclui **Tenho interesse**, **Posso ajudar**, Conexões privadas da
  organização e **Interesses e ajudas** em Minha participação;
- PR funcional `#338`, head exato
  `352e08cee861f27473e550e45917e3f08eff0ae6`, integrada no merge/main
  `ea92046d81cd5fd9b35a5058aa2a9ac6a9ccdf8b`;
- preflight remoto A5 `31980016768` e prova Supabase descartável
  `31980016750` verdes, junto de todos os gates aplicáveis exact-head;
- Wave 0 `31982145313` promoveu somente a migration A5 e manteve a nova flag
  desligada; Wave 1 `31982297402` habilitou somente as conexões privadas;
- Production respondeu GET/HEAD `200` nas quatro superfícies canônicas, sem
  fixture e com empty state real por ausência de sujeito público elegível;
- `businessWrites=0`, A1–A4 intactos, piloto Motorola pausado,
  `launch_publicly=false` e A6 não iniciado.

Estado terminal:
`COMUN_48_4_A5_PRIVATE_INTEREST_CONSENTED_CONNECTION_GREEN_NO_ORDER_NO_CHAT`.

Preservados: A1–A4, flags correspondentes habilitadas em Production,
`COMUN_48_1C_MOTOROLA_PILOT_PAUSED_BY_PRODUCT_DECISION` e
`launch_publicly=false`.

## 48.5-A2 — Contribuição Cultural Save-first

Foi adicionada a migration privada de intake cultural com RPC service-role-only,
idempotência por request, retomada anônima por cookie opaco/hash e seleção
explícita de continuidade. O primeiro save não cria memória pública, mídia,
Acervo ou Search. A experiência é protegida por
`COMUN_CULTURAL_SAVE_FIRST_INTAKE_ENABLED`; A3 permanece fora deste ciclo.

## 48.5-A1-R1

Revisão de hardening do Acervo Vivo: paridade list/detail, direitos explícitos
de assets, gates especializados de Rádio/Arte/Música, coleções sem bypass e
projeção especializada fail-closed. A2 permanece bloqueado até o terminal R1.

## 48.5-A1 — Acervo Vivo

Após o A0, `comun_archive_items` permanece a raiz canônica de memória e a
projeção pública especializada foi endurecida com gates fail-closed para Arte,
Música, História Oral, Rádio, assets, coleções, relações e identificação. O
DTO público é server-only e tipado; não houve migration, write de negócio,
mudança de bucket, API ou reindex. O antigo fallback numérico de identificação
(incluindo `860`) foi removido. Estado: `COMUN_48_5_A1_ACERVO_VIVO_PUBLIC_MEMORY_CORE_GREEN_SPECIALIZED_GATES_FAIL_CLOSED`.

# Estado anterior — 48.4-A4 Onboarding de organizações (16/08/2026)

## 48.4-A4 — Save first, uma verificação e primeiro facilitator

- baseline funcional `3aca11f0cfc1893d3e77e935318f2a08af7ddb52`;
- uma única migration adiciona o workflow privado de onboarding e RPCs service-role-only; as raízes públicas A1 e a governança A2 são reutilizadas;
- primeiro save autenticado guarda apenas o nome em `draft`; `submitted` continua com território, organização, acesso, Oferta e Necessidade em zero;
- somente admin canônico da plataforma pode revisar; aprovação atômica cria território e organização `source_checked`, fonte revisada e primeiro acesso `facilitator/active/platform`;
- a Feirinha recebe entrada secundária, Minha Participação reutiliza Organizações e a fila vive na Sala de Organização; Home continua sem nova porta;
- `comun_territorial_contributions` permanece `LEGACY_KEEP_COMPAT`, sem dual-write;
- flag `COMUN_SOLIDARITY_ORGANIZATION_ONBOARDING_ENABLED` depende de A1+A2, nasceu fail-closed e foi habilitada isoladamente após a prova cloaked;
- PR `#336`, head funcional exato `b4038ccc4ffb4d1ecea2c92ecfa56bc2cd94016b` e merge/main exato `810e9f944b37490f201f01ad1dc0cebbbbf54085`;
- preflight remoto `31972719160` e descartável Supabase `31972719126` verdes no exact-head;
- Wave 0 `31974384419` promoveu somente a migration A4, confirmou o postflight metadata-only e manteve as rotas cloaked;
- Wave 1 `31974507739` habilitou somente o onboarding, com GET/HEAD Production verdes, zero fixture e `businessWrites=0` durante o rollout;
- `COMUN_48_4_A2_NEW_ORGANIZATION_ONBOARDING_DEFERRED` foi resolvido; produtores individuais, A5, piloto Motorola e `launch_publicly=false` permanecem preservados.

Estado terminal:
`COMUN_48_4_A4_ORGANIZATION_ONBOARDING_GREEN_VERIFIED_FIRST_FACILITATOR_NO_OWNER`.

Detalhes: `reports/current/comun-48-4-a4-organization-onboarding.md`.

# Estado anterior — 48.4-A3 Conteúdo econômico autorizado (16/08/2026)

## 48.4-A3 — Ofertas e Necessidades pela organização, sem seller

- promoção Production concluída sobre o baseline `7669f8157826cb2cb63affd6e70b3bae856f3dc5`;
- acesso A2 ativo `editor` ou `facilitator` pode manter Ofertas e Necessidades somente da própria organização; todos os gates A1/A2 são revalidados no banco;
- única migration forward-only adiciona ledger privado auditável e quatro RPCs service-role-only, com idempotência e rate limit, sem nova entidade econômica;
- formulários mínimos vivem na ficha da organização, preservam draft local e não criam seller dashboard, owner, pedido, pagamento, marketplace ou propagação social;
- Oferta publica normalmente por 30 dias e admite editar, pausar, retomar, renovar e arquivar; Necessidade admite editar, parcialmente atendida, atendida, cancelada e reaberta;
- conteúdo público continua vindo exclusivamente dos DTOs A1 fail-closed; ator, acesso e auditoria nunca entram em HTML/DTO;
- `COMUN_SOLIDARITY_ECONOMIC_CONTENT_WRITES_ENABLED` depende das flags A1 e A2; `COMUN_48_4_A2_NEW_ORGANIZATION_ONBOARDING_DEFERRED`, piloto Motorola pausado e `launch_publicly=false` preservados;
- PR funcional `#334`, head exato `7e6a346acd133a18ec7b8ee58733cf2085b86bac`, incorporada no merge/main `f63957fd7016b962b9aea1b567a482f2a0398618`;
- preflight remoto A3 `31956271757`, descartável Supabase `31956271710` e todos os gates aplicáveis verdes; gates pós-merge também verdes no exact-main;
- Wave 0 `31958532076` promoveu somente a migration A3 com a flag desligada e postflight metadata-only verde; Wave 1 `31958676222` habilitou somente os writes econômicos autorizados;
- Production respondeu GET/HEAD `200` nas superfícies canônicas, manteve empty state real sem fixture e registrou `businessWrites=0` nas duas ondas.

Estado terminal:
`COMUN_48_4_A3_AUTHORIZED_ECONOMIC_CONTENT_WRITES_GREEN_OFFERS_NEEDS_NO_SELLER`.

Detalhes: `reports/current/comun-48-4-a3-authorized-economic-content-writes.md`.

# Estado anterior — 48.4-A2 Identidade e governança das organizações (15/08/2026)

## 48.4-A2 — Relação privada e revogável, sem dono

- implementação ativa baseada em `private.comun_solidarity_organization_access`, única nova raiz e única migration do ciclo;
- uma pessoa autenticada pode pedir acesso para agir no COMUN por organização A1 elegível, sem afirmar propriedade, seller account, representação legal, relação de trabalho ou associação no mundo real;
- o primeiro vínculo é `facilitator/platform`; vínculos seguintes são `editor/organization`; a pessoa não escolhe papel;
- editor não governa; facilitador analisa editores, pode promovê-los e revogá-los, mas não revoga facilitador par; admin canônico mantém a exceção de revogação;
- o último facilitador pode sair e o próximo pedido retorna à plataforma; pedido e acesso nunca alteram status/verificação da organização, Oferta, Necessidade, Comunidade, Pauta ou Ação;
- `/comun/cooperativas/[slug]` organiza perfil, ofertas, necessidades e CTA contextual; Minha Participação recebe a seção Organizações sem nova aba de topo;
- tabela e RPCs são service-role-only, com RLS/FORCE RLS; nenhum dado de acesso entra em HTML/DTO público;
- `COMUN_48_4_A2_ECONOMIC_CONTENT_WRITES_DEFERRED_TO_A3`, `COMUN_48_4_A2_NEW_ORGANIZATION_ONBOARDING_DEFERRED` e `launch_publicly=false` preservados;
- PR funcional `#332`, head exato `f40b39c3a772bf93d098d6096e1831cd088889b4`, integrada exact-head no merge/main `c817d155b1fa7667683363857b6f30986f8b71f7`;
- preflight remoto A2 `31915046864` e disposable Supabase `31915046927` verdes; CI aplicável, jornadas, superfícies, coerência, inteligência e resiliência verdes;
- Wave 0 `31915517971` promoveu somente a migration A2 e comprovou RLS/grants metadata-only com a flag desligada; Wave 1 `31915638733` habilitou somente a governança A2;
- Production respondeu GET/HEAD `200` em `/comun`, `/comun/participar` e `/comun/cooperativas`; sem organização elegível, o detalhe permaneceu em empty state real, sem fixture;
- `businessWrites=0`, nenhuma exposição privada e `launch_publicly=false` preservado.

Estado terminal:
`COMUN_48_4_A2_ORGANIZATION_IDENTITY_GOVERNANCE_GREEN_REVOCABLE_ACCESS_NO_OWNER`.

Detalhes: `reports/current/comun-48-4-a2-organization-identity-governance.md`.

# Estado anterior — 48.4-A1 Núcleo público de economia solidária (15/08/2026)

## 48.4-A1 — Organizações + Ofertas + Necessidades

- `/comun/cooperativas` foi recomposta como **Feirinha — Trocas e economia solidária**, uma superfície de descoberta e não um marketplace;
- `comun_territorial_organizations` e `comun_territorial_needs` permanecem canônicas; somente `comun_solidarity_offers` foi criado como nova entidade;
- Oferta pertence obrigatoriamente a organização, possui modalidades explícitas, preço opcional e só é pública quando revisada, publicada e não vencida;
- organizações e territórios passam por allowlists fail-closed de status/verificação; contato privado nunca é selecionado nem usado como fallback;
- interesses permanecem privados e restritos a necessidades; não existem checkout, pedido, pagamento, rating, chat, produtor individual ou publicação econômica pelo usuário;
- PR funcional `#330`, head exato `064a8ceaa2a6f97589f1572b7f1d5e2e34e0c505`, integrada no merge/main `8e9471472a86c38c7f5ceb86649e4253b7263379`;
- preflight remoto `31903726270` e descartável `31903726266` verdes; CI ampla verde, com um único rerun transitório de webserver Playwright em Quality Performance;
- Wave 0 `31906435689` promoveu somente a migration A1 e comprovou RLS/grants metadata-only; Wave 1 `31906556867` habilitou somente a flag A1;
- Production respondeu `200` em `/comun`, `/comun/participar` e `/comun/cooperativas`, HEAD `200` na Feirinha, sem marcador privado, seed, fixture ou write;
- `businessWrites=0`, `COMUN_48_4_A1_INDIVIDUAL_PRODUCERS_DEFERRED_FIRST_CYCLE`, `COMUN_48_4_A1_PUBLIC_ECONOMIC_WRITES_DEFERRED_UNTIL_IDENTITY_CLAIM_CONTRACT` e `launch_publicly=false` preservados.

Estado terminal:
`COMUN_48_4_A1_SOLIDARITY_ECONOMY_PUBLIC_CORE_GREEN_OFFERS_NEEDS_NO_MARKETPLACE`.

Detalhes: `reports/current/comun-48-4-a1-solidarity-economy-public-core.md`.

Preservados: `COMUN_48_3_E3_LOW_FRICTION_PAUTA_CREATION_GREEN_PUBLIC_SAFE_NO_AUTO_ORGANIZATION`, `COMUN_48_3_E2_NATURAL_ORGANIZATION_BRIDGES_GREEN_PUBLIC_EVIDENCE_TO_PAUTA_NO_AUTO_CREATE`, `COMUN_48_3_E1_INTEGRATED_EXPERIENCE_COHERENCE_GREEN_STREAMLINED_NAVIGATION`, `COMUN_48_3_D1_COLLECTIVE_CYCLE_MEMORY_GREEN_CANONICAL_PUBLIC_NARRATIVE`, `COMUN_48_3_C1_COLLECTIVE_ACTIONS_CANONICAL_EXPERIENCE_GREEN_MEMBER_PARTICIPATION`, `COMUN_48_3_B1_RODAS_VIVAS_CANONICAL_EXPERIENCE_GREEN_MODERATED_PUBLIC`, `COMUN_48_2_F_CROSS_OBSERVATORY_CITY_PANORAMA_GREEN_PUBLIC_SAFE`, `COMUN_48_1C_MOTOROLA_PILOT_PAUSED_BY_PRODUCT_DECISION` e `launch_publicly=false`.

# Estado anterior — 48.4-A0 Feirinha / Economia Solidária (15/08/2026)

## 48.4-A0 — Reconciliação da arquitetura econômica

- Feirinha foi definida como superfície de descoberta, não como nova raiz, marketplace, loja ou objeto social;
- `comun_territorial_organizations` e `comun_territorial_needs` serão reutilizadas com extensão; interesses atuais continuam canônicos somente para necessidades;
- não existe objeto canônico de Oferta: `offer=NEEDS_NEW_CANONICAL_OBJECT`, a ser tratado somente no A1;
- território é contexto opcional, Comunidade/Pauta/Ação permanecem objetos distintos e nenhuma relação inexistente foi inventada;
- a rota futura preservada é `/comun/cooperativas`, a ser recomposta sem criar `/feirinha-v2`;
- pagamentos e pedidos foram deferidos; ratings ficam proibidos no primeiro ciclo;
- o adapter econômico futuro permanece bloqueado até possuir gate explícito da organização filha, pois o runtime atual herda somente o gate do território pai;
- PR funcional `#328`, head `ca49f1f7aa9b2b7e8340a2eef6f529ffa21ae9de`, integrada exact-head no merge/main `9ad47e881f7e2e5ba4a8c764a3a116daac015970`;
- preflight remoto `31888711059` confirmou `BEGIN READ ONLY`, `businessContentRead=false`, 10 tabelas metadata-only, RLS ativo e remote plan vazio;
- CI, Civic Graph, Full Surface Migration, Core Journeys e Quality Performance ficaram verdes;
- zero migration, UI, API, flag, deploy funcional, dado privado ou business write; `launch_publicly=false`.

Estado terminal:
`COMUN_48_4_A0_SOLIDARITY_ECONOMY_RECONCILIATION_CONTRACT_GREEN`.

Detalhes: `reports/current/comun-48-4-a0-solidarity-economy-reconciliation.md`.

Preservados: `COMUN_48_3_E3_LOW_FRICTION_PAUTA_CREATION_GREEN_PUBLIC_SAFE_NO_AUTO_ORGANIZATION`, `COMUN_48_3_E2_NATURAL_ORGANIZATION_BRIDGES_GREEN_PUBLIC_EVIDENCE_TO_PAUTA_NO_AUTO_CREATE`, `COMUN_48_3_E1_INTEGRATED_EXPERIENCE_COHERENCE_GREEN_STREAMLINED_NAVIGATION`, `COMUN_48_3_D1_COLLECTIVE_CYCLE_MEMORY_GREEN_CANONICAL_PUBLIC_NARRATIVE`, `COMUN_48_3_C1_COLLECTIVE_ACTIONS_CANONICAL_EXPERIENCE_GREEN_MEMBER_PARTICIPATION`, `COMUN_48_3_B1_RODAS_VIVAS_CANONICAL_EXPERIENCE_GREEN_MODERATED_PUBLIC`, `COMUN_48_3_A1_PAUTAS_VIVAS_PUBLIC_CORE_GREEN_VERSIONED_EVIDENCE`, `COMUN_48_2_F_CROSS_OBSERVATORY_CITY_PANORAMA_GREEN_PUBLIC_SAFE`, `COMUN_48_1C_MOTOROLA_PILOT_PAUSED_BY_PRODUCT_DECISION` e `launch_publicly=false`.

# Estado anterior — 48.3-E3 Criação de Pauta com baixíssima fricção (14/08/2026)

## 48.3-E3 — Uma pergunta, salvar e organizar depois

- `/comun/pautas/nova` faz somente a pergunta “O que você quer entender ou mudar?”, sem categoria, território, comunidade, Roda, Ação ou Dossiê antes do save;
- preenchimento ocorre antes do login; o draft fica somente em `sessionStorage`, o `returnTo` é preservado e não existe auto-submit;
- uma única função transacional cria Pauta pública `observing/received/normal`, membership `participant` e evidência pública opcional revalidada no servidor;
- a função é executável somente pela `service_role`; o ledger privado contém hashes para idempotência e rate limit, sem IP bruto ou autoria pública;
- PII/alto risco falham fechados, duplicata forte exige confirmação e o fluxo não cria automaticamente comunidade, Roda, Ação, grupo, mobilização ou Dossiê;
- a única migration forward-only foi promovida; ledger/RLS/RPC permanecem fechados e a execução é exclusiva da `service_role`;
- PR funcional `#324`, head `855fbef978367bf215780d594bf489606f807897`, integrada exact-head no merge `8b5c4dbe68b9b37de914d81eec24f6449b509f00`;
- correções focais de smoke `#325` e `#326` foram integradas exact-head; main funcional final `87107b3f0d5e4e33acc7be505c84c22b1fd5d8c9`;
- Wave 0 `31844450823` preservou a rota cloaked e as superfícies existentes; Wave 1 final `31845840116` ativou somente a flag E3 e ficou verde;
- preflight pós-promoção `31846083045` confirmou metadata-only, `businessContentRead=false` e remote plan vazio;
- GET/HEAD Production responderam `200` nas cinco superfícies focais, sem marcador privado, fixture ou mutação; `businessWrites=0`.

Estado terminal:
`COMUN_48_3_E3_LOW_FRICTION_PAUTA_CREATION_GREEN_PUBLIC_SAFE_NO_AUTO_ORGANIZATION`.

Detalhes: `reports/current/comun-48-3-e3-low-friction-pauta-creation.md`.

Preservados: `COMUN_48_3_E2_NATURAL_ORGANIZATION_BRIDGES_GREEN_PUBLIC_EVIDENCE_TO_PAUTA_NO_AUTO_CREATE`, `COMUN_48_3_E1_INTEGRATED_EXPERIENCE_COHERENCE_GREEN_STREAMLINED_NAVIGATION`, `COMUN_48_3_D1_COLLECTIVE_CYCLE_MEMORY_GREEN_CANONICAL_PUBLIC_NARRATIVE`, `COMUN_48_3_C1_COLLECTIVE_ACTIONS_CANONICAL_EXPERIENCE_GREEN_MEMBER_PARTICIPATION`, `COMUN_48_3_B1_RODAS_VIVAS_CANONICAL_EXPERIENCE_GREEN_MODERATED_PUBLIC`, `COMUN_48_3_A1_PAUTAS_VIVAS_PUBLIC_CORE_GREEN_VERSIONED_EVIDENCE`, `COMUN_48_2_F_CROSS_OBSERVATORY_CITY_PANORAMA_GREEN_PUBLIC_SAFE`, `COMUN_48_1C_MOTOROLA_PILOT_PAUSED_BY_PRODUCT_DECISION` e `launch_publicly=false`.

# Estado anterior — 48.3-E2 Pontes Naturais de Organização (14/08/2026)

## 48.3-E2 — Evidência pública → Pauta existente

- o Panorama ganhou pontes contextuais derivadas somente de `public_evidence_ref_id` persistido, sem matching textual, busca, embedding, IA, recomendação ou ranking;
- uma consulta batched resolve todas as relações, filtrando evidência `approved/public_safe` e Pautas públicas não arquivadas;
- versões atuais e históricas permanecem distintas e nenhuma relação é atualizada automaticamente;
- uma Pauta ligada abre diretamente; múltiplas usam o recorte canônico `/comun/pautas?evidencia=<refId>`; zero relações não produz CTA morta;
- o recorte resolve referências no servidor, falha fechado para refs inválidas e preserva a volta à fonte pública;
- zero rota, API, flag, migration, auto-create, auto-attach ou leitura de Relata privado;
- débito explícito: `COMUN_48_3_E2_RELATA_TO_PAUTA_DEFERRED_PRIVATE_BOUNDARY`.
- PR funcional `#322`, head `a21ddf2f1f42a27dd3887e1157a3dc06cdbf5356`, integrada exact-head no merge/main `ab4fe8e416e96a9c4b67822d86162baf7fcc2695`;
- preflight `31833796298` e descartável `31833796300` verdes, com leitura metadata-only, `businessContentRead=false`, remote plan vazio e rollback integral;
- CI, Core Journeys, Quality Performance, Experience Coherence e Civic Graph pós-merge verdes; o único rerun foi um `SIGSEGV` transitório do Chromium, sem alteração de código;
- deploy Production exato concluído e GET/HEAD `200` nas cinco superfícies focais; a ref pública válida sem relação mostrou empty state legítimo, sem fixture;
- `bridgeQueryCount=1`, nenhuma leitura aproximada, nenhum marcador privado e `businessWrites=0`.

Estado terminal:
`COMUN_48_3_E2_NATURAL_ORGANIZATION_BRIDGES_GREEN_PUBLIC_EVIDENCE_TO_PAUTA_NO_AUTO_CREATE`.

Detalhes: `reports/current/comun-48-3-e2-natural-organization-bridges.md`.

Preservados: `COMUN_48_3_E1_INTEGRATED_EXPERIENCE_COHERENCE_GREEN_STREAMLINED_NAVIGATION`, `COMUN_48_3_D1_COLLECTIVE_CYCLE_MEMORY_GREEN_CANONICAL_PUBLIC_NARRATIVE`, `COMUN_48_3_C1_COLLECTIVE_ACTIONS_CANONICAL_EXPERIENCE_GREEN_MEMBER_PARTICIPATION`, `COMUN_48_3_B1_RODAS_VIVAS_CANONICAL_EXPERIENCE_GREEN_MODERATED_PUBLIC`, `COMUN_48_3_A1_PAUTAS_VIVAS_PUBLIC_CORE_GREEN_VERSIONED_EVIDENCE`, `COMUN_48_2_F_CROSS_OBSERVATORY_CITY_PANORAMA_GREEN_PUBLIC_SAFE`, `COMUN_48_1C_MOTOROLA_PILOT_PAUSED_BY_PRODUCT_DECISION` e `launch_publicly=false`.

# Estado anterior — 48.3-E1 Coerência Integrada da Experiência (14/08/2026)

## 48.3-E1 — Menos portas e um próximo passo claro

- o App V2 existente foi convergido sem App V3, objeto, API, flag, schema ou migration;
- Home e navegação expressam quatro intenções: relatar, entender, participar e reencontrar a própria participação;
- Panorama é a entrada canônica para entendimento; Pautas, para organização; ferramentas e Comunidades permanecem contextuais;
- Pauta/Roda/Ação/Memória preservam uma CTA dominante e retorno ao contexto;
- Minha participação usa agrupamentos humanos, preserva `returnTo` e remove contadores dominantes e tela de transição;
- 941 testes unitários, 35 testes Playwright em cinco viewports, typecheck, lint e build verdes;
- PR funcional `#320`, head `6bd28c56f15cfa2782aef69dacfd19f13f831c93`, integrada exact-head no merge/main `798c79b4c2a9103fb23f399a07422f771f4135d0`;
- CI, Communities, Core Journeys, Experience Coherence, Quality Performance e Civic Graph pós-merge verdes; o único rerun foi um `SIGSEGV` transitório do Chromium, sem alteração de código;
- deployment Production `5908690635` concluído no SHA exato; oito rotas focais responderam `200` em GET e HEAD no domínio canônico;
- zero migration, API, flag, fixture, business write ou alteração semântica de dados; `businessWrites=0`.

Estado terminal:
`COMUN_48_3_E1_INTEGRATED_EXPERIENCE_COHERENCE_GREEN_STREAMLINED_NAVIGATION`.

Detalhes: `reports/current/comun-48-3-e1-integrated-experience-coherence.md`.

Preservados: `COMUN_48_3_D1_COLLECTIVE_CYCLE_MEMORY_GREEN_CANONICAL_PUBLIC_NARRATIVE`, `COMUN_48_3_C1_COLLECTIVE_ACTIONS_CANONICAL_EXPERIENCE_GREEN_MEMBER_PARTICIPATION`, `COMUN_48_3_B1_RODAS_VIVAS_CANONICAL_EXPERIENCE_GREEN_MODERATED_PUBLIC`, `COMUN_48_3_A1_PAUTAS_VIVAS_PUBLIC_CORE_GREEN_VERSIONED_EVIDENCE`, `COMUN_48_2_F_CROSS_OBSERVATORY_CITY_PANORAMA_GREEN_PUBLIC_SAFE`, `COMUN_48_1C_MOTOROLA_PILOT_PAUSED_BY_PRODUCT_DECISION` e `launch_publicly=false`.

# Estado anterior — 48.3-D1 Memória Coletiva do Ciclo (14/08/2026)

## 48.3-D1 — Narrativa pública canônica do ciclo

- a Pauta Viva agora organiza, em projeção pública read-only, questão, aprendizados, Rodas/sínteses, decisão, Ações, resultados, memória publicada e próximo passo;
- causalidade exige vínculo explícito no action cycle; compartilhar a mesma Pauta é apresentado apenas como contexto;
- busca permanece somente descoberta e nunca fonte de verdade da memória;
- DTOs fail-closed excluem dados privados, estados não publicados, resultados superseded e memória sem `memory_published_at`;
- zero migration, tabela, rota, API, feed, ranking, IA, publicação automática ou business write;
- PR funcional `#314` e correções focais `#315`–`#318` foram mescladas exact-head; exact main ativado `769f7bc1b0da029daa1cbbfa404237d1fc373a6c`;
- preflight `31772092012` e descartável `31772092045` verdes, com remote plan vazio e rollback integral;
- flags-off `31785572587` e wave 1 `31785805806` verdes, somente GET, `businessWrites=0`;
- Production comprovada em `/comun/pautas/calcadas-em-circulacao`, sem índice divergente ou marcadores privados.

Estado atual:
`COMUN_48_3_D1_COLLECTIVE_CYCLE_MEMORY_GREEN_CANONICAL_PUBLIC_NARRATIVE`.

Detalhes: `reports/current/comun-48-3-d1-collective-cycle-memory.md`.

Preservados: `COMUN_48_3_C1_COLLECTIVE_ACTIONS_CANONICAL_EXPERIENCE_GREEN_MEMBER_PARTICIPATION`, `COMUN_48_3_B1_RODAS_VIVAS_CANONICAL_EXPERIENCE_GREEN_MODERATED_PUBLIC`, `COMUN_48_3_A1_PAUTAS_VIVAS_PUBLIC_CORE_GREEN_VERSIONED_EVIDENCE`, `COMUN_48_2_F_CROSS_OBSERVATORY_CITY_PANORAMA_GREEN_PUBLIC_SAFE`, `COMUN_48_1C_MOTOROLA_PILOT_PAUSED_BY_PRODUCT_DECISION` e `launch_publicly=false`.

# Estado anterior — 48.3-C1 Ações Coletivas (13/08/2026)

## 48.3-C1 — Experiência canônica Pauta → Ação

- `comun_collective_actions` permanece a raiz única; `comun_mobilization_actions` fica em compatibilidade, sem leitura/escrita no caminho C1;
- DTOs públicos fail-closed, uma CTA dominante, tarefas com guard de capacidade, atualizações públicas e memória revisada compõem as rotas existentes;
- Pautas Vivas usam somente `comun_collective_actions.pauta_id` no bloco `O que estamos fazendo`;
- `COMUN_COLLECTIVE_ACTIONS_CANONICAL_EXPERIENCE_ENABLED` preserva a experiência anterior quando OFF e depende do release estrutural existente;
- zero migration, API nova, membership, papel, dual-write, criação automática de ação ou publicação automática;
- PR funcional `#309`, head `b9c9f35af3816aa42845c89213b9f2949cc14aef`, merge exact-head `d69c2b851a84e5936b2a073b955384ded1ff3c1c`;
- preflight remoto `31747677539` e descartável `31747677643` verdes, com remote plan vazio e rollback integral;
- flags-off final `31751592047` e wave 1 `31751732584` verdes no exact-main `e735bf4723231943bee63137aecf27c4e3572dc3`;
- o binding server-only ausente foi materializado a partir do secret canônico existente, sem revelar o valor e sem alterar `COMUN_COLLECTIVE_ACTIONS_V1`;
- Production `/comun/acoes=200`, composição canônica ativa, nenhum marcador privado, nenhuma fixture e `businessWrites=0`.

Estado atual:
`COMUN_48_3_C1_COLLECTIVE_ACTIONS_CANONICAL_EXPERIENCE_GREEN_MEMBER_PARTICIPATION`.

Detalhes: `reports/current/comun-48-3-c1-collective-actions-canonical-experience.md`.

Preservados: `COMUN_48_3_B1_RODAS_VIVAS_CANONICAL_EXPERIENCE_GREEN_MODERATED_PUBLIC`, `COMUN_48_3_A1_PAUTAS_VIVAS_PUBLIC_CORE_GREEN_VERSIONED_EVIDENCE`, `COMUN_48_2_F_CROSS_OBSERVATORY_CITY_PANORAMA_GREEN_PUBLIC_SAFE`, `COMUN_48_1C_MOTOROLA_PILOT_PAUSED_BY_PRODUCT_DECISION` e `launch_publicly=false`.

# Estado atual — 48.3-B1 Rodas Vivas (13/08/2026)

## 48.3-B1 — Experiência canônica de conversa coletiva

- `comun_construction_circles` permanece a Roda canônica e ganhou projeção pública fail-closed, sem schema paralelo;
- Rodas públicas vivem na Pauta, etapas `planned/archived`, contribuições não moderadas e sínteses não publicadas ficam fora da superfície;
- a ação existente agora valida Pauta, Roda, rodada atual, modo, tipo, limites e safety antes do único insert `pending`;
- a nova rota focal e o CTA da Pauta são protegidos por `COMUN_RODAS_VIVAS_ENABLED`; OFF preserva A1 integralmente;
- zero migration, API nova, grant público, membership automático, dual-write, ação automática ou publicação automática;
- o débito de contraste do componente tocado foi corrigido e os gates mobile/acessibilidade ficaram verdes;
- PR #307 mesclada por exact-head `acfbe06ab3d8d40b5bf3186707db2c09d32d30fc`, merge `e6af0d64877f1fe268a4a5f5d89510dcf7d3a2db`;
- preflight remoto e descartável verdes nos runs `31740964422` e `31740964399`, com remote plan vazio, RLS/grants preservados, um insert `pending` e rollback integral;
- flags-off verde no run `31742234273`; wave 1 verde no run `31742466100`, com somente `COMUN_RODAS_VIVAS_ENABLED=enabled` e `businessWrites=0` nas duas ondas.

Estado atual:
`COMUN_48_3_B1_RODAS_VIVAS_CANONICAL_EXPERIENCE_GREEN_MODERATED_PUBLIC`.

Detalhes: `reports/current/comun-48-3-b1-rodas-vivas-canonical-experience.md`.

Preservados: `COMUN_48_3_A1_PAUTAS_VIVAS_PUBLIC_CORE_GREEN_VERSIONED_EVIDENCE`, `COMUN_48_2_F_CROSS_OBSERVATORY_CITY_PANORAMA_GREEN_PUBLIC_SAFE`, `COMUN_48_1C_MOTOROLA_PILOT_PAUSED_BY_PRODUCT_DECISION` e `launch_publicly=false`.

# Estado anterior — 48.3-B0 Comunidades e Rodas (13/08/2026)

## 48.3-B0 — Reconciliação da experiência social

- a arquitetura social foi reconciliada sem criar `Community v2`, `Circle v2`, `Thread v2`, `Feed v2`, tabela ou migration;
- `comun_communities` permanece a Comunidade canônica; `comun_pauta_spaces`, a Pauta; `comun_construction_circles`, a Roda; rounds, contribuições, sínteses, grupos e ações preservam identidades distintas;
- memberships de Comunidade, Pauta e Grupo são vínculos independentes, sem propagação automática de papéis, conteúdo ou publicação;
- `comun_circle_contributions` é canônica dentro de uma Roda; `comun_pauta_contributions` fica em compatibilidade para participação geral, sem dual-write;
- a relação Comunidade–Pauta continua limitada ao slug textual legado e a projeção pública de rodas ainda precisa filtrar estados dos filhos; ambas ficam explicitamente para B1;
- `community-experience.ts` foi classificado como narrativa de compatibilidade, não fonte canônica;
- o preflight focal run `31727259904` auditou 17 tabelas somente por metadata em transação read-only, confirmou RLS, `clientWritePaths=0`, `businessContentRead=false` e remote plan vazio;
- não houve UI, API, flag, deploy funcional, migration ou escrita de negócio.

Estado candidato, condicionado à CI e ao preflight remoto:
`COMUN_48_3_B0_COMMUNITIES_RODAS_RECONCILIATION_CONTRACT_GREEN`.

Detalhes: `reports/current/comun-48-3-b0-communities-rodas-reconciliation.md`.

Preservados: `COMUN_48_3_A1_PAUTAS_VIVAS_PUBLIC_CORE_GREEN_VERSIONED_EVIDENCE`,
`COMUN_48_2_F_CROSS_OBSERVATORY_CITY_PANORAMA_GREEN_PUBLIC_SAFE`,
`COMUN_48_1C_MOTOROLA_PILOT_PAUSED_BY_PRODUCT_DECISION` e
`launch_publicly=false`.

# Estado anterior — 48.3-A1 Pautas Vivas (13/08/2026)

## 48.3-A1 — Núcleo público + evidência pública versionada

- preflight remoto metadata-only executado antes da migration no run `31716044656`: schema canônico compatível, RLS ativo, policy pública preservada, escrita de evidence restrita a `service_role` e nenhum conteúdo de negócio lido;
- `comun_pauta_spaces` permanece a raiz única e não recebe DDL;
- uma migration aditiva promovida estende somente `comun_pauta_evidence_items` com referência, versão SHA-256 e payload público allowlisted, sem backfill;
- o resolver lê apenas DTOs públicos do Panorama e o attach server-side recebe somente `pautaId + refId`, com idempotência por versão;
- a evolução das rotas existentes está protegida por `COMUN_PAUTAS_VIVAS_CORE_ENABLED`; OFF preserva a experiência antiga;
- não existe criação pública nova, attach público, conversão de Relata, comunidade/roda nova, IA ou publicação automática;
- PR #304 mesclada por exact-head `3108288abd9f8f87e8181b18f58b77b14cabece9`, merge `39065abd4689c5cd2b1e29184cba0a5bd868e72b`;
- promoção, postflight e flags-off verdes no run `31723844180`; wave 1 verde no run `31724079385`, com `businessWrites=0`;
- `COMUN_PAUTAS_VIVAS_CORE_ENABLED=enabled` em Production; piloto Motorola, auto-publicação, mapa geral Relata, coletivos e `launch_publicly=false` permanecem inalterados.

Estado atual:
`COMUN_48_3_A1_PAUTAS_VIVAS_PUBLIC_CORE_GREEN_VERSIONED_EVIDENCE`.

Detalhes: `reports/current/comun-48-3-a1-pautas-vivas-public-core.md`.

Preservados: `COMUN_48_2_F_CROSS_OBSERVATORY_CITY_PANORAMA_GREEN_PUBLIC_SAFE`,
`COMUN_48_1C_MOTOROLA_PILOT_PAUSED_BY_PRODUCT_DECISION`, auto-publicação OFF,
mapa geral Relata OFF, coletivos OFF e `launch_publicly=false`.

# Estado anterior — 48.3-A0 Pautas Vivas (13/08/2026)

## 48.3-A0 — Reconciliação da arquitetura existente

- `comun_pauta_spaces` foi confirmado como a raiz canônica mais próxima de uma Pauta Viva; a decisão é `pauta_spaces_with_extension`, sem nova tabela neste tijolo;
- Dossiês são sínteses editoriais derivadas, com revisão factual/editorial e snapshots de publicação separados da organização normal;
- contribuições, sínteses, evidências, círculos, comunidades, tarefas, ações coletivas, action cycle, resultados e memória foram mapeados sem copiar snapshots nem criar identidade paralela;
- `PublicEvidenceReferenceV1` é compatível com a ponte futura, mas precisa fixar versão/snapshot antes de persistência durável;
- a auditoria remota do schema/RLS não foi executada porque nenhuma configuração Supabase estava disponível; não houve tentativa de conexão por fallback nem escrita remota;
- não houve UI, API, flag, migration, deploy ou escrita de negócio.

Estado atual:
`COMUN_48_3_A0_PAUTAS_VIVAS_RECONCILIATION_CONTRACT_GREEN`.

Detalhes:
`reports/current/comun-48-3-a0-pautas-vivas-reconciliation.md`.

Preservados: `COMUN_48_2_F_CROSS_OBSERVATORY_CITY_PANORAMA_GREEN_PUBLIC_SAFE`,
observatórios especializados, `COMUN_48_1C_MOTOROLA_PILOT_PAUSED_BY_PRODUCT_DECISION`,
auto-publicação OFF, mapa geral Relata OFF, coletivos OFF e `launch_publicly=false`.

# Estado anterior — 48.2-F Panorama de Volta Redonda (13/08/2026)

## 48.2-F — Síntese pública cross-observatory

- o Panorama de Volta Redonda está ativo em
  `/comun/observatorios/panorama`, protegido por flag própria e composto
  exclusivamente pelos DTOs públicos já existentes de Território, Calçadas
  P4 reviewed-only, Transporte, Qualidade dos Rios e Energia;
- não há score, ranking, mapa unificado, causalidade, correlação entre
  períodos, join por label ou leitura de qualquer dado privado; cada camada
  mostra período, geografia, proveniência e limitações próprias;
- lacunas de qualidade do ar, hidrometeorologia local, água para consumo,
  falta d'água, iluminação, Educação, transporte em tempo real e DEC/FEC
  municipal comparável permanecem explicitamente registradas;
- PR #301 foi mesclada exact-head em
  `760a176b2f20d626e93ff086790d524e763daaef`; CI, preflight remoto, Preview,
  flags-off `31664529501` e wave 1 `31664650933` ficaram verdes;
- a ativação não alterou flags das camadas especializadas, não criou migration
  nem escrita de negócio, e confirmou `businessWrites=0` e
  `externalRuntimeRequests=0`.

Estado atual:
`COMUN_48_2_F_CROSS_OBSERVATORY_CITY_PANORAMA_GREEN_PUBLIC_SAFE`.

Detalhes:
`reports/current/comun-48-2-f-city-panorama.md`.

Preservados: `PARTIAL_E1_POWER`, `PARTIAL_E_WATER_OFFICIAL_NOTICES_ONLY`,
`PARTIAL_E_LIGHTING_SERVICE_AND_PROJECTS_ONLY`,
`COMUN_48_2_D1A_BLOCKED_CURRENT_OFFICIAL_SOURCE_UNAVAILABLE`, `PARTIAL_D2A`,
`education = PARTIAL_D3B`, auto-publicação OFF, mapa geral Relata OFF,
coletivos OFF, `launch_publicly=false` e
`COMUN_48_1C_MOTOROLA_PILOT_PAUSED_BY_PRODUCT_DECISION`.

# Estado anterior — 48.2-E2 Interrupções oficiais de energia elétrica (13/08/2026)

## 48.2-E2 — Observatório de Energia, ANEEL, somente leitura

- PR funcional #298 foi mesclada exact-head em
  `4a5c5d4d776cada38e532027f531ee553dc26554`; a correção operacional #299,
  sem produto/schema/dados, foi mesclada em
  `2e391fc6d3f4ef262dad84c8b8e736ec09bfd9b9`;
- a superfície pública está ativa em
  `/comun/observatorios/servicos-essenciais/energia`, com página de fontes,
  resumo oficial e API somente `GET`/`HEAD`; writes retornam `405`;
- o snapshot ANEEL versionado contém 5.676 registros publicados de interrupção
  para Volta Redonda nas competências `2026-01`, `2026-03` a `2026-06`; não
  é ano completo, tempo real, contagem de apagões únicos ou de pessoas;
- registros são paginados e bounded; não há mapa, geocoding, bairro, setor
  censitário, Relata, Carteira, localização privada, anexo, identidade ou
  encaminhamento;
- DEC/FEC continuam fora da superfície porque não há agregado municipal
  comparável; causa e campos técnicos preservam a semântica da fonte sem
  atribuição pelo COMUN;
- flags-off `31660990853` e wave 1 `31661122386` foram verdes com zero
  migration, zero business write e zero request runtime à ANEEL.

Estado atual:
`COMUN_48_2_E2_ESSENTIAL_POWER_INTERRUPTION_OBSERVATORY_GREEN_OFFICIAL_ONLY`.

Detalhes:
`reports/current/comun-48-2-e2-power-interruption-observatory.md`.

Preservados: `PARTIAL_E1_POWER`, auto-publicação OFF, mapa geral Relata OFF,
coletivos OFF, `launch_publicly=false` e
`COMUN_48_1C_MOTOROLA_PILOT_PAUSED_BY_PRODUCT_DECISION`.

# Estado anterior — 48.2-D4B Qualidade dos rios: superfície oficial (12/08/2026)

## 48.2-D4B — Observatório Ambiental, referência 2025

- a superfície pública é fail-closed e deriva apenas do snapshot INEA RH III
  de 2025, sem fetch externo em runtime;
- mostra os pontos `PS0419` e `PS0421`, 24 coletas, 240 medições e IQA
  publicado separado, sem mapa ou coordenada inventada;
- não infere potabilidade, conformidade legal, poluidor, qualidade atual ou
  água distribuída para consumo;
- `drinking_water_quality` permanece `PARTIAL_D4`; D1, D2A, Educação e o
  piloto humano preservam seus estados anteriores.

Resultado esperado:
`COMUN_48_2_D4B_SURFACE_WATER_OBSERVATORY_GREEN_OFFICIAL_2025`.

Detalhes:
`reports/current/comun-48-2-d4b-surface-water-observatory.md`.

# Estado anterior — 48.2-D4B0 Qualidade dos rios: dados brutos RH III (12/08/2026)

## 48.2-D4B0 — Snapshot INEA 2025, sem superfície pública

- o primeiro snapshot de `surface_water_quality` usa exclusivamente o PDF
  oficial “Dados Brutos RH III — Consolidado 2025”, com hash, parser
  versionado, pointer ativo e sem consulta externa durante runtime;
- `PS0419` e `PS0421`, ambos no Rio Paraíba do Sul em Volta Redonda, foram
  identificados pela fonte. As 24 coletas mensais originam 240 medições de dez
  parâmetros, e o IQA NSF oficial ficou separado em 24 índices;
- qualificadores como `<` e `>` foram preservados; coordenadas não publicadas
  seguem nulas, sem geocoding. O PDF de 2024 confirmou os mesmos pontos e
  schema, com drift apenas de largura/posição de tabela;
- o snapshot de 2025 não é estado atual, tempo real, potabilidade ou decisão
  de conformidade legal. `drinking_water_quality` permanece `PARTIAL_D4` e
  Sisagua não foi tocado;
- não houve UI, rota, API, flag, migration, deploy, runtime externo ou escrita
  Production. Os estados D1, D2A, D3A, D3C, Educação e piloto humano continuam
  preservados.

Resultado terminal:
`COMUN_48_2_D4B0_SURFACE_WATER_RAW_SOURCE_SNAPSHOT_GREEN`.

Detalhes:
`reports/current/comun-48-2-d4b0-surface-water-raw-source-snapshot.md`.

# Estado anterior — 48.2-D4A Água: contrato público de dados (12/08/2026)

## 48.2-D4A — Qualidade de rios ≠ água para consumo humano

- `surface_water_quality` e `drinking_water_quality` agora possuem
  descriptors, manifests candidatos, hashes e proveniência próprios; não há
  tipo de dataset genérico que permita misturar as duas semânticas;
- INEA/RH III confirmou no boletim de 2023 o ponto `PS0419` do Rio Paraíba do
  Sul em Volta Redonda e IQA/IQANSF oficiais, porém sem inventário local
  completo, coordenadas ou dados brutos normalizados: `PARTIAL_D4`;
- Sisagua confirmou catálogos abertos separados para Controle, Vigilância e
  Captação, mas nenhum sistema SAAE-VR foi identificado por ID oficial nem
  foram importados resultados: `PARTIAL_D4`;
- nenhum índice próprio, potabilidade, conformidade legal, coleta residencial,
  Relata, carteira, localização privada ou runtime externo foi criado;
- não houve UI, rota, API, flag, migration, deploy ou escrita Production. Os
  estados D1, D2A, D3A, D3C, Educação e piloto humano permanecem preservados,
  incluindo `COMUN_48_2_D3C_TERRITORIAL_CONTEXT_GREEN_OFFICIAL_PUBLIC_ONLY`.

Resultado terminal:
`COMUN_48_2_D4A_WATER_DATA_CONTRACT_GREEN_DOMAINS_SEPARATED`.

Detalhes: `reports/current/comun-48-2-d4a-water-data-audit.md`.

# Estado anterior — 48.2-D3B2 Equipamentos públicos de Assistência Social (12/08/2026)

## 48.2-D3B2 — Snapshot oficial CadSUAS + SMAS, sem geocoding

- fotografia ativa com 16 unidades municipais de Assistência Social: 15 CRAS e
  1 CREAS, cada uma com identidade CadSUAS estável e presença corroborada por
  fonte municipal atual;
- somente `public_municipal` e `active_reported` entram; 73 dos 89 registros
  CadSUAS permanecem excluídos por falta de prova suficiente;
- todos os registros são `address_only`: não há coordenada, geocoding ou
  vínculo a setor censitário;
- um conflito oficial de endereço do Centro POP foi mantido fora da fotografia,
  sem escolha silenciosa;
- sem UI, API, flag, migration, deploy, dado privado, runtime externo ou
  escrita Production; Educação segue `PARTIAL_D3B`;
- D1/D2A, a exposição ambiental deferida e o piloto humano permanecem nos
  estados anteriores.

Resultado terminal:
`COMUN_48_2_D3B2_PUBLIC_SOCIAL_ASSISTANCE_EQUIPMENT_SNAPSHOT_GREEN_OFFICIAL_ONLY`.

Detalhes: `reports/current/comun-48-2-d3b2-public-social-assistance-equipment-snapshot.md`.

# Estado anterior — 48.2-D3B1 Equipamentos públicos de Saúde (11/08/2026)

## 48.2-D3B1 — Snapshot CNES oficial com vínculo seguro aos setores

- o recorte oficial CNES usa UF `33`, município `330630`, status ativo e a
  allowlist jurídica D3B0 (`1023`, `1031`, `1120`), sem inferir propriedade por
  nome, esfera administrativa ou relação SUS;
- entre 1.103 registros ativos municipais, 102 são equipamentos públicos pela
  allowlist e 1.001 naturezas privadas/fora do contrato foram rejeitadas;
- os 102 registros possuem coordenadas oficiais CNES: 97 foram ligados de
  forma única aos 739 setores D3A, 1 permaneceu ambíguo na borda e 4 ficaram
  `outside_or_geometry_gap`, sem correção ou geocoding;
- identidade CNES, tipos oficiais e definições jurídicas estão versionados;
  telefone, e-mail, CNPJ, profissionais e outros campos desnecessários foram
  excluídos pelo contrato de minimização;
- o runtime permanece offline das fontes; não houve migration, UI, API, flag,
  deploy, dado privado ou escrita Production;
- `READY_D3C_HEALTH` foi atingido; Educação e Assistência continuam
  `PARTIAL_D3B` e não foram alteradas;
- exposição ambiental segue deferida; D1/D2A e o piloto humano preservam seus
  estados anteriores.

Resultado terminal:
`COMUN_48_2_D3B1_PUBLIC_HEALTH_EQUIPMENT_SNAPSHOT_GREEN_OFFICIAL_ONLY`.

Próxima decisão: resolver Educação ou Assistência antes de uma superfície
territorial integrada, sem iniciá-las automaticamente.

Detalhes:
`reports/current/comun-48-2-d3b1-public-health-equipment-snapshot.md`.

# Estado anterior — 48.2-D3B0 Contrato de equipamentos públicos (11/08/2026)

## 48.2-D3B0 — Saúde pronta; Educação e Assistência parciais

- fontes oficiais de Saúde, Educação e Assistência Social foram auditadas sem
  ler dados privados e sem consulta runtime futura;
- Saúde ficou `READY_D3B1`: CNES fornece identidade, natureza jurídica, tipos,
  endereço, status e coordenadas oficiais; a seleção pública usa allowlist
  jurídica explícita e não infere propriedade por esfera ou relação SUS;
- Educação ficou `PARTIAL_D3B`: INEP fornece ID, dependência e situação, mas os
  campos territoriais foram removidos do microdado 2025; o catálogo SME exige
  reconciliação e possui conflito de 105 páginas versus 101 unidades reportadas;
- Assistência ficou `PARTIAL_D3B`: CadSUAS fornece identidade e endereço
  públicos, sem coordenadas; gestão e situação precisam de revisão por tipo;
- `official_public_point`, `address_only` e `derived_geocoded_point` foram
  separados; o último está proibido no D3B0 e setor só pode ser atribuído a
  ponto oficial por point-in-polygon determinístico;
- não houve snapshot ativo, UI, API, flag, migration, deploy, geocoding ou
  escrita Production; exposição ambiental continua explicitamente deferida;
- D1/D2A e o piloto humano permanecem nos estados anteriores, sem regressão.

Resultado terminal:
`COMUN_48_2_D3B0_PUBLIC_EQUIPMENT_DATA_CONTRACT_GREEN`.

Próximo passo autorizado: `48.2-D3B1 — Saúde`, primeiro domínio classificado
`READY_D3B1`.

Detalhes: `reports/current/comun-48-2-d3b0-public-equipment-data-audit.md`.

# Estado anterior — 48.2-D3A Base Territorial Pública Censo 2022 (11/08/2026)

## 48.2-D3A — Geografia e agregados oficiais, sem exposição ambiental

- a malha definitiva do Censo 2022 foi capturada exclusivamente de fontes
  oficiais IBGE, recortada pelo código municipal `3306305` e versionada com
  hashes de fonte e de geometria;
- o snapshot contém 739 setores únicos de Volta Redonda, todos com geometria
  poligonal oficial normalizada sem simplificação, fusão ou eliminação;
- somente `V0001` (261.563 pessoas) e `V0002` (115.652 domicílios) entram no
  contrato; as somas setoriais coincidem com os agregados municipais do mesmo
  universo e valores ausentes continuam `null`;
- setor censitário não foi rebatizado como bairro; renda, raça/cor, idade,
  deficiência, saneamento, densidade, índice social e equipamentos públicos
  permanecem fora do snapshot;
- nenhum índice de exposição, risco, vulnerabilidade ou impacto ambiental foi
  calculado; `COMUN_48_2_D3A_ENVIRONMENTAL_EXPOSURE_DEFERRED_NO_CURRENT_ENVIRONMENTAL_LAYER`
  permanece como adiamento explícito;
- não houve UI, rota, API, flag, migration, deploy, consulta runtime ao IBGE,
  dado privado ou escrita Production;
- D1 permanece `PARTIAL_D1` e bloqueado; D2A permanece `PARTIAL_D2A`, sem
  estação operacional em Volta Redonda; o piloto humano continua pausado por
  decisão de produto.

Resultado terminal:
`COMUN_48_2_D3A_TERRITORIAL_PUBLIC_BASE_GREEN_IBGE_AGGREGATED_ONLY`.

Próximo passo autorizado: `48.2-D3B — Equipamentos e serviços públicos no
território`.

Detalhes: `reports/current/comun-48-2-d3a-territorial-public-base.md`.

# Estado atual — 48.2-D2A inventário hidrometeorológico oficial parcial (11/08/2026)

## 48.2-D2A — Hidrometeorologia oficial sem UI

- o XLSX operacional publicado pelo INEA está acessível e foi normalizado com
  hash e proveniência: possui 108 registros, cinco estações `Plu/Flu` na RH
  III - Médio Paraíba do Sul e nenhuma em Volta Redonda;
- chuva e nível estão vinculados às estações do inventário, mas não há valores,
  unidades, horários ou freshness atuais verificáveis por contrato público
  estável; o mapa dinâmico não foi submetido a engenharia reversa;
- o repositório ganhou um snapshot versionado somente do inventário e testes de
  allowlist, identidade, coordenadas, ausência, atraso, drift, firewall e rede
  runtime; não existe active snapshot de medições;
- decisão `PARTIAL_D2A`; não houve UI, rota, API, flag, migration, deploy,
  leitura privada ou escrita Production;
- D1 permanece `PARTIAL_D1` com
  `COMUN_48_2_D1A_BLOCKED_CURRENT_OFFICIAL_SOURCE_UNAVAILABLE`, e o piloto
  continua `COMUN_48_1C_MOTOROLA_PILOT_PAUSED_BY_PRODUCT_DECISION`.

Resultado atual:
`COMUN_48_2_D2A_NO_OPERATIONAL_STATION_IN_VOLTA_REDONDA`.

Detalhes: `reports/current/comun-48-2-d2a-hydrometeorology-source-snapshot.md`.

# Estado anterior — 48.2-D1A aguardando fonte oficial atual de qualidade do ar (11/08/2026)

## 48.2-D1A — Captura oficial de qualidade do ar

- a auditoria controlada confirmou que o portal SIGQAr está acessível, mas sua
  página pública é dinâmica e não contém inventário atual verificável de
  estações de Volta Redonda;
- a página pública IQAr do INEA permanece acessível e sustenta a metodologia,
  mas o boletim diário que ela incorpora retorna HTTP 404;
- não foram criados snapshot, rota, UI, API, flag, migration, importação,
  deploy ou escrita de negócio; dados históricos não foram usados como estado
  atual e Relata privado permanece fora do escopo;
- D1 continua `PARTIAL_D1` e aguarda fonte pública atual estável; o bloqueio
  preserva `COMUN_48_2_C3_REALTIME_DEFERRED_NO_PUBLIC_API_CONTRACT` e
  `COMUN_48_1C_MOTOROLA_PILOT_PAUSED_BY_PRODUCT_DECISION`.

Resultado atual:
`COMUN_48_2_D1A_BLOCKED_CURRENT_OFFICIAL_SOURCE_UNAVAILABLE`.

Detalhes: `reports/current/comun-48-2-d1a-air-quality-source-snapshot.md`.

# Estado anterior — 48.2-D0 Contrato público de dados ambientais (11/08/2026)

## 48.2-D0 — Auditoria para o futuro Observatório Ambiental

- auditoria documental concluída sem rota, flag, migration, adapter, snapshot
  de produto, importação, deploy ou escrita de negócio;
- não há dataset ambiental canônico pronto no workspace; categorias de Relata,
  localização, anexos, Carteira, encaminhamento e agregados privados seguem
  excluídos pelo firewall;
- fontes oficiais foram classificadas sem rebatizar o produto: INEA/SIGQAr e
  IQAr, INEA hidrometeorológico, INMET, IBGE e ANA possuem uso futuro
  condicionado a snapshot versionado e revisão; Dados Abertos RJ e Prefeitura
  ainda exigem revalidação de dataset aderente;
- D1 qualidade do ar está `PARTIAL_D1`; D2 meteorologia e D3 exposição
  territorial estão parciais: há fontes públicas, mas faltam fotografia,
  cobertura, estação ou contrato de cruzamento explicitamente revisados; D4
  água permanece `USE_LATER`;
- runtime futuro permanece offline das fontes e não haverá atualização ou
  publicação automática; `COMUN_48_2_C3_REALTIME_DEFERRED_NO_PUBLIC_API_CONTRACT`
  e `COMUN_48_1C_MOTOROLA_PILOT_PAUSED_BY_PRODUCT_DECISION` permanecem.

Resultado terminal:
`COMUN_48_2_D0_ENVIRONMENTAL_DATA_CONTRACT_GREEN`.

Detalhes: `reports/current/comun-48-2-d0-environmental-data-audit.md`.

# Estado anterior — 48.2-C2 Sistema em números do Transporte em Production (11/08/2026)

## 48.2-C2 — Indicadores oficiais periódicos do sistema de transporte

- PR funcional #279 foi mesclada exact-head em
  `b0485702c1c1ff241d3e25aa4955312e9a0caa57`, sem migration;
- a seção “O sistema em números” usa somente o snapshot versionado
  `comun-transport-system-metrics-v1-20260811`, derivado do estudo tarifário
  oficial da STMU e do Decreto Municipal nº 19.858/2026;
- demanda, quilometragem, frota, IPK, parâmetros de custo e tarifa técnica
  têm proveniência por métrica; tarifa pública é separada e não há cálculo de
  subsídio;
- fonte oficial periódica não é monitoramento em tempo real: GPS, Cittamobi,
  VRBus, scraping runtime, Relata/P5 privado, Carteira, sessões, localização,
  anexos e dado comunitário estão excluídos;
- PMM permanece adiado por ambiguidade de unidade e não há tendência com um
  único snapshot comparável;
- flags-off `31532627378` preservou C1 com C2 ausente; wave 1
  `31532943667` ativou apenas
  `COMUN_OBSERVATORY_TRANSPORT_SYSTEM_METRICS_ENABLED`, com página/API 200,
  `POST` 405 e invariantes públicos confirmados;
- os dois runs foram read-only sobre dados de negócio: zero relato, Carteira,
  snapshot, package, attempt, coletivo, request externo runtime ou hard
  delete; auto-publicação OFF, mapa geral Relata OFF, coletivos OFF e
  `launch_publicly=false`;
- `COMUN_48_1C_MOTOROLA_PILOT_PAUSED_BY_PRODUCT_DECISION` permanece.

Resultado terminal:
`COMUN_48_2_C2_TRANSPORT_SYSTEM_INDICATORS_GREEN_OFFICIAL_ONLY`.

Detalhes: `reports/current/comun-48-2-c2-transport-system-indicators.md`.

# Estado anterior — 48.2-C1-R1 Reconciliação do catálogo PMVR em Production (11/08/2026)

## 48.2-C1-R1 — Drift de fonte reconciliado

- PR #277 foi mesclada exact-head em
  `1ef309a3fe89cd2fc7381ee66d8ca026cacc096c`, sem migration;
- o drift bruto do catálogo PMVR/STMU foi comparado semanticamente: 48 linhas
  permanecem iguais, sem adições, remoções, troca de operadora ou label;
- o snapshot ativo passou a ser
  `comun-transport-programmed-network-v2-20260811`, preservando v1 como
  predecessor e registrando URLs por linha para revisões futuras;
- `COMUN_48_2_C1_CATALOG_RENDERING_DRIFT_SEMANTICS_CURRENT` e
  `COMUN_48_2_C1_OFFICIAL_SOURCES_CURRENT` foram comprovados sem atualização
  automática; o runtime continua sem acesso à PMVR;
- deploy/onda C1 `31525123463` e smoke Production read-only verdes: hub,
  transporte, fontes e APIs `200`, `POST` `405`, snapshot v2 com 48 linhas e
  linha 210 preservando `+1` dia;
- zero business write, publicação, snapshot, coletivo, package, attempt,
  request externo ou hard delete; `COMUN_48_1C_MOTOROLA_PILOT_PAUSED_BY_PRODUCT_DECISION`
  permanece.

Resultado terminal:
`COMUN_48_2_C1_R1_TRANSPORT_SOURCE_DRIFT_RECONCILED_GREEN`.

Detalhes: `reports/current/comun-48-2-c1-r1-source-drift.md`.

# Estado anterior — 48.2-C1 Rede programada oficial de transporte em Production (11/08/2026)

## 48.2-C1 — Observatório do Transporte (rede programada oficial)

- PR #275 foi mesclada exact-head em
  `2a4332f3c715768bc78b7e61fb103a3017c9f47c`, sem migration;
- a rede pública é um snapshot versionado de 48 linhas e cinco artefatos
  oficiais PMVR/STMU; não é feed em tempo real nem experiência comunitária;
- flags-off `31514616408` preservou o cloak C1; a wave 1 `31514842414` ativou
  apenas `COMUN_OBSERVATORY_TRANSPORT_PROGRAMMED_ENABLED`;
- hub, página de transporte, fontes e APIs públicas respondem `200`; métodos
  mutáveis continuam `405`; a linha 210 preserva `00:20 +1` e declara grade
  parcial sem completar dados por inferência;
- Relata/P5/STMU, Carteira, localização, anexos, encaminhamentos, GPS, paradas
  e tempo real não entram na UI, API ou cache públicos;
- a mudança posterior no catálogo oficial foi detectada sem atualização
  automática: `COMUN_48_2_C1_OFFICIAL_SOURCE_DRIFT_DETECTED` exige ciclo de
  revisão separado;
- não houve escrita de negócio, envio externo, publicação, snapshot, coletivo
  ou hard delete; auto-publicação OFF, mapa geral Relata OFF, coletivos OFF e
  `launch_publicly=false`;
- `COMUN_48_1C_MOTOROLA_PILOT_PAUSED_BY_PRODUCT_DECISION` permanece.

Resultado terminal:
`COMUN_48_2_C1_TRANSPORT_PROGRAMMED_NETWORK_GREEN_OFFICIAL_ONLY`.

Detalhes: `reports/current/comun-48-2-c1-transport-programmed-network.md`.

# Estado anterior — 48.2-C0 Auditoria de dados do transporte concluída (11/08/2026)

## 48.2-C0 — Auditoria de dados do transporte (sem implementação pública)

- baseline remoto confirmado em `457bfc3bc2b81e356e3a610166cd532d1ba38ad9`;
- catálogo municipal de linhas, PDFs oficiais de horários/itinerários, estudo
  tarifário de 2026, Decreto 19.858/2026 e Tarifa Zero foram revalidados em
  fontes oficiais PMVR/STMU;
- a fundação 48.0E permanece `historical_local_private`, com migration
  local-only em quarentena e promoção proibida; P5/STMU, Relata de transporte,
  Carteira, forwarding e sessões de espera permanecem `private_operational` e
  excluídos de qualquer Observatório;
- nenhum contrato público de API/GTFS/GTFS-Realtime foi encontrado:
  `COMUN_48_2_C0_REALTIME_DEFERRED_NO_PUBLIC_API_CONTRACT`;
- nenhum dataset geográfico público oficial de pontos com identificador,
  coordenadas e linhas atendidas foi encontrado:
  `COMUN_48_2_C0_PUBLIC_STOPS_DATASET_NOT_FOUND`;
- não há relatório periódico público reutilizável de STMU localizado para
  2024/2025; a fonte de acessibilidade de 2026 é narrativa/amostral e não
  serve como série de desempenho;
- C1 está limitado à rede programada oriunda de artefatos oficiais versionados;
  C2 tratará números oficiais com metodologia; C3 depende de API/GTFS
  documentado; C4, se existir, será agregado e posterior;
- zero migration, rota, flag, importação, escrita Production, publicação,
  coleta de observações, request externo operacional ou mudança de P5/48.0E;
- `COMUN_48_1C_MOTOROLA_PILOT_PAUSED_BY_PRODUCT_DECISION` permanece
  preservado.

Resultado terminal:
`COMUN_48_2_C0_TRANSPORT_DATA_CONTRACT_GREEN`.

Detalhes: `reports/current/comun-48-2-c0-transport-data-audit.md`.

# Estado anterior — 48.2-B Observatório de Calçadas em Production (11/08/2026)

## 48.2-B — Observatório de Calçadas (promovido)

- PR #270 mesclada exact-head em `76712a1cafaa275b1a0442119cba074d0b7ca659`;
- analytics de Calçadas deriva somente a projeção pública P4 reviewed-only,
  com paginação bounded, condição, problemas allowlisted, recência por
  `last_observed_at`, mapa aproximado, lista equivalente e metodologia
  explícita de não-censo;
- nenhum dado de Relata privado, Wallet, foto, localização exata, Saúde,
  Educação, Proteção ou forwarding entra no observatório;
- flags-off `31498463736` preservou 48.2-A e cloak da rota dedicada; a wave 1
  inicial encontrou corretamente uma projeção pública vazia;
- correção #271 mesclada em `159cb38360eba186fd154f47cbfd8ca377d26258` passou
  a validar o empty state sem fixture; replay read-only `31505161183` verde;
- página e APIs dedicadas respondem `200`; zero business write, envio externo,
  publicação automática, snapshot, coletivo ou hard delete;
- `COMUN_48_2_B_TIME_SERIES_DEFERRED_NO_PUBLIC_HISTORY` e
  `COMUN_48_2_B_NEIGHBORHOOD_ANALYTICS_DEFERRED_NO_PUBLIC_BOUNDARY_MODEL`
  permanecem débitos explícitos, não blockers;
- `COMUN_48_1C_MOTOROLA_PILOT_PAUSED_BY_PRODUCT_DECISION` permanece
  preservado; auto-publicação OFF, mapa geral Relata OFF, coletivos OFF e
  `launch_publicly=false`.

Resultado terminal:
`COMUN_48_2_B_SIDEWALK_OBSERVATORY_GREEN_REVIEWED_ONLY`.

Detalhes: `reports/current/comun-48-2-b-sidewalk-observatory.md`.

# Estado anterior — 48.2-A Observatórios em Production (11/08/2026)

## 48.2-A — Fundação dos Observatórios (promovida)

- PR funcional #266 mesclada exact-head em
  `17047c8464e89c5f09ba8f96902d1e30428ecac6`; o preflight remoto read-only
  `31454677904` comprovou `COMUN_48_2_A_REMOTE_PLAN_EMPTY_GREEN`;
- zero migration, sem alteração de schema, e a exceção histórica de Calçadas
  continua reconciliada apenas pelo ledger externo;
- a primeira automação de ativação (#267) falhou no primeiro `env add`, antes
  de deploy ou onda, sem evidência de ativação parcial;
- PR operacional R1 #268 mesclada exact-head em
  `8346947eafc5abf70ee342604acef2ec4fda51ee`: restaurou o binding explícito
  do projeto Vercel, preflight read-only, diagnóstico sanitizado e rollback
  para as duas flags; nenhum segredo ou valor de ambiente foi registrado;
- flags-off `31457723317`, wave 1 `31457865057` e wave 2
  `31457990389` concluíram verdes, todos com smoke anônimo e sem escrita de
  negócio;
- `/comun/observatorios`, registry e adapter de Calçadas estão ativos;
  Calçadas lê somente a projeção pública P4 reviewed-only, com proveniência,
  freshness e metodologia; Transporte, Ambiente e Água e serviços seguem “Em
  preparação”;
- Saúde, Educação, Proteção de crianças, Relata privado, Carteira, localização
  privada, fotos, identidade e forwarding estão excluídos de API, contagem,
  cards e cache público;
- `COMUN_OBSERVATORIES_FOUNDATION_ENABLED=enabled` e
  `COMUN_OBSERVATORY_SIDEWALK_ADAPTER_ENABLED=enabled`;
- zero fixtures, reports, Carteiras, records, snapshots, packages, attempts,
  coletivos, requests externos e hard deletes; auto-publicação OFF, mapa geral
  Relata OFF, coletivos OFF e `launch_publicly=false`.

Resultado terminal:
`COMUN_48_2_A_OBSERVATORY_FOUNDATION_PUBLIC_FIREWALL_GREEN`.

Detalhes: `reports/current/comun-48-2-a-observatory-foundation.md`.

## 48.1B-P6C-C — encaminhamento assistido sensível

- 48.1C permanece não concluído e pausado por decisão de produto:
  `COMUN_48_1C_MOTOROLA_PILOT_PAUSED_BY_PRODUCT_DECISION`;
- PR funcional `#264`, head exato
  `eded4abb47af433c9a1c7b7a05d0b22310a81b74`, mesclada no merge
  `0b4e17dadf7ca3cd010e73da21191456c16f9b58`;
- Saúde e Educação usam disclosure mínimo explícito; nenhum campo opcional vem
  selecionado e o relato original nunca preenche a mensagem institucional;
- Proteção de criança ou adolescente opera somente em channel-only, sem texto,
  resumo, subtipo, escola, foto, localização ou identidade no package;
- preview obrigatório distingue exatamente o que será e não será
  compartilhado; autorização curta e assinada fica vinculada à Carteira, item,
  categoria e disclosure normalizado;
- valores não selecionados são descartados antes da assinatura e persistência;
- opening por gesto é `prepared`; somente “Sim, enviei” declara envio;
- protocolo oficial e retorno são manuais; Saúde/Educação aceitam nota curta e
  Proteção aceita somente estados allowlisted, sem nota livre;
- `due_at=NULL` para `sensitive_service`; 72h continua exclusiva de STMU;
- exatamente uma migration forward-only, SHA-256
  `483cac71e342a69f906dc702ae7e7e75efe23dc214d0dc3236b465d68b943c2d`;
- preflight metadata-only `31435526208` e E2E descartável `31436411640`
  verdes, com no-leak de texto, foto, GPS, identidade e dado não selecionado;
- 222 check-runs concluídos no head final, zero falha/pendência, Preview verde
  e zero review thread;
- promoção flags-OFF `31438994969`: plano remoto exato de uma migration,
  postflight de schema/RLS/grants e cinco rotas `200`;
- wave 1 `31439260082`: Saúde + Educação ON, prepared-only e cleanup exato;
- wave 2 `31439448933`: Proteção channel-only ON, prepared-only e cleanup
  exato;
- todas as fixtures sintéticas terminaram com zero report, case, Carteira,
  package, attempt, snapshot ou coletivo ativo, zero request externo e zero
  hard delete;
- fontes municipais conflitantes de Saúde e Conselho Tutelar falham fechadas;
  demais canais ativos estão `source_verified`, todos
  `operationally_unchecked` e sem automação;
- `COMUN_SENSITIVE_FORWARDING_ASSISTED_ENABLED=enabled`;
- `COMUN_CHILD_PROTECTION_CHANNEL_ONLY_ENABLED=enabled`;
- forwarding ambiental/urbano, auto-send, publicação automática, mapa público
  geral e coletivos permanecem OFF; `launch_publicly=false`.

Resultado terminal:
`COMUN_48_1B_P6C_C_SENSITIVE_ASSISTED_FORWARDING_DOMAIN_GREEN_NO_AUTO_SEND`.

Detalhes:
`reports/current/comun-48-1b-p6c-c-sensitive-assisted-forwarding.md`.

## 48.1B-P6C-B2 — proteção privada de crianças e adolescentes

- 48.1C permanece não concluído e pausado por decisão de produto:
  `COMUN_48_1C_MOTOROLA_PILOT_PAUSED_BY_PRODUCT_DECISION`;
- PR funcional `#262`, head exato
  `0527f9a1281a765afb00c49bfeb6355dc9ed5166`, mesclada no merge
  `7fc5de4ea36fcd212a95b3ee2b236e66488b2655`;
- `/comun/relatar` segue como entrada única; nenhum miniapp de proteção foi
  criado;
- categoria `child_protection` e roteador
  `comun-child-protection-routing-v1` separam proteção de Educação
  administrativa e Trabalho;
- todo caso é `high_risk`, exige revisão humana e tem publicação
  `never_automatic`;
- Carteira sanitizada não mostra subtipo, texto, escola, criança, foto,
  localização, documento ou detalhe do risco;
- foto-only permanece `original_text=NULL` e `category=other`;
- uma migration forward-only, SHA-256
  `92fb622d38ddf259d91529aecd52f07e52d34132b5ae7601c4799feaede7282b`;
- dry-run remoto exato `31415876505` e E2E descartável `31415876592` verdes;
- 38 checks verdes no head final, Vercel Preview verde, zero review thread;
- run flags-OFF `31419481470`: migration, postflight de RLS/grants e deploy
  verdes, sem leitura de negócio;
- onda privada `31419755484`: routing de proteção ON e forwarding sensível
  OFF;
- deployment final READY `dpl_8rfmUtHn9q39fzJneSf31JGrdRAe` promovido ao
  domínio canônico;
- cinco rotas canônicas `200`; cleanup Production com zero fixture ativa,
  package, attempt, snapshot, coletivo, request/envio externo ou hard delete;
- Conselho Tutelar ficou `source_conflict` por fontes municipais divergentes;
  demais fontes são `source_verified`, todas `operationally_unchecked` e sem
  automação;
- acesso canônico high-risk permanece service-role-only; nenhuma superfície
  pública, editorial genérica, comunitária ou de moderador comum ganhou acesso;
- auto-send, forwarding sensível, publicação automática, mapa público geral,
  coletivos e `launch_publicly` permanecem desligados;
- no fechamento histórico de B2, P6C-C ainda não havia sido iniciado; o estado
  atual concluído está registrado na seção anterior.

Resultado terminal:
`COMUN_48_1B_P6C_B2_CHILD_PROTECTION_PRIVATE_DOMAIN_GREEN_FORWARDING_OFF`.

Detalhes:
`reports/current/comun-48-1b-p6c-b2-child-protection-private.md`.

## 48.1B-P6C-B1 — Educação pública privada e segura

- 48.1C permanece não concluído e pausado por decisão de produto:
  `COMUN_48_1C_MOTOROLA_PILOT_PAUSED_BY_PRODUCT_DECISION`;
- PR funcional `#260`, head exato
  `f3dc4aad41f9ff5c737671b25fab67579b0fa047`, mesclada no merge
  `111e0f1d09b6cf26ab07ebcaf6375d1c70adee2e`;
- `/comun/relatar` segue como entrada única; nenhum miniapp de Educação foi
  criado;
- roteador `comun-education-service-routing-v1` reconhece problemas do serviço
  e subtipos privados, separando Educação de Trabalho e transporte coletivo;
- todo `public_education` é no mínimo `restricted`, exige revisão humana e tem
  publicação `never`; sinais individualizáveis elevam para `sensitive` ou
  `high_risk`;
- `childSafetySignal` separa proteção infantil da reclamação administrativa,
  sem categoria silenciosa ou acionamento automático;
- foto-only permanece `original_text=NULL` e `category=other`;
- exatamente uma migration forward-only, SHA-256
  `10e629df1e7d31806588e44d6276d70b35e2b2f843467cae4f8d699cfa238dfe`;
- run flags-OFF `31409363505`: plano remoto exato, migration, postflight de
  RLS/grants e deploy verdes, sem leitura de negócio;
- onda privada `31409690559`: routing educacional ON e forwarding sensível OFF;
- 31 checks verdes no head final; E2E descartável
  `COMUN_P6C_B1_PUBLIC_EDUCATION_PRIVATE_DISPOSABLE_E2E_GREEN`;
- cinco rotas canônicas `200`; cleanup Production com zero fixture ativa,
  package, attempt, snapshot, coletivo, request/envio externo ou hard delete;
- catálogo oficial server-side, sem automação; fontes `source_verified` e
  canais `operationally_unchecked`;
- `COMUN_P6C_B1_CHILD_PROTECTION_ROUTING_DEFERRED_TO_B2`;
- auto-send, forwarding sensível, publicação automática, mapa público geral,
  coletivos e `launch_publicly` permanecem desligados.

Resultado terminal:
`COMUN_48_1B_P6C_B1_PUBLIC_EDUCATION_PRIVATE_DOMAIN_GREEN_FORWARDING_OFF`.

Detalhes:
`reports/current/comun-48-1b-p6c-b1-public-education-private.md`.

## 48.1B-P6C-A — SUS privado e seguro

- 48.1C permanece não concluído e pausado por decisão de produto:
  `COMUN_48_1C_MOTOROLA_PILOT_PAUSED_BY_PRODUCT_DECISION`;
- PR funcional `#258`, head exato
  `3737f217171c2003147f3ee4a9b81f16d6ce8aa3`, mesclada no merge
  `5f016adfd12d08e7a2f89f515b64387be5a80f86`;
- `/comun/relatar` segue como entrada única; nenhum miniapp SUS foi criado;
- roteador `comun-health-service-routing-v1` reconhece problemas do serviço e
  subtipos privados, sem diagnosticar pessoa ou condição clínica;
- todo `public_health` é `sensitive` ou `high_risk`, com publicação `never`;
- foto-only permanece `original_text=NULL` e `category=other`;
- o drift estrutural do RPC foi comprovado no E2E e corrigido após autorização
  explícita com exatamente uma migration forward-only, SHA-256
  `6bcf50652b436a66ce110ef90a66e09249663c35055514d6e506f88054938d4f`;
- run flags-OFF `31401299502`: plano remoto exato, migration, postflight de
  RLS/grants e deploy verdes, sem leitura de negócio;
- onda 1 `31401563130`: routing privado ON e forwarding sensível OFF;
- 179 check-runs concluídos no head final, sem falha ou pendência; E2E
  descartável `COMUN_P6C_A_SUS_PRIVATE_DISPOSABLE_E2E_GREEN`;
- cinco rotas canônicas `200`; cleanup Production com zero fixture ativa,
  package, attempt, snapshot, coletivo, request/envio externo ou hard delete;
- catálogo oficial server-side, sem automação; conflito municipal 302/572
  registrado, demais fontes `source_verified` e todos os canais
  `operationally_unchecked`;
- auto-send, forwarding sensível, publicação automática, mapa público geral,
  coletivos e `launch_publicly` permanecem desligados.

Resultado terminal:
`COMUN_48_1B_P6C_A_SUS_PRIVATE_DOMAIN_GREEN_FORWARDING_OFF`.

Detalhes: `reports/current/comun-48-1b-p6c-a-sus-private.md`.

## 48.1B-P6B-B — alagamento, drenagem e risco de árvores

- 48.1C permanece não concluído e pausado por decisão de produto:
  `COMUN_48_1C_MOTOROLA_PILOT_PAUSED_BY_PRODUCT_DECISION`;
- PR funcional `#255`, head exato
  `2b82156020ad7d8e958aa61a536fa444b2c70883`, mesclada no merge
  `29bf5fbac1ad8abc538d4d220ead2a932cf25ef4`;
- hotfix de postflight `#256`, sem DDL, mesclado no merge
  `baa5b3139f79f910492aab161fe6a11c9aeb27cd`;
- `/comun/relatar` segue como entrada única; nenhum miniapp de alagamento,
  drenagem ou árvores foi criado;
- routing V3 reconhece alagamento/enchente, drenagem/bueiro/canal e
  árvore/galho em risco, com negações, dominância elétrica e perguntas
  opcionais sem bloquear Guardar;
- foto-only permanece `original_text=NULL` e `category=other`;
- uma única migration, SHA-256
  `3e1f85b83332c9f52561c9d87ff7f54ad3b929e52e5097d798e175d4efcc06ac`;
- dry-run `31361880718`: `COMUN_P6B_B_REMOTE_PLAN_EXACT_ONE`;
- postflight read-only `31362446006`: categorias, RPCs, grants, RLS/FORCE
  RLS e P6B-A preservados, sem leitura de negócio;
- E2E descartável `31359162103` e 33 checks do head funcional verdes;
- deploy flags-OFF `31362536123` e onda 1 `31362722810` verdes;
- Production final `dpl_D8YtJ9YXnzHNmVVWwa8CncHz4xjB` READY;
- classificação urbana ON; forwarding urbano e ambiental OFF;
- cinco rotas canônicas `200`; cleanup Production com zero fixture ativa,
  package, attempt, snapshot, coletivo, request/envio externo ou hard delete;
- auto-send, publicação automática, mapa público geral, coletivos e
  `launch_publicly` permanecem desligados.

Resultado terminal:
`COMUN_48_1B_P6B_B_FLOOD_DRAINAGE_TREE_DOMAIN_GREEN_NO_AUTO_SEND`.

Detalhes: `reports/current/comun-48-1b-p6b-b-flood-drainage-tree.md`.

## 48.1B-P6B-A — incidentes ambientais e territoriais

- 48.1C permanece não concluído e pausado por decisão de produto:
  `COMUN_48_1C_MOTOROLA_PILOT_PAUSED_BY_PRODUCT_DECISION`;
- PR funcional `#253`, head exato
  `997c9de1c07ffcdb161535bf18fe0d26bfda3b1d`, mesclada no merge
  `bc0e627988176afec0b06721f714a89db867b480`;
- `/comun/relatar` continua sendo a única entrada; não foram criados miniapps
  ambientais;
- o roteador determinístico V2 reconhece fogo ativo, fumaça/vestígio,
  poluição e lixo/entulho, com negações, dominância de risco e pergunta de
  chamas opcional, sem bloquear Guardar;
- foto-only permanece `original_text=NULL` e `category=other`, sem visão
  computacional ou frase inventada;
- Carteira usa labels humanos e nenhum adapter institucional como fallback;
- E2E descartável `31354428041`, regressão P6A `31354428057` e 26 checks do
  head final verdes;
- zero migration; dry-run remoto `31354873210` com plano `[]`;
- deployment flags-OFF `31354964511` e onda 1 `31355068551` verdes no merge
  exato; Production final `dpl_5htbwyTaw7nCXN6zxEpPnSa9g6dq` READY;
- classificação ambiental ON; forwarding ambiental OFF e diferido porque
  `source_domain` exigiria extensão de schema;
- cleanup Production: zero fixture sintética ativa, package, attempt,
  snapshot, coletivo, request/envio externo ou hard delete;
- auto-send, publicação automática, mapa público geral, coletivos e
  `launch_publicly` permanecem desligados.

Resultado terminal:
`COMUN_48_1B_P6B_A_ENVIRONMENTAL_INCIDENTS_DOMAIN_GREEN_NO_AUTO_SEND`.

Detalhes: `reports/current/comun-48-1b-p6b-a-environmental-incidents.md`.

## 48.1D-S3 — Carteira orientada pela categoria

- finding `MOTOROLA-P1-003`: um relato de Calçadas recebia o adapter legado de
  iluminação `Fiscaliza VR` como fallback incorreto;
- PR `#251` mesclada por exact-head
  `ef577fdd75396dc50c4cd0a7931b53a9a5c202b0` no merge
  `357c85100958f2cbe1b9b6a6ca9eb9c9a2b1ca02`;
- resolver único e fail-closed separa STMU, serviços essenciais, Calçadas e
  categorias sem encaminhamento verificado;
- Calçadas não renderiza Fiscaliza VR, STMU ou Essential panel; categoria
  desconhecida fica “Categoria em revisão” e sem canal;
- labels humanos substituem enums; um item é renderizado uma vez; próximo passo
  só aparece quando metadata suficiente o comprova;
- `ComunForwardingPanel` ficou congelado como adapter legado específico e saiu
  do fallback da Carteira canônica;
- retomada segura por item não foi improvisada:
  `COMUN_WALLET_SIDEWALK_RESUME_CAPABILITY_PENDING`;
- E2E focal run `31348386321`, P5 `31348386320`, P6A `31348386316`, Experience
  `31348386313` e Quality `31348386309` verdes;
- CI: 31 checks verdes; plano remoto `[]`; zero migration S3;
- Production `dpl_6kdi6MwdPdfUtxnJjTVuKfrsJG6w` READY no merge exato;
- smoke read-only `/comun`, `/comun/relatar`, `/comun/minha-participacao`,
  `/comun/calcadas` e `/comun/onibus` = `200`; zero erro observado;
- zero fixture/escrita Production, envio externo, publicação ou hard delete;
- reteste humano focal da Carteira atual ainda deve confirmar somente registro,
  label, ausência de Fiscaliza e compreensão do próximo passo;
- depois do reteste, a regra S3 previa retomar `J1`, `J3` e `J7` antes de P6B;
  a decisão de produto posterior autorizou P6B-A e pausou o piloto;
- auto-send, publicação automática e `launch_publicly` permanecem desligados.

Detalhes: `reports/current/comun-48-1d-s3-category-aware-wallet.md`.

## 48.1C-PREP — protocolo humano Motorola, sem sessões iniciadas

- branch `codex/48-1c-motorola-pilot-prep` parte de
  `origin/main=ab9e9434a12f778c04ea9baf5760b89cf5ffdf4b`;
- preparação estritamente documental e de test harness, sem feature visual,
  conteúdo Production ou migration;
- sete jornadas canônicas, métricas manuais, score Motorola, severidades e
  regra de ajuda definidos;
- template admite apenas campos sanitizados e códigos `P01`, `P02` etc. fora
  do produto;
- checklist exige soft cleanup, zero publicação, coletivo, envio/request
  externo e hard delete;
- participantes contabilizados: `0`; estado: `PREPARED — NO HUMAN SESSIONS
YET`;
- P1G humano permanece separado e pendente; `launch_publicly=false`;
- este era o gate de preparação anterior à decisão de produto que autorizou
  P6B-A e pausou o piloto.

Detalhes: `reports/current/comun-48-1c-motorola-pilot.md`.

## 48.1B-P1G — Google Auth — tecnicamente ativo, micro-gate humano pendente

- baseline `origin/main=09ab579b658e3ef1e6964b932ef8faba081e574a` e
  estado inicial P6A terminal confirmados;
- branch nova `codex/48-1b-p1g-google-auth`, zero migration e arquivos não
  rastreados preexistentes preservados;
- Supabase Auth SSR/PKCE existente foi endurecido sem criar auth paralelo;
- Production fixa `https://comunsocial.online`; Preview autorizado permanece
  isolado; `returnTo` externo/codificado falha fechado;
- perfis bloqueados não entram; conta nova confirma nome/termos/política sem
  território; Carteira anônima só vincula após gesto explícito;
- escopos Google limitados a `openid email profile`, sem offline access, APIs
  Google ou persistência de provider token;
- testes focais 20/20, contrato dos workflows 4/4, E2E local 2/2 com Auth falso
  loopback e zero contato externo, Axe/typecheck/lint verdes;
- Production observada com Google ativo, e-mail disponível e navegação anônima
  preservada;
- preflight read-only `31322898529` confirmou P6A, provider Google público
  desabilitado e plano remoto de zero migration, sem leitura de negócio ou
  segredo;
- preflight pós-configuração `31325453756` confirmou provider Google público
  habilitado e plano remoto ainda vazio, sem ler credenciais ou negócio;
- termos Google Cloud aceitos; projeto `COMUN`, app OAuth externo e cliente Web
  Production criados com origem/callback exatos e somente escopos básicos;
- Supabase Production: Site URL e redirect exatos, provider Google ON, Client
  ID/Secret presentes apenas no cofre do provider, Skip nonce OFF e contas sem
  e-mail OFF; nenhum segredo foi registrado;
- preflight final `31326891817`, CI completa e merge exact-head
  `ab9e9434a12f778c04ea9baf5760b89cf5ffdf4b` verdes;
- deploy flags-off `31328211730` e ativação técnica `31328303003` verdes, com
  e-mail/senha e navegação anônima preservados;
- gate atual: login/logout humano real em dois ciclos, com onboarding apenas no
  primeiro quando aplicável;
- não emitir ainda `COMUN_48_1B_P1G_GOOGLE_AUTH_DOMAIN_GREEN`.

Detalhes: `reports/current/comun-48-1b-p1g-google-auth.md`.

Este encadeamento foi substituído pela decisão de produto registrada na seção
P6B-A acima; 48.1C continua não concluído.

## 48.1B-P6A — serviços essenciais — concluída

- baseline canônico confirmado em
  `origin/main=7ee7123dbd3c66b8713e3238d35a422734f029b6` e branch nova
  `codex/48-1b-p6a-essential-services`;
- preflight remoto `COMUN_P6A_REMOTE_PREFLIGHT_GREEN`: categorias, RPCs,
  constraints, grants, RLS/FORCE RLS e migrations conferidos sem leitura de
  conteúdo;
- `water_supply` é a única categoria nova; energia, iluminação, risco elétrico
  e Capture First permanecem separados;
- porta única `/comun/relatar`, um protocolo e um item de Carteira;
- catálogo institucional server-side verificado em fontes oficiais; nenhum
  canal foi acionado;
- uma migration P6A generaliza o núcleo P5 e preserva wrappers STMU;
- E2E descartável P6A `31319369615` verde no head
  `982a5312a1bd5e4c0c92fe222dc03fc60bd2efee`: três serviços, uma decisão na
  ambiguidade, transição do mesmo relato photo-only, segurança, screenshot
  mobile, Axe, zero request externo, zero publicação e zero hard delete;
- regressão P5/STMU `31319369666` verde no mesmo head, preservando
  `bus_intake_id` e `prepared != sent`;
- `prepared` continua diferente de `sent`; auto-send, publicação, mapa público,
  coletivos, território, Google e `launch_publicly` permanecem desligados;
- PR `#243` mesclado por exact-head em
  `0a4ada3f54d29dd7d48a71363a9f406b03edfcdd`;
- preflight `31320178811`, promoção única `31320220765`, postflight
  `31320276479`, deploy flags-off `31320322317`, onda 1 `31320434158`, onda 2
  `31320554100` e postflight final `31320680060` verdes;
- cleanup final: zero relatos/casos/itens/wallets/pacotes/tentativas sintéticos
  ativos, zero snapshot, coletivo, request/envio externo e hard delete;
- Conta, Carteira, Relata, Photo First, localização privada, Calçadas, Ônibus,
  STMU assistida, serviços essenciais e forwarding assistido estão ON;
- auto-send, publicação automática, mapa público geral, coletivos, perfil
  territorial e Google estão OFF; `launch_publicly=false`.

Resultado terminal:
`COMUN_48_1B_P6A_ESSENTIAL_SERVICES_DOMAIN_GREEN_NO_AUTO_SEND`.

Este próximo passo era o gate vigente ao concluir P6A. A decisão de produto
posterior autorizou P6B-A sem concluir 48.1C.

## 48.1B-F2 — capture first

- M1 foi mesclado no PR `#238` e promovido como exatamente uma migration;
- catálogo remoto, grants, RLS e seis rotas públicas passaram no pós-flight;
- nenhum relato foi lido, nenhum backfill ou fixture M1 foi criado;
- resultado M1:
  `COMUN_48_1B_F2_M1_SEMANTIC_TEXT_ABSENCE_REMOTE_GREEN_RUNTIME_OFF`;
- R1 foi mesclado no PR `#239`, promovido e ativado em Production; a fixture
  exata do run `31299281446` confirmou foto P3 privada, receipt, Carteira, zero
  publicação/forwarding e cleanup;
- C1 foi mesclado no PR `#241`, sem migration ou adapter novo; o run descartável
  `31300536511` comprovou `NULL`, categoria `sidewalk_accessibility`, um
  protocolo e `pending_review`;
- deploy C1 OFF (`31300837241`) e ativação com fixture/cleanup
  (`31300951155`) passaram no merge `be08800ac7a13a7f9d29a481b5a3d85e6856733d`;
- o primeiro shortcut PWA é `Vi um problema` → `/comun/relatar`;
- Share Target permanece em
  `COMUN_F2_SHARE_TARGET_DEFERRED_FILE_LIFECYCLE_REQUIRED`;
- resultado terminal vigente:
  `COMUN_48_1B_F2_CAPTURE_FIRST_DOMAIN_GREEN`;
- próximo tijolo: `48.1B-P6A — ÁGUA + ENERGIA + ILUMINAÇÃO`.

## 48.1B-P5 — Ônibus + STMU assistida — candidata em validação

- baseline: `origin/main=6b037d6dd3ffc617c6c47d26adb466eaaf7639bd`;
- preflight remoto read-only: `COMUN_P5_REMOTE_PREFLIGHT_GREEN`, run `31279521086`, zero leitura de conteúdo e zero escrita;
- schema P5 não existe remotamente; uma única migration forward-only foi criada, sem importar as migrations local-only 48.0E/H/K/L;
- Relata permanece fonte da verdade, categoria `public_transport`, um protocolo COMUN e um item canônico de Carteira;
- forwarding é somente assistido: copiar e abrir dependem de gesto; abertura é `prepared`, nunca `sent`;
- WhatsApp e mailto não recebem mensagem em query; 72 horas só começa após declaração explícita da pessoa;
- validator SQL, privileges lint, 8 testes focais, typecheck, lint e build verdes;
- Docker local indisponível; lane Supabase descartável sem secrets remotos criada para o E2E funcional;
- PR draft #232; migration, flags, deployment e Production ainda inalterados;
- `launch_publicly=false`; coletivos, território e Google permanecem desligados.

## Tijolo 48.0M — ensaio humano integrado — integrado, técnico dormente, humano pendente

- baseline inicial confirmado: `origin/main=a4910c50680cdde09808364c3cb83669baebaba0`; PR #168 mesclada no SHA `dbdf61a39deecefc558e8ee1ee527a4ba326d4d3`; Production `dpl_9WgR8YbQCzmNqEx2GD8Cnd1BjUX6` permanece READY e sem promoção manual;
- smoke read-only: `/comun`, `/comun/relatar`, `/comun/calcadas` 200; Relata, Ônibus, forwarding e STMU multicanal 404; flags públicas desligadas;
- preflight: 492 unitários, typecheck/lint/build, surfaces 192/0 desconhecidas/0 legacy/0 P0-P1, DB/RLS/grants e rehearsals de Relata, Carteira, forwarding, Calçadas, Ônibus, STMU WhatsApp e multicanal verdes;
- E2E/Axe: captura 10/10, Carteira 5/5, forwarding 5/5, Ônibus 5/5; a11y Calçadas 2/2;
- infraestrutura local: conflito de porta 5543x e retry focal de gateway Storage 502, ambos descartáveis; configuração restaurada; nenhum Supabase remoto consultado ou alterado;
- E2E histórico de Calçadas 4/8 por `FIXTURE_SETUP_MISSING`: fixture genérica não cria pauta canônica e a página renderiza fallback editorial. Não foi aplicado patch permissivo nem alterada a implementação;
- resultado técnico: `COMUN_REHEARSAL_48_0M_ENVIRONMENT_READY_HUMAN_SESSION_PENDING`;
- smoke LAN humano confirmado pelo responsável do produto em computador e celular, sem submissão externa: `COMUN_REHEARSAL_48_0M_LAN_SMOKE_GREEN`;
- resultado humano: `COMUN_INTEGRATED_HUMAN_REHEARSAL_INCOMPLETE` (não participante completo; sem tempos, jornadas completas ou três participantes);
- smoke read-only pós-merge preservou `/comun=200`, `/comun/relatar=200`, `/comun/calcadas=200` e manteve Relata, Ônibus, forwarding, STMU e ambiente de ensaio em `404`;
- resultado terminal técnico: `COMUN_REHEARSAL_48_0M_MERGED_DORMANT_ENVIRONMENT_READY_HUMAN_SESSION_PENDING_REMOTE_UNCHANGED`;
- STMU opção 3 e verificação de e-mail não realizadas; nenhum envio, WhatsApp, e-mail ou piloto público iniciado;
- relatórios: `comun-tijolo-48-0m-rehearsal-diagnostico.md`, plano/template/resultados, matriz de prontidão, plano de piloto, findings JSON e contratos STMU;
- próximo passo: ensaio humano real 48.0M-H1 e correção focal da fixture antes de qualquer 48.1; 47.9D não iniciado e `launch_publicly` não acionado.

### 48.0M-AUTH1 — Google Auth integrado ao Supabase Auth, dormente

- código pronto na branch `codex/tijolo-48-0m-integrated-human-rehearsal`, sem migration ou credencial real;
- `Continuar com Google` é opt-in por `COMUN_GOOGLE_AUTH_ENABLED`, com PKCE/SSR, callback `/comun/auth/callback` e retorno interno allowlisted;
- contas novas passam por `/comun/completar-conta` para nome editável, termos e política; contas existentes preservam identidade, perfil, participação e Carteira;
- Carteira anônima não é rotacionada, reivindicada silenciosamente ou duplicada;
- resultado: `COMUN_AUTH_GOOGLE_48_0M_CODE_READY_PROVIDER_CONFIGURATION_PENDING`;
- provider Google permanece não configurado, flag Production desligada, `COMUN_INTEGRATED_HUMAN_REHEARSAL_INCOMPLETE` preservado e 48.1 não iniciado.
- regressão E2E comunitária inicialmente encontrou `ECONNREFUSED 127.0.0.1:55431`; o laboratório foi recuperado em portas alternativas após reserva da `55432`, o reset integral local ficou verde e a configuração versionada foi restaurada;
- smoke manual do responsável pelo produto confirmou cadastro, login, Minha Participação e onboarding no laboratório LAN; nenhum canal externo foi acionado; `COMUN_INTEGRATED_HUMAN_REHEARSAL_INCOMPLETE` permanece.

## Catálogo territorial de bairros — integração local

- onboarding com bairro opcional para Volta Redonda usando snapshot textual Prefeitura/IPPU `2026-08-04-textual-preliminary`;
- persistência aditiva local-only em `comun_member_profiles`, protegida por `COMUN_TERRITORY_CATALOG_LOCAL`;
- sem geometria, coordenada, endereço ou projeção pública;
- migration `20260805090000_comun_member_profile_territory_selection.sql`, manifesto com `requiresPromotion=false` e `remotePromotionAllowed=false`;
- resultado: `COMUN_TERRITORY_NEIGHBORHOOD_CATALOG_LOCAL_READY`;
- lista preliminar ainda aguarda validação contra o shapefile oficial; Supabase remoto não consultado ou alterado.

## Tijolo 48.0L — STMU multicanal — integrado, dormente

## Tijolo 48.0L — STMU multicanal — integrado, dormente

- baseline confirmado: `origin/main=7d40abbac84daaa4a4298dcea1e471f7441b6830`; PR #166 mesclada no SHA `1177323071a826c912b63c2aa9678ad1577589f1`; deployment Production `dpl_9WgR8YbQCzmNqEx2GD8Cnd1BjUX6` READY;
- modelo multicanal aditivo: um caso Relata, tentativas sequenciais por canal, eventos append-only, latência em faixas e escalonamento sem duplicação;
- canais reconciliados: WhatsApp com menu 1/2/3 observado; e-mail oficial `stmu@voltaredonda.rj.gov.br` verificado como fonte atual, ainda não testado; Gmail de campo não corroborado e bloqueado; telefone e presencial verificados como fontes, sem automação;
- migration local-only `20260804232125_comun_stmu_multichannel_attempts_local.sql`, SHA `8cc01fcd7acf16fa7337d52626eb0be4c547a61bce76760954479cd1bfd5b572`; manifesto `requiresPromotion=false`, `remotePromotionAllowed=false`;
- pacote de e-mail idempotente, revisão, cópia explícita e abertura `mailto:` exata sem corpo/query; nenhum envio, anexo ou acesso Gmail;
- DB rehearsal `COMUN_STMU_48_0L_DB_GREEN`; RLS `COMUN_RLS_COMPLETE_GREEN`; privilégios explícitos verdes; cloak GET/POST/PATCH/PUT/DELETE `404`;
- 492 testes unitários, surfaces 26/26, typecheck, lint e build verdes; micro-gate humano de opção 3 e verificação de e-mail pendentes;
- Production, Supabase remoto, flags públicas, domínio, secrets, WhatsApp, e-mail e `launch_publicly` permanecem intocados;
- resultado terminal: `COMUN_STMU_48_0L_MERGED_DORMANT_MULTICHANNEL_RESILIENCE_GREEN_FIELD_EMAIL_PENDING_REMOTE_UNCHANGED`; smoke pós-merge preservou rotas públicas e manteve multicanal `404`;
- próximo passo: micro-gates humanos separados e planejamento de `48.1 — primeiro piloto real consentido`; 47.9D não iniciado.

## Tijolo 48.0K — STMU WhatsApp — candidato local, dormente

- baseline após Fase A: `origin/main=e7ef45aadd92e757da2fc2ca6c01dd240ac24708`; branch `codex/tijolo-48-0k-stmu-whatsapp-assisted`;
- canal `vr-stmu-whatsapp` observado ao vivo de forma sanitizada: identidade, menu 1/2/3 e horário 8h–17h; perguntas da opção 3, anexos, protocolo e handoff não observados;
- adaptador `vr-stmu-whatsapp-complaint-v1`, categoria canônica `public_transport`, forwarding compartilhado e Carteira existente;
- migration local-only `20260804204544_comun_stmu_whatsapp_assisted_local.sql`, SHA `5ed6358e97650c20fb0bb881c6d804a6f79d6ea5455fb81079f506861e7c112a`; manifesto `requiresPromotion=false`, `remotePromotionAllowed=false`;
- pacote idempotente, requisitos versionados, revisão, abertura assistida por gesto, retorno e declaração sintética verdes no DB rehearsal `COMUN_STMU_48_0K_DB_GREEN`;
- RLS `COMUN_RLS_COMPLETE_GREEN`, grants explícitos/service-role-only; cloak GET/POST/PATCH/DELETE/PUT `404` sem `405`;
- URL exata `https://wa.me/5524992958558`, sem query, prefill, automação, sessão, envio ou protocolo confirmado; expectativa de 72h permanece fonte declarada e começa somente após declaração da pessoa;
- typecheck, lint, build, surfaces e teste focal verdes; ensaio humano da opção 3 pendente; nenhum WhatsApp real acessado;
- Production, Supabase remoto, flags públicas, domínio, secrets e `launch_publicly` permanecem intocados;
- resultado esperado após integração segura: `COMUN_STMU_48_0K_MERGED_DORMANT_WHATSAPP_MENU_OBSERVED_COMPLAINT_FLOW_PENDING_REMOTE_UNCHANGED`;
- relatórios: `comun-tijolo-48-0k-stmu-diagnostico.md`, `comun-tijolo-48-0k-stmu-whatsapp.md/.json`, reconciliação, observação, abertura e template do micro-gate;
- próximo passo: `48.1 — primeiro piloto real consentido` somente após gates humanos e operacionais separados; 47.9D não iniciado.

## Faixa 48.0J-N1 — Calçadas integrada, Fiscaliza degradado

- PR #164 mesclada no SHA `e7ef45aadd92e757da2fc2ca6c01dd240ac24708`; a falha do smoke foi classificada como `SMOKE_WRONG_ENVIRONMENT` (fixture local correta, app apontava para processo/porta errados), corrigida sem aceitar `404` genérico;
- smoke pós-merge: `/comun=200`, `/comun/relatar=200`, `/comun/calcadas=200`, Relata/Ônibus/forwarding `404`; Production permaneceu dormente e remoto inalterado;
- resultado Fase A: `COMUN_SIDEWALK_48_0J_MERGED_DORMANT_LOCAL_CONNECTED_FISCALIZA_DEGRADED_REMOTE_UNCHANGED`;
- 48.0K só foi iniciado após esse merge, novo baseline e remoção da branch 48.0J.

# Estado atual do COMUN

## 48.1B-P3B — localização privada criptografada — em validação CI, não ativada

- branch `codex/48-1b-p3b-private-location` criada a partir de `origin/main=fd99b55e98c9941f8bfc956f82501af3e3ac8a3d`;
- P3A permanece `COMUN_48_1B_P3A_PRIVATE_ATTACHMENTS_DOMAIN_GREEN_LOCATION_OFF`;
- localização desacoplada da chave HMAC espacial; coletivos permanecem desligados;
- ponto/precisão não são persistidos no `sessionStorage`, receipt, Carteira, telemetria ou resposta;
- teste local de código, typecheck, lint e build verdes; Docker local não respondeu, portanto a prova de banco segue na lane CI descartável;
- Production ainda não recebeu flag nem chave P3B; `launch_publicly=false`.

## Tijolo 48.0H — encaminhamento institucional compartilhado — candidata local

- baseline `origin/main` confirmado em `7a4ebaa5ab9b59323fe55cd7c9f0dd87c8c28ffe`; branch isolada `codex/tijolo-48-0h-forwarding-fiscaliza`;
- adaptador único `vr-fiscaliza-lighting-v1` para `public_lighting`; canal `vr-fiscaliza-web` permanece `source_verified`, `operationally_unchecked`, sem automação;
- pacote privado com requisitos, revisão, abertura assistida, declaração de envio, protocolo oficial informado pela pessoa, resposta e retirada; nenhum envio externo;
- migration `20260804151244_comun_forwarding_local.sql`, SHA `68235715785a01c6f7c94e65ad5a4342493ec39a0012923c356ccdc597475454`; manifesto local-only;
- RLS/grants verdes: tabelas privadas forçadas, RPCs service-role-only, contato separado e omitido da listagem; protocolo oficial imutável após primeiro registro;
- DB rehearsal `COMUN_FORWARDING_48_0H_DB_GREEN`; forwarding E2E/Axe `5/5` em cinco viewports; typecheck, lint e build verdes;
- resets locais tiveram retries focais por 502/stack compartilhada do gateway Storage; a cadeia completa foi aplicada em banco descartável; não é finding do produto;
- Production, flags públicas, Supabase remoto, domínio, secrets, canal externo e `launch_publicly` permanecem intocados; ensaio operacional real do Fiscaliza e 47.9D não iniciados;
- PR #160 mesclada no SHA `e07e5f7324817dfad6a643a97bbcb2b2383a6c52`; Production `dpl_7H9z7JzbuosPKepQ3mCLFSUKkXbz` `READY`; smoke pós-merge preservou `/comun` e legado `200`, Relata/Ônibus/forwarding `404` dormentes;
- resultado terminal: `COMUN_FORWARDING_48_0H_MERGED_DORMANT_LOCAL_FISCALIZA_ADAPTER_GREEN_REMOTE_UNCHANGED`;
- relatórios: `comun-tijolo-48-0h-forwarding-diagnostico.md`, `comun-tijolo-48-0h-shared-forwarding.md`, `comun-tijolo-48-0h-forwarding.json` e contratos associados;
- próximo tijolo: `48.0I — verificação operacional do canal e primeiro encaminhamento assistido`, sem execução neste tijolo.

## Tijolo 48.0G — carteira única de participação — candidata local

- baseline `origin/main` confirmado em `8947b3db28280b988c0a1f72ac67947c9bca7455`; branch isolada `codex/tijolo-48-0g-wallet`;
- `/comun/minha-participacao` é a superfície canônica; carteira anônima local reúne múltiplos relatos, follows legados, observações de Ônibus e casos sanitizados;
- Relata permanece fonte da verdade; protocolos antigos continuam válidos e aparecem como “Protocolo acompanhado”;
- migration `20260804135032_participation_wallet_local.sql`, SHA `ddd8a8cb3acb84a13f8b1f58ffb96df1d75d83dc1f4370a0550141c7585de2c0`, manifesto local-only;
- tokens, recibos e recuperação separados; hashes only, RLS forçada, RPCs service-role-only e rate limit de recuperação;
- DB rehearsal `COMUN_WALLET_48_0G_DB_GREEN`; RLS/grants e restore descartável de banco/Storage verdes; 479 unitários; wallet E2E/Axe 5/5 em cinco viewports; typecheck/lint/build/surfaces verdes;
- primeiro reset apresentou container Supabase compartilhado em estado parcial; retry focal aplicou a cadeia completa. Não é finding do produto;
- Production, flags públicas, Supabase remoto, domínio, secrets, encaminhamento externo e `launch_publicly` permanecem intocados;
- ensaio humano 48.0F-H1 continua pendente; 47.9D não iniciado;
- resultado técnico local: `COMUN_WALLET_48_0G_LOCAL_CANDIDATE_GREEN`; integração exige PR/CI/Preview e smoke dormente;
- próximo tijolo: `48.0H — Encaminhamento institucional compartilhado`.

## Tijolo 48.0F — captura rápida e convergência — candidata local

- baseline `origin/main` confirmado em `87277aa2b7a58ea7a9bcd9f260082519beca25fc`; branch `codex/tijolo-48-0f-capture`;
- `COMUN_QUICK_CAPTURE_V2` cumulativa e desligada fora do laboratório; `/comun/relatar` legado preservado quando desligada;
- Relata novo é fonte da verdade; legado é projeção reversível; protocolos antigos permanecem válidos;
- estado `captured_private`, taxonomia canônica com `public_transport`, perguntas adaptativas e formulário detalhado com retomada de rascunho;
- migration `20260804022743_comun_capture_quick_capture_convergence.sql`, SHA `d730d5f005bb7e443b72b016ea30983d0b16123878a9b4b3eb6363991c2e003e`, local-only;
- 475 unitários, 10 E2E em cinco viewports com Axe, DB rehearsal/RLS/grants, typecheck/lint/build e surfaces verdes;
- 192 páginas, zero rota desconhecida, zero `legacy_rendered`, zero P0/P1; dívida estrutural não aumentou;
- nenhum Supabase remoto, Production, domínio, secret, canal externo ou `launch_publicly` foi tocado;
- ensaio humano de 60 segundos não realizado; 47.9D não iniciado;
- resultado parcial: `COMUN_CAPTURE_48_0F_LOCAL_FOUNDATION_CANDIDATE`; próximo gate é PR/CI/Preview e smoke pós-merge dormente;
- próximo tijolo após integração segura: `48.0G — Carteira de relatos`.

## Tijolo 48.0D-R1 — projeção sanitizada e mapa local — integrado, Production dormente

- baseline verificado forward-only: `118f1d4c88cc6915ef471ba59cfcfbcf0355d770`; merge final `261c853d606158ce349fa24cf1cb7b3a74a60f31`;
- PR #156 mesclada; deployment Production `dpl_G9iA4Mgn6jAcuuFqDgtQiKcgD7q6` em `READY`;
- branch isolada: `codex/tijolo-48-0d-relata-sanitized-local-map`;
- quarta barreira cumulativa: `COMUN_RELATA_LOCAL_PUBLIC_MAP`;
- migration local-only `20260803200000_comun_relata_sanitized_local_map.sql`, checksum no manifesto, `requiresPromotion=false`, `remotePromotionAllowed=false`;
- snapshots públicos do 48.0B preservados e bloqueados; nova projeção é aditiva e não publica Relata;
- política `relata-public-projection-v1`: células métricas 300/800/1.000 m, categorias templated, estados bloqueados/suprimidos/revisão/prévia local;
- confirmações first-party com cookie HttpOnly e hash server-side, sem criar relato ou alterar contagem de relatos;
- mapa/lista local com filtros, detalhe sanitizado, raio de incerteza e alternativa acessível; sem fotos, texto, protocolo, endereço ou status oficial;
- verificação: typecheck verde; testes focais de flags/projeção `9/9` verdes; migration aplicada e validada somente no Supabase descartável local;
- Production permanece dormente; nenhum domínio, secret, flag remota ou bucket remoto foi tocado;
- recuperação R1: Docker Desktop `4.61.0`, Engine `29.2.1`, Supabase CLI `2.111.0`; conflito de porta e retry focal de gateway Storage foram infraestruturais;
- migration completa aplicada no Supabase descartável por reset forward-only; rehearsal `COMUN_RELATA_48_0D_DB_GREEN`, RLS/grants/restore/Storage verdes;
- Relata focal `39/39`, unitários `462/462`, E2E `20/20` em cinco viewports com Axe, surfaces `26/26`, typecheck/lint/build verdes;
- no-leak dormente: `/comun=200`, App V2/legado `200`, `/comun/relata`, mapa e APIs Relata `404` uniformes sem `405`;
- resultado terminal: `COMUN_RELATA_48_0D_MERGED_DORMANT_LOCAL_SANITIZED_MAP_GREEN_REMOTE_UNCHANGED`; smoke Production confirmou `/comun`, App V2 e legado `200`, Relata/mapa/APIs `404`, flags Production desligadas;
- próximo tijolo: `48.0E — package forwarding/channel verification`; 47.9D não iniciado; `launch_publicly` não acionado.

## Tijolo 48.0C integrado e dormente — 3 de agosto de 2026

- baseline forward-only: repository main `bb2b3cb709a6f3b01c0774175c9c9e9704e81396`;
- PR #153 principal mesclada em `eda38611f04870056d9ed6f30525b9f8d2b8fa1f`;
- smoke pós-merge encontrou `405` focal em métodos não implementados de duas
  APIs dormentes; nenhuma superfície foi promovida;
- PR #154 focal mesclada em `6fefaa8e79de53e4c8bee1f4f4c16a71d5bc68c1`;
- migration aditiva/checksum e manifesto local-only verdes; migration 48.0B intacta;
- localização opcional com AES-256-GCM server-side e células somente em HMAC;
- JPEG/PNG/WebP: até três, 8 MiB, 20 MP, validação real, derivada privada sem
  metadados e bucket privado sem leitura direta;
- processo individual preservado; casos coletivos e participações aditivos,
  determinísticos, versionados e sem auto-link de emergência/sensível;
- retirada revoga interface, inativa vínculos e preserva história; cleanup dry-run;
- Relata 32/32, E2E 15/15, unidade 456/456, RLS 194 tabelas/2.328 combinações,
  a11y, PWA, performance, rede, restore, no-leak, typecheck, lint e build verdes;
- surfaces: 190 páginas, sete shells, zero desconhecida, zero legacy e zero P0/P1;
- Production `dpl_Z4Da7tM1QEcNZ6hGyaUBeZANXEaw`, `READY`, no SHA final exato;
- `/comun`, App V2 e legado: `200`; `/comun/relata`: `404`;
- 21/21 combinações de localização, agrupamento e anexos com sete métodos:
  `404`, sem leak de existência por `405`;
- Quality da PR #154 teve `502` de restart Supabase descartável e Civic Graph
  pós-merge teve `SIGSEGV` do Chromium; retries focais únicos nos mesmos SHAs
  passaram, sem finding de produto;
- CI, deployment status, Core Journeys, Quality e Civic Graph pós-merge verdes;
- Supabase remoto não consultado, não migrado e não alterado;
- resultado terminal:
  `COMUN_RELATA_48_0C_MERGED_DORMANT_LOCAL_GREEN_REMOTE_DB_UNCHANGED`;
- 47.9D não iniciado; `launch_publicly` não acionado.

## Tijolo 48.0B integrado e dormente — 3 de agosto de 2026

- base: `97c102d2a2464e511cd443ee29cac119d7e7c360`, merge verde do 48.0A-N1;
- branch de produto removida após o merge;
- candidata funcional final: `43484e730cc273dbb578affed98420c96099616b`;
- PR #151 mesclada; merge/main:
  `093f9772d28c018c95d5f8c1aac5afe6c1de30e6`;
- migration real e forward-only validada somente no Supabase descartável;
- manifesto/checksum local-only verde; promoção remota explicitamente proibida;
- seis tabelas com RLS forçada e três RPCs executáveis somente pela service
  role do runtime local server-side;
- protocolo COMUN não oficial, não sequencial e separado do segredo de recibo;
- idempotência sequencial/concorrente, isolamento, retirada e histórico verdes;
- 21 testes Vitest e 15 E2E em cinco viewports verdes, incluindo Axe e PWA;
- regressão local: 444 unitários, App V2 35/35, PWA 30/30, performance 9/9,
  rede focal 2/2, segurança, surfaces, no-leak e smokes verdes;
- PR: 23 checks verdes; RLS completa com 190 tabelas, 2.280 combinações e
  zero finding; backup/restauração de `public`, `private` e ledger verdes;
- catálogo v1: 14 fontes oficiais, 13 canais, zero canal operacionalmente
  verificado e zero automação;
- conflitos CAU/WhatsApp e Light/call center preservados, sem escolher valor;
- Production `dpl_B8Tm8VzZV2SNTECxV9dAuJFHpvEN` em `READY`, no merge SHA
  exato; `/comun=200`, legado/App V2 em `200` e `/comun/relata=404`;
- Supabase remoto não consultado, não migrado e não alterado;
- CI, Civic Graph, Core Journeys, Experience Coherence e Quality Performance
  pós-merge verdes;
- resultado terminal honesto:
  `COMUN_RELATA_48_0B_MERGED_DORMANT_LOCAL_GREEN_REMOTE_DB_UNCHANGED`;
- próximo: `48.0C — localização privada, anexos protegidos e formação de casos`;
- 47.9D não iniciado; `launch_publicly` não acionado.

## Faixa focal concluída — Tijolo 48.0A-N1 (3 de agosto de 2026)

- PR #150 mesclada no SHA `97c102d2a2464e511cd443ee29cac119d7e7c360`;
- Quality, Civic Graph, Experience Coherence e Core Journeys pós-merge verdes;
- Production `dpl_GJkAy2Xo7NZkTimiw2sjvtCDnNVV` em `READY` no SHA exato;
- contrato focal: dois checks, um Chromium low-Android, um worker, zero retry;
- nenhum `SIGSEGV`, nenhuma redução de cobertura e nenhuma mudança de produto;
- resultado: `COMUN_QUALITY_NETWORK_CHROMIUM_STABILIZED`.

## Faixa focal em validação — Tijolo 48.0A-N1 (3 de agosto de 2026)

- baseline documental: `28dd410dffe96b1065a2846545dbde2a20799bc9`;
- SHA funcional e observado em Production:
  `c70d1ceab802a7df591c9e6ac2aee07d364c3b1b`;
- Production continua com `/comun/relata` em `404` e `/comun` em `200`;
- causa operacional confirmada: o contrato de rede coletava 18 casos em nove
  projetos e criava a fixture de navegador antes do skip de oito cenários;
- candidata focal: um Chromium `320x568-low-android`, dois checks funcionais,
  um worker, nenhum retry e artifact sanitizado;
- duas execuções locais consecutivas verdes; remoto, PR e pós-merge pendentes;
- resultado não terminal:
  `COMUN_QUALITY_NETWORK_CHROMIUM_STABILIZATION_CANDIDATE`;
- relatório: `reports/current/comun-tijolo-48-0a-n1-quality-network.md` e
  `.json`;
- nenhuma mudança de produto, banco, flag ou integração externa;
- 47.9D não iniciado e `launch_publicly` não acionado.

Atualizado em 2 de agosto de 2026.

## Atualização canônica — Tijolo 48.0A (3 de agosto de 2026)

- baseline confirmado: `d14f1aed1eca46b330b661935e6c73122390e708`;
- escopo: fundação local do COMUN Relata em `/comun/relata`, sem persistência, migration, envio ou integração oficial;
- flag: `COMUN_RELATA_PREVIEW`, desligada por padrão e sem link público;
- protocolo de preview: `COMUN-LOCAL-*`, explicitamente não oficial;
- roteamento: determinístico, versionado (`relata-routing-v1`) e sem LLM;
- resultado: `COMUN_RELATA_FOUNDATION_BLOCKED_POSTMERGE_QUALITY_NETWORK_CHROMIUM_SIGSEGV`;
- PR #148 mesclada; merge/Production SHA: `c70d1ceab802a7df591c9e6ac2aee07d364c3b1b`;
- Production confirmou o SHA exato e o Relata segue `404` com flag desligada;
- blocker pós-merge: Chromium headless `SIGSEGV` no teste de rede; retry focal no mesmo SHA repetiu; separar de finding do produto;
- `/comun/relatar` legado, App V2 canônico e rollback `?experiencia=legacy` preservados;
- 47.9D não iniciado e `launch_publicly` não acionado;
- diagnóstico: `reports/current/comun-tijolo-48-0a-relata-diagnostico.md`;
- proposta de schema (não executável): `reports/current/comun-relata-schema-proposal.md`;
- relatório: `reports/current/comun-tijolo-48-0a-relata-foundation.md` e `.json`.

## Checkpoint ativo — Tijolo 47.9D0

- base efetiva da promoção: `da76487568611b7e137b2c6798357250779af7cf`;
- PR #146 de estabilização visual: mesclada;
- Production da estabilização: `dpl_BUy8oxTEmsn2fiAezyxGhSJcoiHT`, READY e
  validada no SHA exato;
- resultado parcial: `COMUN_APP_V2_LAYOUT_REAL_STABILIZED`;
- branch candidata da promoção:
  `codex/tijolo-47-9d0-v2-default-promotion`;
- padrão candidato: App V2 canônico sem query;
- compatibilidade: `?experiencia=app-v2`;
- rollback temporário: `?experiencia=legacy`;
- PWA candidata: `comun-pwa-v3`;
- inventário preservado: 189 páginas, sete shells, zero rota desconhecida,
  zero `legacy_rendered`, zero P0/P1 e 93 compatibilidades P2/P3;
- nenhum resultado de ensaio humano foi produzido;
- 47.9A e 47.9C não foram promovidos a GREEN;
- `launch_publicly` não foi acionado.

O roadmap oficial passa a seguir:

1. `47.9D0 — Estabilização de layout real e promoção controlada do App V2`;
2. `47.9D — Ensaio humano ampliado, aparelhos reais e consolidação`;
3. `47.10 — Conteúdo, ajuda e governança`;
4. `47.11 — Ensaio geral e go/no-go`.

Permanecem em paralelo 47.8A, o fechamento do provider 47.9B, Calçadas e
conteúdo cultural real. O 47.9B permanece bloqueado pelo provider e o 47.9C
aguarda aparelhos e tecnologias assistivas reais, sem promoção a GREEN.
`security_resilience` segue bloqueado por redundância durável;
`miniapps` está `in_progress`; `archive_radio_art` permanece
`evidence_required`. A candidata da promoção está em
`reports/47.9d0/default-promotion-candidate.md`.

## Linha ativa

- repositório: `alexandrevrabandonada-oss/comunvrabandonada`;
- PR #31 e PR #32: mescladas por merge commit;
- HEAD de partida e base `main`:
  `7152bb7d946ac4245053ae3cd0e2563a3822ac51`;
- HEAD técnico validado:
  `072006b458d04319a983d7823ed814199f8884da`;
- HEAD documental:
  `ca40c96b5fd2b4991e4fe987b636a7e8811fdbe1`;
- `main` vigente:
  `4a9e2d4f341e755b3a1aa969c26344f4f4334bae`;
- escopo: composição da experiência existente, sem migration;
- CI e Vercel no merge SHA: aprovados;
- decisão vigente: `COMUN_NUCLEO_VIVO_PRODUCTION_GREEN`;
- hotfix 42.1: concluído pela PR #32;
- estado local do hotfix: `COMUN_CANONICAL_SIDEWALK_PAUTA_OK`;
- Tijolo 43: ciclo operacional corrigido localmente, com migration pendente de promoção;
- PR #35 (draft): HEAD `4ca09221f4d4720ac0da6cca1dab871ecdda8e46`;
- decisão do Tijolo 43: `COMUN_CALCADAS_FAST_PATCH_REQUIRED`;
- gate humano: 0/3;
- piloto público: fechado.

## Decisão vigente — Tijolo 42

A pauta passa a ser o eixo público entre território, comunidade, conversa,
contribuição, ação, resultado e memória. A pauta-piloto “Calçadas em
circulação” apresenta seis etapas fixas e mantém o mapa como sua ferramenta
cartográfica. A comunidade-piloto é identificada editorialmente como
“Mobilidade e Acessibilidade”, sem criar fixture ou registro remoto.

Nenhum domínio, Supabase remoto ou workflow foi alterado neste tijolo. O
diagnóstico canônico está em `reports/current/comun-tijolo-42-diagnostico.md`.

Evidência terminal:

- FAST: aprovado;
- FULL: aprovado no run `30122395558`;
- Vercel Preview: aprovado;
- PR #31 mesclada normalmente;
- CI da `main`: aprovado no run `30125728267`;
- Vercel da `main`: aprovado no merge SHA;
- `/comun`, `/comun/calcadas` e `/comun/participar`: HTTP 200;
- Minha Participação e Caixa: HTTP 307 esperado;
- PMTiles: HTTP 206;
- `/comun/pautas/calcadas-em-circulacao`: HTTP 404;
- nenhuma resposta 5xx;
- navegação pauta ↔ mapa: reprovada pelo 404.

O bloqueio `NO_GO_PAUTA_CANONICA_404` acima é evidência histórica do primeiro
smoke do Tijolo 42 e foi encerrado pela PR #32. Nenhuma branch ou PR do Tijolo
43 foi criada durante esse fechamento.

O Tijolo 42.1 adiciona um fallback editorial honesto e sem fixture remota.
Registro público real sempre vence; registro privado/arquivado e falha de
consulta não são convertidos em pauta pública. A validação local passou com
typecheck, lint, 263/263 unitários, build, dois smokes, 14/14 E2E, 8/8 Axe e
fixtures limpas.

## Fechamento vigente — Tijolo 42.1

- PR #32 mesclada por merge commit;
- branch HEAD: `a52c625e2221345311a93d6931491d3887e478cd`;
- merge SHA: `a989d517cd56d1051176eeb16675b019936e3244`;
- FULL pré-merge: run `30128663490`, aprovado;
- CI pós-merge: run `30130058303`, aprovado;
- Vercel Production deployment `5595972121`: aprovado;
- pauta canônica, Home, pautas, mapa e participação: HTTP 200;
- áreas autenticadas: HTTP 307 esperado;
- PMTiles: HTTP 206;
- pauta ↔ mapa: aprovada;
- nenhuma resposta 5xx ou marcador sensível encontrado nas superfícies
  inspecionadas.

Decisão vigente: `COMUN_NUCLEO_VIVO_PRODUCTION_GREEN`.

O Tijolo 43 está `TIJOLO_43_UNBLOCKED`; o gate humano permanece 0/3 e o piloto
público permanece fechado.

## Início controlado do Tijolo 43

A PR documental #33 foi mesclada no SHA
`9b067d8302eb42e443afb6580b347d8a2cc941ec`. O smoke subsequente encontrou um
identificador editorial local usado como chave React no payload RSC de Home e
Pautas. A correção mínima da PR #34 foi mesclada no SHA
`4a9e2d4f341e755b3a1aa969c26344f4f4334bae`.

O novo smoke confirmou Home, Pautas, pauta canônica, Mapa e Participar com HTTP
200, PMTiles com HTTP 206, navegação bidirecional e ausência dos marcadores
sensíveis auditados. Só então foi criada a branch
`codex/tijolo-43-calcadas-ciclo-operacional`.

O diagnóstico inicial foi corrigido: a proteção do texto privado, o lock
recuperável e a relação durável de duplicidade exigiram a migration local
`20260724233256_comun_sidewalk_operational_hardening.sql`. Ela não foi aplicada
remotamente. O gate humano permanece 0/3 e o piloto público fechado.

## Checkpoint CI do Tijolo 43

O SHA anterior corrigiu o teste frágil de marcadores e tornou o rehearsal
diagnosticável por checkout imutável e artifact sanitizado. No run
`30141194406`, o PRE real coincidiu com o contrato, mas a primeira passagem
falhou com `SOLO_CANONICAL_DATABASE_QUERY_FAILED`; POST e segunda passagem não
foram alcançados. FAST falhou nos três testes de transporte Docker do
PostgreSQL temporário no Ubuntu, enquanto os gates locais seguem verdes.
Vercel Preview passou; FULL foi pulado e não foi disparado manualmente.

Não houve Supabase remoto, migration remota, merge, deploy manual, domínio ou
promoção. A correção da conectividade Docker no CI é o próximo bloqueio antes
de qualquer promoção.

## Patch T43.1 — transporte PostgreSQL no Ubuntu

O diagnóstico confirmou que o cliente `psql` e o banco são containers irmãos:
no GitHub Ubuntu, a porta publicada em loopback não é uma rota entre eles. O
patch usa uma rede Docker explícita e alias interno (`postgres-test` nos
testes; `db` no rehearsal), sem ampliar a allowlist local nem alterar a
migration ou o manifesto congelado. Os 18 testes do runner passaram em duas
execuções locais consecutivas; typecheck, lint, 266 unitários, validator SQL,
`solo:test` e smoke operacional passaram.

Na mesma rodada, a stack Supabase local não estava iniciada: faltava
`supabase_db_nvmdszymrtacfehdynpg`. Portanto runtime smoke, matriz RLS e DB
lint não têm novo resultado verde e a decisão continua
`COMUN_CALCADAS_FAST_PATCH_REQUIRED`. O FAST e o rehearsal no GitHub devem
passar no mesmo SHA antes de qualquer FULL. Gate humano permanece 0/3 e piloto
público fechado.

## Hardening

A release `20260723220112-canonical-security-hardening` ficou executável pelo
role `postgres` disponível. Ela corrige integralmente o escopo controlável pelo
COMUN e mantém os defaults de `supabase_admin` como observações gerenciadas.

Foram preparados:

- view pública `security_invoker`, RLS e grants de coluna sanitizados;
- defaults futuros pertencentes a `postgres` endurecidos;
- duas funções definer com `search_path=pg_catalog`;
- trigger `auth.on_auth_user_created` preservado;
- ledger privado `public.comun_schema_releases`;
- lint obrigatório de privilégios explícitos;
- runner de release por manifesto, checksum e fingerprints;
- CI com diagnóstico separado e repetição única para 502 transitório.

## Decisão histórica

Estado técnico anteriormente comprovado após FAST, FULL e Vercel no mesmo HEAD:
`COMUN_SECURITY_HARDENING_READY_TO_PROMOTE`.

Evidências:

- captura sanitizada determinística: run `30054188587`;
- FAST: run `30054740000`, sucesso;
- FULL: run `30054740000`, sucesso;
- Vercel Preview: sucesso;
- fingerprint pré:
  `b4d66ad06d1aba22930609f58b0ea1696fbfe5747a21f141dcedc97766d672de`;
- fingerprint pós inicialmente projetado:
  `82989755711d63a14d209cc2074fd3656288e74fb030331dac282acac7a8265b`.

Não houve migration remota, merge, alteração de domínio ou mudança em
produção. O gate humano permanece 0/3 e o piloto público fechado.

## Promoção final

O run `30057245879` criou o checkpoint sanitizado `8583227864`, mas interrompeu
o runner forward-only com `SOLO_FORWARD_ONLY_FAILED`. A captura read-only
`30057335078` confirmou rollback total: fingerprint pré inalterado, 9
bloqueantes e ledger ausente. A label foi removida, a PR permanece aberta e a
main não avançou.

## Correção do runner em validação

A causa exata foi reproduzida com PostgreSQL 17: a consulta JSON era executada
no formato tabular padrão do `psql`, e o runner aplicava `JSON.parse` sobre
cabeçalho, separador, documento e contador `(1 row)`. A exceção nativa não
recebia marcador próprio, contribuindo para o diagnóstico genérico no workflow.

O patch separa `executeSql`, `queryJson` e `queryScalar`, canoniza o transporte,
sanitiza todas as falhas de processo e adiciona um preflight remoto
estritamente read-only no `COMUN Nightly`. A migration e seu checksum
permanecem idênticos.

O primeiro ensaio read-only, run `30061056715`, comprovou que o baseline
compacto não contém por contrato triggers de `auth`; a validação antiga
procurava `auth.on_auth_user_created` na projeção errada. O patch passou a
consultar somente a contagem desse trigger em `pg_catalog`, por `queryScalar`.
Nenhuma escrita ocorreu nesse diagnóstico.

Evidências do HEAD técnico corrigido
`12fbb437324086f92d8beefc586d335b5652f8ed`:

- FAST e FULL: run `30061223511`, sucesso;
- Vercel Preview: sucesso;
- preflight remoto read-only: run `30062302321`, sucesso;
- fingerprint remoto:
  `b4d66ad06d1aba22930609f58b0ea1696fbfe5747a21f141dcedc97766d672de`;
- bloqueantes: 9; observações de plataforma: 1; ledger: ausente;
- todos os demais jobs do `COMUN Nightly` foram ignorados.

Essa decisão foi superada pela segunda tentativa controlada.

## Estado canônico após a segunda tentativa

No run `30099519716`, a migration foi confirmada e aplicada dentro da transação,
mas o pós-check interrompeu a promoção com
`SOLO_CANONICAL_POST_FINGERPRINT_MISMATCH`. A captura read-only
`30099668279` confirmou:

- fingerprint real:
  `a8dc235b2f0a1fa2554a7dd0db9c46372867fc21a5f610b47d008e1c15c46197`;
- zero achados bloqueantes;
- uma observação de plataforma e três defaults gerenciados;
- ledger presente;
- cleanup dry-run sem objetos elegíveis;
- `main` ainda em `b2f6733dacd15ec21601ed6b6837b42213b87d70`;
- nenhum merge e nenhum deployment novo.

A divergência ficou limitada a dois privilégios que o projetor pressupunha,
mas a migration corretamente não concedeu: `INSERT` e `DELETE` no ledger para
`service_role`. O contrato local foi reconciliado com o estado remoto mais
restritivo, mantendo os bytes e o checksum da migration aplicada. A tupla
histórica do ledger é aceita apenas por valor completo explicitamente
registrado; qualquer outra divergência continua bloqueante.

## Fechamento da terceira tentativa

O contrato reconciliado foi validado no HEAD
`7f19aa6b0894a68194f5f20b6236382bf1e8e006`:

- FAST e FULL: run `30102040827`, sucesso;
- preflight remoto estritamente read-only: run `30103889675`, sucesso;
- fingerprint remoto:
  `a8dc235b2f0a1fa2554a7dd0db9c46372867fc21a5f610b47d008e1c15c46197`;
- zero achados bloqueantes;
- uma observação de plataforma;
- ledger presente e aceito pelo contrato histórico exato;
- nenhum job mutável executado no preflight.

A autorização controlada disparou o run `30104161976`. O runner:

- criou o checkpoint sanitizado `8600891303`;
- validou manifesto, checksum e SQL;
- reconheceu `COMUN_CANONICAL_SECURITY_HARDENING_ALREADY_APPLIED`, sem repetir
  a migration;
- concluiu DB lint e postflight remoto;
- executou cleanup somente em dry-run, com zero objetos elegíveis;
- interrompeu antes do merge em `Validate immutable Vercel preview`, com
  `SOLO_VERCEL_PREVIEW_CURL_FAILED:/comun:1`.

Como a falha ocorreu antes do merge, os passos de merge, deployment da `main`,
reconciliação de domínio, smoke público e marcador verde de produção foram
ignorados. A label `comun:promover` foi removida imediatamente. A PR #30
permanece aberta e sem merge; a `main` permanece em
`b2f6733dacd15ec21601ed6b6837b42213b87d70`.

Decisão vigente: `SOLO_PROMOTION_FAILED`. O hardening remoto está aplicado e
sem achados bloqueantes, mas a promoção da aplicação não foi concluída. O
próximo trabalho deve diagnosticar a chamada autenticada ao preview da Vercel
sem repetir a migration. O gate humano permanece 0/3 e o piloto público
continua fechado.

## Correção isolada do preview protegido

A causa inferior foi confirmada como `VERCEL_SCOPE_FAILED`. O runner combinava
rota relativa, URL sem protocolo e um slug de escopo que o token do Actions não
podia acessar. O cliente agora usa a URL HTTPS completa do deployment e não
depende de slug; o contrato canônico é comprovado pelos IDs de projeto e time,
SHA, `READY` e target `preview`.

O modo manual `preview_preflight=true` executa somente checkout, Node,
imutabilidade do SHA, cliente Vercel e artifact sanitizado. Ele não recebe
secrets de banco e mantém release preflight, FULL local, cleanup, worker,
health de produção e baseline capture como `skipped`.

No HEAD `7a86cc8585ae81a8b732346220b30dbaa29f8578`, FAST, FULL e
Vercel passaram. O preflight isolado `30111887097` bloqueou antes das rotas
porque o CLI rejeitou o valor atual de `VERCEL_TOKEN` como inválido. O
deployment `dpl_41VBYab1Z6i6cBtr5Y266tJAZPyy` foi confirmado read-only como
`READY` no projeto e time canônicos por uma identidade Vercel separada.

Decisão vigente: `NO_GO_VERCEL_PREVIEW_CREDENTIAL`. A PR #30 permanece aberta,
sem merge e sem label de promoção; o gate humano permanece 0/3 e o piloto
público continua fechado.
Adendo Tijolo 43.1: FAST no SHA `5503e02` ficou verde e o rehearsal confirmou a rede interna em `db:5432`; a falha posterior era somente um delimitador de fingerprint no runner, já corrigido com teste de regressão. A decisão permanece `COMUN_CALCADAS_FAST_PATCH_REQUIRED`, sem FULL, promoção ou escrita remota.

# Tijolo 48.0E — COMUN Ônibus (local-only)

Em 2026-08-04, a branch `codex/tijolo-48-0e-comun-bus-foundation` foi criada a partir de `origin/main` em `f8efa8e1eb8370613a35e605ddb8d346b90a4676`. A fundação local do COMUN Ônibus está implementada e validada em Supabase descartável, com fixture sintética `FIX-01`, horários versionados, sessões de espera, observações e vínculo privado com Relata.

Estado: pronta para PR draft, ainda não integrada. `COMUN_BUS_LOCAL_PILOT` permanece desligada fora do laboratório. Não houve consulta ou escrita no Supabase remoto, envio para STMU, publicação de mapa ou acionamento de `launch_publicly`. Production continua dormente e `/comun/onibus` permanece 404 fora do ambiente local permitido.

Evidência: 20 tabelas privadas com RLS forçada, RPCs sem execução pública, 470 testes unitários, 5 viewports Playwright, zero rota desconhecida, zero `legacy_rendered` e zero P0/P1. Próximo gate é CI/Preview da PR; nenhum ensaio humano foi iniciado.

# Tijolo 48.0I — verificação Fiscaliza VR (04/08/2026)

O 48.0I está implementado em branch local-only a partir de `origin/main` `3beab754d99ab2048430a5124960b960cbf4a518`. As fontes foram reconciliadas: prazo geral atual `not_stated`, iluminação `30 dias` como estimativa de realização não legal e menção histórica de `48 horas` excluída de vencimentos. A entrada pública municipal redirecionou para `fiscalizavr.citysystems.com.br`, indisponível por DNS; não houve autenticação, preenchimento, submissão ou protocolo real. O resultado técnico é `COMUN_FISCALIZA_OPERATIONAL_OBSERVATION_PARTIAL`.

A migration local-only `20260804164500_comun_fiscaliza_observation_local.sql` (SHA-256 `6924e6de8053d785058dec5cb77aae4d1503efe387d959d34d35cc7c73b14aca`) adiciona catálogo de fontes e observações com RLS forçada/service-role-only. A abertura assistida exige flag separada, URL HTTPS exata e gesto explícito; host inesperado é rejeitado. Production, Supabase remoto, `launch_publicly` e todas as flags públicas permanecem inalterados. Próximo tijolo: `48.0J — Conectar Calçadas ao encaminhamento`.

# Tijolo 48.0J — conexão Calçadas, Relata e Carteira (04/08/2026)

Branch local-only: `codex/tijolo-48-0j-sidewalk-relata-forwarding`, baseada em `origin/main` `8beb93415bd6deddd1ca3ca3ff0d473866f9b1e6`.

Foi criada a ponte aditiva `20260804203000_comun_sidewalk_relata_connection_local.sql` (SHA-256 `76f42a963a1e9a167090938aaba24c37f95e9add8597184332bff0e57d05355a`), com RLS forçada, RPCs server-only, idempotência e eventos append-only. Calçadas permanece fonte da verdade das observações e derivadas públicas; Relata permanece fonte da verdade do relato privado, protocolo COMUN, evidências e retirada; Carteira organiza a relação; encaminhamento prepara pacote.

Rehearsal sintético verde: registro de calçada → protocolo COMUN → item da Carteira → jurisdição pública explícita → pacote `package_ready_channel_degraded`, sem publicação, envio externo ou duplicação de Storage. O adapter Carta 165 registra inspeção estimada em 7 dias e execução estimada em 30 dias, ambas não legais.

Correção semântica do Fiscaliza: estado máximo automático agora `public_entry_observed_auth_boundary_pending`; destino legado indisponível e autenticação/formulário/submissão/protocolo continuam não confirmados. Nenhum link de abertura é oferecido.

Production e Supabase remoto não foram consultados de forma mutável ou alterados; flags permanecem desligadas. Próximo tijolo: `48.0K — Verificação operacional da STMU`.

Faixa 48.0J-N1: o smoke genérico foi classificado como `SMOKE_WRONG_ENVIRONMENT`, pois `localhost:3000` estava ocupado por outro laboratório e a fixture era criada em stack/porta diferentes. Com aplicação e fixture no mesmo ambiente local descartável (`localhost:3100`), `smoke:no-leak-http` passou com teardown limpo. Nenhum 404 foi aceito como sucesso e nenhum gate foi suprimido; PR #164 foi atualizada para merge.

# Tijolo 48.0M — fechamento técnico (05/08/2026)

O HEAD local `a930ff1c22b5a263ad96a87123eeba107317267d` permanece forward-only
desde `a4910c50680cdde09808364c3cb83669baebaba0`. O ambiente de ensaio foi
confirmado pelo responsável do produto em computador e celular na LAN, com
cadastro por e-mail, login, onboarding, Minha Participação e Relata acessíveis.
Resultado adicional: `COMUN_OWNER_OPERATOR_CORE_FLOW_SMOKE_GREEN`.

Isso não encerra o ensaio humano integrado: `COMUN_INTEGRATED_HUMAN_REHEARSAL_INCOMPLETE`.
Não há participantes formais, tempos, taxa de conclusão ou acionamento de
canal externo. Google real continua `provider_configuration_pending`;
`launch_publicly=false`.

A suíte local descartável passou RLS, grants, todas as rehearsals de banco,
restore, cleanup, captura E2E (10/10), Carteira (5/5), Ônibus (5/5) e
forwarding (5/5). Nenhuma migration remota ou flag pública foi ativada.

# 48.1A — plano allowlisted

O 48.1A está somente em diagnóstico/preflight: dependências, checksums,
rollback e métricas sanitizadas foram documentados; preflight remoto e
checkpoint ainda precisam ser executados antes de qualquer promoção. Ônibus,
STMU e encaminhamento ficam fora do primeiro conjunto core. Nenhuma expansão
fechada, piloto público ou ativação ampla foi iniciada.

## Pós-merge e bloqueio do preflight remoto

O 48.0M foi mesclado pela PR #170 no SHA
`dcc0baa414c114f2ced7e8d57aae1f32af1af233`, com CI/Preview verdes e Production
dormente. O smoke read-only pós-merge preservou as rotas públicas e encontrou
405 em métodos sem handler de `/api/comun/relata`; a correção focal está na
branch `codex/tijolo-48-1a-owner-allowlisted-pilot`.

O preflight remoto do 48.1A foi bloqueado por permissão no projeto Supabase
correto (`COMUN_48_1A_REMOTE_PREFLIGHT_BLOCKED_PROJECT_PERMISSION`). Não houve
consulta de schema/ledger/RLS, migration remota, criação de allowlist, ativação
de flag, piloto ou envio externo. O próximo passo é recuperar a autorização
read-only do projeto antes de qualquer promoção controlada.

O responsável liberou uma sessão Chrome autenticada para leitura manual. O
painel confirmou o projeto-alvo e permitiu observar, sem mutação, o catálogo de
tabelas públicas, a tela de migrations, os buckets e a tela de provedores. As
buscas públicas por `wallet`, `particip` e `relata` não retornaram tabela; a
tela de migrations não mostrou entradas; os buckets privados existentes
incluem `comun-report-attachments` e `comun-public-safe-attachments`, mas não
há bucket `comun-relata-private` visível. Isso é evidência de UI, não prova de
schema privado, RLS, grants ou ledger. O blocker permanece e nenhuma promoção
foi tentada.

## Fechamento 48.1A

PR #171 foi integrada pelo head SHA exato, com merge SHA
`1d8774491c87cc9d9dbc907da5b6b9cc9e8b5cfd`; a branch foi removida. Production
foi revalidada após propagação: `/comun`, `/comun/relatar` e `/comun/calcadas`
em 200; todos os métodos de `/api/comun/relata` em 404; nenhuma flag pública,
allowlist, migration ou escrita remota.

Resultado: `COMUN_48_1A_MERGED_DORMANT_PREFLIGHT_INFRA_GREEN_REMOTE_PREFLIGHT_BLOCKED_PROJECT_PERMISSION`.

A CLI Supabase 2.111.0, autenticada por perfil local, lista o projeto-alvo;
as variáveis de token/DB/service role estão ausentes no processo. O MCP lista
apenas projetos não relacionados e nega `get_project` do alvo. Permissão de
banco read-only, ledger, RLS e grants permanecem não comprovados. Piloto,
Google real e `launch_publicly` continuam fechados.

## Checkpoint pós-48.1A e 48.0M-H1 (05/08/2026)

O fechamento documental da 48.1A foi integrado pela PR #172 no merge SHA
`c35776513ea3141171b843f696edb1df81232979`; a branch foi removida. O smoke
read-only pós-merge confirmou `/comun`, `/comun/relatar` e `/comun/calcadas`
em 200. Relata, Ônibus, forwarding, STMU e o ambiente de ensaio continuam
dormentes em 404, e os métodos GET/POST/PUT/PATCH/DELETE/HEAD/OPTIONS do
endpoint dormente do Relata também respondem 404.

Resultado documental: `COMUN_48_1A_DOCUMENTATION_MERGED_REMOTE_PREFLIGHT_STILL_PERMISSION_BLOCKED`.

O roteiro do 48.0M-H1 está preparado, mas a sessão integrada real não foi
executada neste checkpoint. Não há três participantes, medições, taxa de
conclusão ou achados de usabilidade para contabilizar. O estado permanece
`COMUN_INTEGRATED_HUMAN_REHEARSAL_INCOMPLETE`; não houve piloto, envio externo,
ativação de flag ou `launch_publicly`.

## 48.1B — preflight do piloto em Production (05/08/2026)

A branch `codex/tijolo-48-1b-production-domain-pilot` foi criada a partir de
`origin/main` `7e2d259e193c0d8841c57b89002f551c9a9c2ad`. A CLI Supabase 2.111.0
listou o projeto alvo e o vínculo local foi estabelecido sem mutação. A
consulta `migration list --linked` mostrou um drift histórico: a migration
`20260724233256_comun_sidewalk_operational_hardening.sql` não aparece no
histórico remoto, apesar de migrations posteriores constarem como aplicadas.

`supabase db push --linked --dry-run` recusou prosseguir (`LegacyDbPushMissingRemoteError`)
e sugeriu `--include-all`. Não foi usado `--include-all`, `migration repair`,
reset, seed ou `db push` mutável. Nenhuma flag, Auth, Google, Carteira,
Relata V2, Calçadas, Ônibus, Observatórios ou forwarding foi ativado.

Resultado: `COMUN_48_1B_BLOCKED_REMOTE_MIGRATION_PLAN_DRIFT`. Production,
Supabase remoto, `launch_publicly` e registros de usuários permanecem
inalterados. O piloto não deve avançar até a reconciliação forward-only do
histórico.

## 48.1B-R1 — reconciliação do ledger externo (05/08/2026)

A tentativa R1 executou o workflow canônico read-only no run `31011836481`.
O ledger próprio de Calçadas apareceu como `PRESENT_ACCEPTED` e o fingerprint
scoped coincidiu com o POST local, mas a classificação canônica foi
`INSUFFICIENT_READ_PERMISSION`, pois os gates globais não puderam ser provados.
O CLI continua vendo `20260724233256` ausente e o dry-run continua recusando a
fila com sugestão de `--include-all`; essa opção não foi usada. Resultado
vigente: `COMUN_48_1B_R1_BLOCKED_SIDEWALK_REMOTE_STATE_UNPROVEN`.

Não houve migration, repair, reset, seed, flags, piloto, alteração de
Production ou escrita remota. A PR #174 permanece draft e o próximo passo só
é permitido após prova exata do estado remoto e baseline de CLI vazio.

## 48.1B-R1A — classificação escopada e reconciliação (05/08/2026)

O classificador passou a separar prova escopada de evolução global. O replay do
run `31011836481` confirmou `APPLIED_EXACT_SCOPED_EXTERNAL_LEDGER`; o fingerprint
global divergente foi classificado como
`EXPECTED_GLOBAL_EVOLUTION_AFTER_SCOPED_RELEASE`. A exceção externa do ledger
foi validada sem alterar a migration histórica.

A quarentena temporária isolou apenas a migration excepcional e as migrations
com declaração explícita local-only, restaurando tudo com SHA confirmado. O
dry-run reconciliado ficou com uma única pendência não classificada:
`20260805090000_comun_member_profile_territory_selection.sql`. Resultado
vigente: `COMUN_48_1B_R1A_BLOCKED_PENDING_MIGRATION_CLASSIFICATION`. Nenhuma
flag, piloto, deployment ou escrita remota foi executada.

## 48.1B-R1B — baseline CLI reconciliado (05/08/2026)

O manifesto local-only de território foi reconhecido e validado exatamente;
as migrations local-only permaneceram fora do plano remoto. A quarentena foi
restaurada e o dry-run retornou `upToDate=true` com arrays vazios.

Resultado vigente: `COMUN_48_1B_R1_EXTERNAL_LEDGER_AND_LOCAL_ONLY_RECONCILED_CLI_BASELINE_EMPTY`.
Isso não ativa Production nem o piloto; R2 pode ser preparado, sem escrita
remota.

## 48.1B-R2 — bundle novo preparado (05/08/2026)

Com o baseline R1B vazio, foi criado um bundle novo e aditivo para conta,
Carteira, Relata V2 privado, evidências e localização. A migration tem SHA
`fefb9149…`, RLS forçada e revogações para `public`, `anon` e `authenticated`.

Resultado: `COMUN_48_1B_R2_PRODUCTION_BUNDLE_READY_FOR_EXACT_DRY_RUN`.
Nenhuma escrita remota, promoção, flag ou piloto ocorreu.

## 48.1B-R2A — alinhamento runtime/schema (05/08/2026)

O inventário do runtime mostrou que o bundle R2 inicial usava tabelas
`comun_production_*` que não eram chamadas pelas APIs. A migration candidata
foi redesenhada, ainda não aplicada remotamente, para usar os contratos
canônicos de Relata, Carteira e evidências, incluindo vínculo explícito
Conta–Carteira, RPCs server-only, RLS forçada, grants e Storage privado.
O SHA atual é `ffcfc1b22d889452b8c57817393b1b9ea24fca862abc04344f58bae081d2f4ab`.

Estado vigente: `COMUN_48_1B_R2A_L1_BLOCKED_RUNTIME_E2E_SCOPE`.

Rehearsal L1: workdirs A/B isolados verdes; Relata/Carteira core, Storage privado,
RLS/grants, rollback por flags e dry-run read-only do SHA atual comprovados. O
runner amplo de evidências/coletivos permanece fora do escopo desta migration
R2A; o terminal continua bloqueado até a cobertura E2E completa.
O resultado R2 anterior permanece apenas como histórico. Não houve migration,
flag, Google, allowlist, deployment de piloto, escrita remota ou
`launch_publicly`. O próximo gate é validar duas rehearsals locais em bancos
descartáveis, E2E do runtime, auditoria RLS/grants, rollback e dry-run exato.

## 48.1B-R2A-R2 — checkpoint atual (2026-08-05)

- branch: `codex/tijolo-48-1b-production-domain-pilot`;
- migration candidata: `20260805130000_comun_production_pilot_core_bundle.sql`;
- checksum atual: `0648404b49be00b2d46dc5431c1bde4cb0072bf0f27a1c8f42075bb522cdd4f9`;
- topologia: migrations local-only separadas em `supabase/local-migrations`;
- localização/anexos/estado sanitizado: contratos e RPCs presentes;
- coletivos: adiados e bloqueados por `COMUN_RELATA_COLLECTIVE_ENABLED`;
- static gates: topology, release, privileges, typecheck, lint e build verdes;
- dry-run CLI read-only: somente a migration candidata, sem escrita;
- E2E privado HTTP completo: pendente por falha do daemon Docker na repetição;
- resultado: `COMUN_48_1B_R2A_R2_BLOCKED_RUNTIME_E2E_SCOPE`;
- Production, flags públicas, Google, allowlist, piloto e `launch_publicly`: inalterados/fechados.

## 48.1B-R2A-E2E — lane CI (2026-08-05)

- head: `f303fb44a08d3dc0300fc970be1231579e053499`;
- tentativa local limitada: Docker Desktop indisponível;
- lane adicionada: `COMUN R2A / private runtime E2E`;
- escopo: Relata, localização, anexos, Carteira, conta explícita e isolamento;
- coletivos: desabilitados, sem chamada RPC;
- PR #174: permanece draft; lane CI reproduzível encontrou `42702 ambiguous_column`
  na RPC `public.comun_relata_begin_attachment`;
- resultado: `COMUN_48_1B_R2A_BLOCKED_RUNTIME_E2E_FUNCTIONAL_FAILURE`;
- nenhum schema remoto, flag pública, Google, allowlist, piloto ou `launch_publicly` foi alterado.

## 48.1B-R2A-F1 — hotfix da RPC de anexos (2026-08-05)

- head: `97b6ea496ccd9838778557aba79b038b6a907fe0`;
- candidata preservada com SHA `0648404b49be00b2d46dc5431c1bde4cb0072bf0f27a1c8f42075bb522cdd4f9`;
- hotfix forward-only: `20260805201000_comun_production_pilot_attachment_rpc_fix.sql`;
- hotfix SHA: `f092f26df14fe9f724be9b3a6ad9d46fb5d73145d8cf2072933ac0c5917addcc`;
- correção: qualificação `a.label_index`, variável `v_label_index` e lock do relatório autorizado;
- privilégios: somente `service_role`;
- static gates: validator, topology, typecheck, lint e build verdes;
- Docker local: indisponível; CI descartável `31047472852` aplicou a cadeia e executou o E2E;
- PR #174: draft;
- resultado vigente: `COMUN_48_1B_R2A_BLOCKED_RUNTIME_E2E_FUNCTIONAL_FAILURE`;
- finding adicional: `public.comun_participation_wallet_link_account` falha com SQLSTATE
  `42702` por `ON CONFLICT(wallet_id,user_id)` ambíguo; nenhum schema remoto foi alterado;
- schema remoto, flags, Google, allowlist, piloto e `launch_publicly`: inalterados/fechados.

## 48.1B-R2A-F2 — hotfix Carteira–conta (2026-08-05)

- branch: `codex/tijolo-48-1b-production-domain-pilot`;
- head: `9e51e5cb6d2bfa0c36a89a82102a0beb56e0e60f`;
- migration nova: `20260805212659_comun_production_pilot_wallet_account_rpc_fix.sql`;
- SHA: `0d4b9a271a169184d45020bdad3ef11c8e1a01bd6d256848787b98b5d04a3382`;
- candidata e hotfix de anexos preservados byte a byte;
- correção: `ON CONFLICT ON CONSTRAINT` qualificado na RPC de vínculo Carteira–conta;
- static gates: topology, release, privilégios, typecheck, lint e build verdes;
- primeira lane CI: stack efêmera travada antes do banco;
- cancelamento anterior ocorreu antes de health, Postgres ou E2E; não prova indisponibilidade do Docker/Supabase;
- classificação corrigida para: `COMUN_48_1B_R2A_BLOCKED_CI_STARTUP_CANCELLED_BEFORE_HEALTH_RESULT`;
- CI1 aplicado: artifacts pré-start, diagnóstico sanitizado, stack mínima, heartbeat e limite de 12 minutos;
- novo attempt neste SHA: pendente;
- PR #174 continua draft; sem READY, merge, promoção remota ou flags;
- Supabase remoto, Google, piloto e `launch_publicly`: inalterados/fechados.

## 48.1B-R2A-CI1 — inicialização observável e cleanup (2026-08-06)

- run `31056455947` iniciou a stack descartável com classificação
  `COMUN_48_1B_R2A_CI_STARTUP_GREEN`;
- Auth/PostgREST/Storage responderam `200/200/400` e o Postgres passou no probe;
- E2E privado passou como
  `COMUN_48_1B_R2A_PRIVATE_EVIDENCE_ACCOUNT_E2E_GREEN`;
- o job foi cancelado pelo limite do runner durante cleanup, resultando em
  `COMUN_48_1B_R2A_BLOCKED_E2E_CLEANUP`;
- artifact revelou chaves locais no log sanitizado; redação por rótulo/JSON foi
  corrigida e o stop agora possui timeout de 120 segundos;
- novo attempt é obrigatório; PR #174 permanece draft;
- nenhum acesso ou escrita remota, migration, flag, Google, piloto ou
  `launch_publicly` ocorreu.

O retry `31058759867` repetiu startup e E2E verdes, mas também terminou por
cancelamento do runner durante cleanup (`COMUN_48_1B_R2A_BLOCKED_E2E_CLEANUP`).
O patch corrente usa timeout com kill escalonado e remove apenas containers
rotulados do laboratório antes da verificação final. Um terceiro attempt deve
confirmar `COMUN_R2A_E2E_CLEANUP_DONE` antes de qualquer READY/merge.

O attempt `31063191091` confirmou startup, E2E privado, cleanup e artefatos
sanitizados verdes. A execução completa continua bloqueada por
`COMUN_48_1B_R2A_BLOCKED_PREEXISTING_SCHEMA_SCOPE`: jornadas agregadas assumem
`territory_municipality` em `comun_member_profiles`, mas a coluna existe apenas
na migration local-only `supabase/local-migrations/20260805090000_comun_member_profile_territory_selection.sql`.
Não houve promoção dessa migration, escrita remota, ativação de flags, Google,
piloto ou `launch_publicly`. A PR #174 permanece draft.

## 48.1B-R2A-S1 — onboarding mínimo e catálogo territorial local-only (2026-08-06)

- resolver canônico: `lib/comun-territory-profile.ts`;
- Production: `COMUN_TERRITORY_PROFILE_ENABLED=disabled` por padrão;
- alias local: somente com `ALLOW_LOCAL_TESTS=true` e fora de Production;
- onboarding mínimo e Calçadas concluem sem as colunas territoriais;
- payload mínimo não inclui campos territoriais quando a capacidade está off;
- lane separada `COMUN Territory / local-only contract` aplica explicitamente
  a migration local e verifica persistência privada de cidade/bairro;
- cadeia R2A: preservada, sem quarta migration;
- unitários: 502/502; typecheck e lint focais verdes;
- nenhum schema remoto, flag, Google, piloto ou `launch_publicly` foi alterado;
- PR #174 aguarda CI nova antes de READY/merge.

### Fechamento técnico S1 (2026-08-06)

- head final: `9ab125d433fe99c5e4e918b5cc59117155a1d76a`;
- Quality Performance e lane territorial local-only verdes no run `31129274128`;
- topology e runtime E2E privado verdes no run `31130644215`;
- cadeia R2A preservada, sem promoção da migration territorial local-only;
- nenhuma flag, Google, piloto, migration remota ou `launch_publicly` foi alterada;
- PR #174 pode avançar para READY/merge documental e técnico;
- promoção remota continua separada, condicionada a dry-run exato das três
  migrations R2A e sem promoção territorial.

### Pós-merge e promoção R2A (2026-08-06)

- PR #174 mesclada; merge commit `a0eda5cc7ba7e1ae9e7cf74fa9d9f5c24950d378`;
- dry-run remoto exato e promoção concluída somente para as três migrations R2A;
- migration territorial local-only não foi promovida;
- postflight read-only confirmou RLS/force-RLS, grants públicos ausentes nas
  tabelas escopadas, RPCs server-only e bucket privado;
- `supabase db lint --linked` mantém apenas o finding preexistente de
  `comun_search_candidates`, fora do escopo R2A;
- smoke de Production: `/comun=200`, `/comun/relatar=200`,
  `/comun/calcadas=200`; Relata novo, Ônibus e APIs de piloto `404`;
- flags, Google, allowlist, piloto e `launch_publicly` permanecem fechados;
- resultado: `COMUN_48_1B_R2A_REMOTE_SCHEMA_PROMOTED_DOMAIN_STABLE_FLAGS_OFF`.

## 48.1B-P1T — território opcional do perfil (2026-08-06)

- Baseline remoto confirmado em `6bd9bd86630364b9acecce7ae4966903639ece4f`.
- Leitura remota classificou `public.comun_member_profiles` como `COMUN_P1T_REMOTE_TERRITORY_ABSENT`.
- Migration nova criada: `20260806235454_comun_member_profile_optional_territory.sql`.
- SHA-256: `1173bbddeafdcb929bee4eb7594e74fa6465af87421c0b0fe7ca7c549f11a1f5`.
- A migration local-only `20260805090000` não foi movida nem promovida.
- Flags, Google, piloto e `launch_publicly` continuam fechados.
- PR #177 integrada em `c49d00878915c1559ec3e09fa2762ba91c2f4f9b`.
- CI, lane descartável e dry-run exato verdes; migration P1T promovida remotamente com flags desligadas.
- RLS/grants preservados e smoke de domínio verde.
- Relata, Google, piloto e `launch_publicly` permanecem fechados.
- Resultado: `COMUN_48_1B_P1T_REMOTE_TERRITORY_SCHEMA_GREEN_FLAG_OFF`.

## 48.1B-P1 — Conta e Carteira reais no domínio (2026-08-06)

- branch de implementação: `codex/48-1b-p1-account-wallet-domain`;
- baseline: `903c7519658395eba7e9b0437c1cb236ffbaea38`;
- sem nova migration: o schema remoto de Conta, perfil e Carteira já foi comprovado;
- cadastro passou a exigir `COMMUNITY_REGISTRATION_MODE=open` explicitamente e trata confirmação de e-mail sem falso redirecionamento;
- refresh de sessão foi ampliado para autenticação comunitária, Minha Participação e APIs da Carteira;
- Carteira passou a aceitar flag canônica de produção, mantendo alias local-only e cookie Secure em produção;
- vínculo Conta–Carteira e desvinculação são explícitos;
- território permanece desligado; Google permanece desligado; Relata novo, Ônibus, forwarding e coletivos permanecem dormentes;
- `migration list --linked` e `db push --linked --dry-run` ficaram vazios após quarentena temporária apenas da release externa de Calçadas, restaurada com SHA íntegro;
- Docker local não respondeu; E2E descartável foi adicionado à CI sem credenciais remotas;
- status: `COMUN_48_1B_P1_REMOTE_PREFLIGHT_GREEN_SCHEMA_PRESENT`, aguardando CI E2E, PR e ativação staged;
- nenhum dado remoto foi criado ou alterado nesta etapa.

### 48.1B-P1 — checkpoint de integração (2026-08-07)

- PR #179 permanece draft no head `e0bfedbc71ee890ac8e321004f055779b89474f9`.
- Correção mecânica de Prettier aplicada em `app/actions.ts` e no painel/página
  de Minha Participação; unitários (504), typecheck, lint e build verdes.
- Lane CI descartável de Conta/Carteira verde no run `31139892110`.
- O único gate restante falhou por infraestrutura do runner: a suíte funcional
  de Núcleo passou 14/14, mas a etapa a11y perdeu o servidor local (`ERR_ABORTED`)
  em seis navegações; o retry focal ficou preso sem logs por mais de 16 minutos
  e foi cancelado.
- Não marcar READY, não mesclar e não executar ativação Vercel enquanto esse
  gate não estiver verde. Território, Google, Relata novo, flags e `launch_publicly`
  permanecem desligados; nenhuma migration ou escrita remota foi feita.
- Resultado atual: `COMUN_48_1B_P1_BLOCKED_CI_RUNTIME_INFRASTRUCTURE`.

### 48.1B-P1-CI1 — isolamento Quality Performance (2026-08-07)

- Adicionado `scripts/quality/run-isolated-a11y.mjs` com health gate inicial,
  monitor de vida, snapshots sanitizados de recursos, classificação de saída e
  cleanup por processo/grupo.
- Criada lane obrigatória `COMUN Quality / isolated a11y` na Quality Performance;
  a cobertura completa permanece obrigatória.
- Suítes a11y focais e WCAG do mega-job passaram a usar servidor explícito na
  porta `3037`, sem `PLAYWRIGHT webServer` concorrente.
- Build, unitários (504), typecheck, lint, sintaxe e formatação verdes; smoke
  local do executor verde.
- Nenhuma funcionalidade P1, migration, RPC, flag, Google ou Production foi
  alterada.
- O contrato estático de Quality Performance foi atualizado para a nova forma
  isolada de a11y; `npm run quality:test` permanece verde.
- Próximo gate: nova execução CI no head deste patch; ainda não marcar READY.

### 48.1B-P1-CI1 — resultado do retry (2026-08-07)

- Head: `6cf606ed728ff2201d8f520f63e0a44bacf0e0da`; run: `31144115752`.
- `COMUN Quality / isolated a11y` ficou verde; `pr-lane` e a lane territorial
  falharam antes das suítes por `502` do Supabase descartável durante restart
  dos containers.
- Um único retry focal reproduziu o mesmo erro upstream. Não houve novo retry,
  escrita remota ou mudança de produto.
- Resultado atual: `COMUN_48_1B_P1_BLOCKED_CI_RUNTIME_INFRASTRUCTURE`.
- PR #179 continua draft; Conta, Carteira, território, Google, Relata novo,
  Ônibus, forwarding, flags públicas e `launch_publicly` permanecem fechados.

### 48.1B-P1-CI1 — diagnóstico da reexecução `31144761069` (2026-08-07)

- O a11y isolado, rede e contratos territoriais ficaram verdes no head
  `b715da904994ee65560c5002e5a255ad1a30a2ed`.
- O `pr-lane` falhou somente na jornada integral: cinco viewports receberam
  `/comun/criar-conta?returnTo=...` em vez do onboarding esperado. O servidor
  estava vivo; não foi falha de processo nem `ERR_ABORTED`.
- Diagnóstico: `COMMUNITY_REGISTRATION_MODE=open` foi aplicado à lane de rede,
  mas não à `pr-lane`, que executa a jornada que cria a conta sintética.
- Patch CI-only: adicionar o env à `pr-lane`; nenhuma funcionalidade, schema,
  Auth, Carteira, migration, flag pública ou Production foi alterada.
- PR #179 permanece draft até a execução completa no novo SHA.

### 48.1B-P1-CI1 — fechamento e ativação staged (2026-08-07)

- Correção CI-only `6a48aaa` integrada; a execução `31145624724` passou Quality
  Performance completa e a11y isolado. E2E Conta/Carteira `31145624637` verde.
- PR #179 mesclada em `b9ed2dcde3d1f78e5c85ea5640e0305b35144eeb`.
- Deploy flags-off READY `qokdtmxdw`; smoke: `/comun`, `/comun/entrar`,
  `/comun/criar-conta`, `/comun/relatar`, `/comun/calcadas` 200; Wallet API,
  Relata novo e Ônibus dormentes 404.
- `COMMUNITY_REGISTRATION_MODE=open` ativado no deploy `3zavnu1uk`; formulário
  de criação público respondeu 200 sem aviso de cadastro fechado.
- `COMUN_PARTICIPATION_WALLET_ENABLED=enabled` ativado no deploy `iemr840o6`;
  Minha Participação respondeu 200 e Wallet API anônima retornou estado vazio
  sem criar registro.
- Território e Google continuam desligados. Não foi criado usuário/carteira
  sintética em Production: o ciclo de recuperação foi comprovado na CI
  descartável, mas não foi repetido remotamente para não deixar dados de teste
  nem disparar e-mail externo sem cleanup administrativo seguro.
- Estado: Conta e superfície da Carteira ativas; piloto de Relata, território,
  Google e `launch_publicly` continuam fechados.

## 48.1B-P2 — Relata textual privado (2026-08-07)

- Branch de implementação: `codex/48-1b-p2-relata-text-domain`, baseada no
  `origin/main` `76687bf06491b82b7062d99c2d6ba26b8c10574a`.
- Persistência ganhou a flag canônica `COMUN_RELATA_PERSISTENCE_ENABLED` para
  Production; o alias `COMUN_RELATA_LOCAL_PERSISTENCE` ficou restrito a testes
  locais com loopback e `ALLOW_LOCAL_TESTS=true`.
- Quick Capture V2 passou a renderizar texto sem foto, localização, mapa ou
  chaves de evidência quando `evidenceEnabled=false`.
- POST textual mantém classificação determinística, pergunta adaptativa,
  `captured_private`, protocolo COMUN, `noOfficialSend=true`, idempotência e
  associação compensável à Carteira.
- Tentativas de `hasPhoto=true` e telemetria de foto/localização são rejeitadas
  com a capacidade de evidência desligada; APIs de evidência permanecem 404.
- Unitários 506/506, typecheck, lint, build, topologia, release, privileges e
  contrato estático da lane P2 verdes.
- Foi adicionada lane CI descartável `COMUN P2 / private textual Relata E2E`,
  sem credenciais remotas, com cleanup obrigatório. O run final `31191438888`
  passou com `COMUN_P2_RELATA_TEXT_DISPOSABLE_E2E_GREEN`, sem snapshot público,
  sem anexos e sem resíduo; o artifact foi sanitizado após corrigir o redator
  para chaves tabulares do Storage. Docker/Supabase local não respondeu no host;
  a prova de runtime veio do laboratório CI efêmero.
- Nenhuma migration, escrita remota, flag de Production ou registro sintético
  remoto foi criado nesta etapa.
- PR #181 foi mesclada em `15ce47426bd9693a799faef4475cbe3762dc38d2`.
- Deployments staged: flags-off `dpl_7yFy7adBNW5LENNAmXC6tpUQJrzC`, persistência
  ON `dpl_ApZnWSgcneebNzJyPs9Q6EEnsxJn`, Quick Capture textual ON
  `dpl_542s3DLmDyTDur11Z4v3cxNBBt6k`.
- Smoke `https://comunsocial.online`: Quick Capture V2 200 sem foto/localização;
  modo detalhado 200; Conta, Carteira e Calçadas 200; Ônibus e APIs de evidência
  404; nenhum POST real. Estado: Conta ON, Carteira ON, Relata textual ON,
  evidências/território/Google/Ônibus/forwarding/publicação OFF,
  `launch_publicly=false`.

## 48.1B-P3A — Fotos privadas (2026-08-07)

- Branch de implementação: `codex/48-1b-p3a-private-attachments`, baseada em
  `origin/main=9f00890c61e9cf15f5527524e40b43c0e16ddf4f`.
- O fluxo foi separado por capacidade: fotos usam
  `COMUN_RELATA_ATTACHMENTS_ENABLED`; localização e agrupamento continuam
  independentes e desligados.
- O início de upload agora usa signed upload URL para o bucket privado; os
  bytes não atravessam a Function. A finalização server-side valida a
  quarentena e publica somente derivada privada WebP.
- Unitários 507/507, typecheck, lint e build verdes. Foi adicionada lane CI
  descartável `COMUN P3A / private attachments E2E` com cleanup obrigatório.
- O dry-run remoto foi vazio após a quarentena temporária e restauração íntegra
  da migration externa de Calçadas.
- O preflight de Storage/RLS/RPCs remoto não pôde ser concluído porque a sessão
  Vercel não entregou valor utilizável para `SUPABASE_SERVICE_ROLE_KEY`.
  Resultado: `COMUN_P3A_BLOCKED_REMOTE_ATTACHMENT_PREFLIGHT_PERMISSION`.
- Não houve deployment, flag, migration, fixture ou escrita remota. P3B não foi
  iniciado. `launch_publicly=false`.
- Head atual `545dd71` publicado na PR draft `#183`; a lane CI descartável
  passou nos runs `31205708682` e `31206331155`
  (`COMUN_P3A_ATTACHMENTS_DISPOSABLE_E2E_GREEN`).
  A PR permanece draft porque a prova remota do bucket/RLS/grants/RPC ainda
  está bloqueada por credencial server-side não disponível nesta sessão.
- O responsável informou rotação da chave `service_role` no Supabase, mas a
  nova credencial ainda não foi comprovada no ambiente seguro de execução; não
  usar chaves coladas no chat.
- Em 2026-08-07 houve uma tentativa de deploy a partir do worktree P3A por
  falha de troca para `main`; o alias foi revertido imediatamente para
  `dpl_542s3DLmDyTDur11Z4v3cxNBBt6k`. Smoke pós-rollback ficou verde e nenhuma
  fixture, migration, flag ou escrita remota ocorreu.
- O preflight remoto P3A foi posteriormente executado em deployment Production
  staged sem alias canônico (`dpl_J8Ksnhye8ztj6xnqmBrbRtY4KUHt`), usando a
  service role somente no runtime server-side. Bucket privado, superfície RPC,
  bloqueio anon e baseline R2A foram comprovados; o endpoint temporário foi
  removido antes do merge. Resultado: `COMUN_P3A_REMOTE_ATTACHMENT_PREFLIGHT_GREEN`.

### 48.1B-P3A — ativação de fotos privadas (2026-08-07)

- PR #183 mesclada em `6571c75acc49a234a1258ac8a588ee52ba76600d`.
- `COMUN_RELATA_ATTACHMENTS_ENABLED=enabled` ativada isoladamente no domínio;
  `COMUN_RELATA_LOCATION_ENABLED=disabled` e `COMUN_RELATA_COLLECTIVE_ENABLED=disabled`.
- `/comun/relatar` 200 com botão de foto; localização, agrupamento e seus endpoints
  permaneceram 404. Conta, Carteira e Relata textual continuaram ativos.
- A fixture sintética percorreu signed upload, Storage privado, finalização,
  leitura autorizada e retirada. Recibo inválido recebeu 404. O cleanup server-side
  confirmou zero objeto residual de quarentena/derivada e zero item ativo na
  Carteira; histórico retirado foi preservado por retenção.
- Resultado terminal: `COMUN_48_1B_P3A_PRIVATE_ATTACHMENTS_DOMAIN_GREEN_LOCATION_OFF`.
- 48.1B-P3B-C2: o cleanup autorizado foi comprovado por verificação read-only no
  run `31239240233`; localização/caso/relato ficaram retirados, carteira
  revogada, sem snapshots/coletivos/forwarding, `hardDeletes=0` e
  `plaintextLocationRead=false`.
- Foi criada a migration forward-only F1
  `20260808043000_comun_relata_location_readd_state_fix.sql`, ainda não
  aplicada remotamente. A flag de localização permanece `disabled` até CI,
  dry-run exato, promoção e postflight.
- Estado P3B atual: `COMUN_P3B_SYNTHETIC_CLEANUP_GREEN_F1_PENDING`.
- Conta, Carteira, Relata textual e fotos privadas permanecem ativos; localização,
  coletivos, mapa público, território, Google, Ônibus, forwarding e
  `launch_publicly` permanecem desligados.

### 48.1B-P3B-C2 — F1 promovida, localização ainda bloqueada (2026-08-08)

- F1 `20260808043000_comun_relata_location_readd_state_fix.sql` foi promovida
  remotamente pelo runner dedicado e passou no postflight `31243106898`;
- o cleanup da fixture órfã permanece comprovadamente verde (`31239240233`),
  sem hard delete e sem leitura de plaintext;
- o workflow de reativação foi integrado, mas o smoke real retornou `404` na
  rota de localização mesmo com os nomes das variáveis server-side presentes;
- a flag foi revertida no run `31244127100`; fotos continuam ON e localização
  continua OFF/404;
- nenhum segredo foi exposto, nenhum valor de chave foi lido e nenhum dado real
  foi criado.

Resultado terminal atual: `COMUN_P3B_BLOCKED_LOCATION_RUNTIME_KEY_INVALID_OR_UNAVAILABLE`.
O piloto permanece sem localização até que a chave server-side atual seja
comprovadamente válida e um novo smoke com `finally`/recovery passe.

### 48.1B-P3B-C3 — rotação server-side bloqueada no gate de runtime (2026-08-08)

- A rotação de chave foi executada exclusivamente dentro do runner, sem leitura
  ou registro do valor. O workflow permaneceu sem migrations e sem produto novo.
- Após redeploy, o controle de localização não apareceu no deployment nem no
  domínio canônico dentro do gate. Os runs `31260199454`, `31260510529`,
  `31260965396` e `31261385771` fizeram rollback automático e não criaram
  fixtures.
- Smoke read-only final: `/comun/relatar=200`, localização ausente e POST da
  rota de localização `404`; fotos continuam ON e demais capacidades continuam
  OFF. `launch_publicly=false`.

Resultado terminal: `COMUN_P3B_BLOCKED_NEW_KEY_NOT_VISIBLE_TO_RUNTIME`.
Não emitir `COMUN_48_1B_P3_PRIVATE_EVIDENCE_DOMAIN_GREEN` nem iniciar P4 até
comprovar a disponibilidade da chave/capacidade no runtime sem expor segredo.

### 48.1B-P3B-C4 — evidencias privadas completas no dominio (2026-08-08)

- O diagnostico separou metadata Vercel, env de execucao, runtime staged e
  runtime canonico. Nenhum valor sensivel foi lido ou publicado.
- PRs #223 e #224 corrigiram o identificador canonico do deployment e o gate
  shell do alias; PR #225 corrigiu somente a consulta read-only do harness.
- O run intermediario `31269740911` criou uma localizacao sintetica, encontrou
  ambiguidade apenas no SQL de auditoria e concluiu recovery com zero residuo
  ativo e rollback verde.
- O run final `31270085605` comprovou no dominio: add A, withdraw, readd B,
  withdraw, retirada do relato e postflight verde.
- Cleanup final: zero localizacao/caso/relato/Carteira/anexo/snapshot sintetico
  ativo, `hardDeletes=0`, `plaintextLocationRead=false`.
- Estado final: Conta ON; Carteira ON; Relata textual ON; fotos privadas ON;
  localizacao privada ON. Mapa publico, coletivos, territorio, Google, Onibus,
  forwarding e publicacao automatica OFF; `launch_publicly=false`.

Resultado terminal: `COMUN_48_1B_P3_PRIVATE_EVIDENCE_DOMAIN_GREEN`.
Proximo tijolo elegivel: `48.1B-P4 — Calcadas real`.

### 48.1B-P4 — Calcadas real no dominio (2026-08-08)

- baseline inicial `origin/main=e9aded8f486843e888473172c59eb58a4d7e1335`;
- migration unica `20260808180246_comun_sidewalk_relata_real.sql`, SHA-256
  `6ed799985fe9270ae9a8406d043d566520c2f9c89002493393c37d7076d9c494`;
- PRs #227, #228, #229 e #230 integradas; main funcional final
  `97ad858c92c8694adf7514d0df8cfe8d2c90754f`;
- preflight remoto `31275553224`, promocao exata `31275588586` e postflight
  RLS/grants `31275651342` verdes;
- deployment flags-off `31278490774` verde;
- intake privado real P4A `31278576840` verde, com foto/localizacao privadas,
  `hardDeletes=0` e zero residuo sintetico ativo;
- capacidade editorial P4B `31278723422` verde em leitura: zero intake pendente,
  zero publicacao automatica e nenhum registro publico sintetico;
- `/comun`, `/comun/relatar`, `/comun/calcadas` e
  `/comun/calcadas/contribuir` respondem `200`; fila admin exige autenticacao;
- Conta, Carteira, Relata, fotos e localizacao permanecem ON; intake P4 ON;
  revisao/projecao P4 ON somente por gesto editorial;
- ponto exato publico, publicacao automatica, mapa publico geral do Relata,
  coletivos, territorio, Google, Onibus e forwarding permanecem OFF;
  `launch_publicly=false`.

Resultado terminal:
`COMUN_48_1B_P4_SIDEWALK_REAL_DOMAIN_GREEN_REVIEWED_MAP_ONLY`.

### 48.1B-P5 — Ônibus real e STMU assistida (2026-08-08)

- PR #232 mesclada em `87db9f7e5e76eed73a261fed5044393d719e42c4`;
- migration única `20260808220000_comun_bus_stmu_assisted.sql`, SHA-256
  `88b5d6821edd3984e6c08eddfd924efc6c90dfe37dce45fd6f3c01a71d539a41`;
- preflight `31284013965`, promoção `31284042454` e postflight
  `31284102583` verdes, sem migrations históricas local-only;
- P5A/Ônibus ativada no run `31284226667`, com Relata privado, protocolo COMUN,
  adapter mínimo, Carteira e cleanup sintético em `finally`;
- a primeira ativação P5B (`31284318553`) fez rollback automático por uma
  assertion CI-only de destino composto; nenhum envio ou tentativa foi criado;
- hotfix operacional PR #233 mesclado em
  `dd8fca19c074f77c145148bbf5ca5bc39f4eb058`;
- ativação final P5B `31284607662` verde, com cinco RPCs, destinos exatos sem
  query, zero request externo, zero auto-send e tentativas invariáveis;
- Conta, Carteira, Relata, fotos, localização, Calçadas, Ônibus e STMU assistida
  estão ON;
- forwarding automático, publicação automática, mapa público geral, coletivos,
  território e Google permanecem OFF; `launch_publicly=false`.

Resultado terminal:
`COMUN_48_1B_P5_BUS_STMU_ASSISTED_DOMAIN_GREEN_NO_AUTO_SEND`.

### 48.1B-F1 — Motorola Pass (2026-08-09)

- revisão transversal iniciada a partir de `633ded9b6dac89998d77234b74b6c4c41ef15c7a`;
- navegação central mobile e CTA da Home levam ao Relata em um gesto, sem modal nem login;
- Calçadas usa a rota canônica P4 `/comun/calcadas/contribuir` nas entradas App V2;
- Ônibus não presume tipo de problema e recolhe detalhes opcionais;
- Minha Participação apresenta “Meus registros” como linguagem primária;
- zero migration, zero mudança de backend e dry-run remoto reconciliado vazio;
- unitários, typecheck, lint, build, Quality Performance, Segurança,
  acessibilidade, no-leak e jornadas integrais verdes;
- PR #235 mesclada em `8fd3565ed101ee5bd765fc554c789fada0229b50`;
- deployment Production `dpl_YDC6Lvkbc73fnAD1GfYwMR3hKPVg` READY;
- `/comun`, `/comun/relatar`, `/comun/calcadas`,
  `/comun/calcadas/contribuir`, `/comun/onibus` e
  `/comun/minha-participacao` respondem `200`;
- no domínio real, centro mobile e Home chegam ao Relata em um gesto;
  Calçadas usa a rota P4; Ônibus começa sem tipo falso e com detalhes
  recolhidos; “Meus registros” é a linguagem primária;
- nenhuma fixture, escrita Supabase, migration, mudança de flag ou envio
  externo ocorreu; `launch_publicly=false`.

Estado atual: `COMUN_48_1B_F1_MOTOROLA_PASS_DOMAIN_GREEN`.

Próximo ciclo elegível: `48.1C — piloto humano contínuo no domínio real`. Não
iniciar outro miniapp antes de medir a fricção do fluxo integrado.

### 48.1B-F2 — Capture First — bloqueado pelo contrato textual (2026-08-09)

- baseline pós-PR #236: `origin/main=533a129e3cd979f7001a95b4881c4696d2a3c9ed`;
- o schema promovido exige `original_text NOT NULL` e entre 8 e 600 caracteres;
- a RPC `comun_relata_create` e a rota server-side repetem a mesma exigência;
- anexos P3 só podem ser associados depois da criação do Relata, portanto não
  existe caminho canônico para foto-only sem inventar texto semântico;
- dry-run remoto reconciliado vazio, migration externa de Calçadas restaurada
  com SHA canônico;
- nenhuma migration, alteração de produto, flag, fixture, escrita remota,
  publicação ou envio externo foi executado; `launch_publicly=false`.

Estado: `COMUN_F2_BLOCKED_EXISTING_SCHEMA_REQUIRES_FALSE_DATA`.
O Share Target permanece
`COMUN_F2_SHARE_TARGET_DEFERRED_FILE_LIFECYCLE_REQUIRED`; F2 terminal e P6A não
foram iniciados.

### 48.1D-S1 — Relata único (2026-08-09)

- esta seção posterior substitui o estado intermediário F2 bloqueado acima;
  F2, P6A e P1G permanecem verdes conforme seus relatórios próprios;
- o finding humano `MOTOROLA-P1-001` foi registrado em 48.1C e pausou somente
  `P01 / J1` e `P01 / J3` até esta correção;
- PR funcional `#248`, head exato
  `f249a868d6f7fe352fce3d10e3d10394a4d1f4b4`, mesclada em
  `5e888dc99f5ce10fb414f0be4e8ab21dd53191fd`;
- follow-up Auth/Quality `#249`, sem mudança de backend Auth, mesclado no main
  final `643b489fe07126ae7cc372704457279b2d7d5ac6`;
- `/comun/relatar` é a única entrada pública de novos relatos;
  `?modo=detalhado` não reativa `ReportForm`, e `/comun/relata` redireciona
  permanentemente para a rota canônica;
- perguntas adaptativas são tipadas e não bloqueiam captura; Calçadas,
  fallback `other`, fumaça, luz ambígua e foto-only podem ser guardados sem
  abrir outro pipeline;
- `ReportForm` e `submitReport` permanecem apenas como legado/histórico; o E2E
  descartável comprovou `legacyWriteDelta=0`, um protocolo e um item na
  Carteira;
- zero migration, plano remoto `[]`, zero migração histórica e zero mudança de
  Auth ou flags;
- CI funcional, P6A descartável, Quality, acessibilidade, Security, no-leak,
  Core Journeys e Preview verdes;
- Production no merge exato respondeu `200` nas sete rotas de smoke; as duas
  variantes do Relata mostraram a experiência canônica sem rótulos legacy;
- com Google ON, o formulário de e-mail/senha ficou inequivocamente escopado
  para acessibilidade e Quality; nove viewports passaram no domínio final, sem
  submit ou sessão;
- Quality, Experience Coherence, Core Journeys, Civic Graph e CI post-merge
  passaram no SHA final; um retry de Experience foi necessário após `502`
  transitório do Supabase CLI antes das jornadas;
- nenhuma fixture foi necessária em Production, portanto a promoção realizou
  zero escrita de negócio, zero publicação, zero envio externo e zero hard
  delete;
- auto-send e publicação automática permanecem OFF;
  `launch_publicly=false`.

Estado atual: `COMUN_48_1D_S1_UNIFIED_RELATA_INTAKE_GREEN`.

Esse próximo passo era o gate vigente ao concluir S1. A tentativa que encontrou
o P1 não conta como sucesso; a decisão de produto posterior pausou 48.1C e
autorizou P6B-A separadamente.

### 48.2-D3C — Território e Serviços Públicos (2026-08-12)

- PR funcional #288: head `e867c9038ddfc3978c61dd90fa08646c718f5705`,
  merge `55b5e12fb698d9f165d59b809b601737e798200e`; PR operacional #289:
  head `7b1ce943b26664c55aa21136cfa54d89059277fe`, merge
  `cfbf73c1226d8658398a672e73553c5e5d2c7a25`;
- nova leitura pública read-only em `/comun/observatorios/territorio`, com
  fontes/metodologia e API somente `GET`/`HEAD`; writes retornam `405`;
- snapshots ativos mostram 739 setores censitários, 261.563 pessoas e
  115.652 domicílios do Censo 2022; 102 equipamentos públicos de Saúde, dos
  quais 97 vinculados unicamente a setor, 1 ambíguo e 4 sem vínculo seguro;
  e 16 unidades públicas de Assistência Social somente por endereço;
- Assistência não recebe marcador, geocoding ou vínculo de setor; Educação não
  entra enquanto permanece `PARTIAL_D3B`; nenhum indicador de cobertura,
  suficiência, vulnerabilidade, exposição ou risco foi calculado;
- payload de geometria integral dos setores foi adiado pelo orçamento de
  transferência: `COMUN_48_2_D3C_SECTOR_MAP_DEFERRED_PAYLOAD_BUDGET`;
- zero migration, zero dado privado, zero request runtime às fontes, zero
  business write em Production e `launch_publicly=false`;
- flags-off Production verde no run `31608934047`; wave 1 verde no run
  `31609144980`, com página/fontes/API em `200`, `POST=405` e valores dos
  snapshots ativos conferidos.

Estado atual:
`COMUN_48_2_D3C_TERRITORIAL_CONTEXT_GREEN_OFFICIAL_PUBLIC_ONLY`.

### 48.2-D4B — Observatório Ambiental: Qualidade dos Rios (2026-08-12)

- PR #293: head funcional exato
  `460fed0aa555c4dcc232c394372826a838990edb`, merge
  `631fd84564eb217980dde008cc6a41311545e53f`;
- a superfície pública read-only está ativa em
  `/comun/observatorios/ambiente/qualidade-dos-rios`, com página de fontes e
  API limitada a `GET`/`HEAD`; métodos mutáveis retornam `405`;
- a fonte é exclusivamente o snapshot INEA RH III 2025 já revisado: PS0419 e
  PS0421 no Rio Paraíba do Sul, Volta Redonda, 24 coletas, 240 medições e 24
  IQA oficiais mantidos separados; não há mapa porque a fonte não publicou
  coordenadas;
- não há fetch ao INEA em runtime, Relata, Carteira, localização privada,
  anexo, identidade, Sisagua, potabilidade, conformidade legal, tendência ou
  atribuição causal;
- flags-off Production verde no run `31639691495`; wave 1 verde no run
  `31639948201`, com main exato, zero migration, binding Vercel comprovado,
  páginas/API em `200`, `POST=405` e zero business write;
- `drinking_water_quality` permanece `PARTIAL_D4`; auto-publicação, mapa geral
  Relata e coletivos continuam OFF; `launch_publicly=false`.

Estado atual:
`COMUN_48_2_D4B_SURFACE_WATER_OBSERVATORY_GREEN_OFFICIAL_2025`.

Preservados: `COMUN_48_2_D3A_ENVIRONMENTAL_EXPOSURE_DEFERRED_NO_CURRENT_ENVIRONMENTAL_LAYER`,
`COMUN_48_2_D1A_BLOCKED_CURRENT_OFFICIAL_SOURCE_UNAVAILABLE`, `PARTIAL_D1`,
`PARTIAL_D2A`, `COMUN_48_2_D2A_NO_OPERATIONAL_STATION_IN_VOLTA_REDONDA` e
`COMUN_48_1C_MOTOROLA_PILOT_PAUSED_BY_PRODUCT_DECISION`.

### 48.2-E0 — Serviços Essenciais: contrato público de dados (2026-08-12)

- contrato público versionado para três domínios semanticamente separados:
  `power_distribution_continuity`, `water_supply_service` e
  `public_lighting_service`;
- a auditoria da ANEEL confirmou a distribuidora `LIGHT SESA` e uma série
  mensal de DEC/FEC por conjunto; a relação município–conjunto posteriormente
  materializada pelo E1 revelou-se atual, não histórica; DEC/FEC seguem como
  indicadores coletivos por conjunto, nunca como lista de apagões;
- energia ficou preliminarmente `READY_E1_POWER` e foi reconciliada pelo E1
  para `PARTIAL_E1_POWER`; água ficou
  `PARTIAL_E_WATER_OFFICIAL_NOTICES_ONLY`, pois comunicados SAAE-VR não
  comprovam registro completo de eventos; iluminação ficou
  `PARTIAL_E_LIGHTING_SERVICE_AND_PROJECTS_ONLY`, pois a Carta 158 e obras
  oficiais não constituem métricas de performance ou inventário de falhas;
- zero UI, rota, API, flag, migration, deploy, escrita de negócio, leitura de
  Relata/Carteira/localização/anexos ou fetch externo em runtime;
- `drinking_water_quality=PARTIAL_D4`, auto-publicação, mapa geral Relata e
  coletivos permanecem preservados; `launch_publicly=false`.

Estado E0 preservado:
`COMUN_48_2_E0_ESSENTIAL_SERVICES_PUBLIC_DATA_CONTRACT_GREEN`.

O E1 somente pode produzir snapshot quando houver uma relação oficial
município–conjunto válida no mesmo período dos indicadores.

### 48.2-E1 — Continuidade da Energia: auditoria ANEEL (2026-08-12)

- a captura controlada encontrou 780 indicadores coletivos: 390 DEC e 390
  FEC, de 2020-01 a 2026-06; eles continuam separados e não representam uma
  lista de apagões;
- a relação oficial `IndQual Município` para Volta Redonda (IBGE `3306305`)
  está disponível apenas como materialização atual com geração em 2026-08-05,
  sem relação equivalente por período histórico;
- por isso, não foi aplicado o vínculo de 2026 retroativamente à série. Não
  houve `active-snapshot`, agregado municipal, classificação normativa,
  compensação, UI, API, flag, migration, deploy ou escrita de negócio;
- quatro conjuntos da relação atual (`554`, `1856`, `8570` e `8571`) não têm
  observação DEC/FEC no recorte capturado; a diferença para a lista de
  sanidade E0 foi registrada sem afirmar mudança histórica;
- a fonte de compensação foi identificada, mas ficou não materializada por
  exceder 1 GB; nenhum direito de compensação foi inferido.

Estado atual: `PARTIAL_E1_POWER`.

O E1 revisou explicitamente a prontidão preliminar `READY_E1_POWER` do E0
para `PARTIAL_E1_POWER`: a materialização capturada não contém relação
município–conjunto válida por período. É uma correção metodológica, não uma
regressão de produto.

### 48.2-E1-R2 — Interrupções oficiais de energia ANEEL (2026-08-13)

- a fonte oficial ANEEL de interrupções é semanticamente separada de DEC/FEC
  e permite seleção direta pelo campo `CodMunicipioIBGE=3306305`, sem usar a
  relação IndQual Município;
- snapshot público de fundação promovido a partir do Parquet ANEEL de 2026:
  5.676 registros de Volta Redonda, todos validados no próprio registro para
  CNPJ `60444437000146`, nome `LIGHT SERVICOS DE ELETRICIDADE S A` e sigla
  `LIGHT SESA`;
- a fotografia registra competências `2026-01`, `2026-03`, `2026-04`,
  `2026-05` e `2026-06`. Não chama 2026 de ano completo e não cria série ou
  tendência; o catálogo 2017–2026 foi auditado, mas somente 2026 foi
  materializado nesta versão;
- início/fim, duração derivada, códigos de interrupção/evento/ocorrência,
  expurgo e causa são preservados conforme a fonte; consumidores afetados não
  são pessoas ou consumidores únicos e conjuntos não são bairros;
- zero dado privado, geocoding, Relata, Carteira, UI, API, flag, migration,
  deploy, runtime fetch ou escrita de negócio.

Estado atual:
`COMUN_48_2_E1_R2_POWER_INTERRUPTION_ANEEL_SNAPSHOT_GREEN_OFFICIAL_ONLY`.

`PARTIAL_E1_POWER` continua válido exclusivamente para os indicadores
regulatórios históricos DEC/FEC; ele não bloqueia o snapshot independente de
interrupções. O próximo bloco elegível é 48.2-E2, que deverá manter os dois
domínios separados.

Uma revisão E1-R1 exige relação oficial temporalmente válida de
município–conjunto antes de qualquer snapshot ou Observatório de energia.
Permanecem preservados `COMUN_48_1C_MOTOROLA_PILOT_PAUSED_BY_PRODUCT_DECISION`,
auto-publicação OFF, mapa geral Relata OFF, coletivos OFF e
`launch_publicly=false`.
### 48.5-A2-R1 — Intake cultural save-first operacional (2026-08-17)

Estado atual: `COMUN_48_5_A2_R1_CULTURAL_SAVE_FIRST_OPERATIONAL_GREEN_PRIVATE_RESUME_ROUTE_SELECTION`.

- A2 significa somente `SAVE-FIRST_PRIVATE_INTAKE` e `EXPLICIT_ROUTE_SELECTION`;
  não cria alvo ou submissão cultural especializada.
- A retomada privada usa RPC service-role-only com cookie HttpOnly ou conta
  vinculada; protocolo sem autorização, token errado e outra conta retornam
  404 sem vazamento.
- Rotas conhecidas passam a `routed`; `unknown` permanece `routing`.
  `target_kind` e `target_id` ficam nulos e todos os contadores de handoff
  especializado permanecem inalterados.
- Migration R1: `20260817170000_comun_cultural_contribution_intakes_r1.sql`.
  `COMUN_48_5_A2_SPECIALIZED_TARGET_HANDOFF_DEFERRED_TO_A3`.
- Wave 0 foi mantida com flag OFF e Wave 1 habilita somente
  `COMUN_CULTURAL_SAVE_FIRST_INTAKE_ENABLED`; Production usa GET/HEAD e
  businessWrites=0.

### 48.5-A2 — Intake cultural save-first
# Estado atual — 48.5-A2-R1 Intake cultural operacional (candidato; 17/08/2026)

Estado atual: `COMUN_48_5_A2_R1_CANDIDATE_GREEN_PENDING_MERGE_AND_ROLLOUT`.

- A2-R1 corrige a retomada privada via RPC service-role-only e a semântica de
  rota (`routed` para caminhos conhecidos; `routing` para `unknown`), sem criar
  handoff especializado;
- o teste SQL descartável versionado cobre autorização por hash/conta,
  idempotência, rate limit, grants, campos não retornados e zero alterações
  nos pipelines especializados;
- a #347 ainda não foi merged. Rollout pós-merge, Wave 0, Wave 1, postflight
  e Production GET/HEAD continuam pendentes; `businessWrites=0` até aqui;
- preflights históricos de outros tijolos são
  `HISTORICAL_PREFLIGHT_NOT_A2_R1_GATE` e não devem ser alterados para aceitar
  esta migration.

À data registrada nesta seção histórica, A3 ainda não havia sido iniciado; esse estado foi superado pelo bloco corrente no topo. O terminal Production continua condicionado ao merge exact-head e à evidência real de rollout.

# Estado atual — 48.5-A0 Reconciliação de cultura, memória e rádio (17/08/2026)
## A4 — Direitos progressivos da memória cultural (DIAG → PATCH, 19/08/2026)

Estado atual: `COMUN_48_5_A4_PROGRESSIVE_CULTURAL_RIGHTS_CANDIDATE_PENDING_VERIFY`.

- baseline confirmado: `origin/main=826587f3e32177de68a288ed63bf231a91cd3425`; A3 funcional `a7a55861458be833048ecb20ec3b5d2ba7b4bb84` permanece ancestral;
- DIAG encontrou gates especializados já existentes e uma lacuna na entrada: Foto, Arte e Rádio usavam declaração binária/genérica; História Oral já separava consentimentos e a etapa de sugestão não autoriza gravação;
- patch A4 adiciona migration forward-only com campos tipados de direitos progressivos nas três raízes de contribuição, versão `a4-20260819-v1`, estado `rights_incomplete/rights_declared/rights_review_required/rights_approved` e flag `COMUN_CULTURAL_PROGRESSIVE_RIGHTS_ENABLED` OFF;
- autoria desconhecida, material de terceiro não confirmado e licença ausente para reutilização permanecem fail-closed; `review_only` não autoriza publicação;
- A3 continua intacto: Foto/Documento, Arte, História Oral e Rádio seguem handoff especializado; Música segue fora; unknown não ganha target; publicação/Search/assets/coleções continuam separados;
- nenhuma migration foi aplicada em Production, nenhuma fixture foi criada e nenhuma flag A4 foi ativada.

Detalhes: `reports/current/comun-48-5-a4-progressive-cultural-rights.md`.

O estado só poderá avançar após testes focados, proof Supabase local/CI, exact Preview/freshness, CI verde e rollout controlado Wave 0/1.
## A4-R1 — Provisionamento Chromium de CI endurecido (19/08/2026)

Estado atual: `COMUN_48_5_A4_R1_PROGRESSIVE_RIGHTS_CANDIDATE_PENDING_REMOTE_VERIFY`.

- PR #351 continua sem novo Tijolo funcional e preserva integralmente o contrato A4 de direitos progressivos, fail-closed e flag OFF;
- o bloqueio operacional foi isolado nos jobs que executavam `npx playwright install --with-deps chromium` independentemente: quinze pontos nos seis workflows ativos escopados;
- foi criada uma action compartilhada com cache exato de `~/.cache/ms-playwright` por sistema, arquitetura, versão real do Playwright e lockfile; dependências de sistema continuam separadas;
- retries são limitados a duas tentativas e somente para rede/download; falha emite `COMUN_BROWSER_PROVISIONING_FAILED` e não é mascarada;
- validação local verde: contrato de provisionamento, A4 `40/40`, typecheck, lint, build, unitário `207/1140` e diff check. O candidato ainda aguarda Preview/CI remoto e não pode ser declarado merged;
- migration `20260819130000_comun_cultural_progressive_rights.sql` permanece não aplicada em Production e `COMUN_CULTURAL_PROGRESSIVE_RIGHTS_ENABLED` permanece OFF; business writes, fixtures e publicação continuam em zero.
- as quatro primeiras execuções remotas encontraram timeout/lock no apt mirror durante `install-deps`; a quarta confirmou que um `apt-get` reparentado ainda segurava o lock. O novo candidato, somente após timeout, percorre descendentes, libera os lockfiles apt/dpkg por PID de holder com `fuser`, força a resolução após 5 segundos se necessário, mantém duas tentativas e segue fail-closed.

Checkpoint pré-merge reservado: `COMUN_48_5_A4_R1_PROGRESSIVE_RIGHTS_GREEN_BROWSER_CI_STABLE_AWAITING_ROLLOUT`.
## Estado atual — 48.5-A5-A0: contrato de curadoria unificado GREEN; delta A5-A1 necessário (22/08/2026)

Estado terminal: `COMUN_48_5_A5_A0_CURATION_CONTRACT_GREEN_A5_A1_SCHEMA_DELTA_REQUIRED`.

- A5-A0 reutiliza os envelopes especializados de Foto/Documento, Arte, História Oral e Rádio e adiciona um resolver único de readiness editorial; não foi criada fila/tabela cultural paralela e Música continua fora do intake A3;
- `ready_for_editorial_review` agora é decidido no servidor pelo resolver, e o adapter fotográfico só materializa rascunho privado quando a prontidão permite. Nenhum caminho novo publica, escreve Search, coleção ou asset público, nem eleva direitos por inferência;
- História Oral e Rádio ainda não possuem vínculo canônico de proveniência para uma materialização especializada auditável. Esse é o menor delta para A5-A1; A5-A0 não introduz migration nem adapter improvisado;
- A3 e A4 permanecem ON/encrypted/Production-only. `migrations=0`, `ProductionBusinessWrites=0`, `ProductionSchemaWrites=0`, `ProductionEnvWrites=0`, `publications=0`.

Relatório: `reports/current/comun-48-5-a5-a0-cultural-curation-readiness.md`.
## Estado atual — 48.5-A5-A1: proveniência especializada imutável integrada; rollout Production pendente (23/08/2026)

Estado terminal: `COMUN_48_5_A5_A1_SPECIALIZED_PROVENANCE_SCHEMA_GREEN_PRODUCTION_ROLLOUT_REQUIRED`.

- A PR [#364](https://github.com/alexandrevrabandonada-oss/comunvrabandonada/pull/364) foi integrada em `382a215e2828827596ed68bf2a7dfe1c2645361d`; a árvore merged é idêntica ao checkpoint validado `9bfaf8ec1d47faf4e3dc750a7a68ec3a19a5565d`;
- a migration aditiva `20260823003249_comun_cultural_specialized_provenance_readiness.sql` tem SHA-256 `771975081046474022764A8E69743CC6015EBB4A817C614719FA7D6DFC74BDFB` e ainda não foi aplicada em Production;
- a prova Supabase descartável [32609596998](https://github.com/alexandrevrabandonada-oss/comunvrabandonada/actions/runs/32609596998), CI, Cultural, Quality, Core Journeys, Full Surface, Civic Graph, Civic Intelligence, Experience Coherence, Security Resilience, Preview exato e freshness COST-02 ficaram GREEN;
- vínculos de proveniência de História Oral e Rádio são aditivos, privados, tipados, imutáveis e 1:1 por envelope; Arte reutiliza o vínculo existente. A readiness pré-raiz não achata consentimento granular de História Oral, e `publicationEligible` permanece sempre `false`;
- `A3=ON/preserved`; `A4=ON/preserved`; `autoPublication=false`; `ProductionBusinessWrites=0`; `ProductionSchemaWrites=0`; `ProductionEnvWrites=0`; `ProductionMigrationApplied=false`. Nenhum rollout A5-A1-R1 foi iniciado.

Relatório: `reports/current/comun-48-5-a5-a1-specialized-provenance-readiness.md`.
## Estado atual — 48.5-A5-A1-R1 bloqueado por plano remoto não exato (23/08/2026)

Estado terminal: `COMUN_48_5_A5_A1_R1_BLOCKED_NONEXACT_MIGRATION_PLAN`.

- o run Production [32636667277](https://github.com/alexandrevrabandonada-oss/comunvrabandonada/actions/runs/32636667277), no main `477b301e1a8ac8c473d01b143cb602e9a9e00d04`, confirmou checksum A5-A1, deployment compatível e A3/A4 encrypted/ON sem overrides;
- o snapshot explicitamente read-only confirmou A5-A1 ausente e sem schema parcial. O dry-run encontrou a migration anterior pendente `20260724233256_comun_sidewalk_operational_hardening.sql` e recusou avançar sem `--include-all`;
- A5-A1 não foi aplicada: `ProductionSchemaWrites=0`, `ProductionBusinessWrites=0`, `ProductionEnvWrites=0`, sem fixture, target, asset, Search, coleção ou publicação. Não houve bypass, repair, reset, seed, quarentena ou mudança de ledger;
- a próxima ação é a lane proprietária resolver a migration pendente. Só então uma nova tentativa A5-A1 poderá exigir o plano de uma única migration cultural.

Relatório: `reports/current/comun-48-5-a5-a1-r1-production-rollout.md`.
## Estado em implementação — 48.5-A5-A2: workspace de materialização privada especializada (24/08/2026)

- História Oral e Rádio passam a ter workspace administrativo de triagem e materialização privada via as RPCs A5-A1 já atômicas; Música continua fora do fluxo Rádio e publicação não é autorizada;
- Arte recebe readiness, UI de diagnóstico e migration aditiva ainda não aplicada (`20260824001340_comun_artwork_submission_private_materialization.sql`, SHA-256 `b9da07e8da93aa22d41119eb3a0f406176595bd4fbdf96bf1d75e16ddfd02354`). A CTA permanece dormente até o rollout específico;
- A3/A4 ON e A5-A1 ativo permanecem preservados. Nenhum write Production, migration Production, env, publicação, Search, asset público ou coleção ocorreu neste slice;
- a prova descartável de Arte está versionada para CI. O Docker local falhou antes de iniciar por erro de I/O da infraestrutura, sem aplicar schema/dados; não há retry remoto ou contorno manual.

Relatório: `reports/current/comun-48-5-a5-a2-private-materialization-workspace.md`.
## Estado atual — 48.5-A5-A2: materialização privada especializada pronta para integração (24/08/2026)

Estado candidato: `COMUN_48_5_A5_A2_PRIVATE_MATERIALIZATION_GREEN_ART_SCHEMA_ROLLOUT_REQUIRED`.

- A continuidade privada de História Oral e Rádio está integrada ao resolver canônico com readiness recalculada no servidor, RPCs atômicas existentes e auditoria administrativa; Arte tem somente schema/migration e prova descartável local preparados, sem CTA ativo antes do rollout separado;
- os gates locais passaram: testes focais (18), unitários (1.165), typecheck, lint, build e `git diff --check`;
- recuperação local conservadora atingiu 8,02 GiB livres: somente cache Docker regenerável e compactação reversível do cache `_npx`; `DockerVolumesRemoved=0`, `UserFilesRemoved=0`, `SourceFilesRemoved=0`;
- A3 e A4 permanecem ON/preserved, A5-A1 permanece ativo/preservado. Não houve writes Production de negócio, schema ou env; não houve publicação, Search, promoção pública de asset ou coleção.

Relatório: `reports/current/comun-48-5-a5-a2-private-materialization-workspace.md`.
## Estado atual — 48.5-A5-A2-R1: schema de Arte GREEN; ativação runtime em validação (24/08/2026)

- A migration `20260824001340_comun_artwork_submission_private_materialization.sql`, SHA-256 `b9da07e8da93aa22d41119eb3a0f406176595bd4fbdf96bf1d75e16ddfd02354`, foi aplicada uma única vez no run `32686486554`.
- O planner foi exato antes e vazio depois; a exceção external-ledger de Sidewalk permaneceu preservada. Grants/RLS ficaram fail-closed e todos os fingerprints de negócio permaneceram iguais: `ProductionBusinessWrites=0`, roots/children/publicações/Search/assets/coleções criados `=0`.
- O runtime em validação habilita criação de rascunho privado para obra nova e escolha explícita de rascunho de Arte existente para complemento/correção. Nenhum desses caminhos publica.
- `A3=ON/preserved`; `A4=ON/preserved`; `A5A1=ACTIVE/preserved`; Oral/Rádio preservados; `autoPublication=false`.
