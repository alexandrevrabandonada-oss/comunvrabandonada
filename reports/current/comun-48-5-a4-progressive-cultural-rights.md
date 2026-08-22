# 48.5-A4 — Direitos Progressivos da Memória Cultural

## A4-C0 — Fechamento pós-ativação e baseline de estabilidade (22/08/2026)

Estado terminal: `COMUN_48_5_A4_C0_POST_ACTIVATION_BASELINE_GREEN_A4_CLOSED`.

- a ativação canônica Wave 1 `32570311968`/`dpl_3jnrsGkHH4rAzEsdHQ8Le3jGkX5h` foi confirmada, e o verifier C0 `32593036170` passou integralmente sem write remoto;
- A4 e A3 estão ON, encrypted, únicas e Production-only; a migration A4 consta uma vez com checksum canônico. Schema, RLS, grants, não-inferência de direitos legados, contrato de licença, separação review/publicação e consentimento granular de História Oral ficaram verdes;
- o artifact sanitizado `9480830306` registra snapshot estável e oito GET/HEAD 200. Não armazena HTML ou valores de env; `businessWrites=0`, `schemaWrites=0`, `envWrites=0`, `fixtures=0`, `publications=0`, `rollback=false`;
- relatório canônico de closeout: `reports/current/comun-48-5-a4-c0-post-activation-closeout.md`. A4 está fechada em `CLOSED_BASELINE`; A5 não foi iniciada.

## A4-R2-Wave1-R1 — Runtime boundary e rollback determinístico em preparação (21/08/2026)

Estado local: gates focados verdes; A4 permanece Production `encrypted/OFF` e A3 permanece `encrypted/ON`.

- Arte e Rádio passam a declarar `dynamic = "force-dynamic"`; Foto e a política global de cache não foram alteradas;
- o runner passa a registrar `runtime-smoke.json` sanitizado por superfície/marcador, contendo apenas status HTTP, presença booleana e SHA-256 do corpo — nunca HTML ou valor de env;
- toda falha após A4→ON agora entra em rollback explícito por estágio. O recibo `rollback.json` é criado antes do PATCH `enabled→disabled`, e o caminho dedicado exige A4 ON, A3 ON, identidade preservada, deployment exato e smoke OFF;
- nenhuma nova Wave 1 pode ser disparada até a PR desta correção estar integrada, um novo deployment de código com A4 OFF estar READY e os gates completos passarem. Não houve mudança Supabase, migration, fixture ou business write neste patch local.

## A4-R2-Wave1 — Ativação Production interrompida e restaurada para OFF (21/08/2026)

Estado terminal: `COMUN_48_5_A4_R2_WAVE1_RUNTIME_SMOKE_BLOCKED_ROLLED_BACK_FLAG_OFF`.

- a implementação isolada da Wave 1 foi integrada pelas PRs #354, #355, #356 e #357. Ela usa somente `workflow_dispatch`, valida o SHA exato, schema/read-only, snapshots, A4/A3 canônicas e muda exclusivamente a env A4 por `PATCH` no ID já existente; não contém migration nem comandos Supabase mutáveis;
- o primeiro dispatch útil `32470001808`, no SHA `9ff9693e6a69a1c931eab2e17b07f2510e261fb4`, confirmou schema A4 uma vez, RLS/grants, ausência de backfill, História Oral granular, baseline read-only, A4 OFF/encrypted/única e A3 ON/encrypted/única. O PATCH A4→ON retornou `HTTP 200`; os receipts comprovam que A4 manteve ID, tipo, target e criação, e A3 manteve também `updatedAt`;
- o deploy pós-write `dpl_3z947n9D67xc5kJJ5CYnUMxuthYd` ficou READY e foi promovido. O smoke GET/HEAD obrigatório falhou depois desse deploy, antes de `postflight.json` e do terminal GREEN. O log não identifica qual marcador obrigatório faltou, portanto a causa de runtime permanece não determinada e não foi inferida;
- o trap de rollback não materializou recibos `disable-*`; isso é um defeito operacional do runner. Para retornar imediatamente ao estado seguro foi executado o modo canônico `disable-only`, e não um PATCH manual;
- o dispatch de recuperação `32470635477` ficou GREEN: A4 ON→OFF recebeu `HTTP 200`, a mesma env permanece única/encrypted/Production-only, sem shared, duplicata, branch ou custom override; A3 continua ON com fingerprint e metadata inalterados. O deployment de recuperação `dpl_GeC3TXJxrhCgGe1kk8a9k4rePD2t` ficou READY e o smoke baseline GET/HEAD passou;
- não houve migration, RPC, POST de contribuição, fixture, intake, target, asset, Search, coleção ou publicação. O baseline read-only continua com intakes/submissões/alvos de contribuição em zero; a tentativa encerrou sem `postflight` porque o smoke falhou. A4 permanece fail-closed OFF e nenhuma nova Wave 1 deve ser disparada até corrigir e comprovar o rollback automático e o marcador de smoke;
- a migration A4 já permanece registrada uma vez conforme a Wave 0 anterior. A3 segue ativa; não iniciar A5.

## A4-R2-Wave0-G0 — E1 terminal integrado e schema Production confirmado (20/08/2026)

Estado terminal: `COMUN_48_5_A4_R2_SCHEMA_GREEN_PROGRESSIVE_RIGHTS_FLAG_OFF`.

- o gate Wave 0 agora executa o bridge E1 antes de quarentenar a migration externa de calçadas e só continua quando o artifact confirma `COMUN_SIDEWALK_EXTERNAL_LEDGER_EVOLVED_SCOPE_GREEN`, prova histórica exata, invariantes release-owned, grants seguros, service role operacional e `zeroRemoteWrites=true`;
- os runs `32429602534`, `32429859490` e `32430101274` falharam de modo fail-closed antes de qualquer migration nova: primeiro pelo escopo efêmero do caminho de quarentena, depois porque Production já indicava A4 aplicada, e por fim porque a comparação ainda esperava `0→1`. Os patches `7c679c56`, `a8f4d12d` e `f239fcc4` corrigiram somente o runner e seus contratos;
- a execução terminal `32430306663`, no SHA `f239fcc4244ef3eb4272ae9f0632f11c878b0342`, ficou GREEN. Ela encontrou `20260819130000` já registrada exatamente uma vez antes da execução; o dry-run não planejou migrations e o runner fez `migrationApply=noop_already_applied`. A proveniência dessa aplicação histórica não foi determinada neste slice e nenhuma tentativa Wave 0 a reaplicou;
- o postflight read-only confirmou as 24 colunas/contratos esperados, constraints de licença, defaults, RLS/grants (`aclClosedToClients=true`, `serviceRoleCanOperate=true`), `rightsBackfillZero=true`, nenhum bucket/policy novo e nenhum objeto público adicional;
- snapshots before/after são idênticos para os contadores de negócio: `businessWrites=0`, `publicAssetWrites=0`, `searchWrites=0`, `publicationsCreated=0`, sem fixtures, intakes, targets, assets, coleções ou publicação. O bridge E1 permaneceu GREEN e read-only;
- a auditoria pós-flight confirma A4 única, encrypted e OFF, sem shared/duplicata/branch/custom override; A3 única, encrypted e ON. Production está READY e os oito smokes GET/HEAD terminaram verdes. Wave 1 não foi executada.

## A4-R2-D0-R3 — Recuperação determinística da flag A4 ausente (20/08/2026)

Estado terminal: `COMUN_48_5_A4_R2_FLAG_RECOVERED_ENCRYPTED_EXPLICIT_OFF_READY_FOR_WAVE0`.

- `origin/main` começou no SHA confirmado `9d017247b633becb180770d791785200fe0a9063`; o checkpoint de recuperação foi integrado como `927b11ead665b7569460fb32dfdcd79441c7d5e3`;
- a causa do bloqueio D0-R2 foi corrigida: o corpo do `POST /v10/projects/{project}/env` era um array e não continha `key` no nível exigido. O payload R3 é exatamente o objeto `{key,type,value,target}` e seu contrato impede array;
- a barreira runtime foi o deployment Production `dpl_5Lneths916NKs4UKWNCH6DpEEPSy`, READY no SHA R3 enquanto A4 estava ausente. Isso comprovou `ABSENT => OFF` antes da única mutação permitida;
- run `32394666050` passou. O POST único recebeu `HTTP 201`; a nova env tem fingerprint `sha256:b5156714a5f7cca3`, `type=encrypted`, target somente Production, valor efetivo OFF, sem shared env, duplicata, branch ou custom-environment override;
- a auditoria pós-deployment confirmou A4 OFF/encrypted/única, A3 ON/encrypted e `businessWrites=0`. Os oito GET/HEAD culturais passaram; não houve acesso Supabase, migration A4, Wave 0/1, fixture, target, asset, Search, coleção ou publicação;
- o rollback operacional é manter A4 OFF. A migration `20260819130000_comun_cultural_progressive_rights.sql` continua pendente. Este slice termina aqui: Wave 0 deve ocorrer somente em execução posterior e limpa.

## A4-R2-D0-R1 — Normalização da flag opaca bloqueada pela Vercel (20/08/2026)

Estado terminal: `COMUN_48_5_A4_R2_FLAG_TYPE_TRANSITION_BLOCKED_NEEDS_ATOMIC_REPLACEMENT_DESIGN`.

- `origin/main` inicial `9c2447d49c8553f84f2846da22291ae420bb417e` foi confirmado; o recovery runner foi atualizado no SHA `1c988681dc62fdc4e0cdcec9f369124e6eab1cd7` e seu deployment Production ficou READY antes da chamada;
- precheck do run `32359749167` confirmou a A4 pelo mesmo fingerprint de ID, única, project-level, Production-only, `type=sensitive`, sem shared env, duplicata, branch ou custom-environment override. A3 permaneceu `encrypted` e ON. A migration A4 continua pendente conforme o estado operacional de entrada e nenhum acesso Supabase foi feito;
- a única mutação autorizada usou `PATCH /v9/projects/{project}/env/{id}` com o payload mínimo `key,type,value,target`, onde o estado desejado era encrypted/disabled/production. O recibo preservado antes de parsing registrou `HTTP 400`, `error.code=BAD_REQUEST`, request fingerprint sanitizado e a mensagem: `You cannot change the type of a Sensitive Environment Variable.`;
- a resposta é prova direta de que a transição `sensitive → encrypted` não é permitida no mesmo ID. Não houve retry, payload alternativo, delete+create, segunda chave, alteração de A3, deployment manual, smoke ou mudança de runtime;
- `businessWrites=0`, `fixtures=0`, `targets=0`, `archiveItems=0`, `assets=0`, `searchWrites=0`, `collections=0` e `publications=0`. A4 permanece opaca/fail-closed; A3 permanece íntegra e ativa;
- o runner agora preserva status, code, message, action quando existir, content-type, request ID sanitizado e formato do payload. A próxima operação possível é apenas um novo slice de desenho para substituição atômica, com ID novo e sem janela de configuração parcial; Wave 0 e Wave 1 continuam proibidas.

## A4-R2-D0-R1 — Diagnóstico canônico da env A4 permanece bloqueado (20/08/2026)

Estado terminal preservado: `COMUN_48_5_A4_R2_FLAG_BOOTSTRAP_BLOCKED_SAFE_ABSENT`.

- `origin/main` foi confirmado no início como `7c22b803b97d72e873b48361ade3d42fad0d2f4b`; o runner Vercel-only D0-R1 foi integrado no SHA `d0f7f07afff9b04d12844d3ae244d08124375dc8`. Ele não recebe credenciais Supabase e não executa preflight, leitura ou write no banco;
- a recuperação completa do run `32317096418` confirmou somente `HTTP 400`. O uso de `curl -f` e o cleanup do arquivo temporário apagaram a resposta antes da criação do artifact; portanto `error.code` e `error.message` não são recuperáveis de modo honesto. Nenhuma causa foi inferida a partir desse vazio;
- a fonte oficial do endpoint confirma que `PATCH /v9/projects/{idOrName}/env/{id}` aceita `type`, `value` e `target`. O payload candidato registrado pelo runner é estritamente `{ "type": "encrypted", "value": "disabled", "target": ["production"] }`: sem `key`, `gitBranch`, `customEnvironmentIds` ou `comment`;
- o diagnóstico read-only `32318723234` confirmou exatamente uma env A4 project-level Production, `type=sensitive`, sem shared env, duplicata, branch ou custom environment. A3 permaneceu única, `type=encrypted` e ON. IDs e atores foram registrados somente como fingerprints;
- o mesmo diagnóstico demonstrou dois limites objetivos: a API de team disponível não revelou um valor reconhecível para a política **Enforce Sensitive Environment Variables** (`teamSensitivePolicy=unknown`) e `vercel env pull` devolveu a A4 sensível mascarada (`valueState=UNKNOWN`), em vez de produzir uma prova estável de `ABSENT`. O runner trata ambos como bloqueadores fail-closed;
- por isso não houve novo PATCH, delete, POST, deployment, mudança de A3, migration A4, acesso Supabase, fixture ou escrita funcional. `businessWrites=0`, `fixtures=0`, `targets=0`, `assets=0`, `searchWrites=0`, `collections=0` e `publications=0`;
- o hardening D0-R1 mantém a mutação limitada a uma só chamada por ID e captura, no próximo contexto que a autorize, apenas `httpStatus`, `error.code` e `error.message` sanitizados. Não há retry automático. A conversão `sensitive→encrypted` não foi marcada como suportada nem como proibida: falta a evidência de política/estado que o contrato exige.

Próximo passo seguro: obter da Vercel uma prova administrativa read-only da política de sensitive e/ou uma resposta oficial que classifique a transição. Até lá, manter A4 fora de Wave 0; A3 permanece ON e a migration `20260819130000_comun_cultural_progressive_rights.sql` continua pendente.

## A4-R2-D0 — Bootstrap Production bloqueado após reparo por ID rejeitado (20/08/2026)

Estado terminal desta execução: `COMUN_48_5_A4_R2_FLAG_BOOTSTRAP_BLOCKED_SAFE_ABSENT`.

- `origin/main` começou no `768cb85d7a13cd5b6d9cb472f60cc7db53a60025`; os runners D0 foram publicados em `d92c0b93`, `9969a6eb`, `45779dcb`, `1688fd6a` e `46cd7d2f`. O ancestral funcional A4 `27c441a4fa03857ece2e022f6f64516d5188989d` continua presente e a migration A4 permanece pendente;
- o primeiro D0 `32316035837` confirmou ausência total inicial e A3 ON, executou o POST de criação e falhou somente ao sanitizar a resposta por uma incompatibilidade `require`/top-level `await`; não chegou a Supabase, deployment manual ou smoke;
- a reexecução somente-leitura `32316619914` e sua versão com metadata `32316811934` confirmaram uma única chave project-level Production A4, sem shared env, branch ou custom environment. Ela tem writer provenance `managed-by=comun-48-5-a4-r2`, ID somente em fingerprint, mas `type=sensitive` e resolução efetiva `ABSENT`; a chave A3 comparável permanece única, `type=encrypted` e efetiva ON;
- o único reparo autorizado por ID, `32317096418`, passou todas as pré-condições e tentou `PATCH` exclusivamente na chave A4 assinada para `disabled`/`encrypted`. A API Vercel devolveu HTTP 400; não foi criada segunda chave, não houve delete, não houve alteração de A3 e o fluxo parou imediatamente;
- deployments de código D0 ficaram READY antes das execuções; nenhum deployment manual de materialização foi iniciado depois da falha do PATCH;
- nenhuma migration, RPC, fixture, intake, target, archive item, asset, Search, coleção ou publicação foi criado. Não houve write Supabase e os business writes permanecem zero;
- contratos locais D0, typecheck, lint, sintaxe Bash/Node e `git diff --check` verdes. O patch registra ownership explícito, receipts sanitizados, auditoria de shared/duplicata/override e só permite correção por ID sob a pré-condição assinada;
- a hipótese operacional mais forte é incompatibilidade de tipo da API (`sensitive` não é resolvida pelo mecanismo `env pull` adotado pelo projeto, enquanto a chave A3 usa `encrypted`), mas o HTTP 400 não foi exposto como resposta sanitizada no artifact. Não repetir POST, PATCH ou Wave 0 até capturar a mensagem/código Vercel de forma sanitizada e ajustar o payload canônico.

Checkpoint verde `COMUN_48_5_A4_R2_FLAG_BOOTSTRAP_GREEN_EXPLICIT_OFF_READY_FOR_WAVE0` não foi atingido. A4 continua fail-closed pela resolução ausente; Wave 0/Wave 1 permanecem proibidas.

## A4-R2-Wave0 — Preflight bloqueado por flag Production ausente (19/08/2026)

Estado terminal desta tentativa: `COMUN_48_5_A4_R2_FLAG_ABSENT_BLOCKED_SAFE_OFF`.

- o `origin/main` esperado `9074f132c48ad58cd34c06f73bf74f4f24aa3583` foi confirmado antes do patch operacional; o runner foi publicado no `e5034489729ed7bf6e942c5054f9da4f2b387e76` e a correção de classificação no `01d28b1e942736d7db0909c86cbb23d2e4ab34fb`; o ancestral funcional A4 `27c441a4fa03857ece2e022f6f64516d5188989d` permanece presente;
- Production Vercel ficou `READY` no deployment `dpl_Cc7WCKjdLPQUC4ZRCgHGjwphG7Nr` do SHA `01d28b1e`; COMUN CI do primeiro patch `32313692758` ficou verde;
- Wave 0 `32313832470` parou fail-closed na auditoria de ambiente: o helper inicial só informou chave Production não única. A correção tornou a classificação explícita;
- diagnóstico focal `32314123097` foi abortado antes da auditoria porque o novo deployment ainda estava `BUILDING`; ele não alcançou Supabase nem escreveu Vercel;
- diagnóstico focal final `32314228096` confirmou `COMUN_CULTURAL_PROGRESSIVE_RIGHTS_ENABLED_PRODUCTION_ENV_ABSENT`. A chave não existe como env project-level Production. Não foi criada automaticamente, conforme o contrato. Shared env/overrides não foram aceitos como verdes porque a ausência já bloqueia o preflight;
- o runner não chegou a `supabase migration list`, `db push`, snapshot ou postflight em nenhuma dessas execuções. A migration `20260819130000_comun_cultural_progressive_rights.sql` não foi aplicada nesta tentativa;
- nenhum insert/update funcional, fixture, upload, target, archive item, asset, Search, coleção ou publicação foi criado. `businessWrites=0` por interrupção antes da fronteira Supabase; nenhuma flag foi mutada;
- `COMUN_CULTURAL_SPECIALIZED_HANDOFF_ENABLED` não foi alterada pelo runner A4; A3 permanece ativo conforme o estado Production anterior. A ausência A4 é tratada como bloqueador operacional, não como OFF operacionalmente satisfatório;
- a aplicação trata ausência como `false`, mas o rollout exige uma chave Production única, explícita e `disabled`. O próximo passo deve ser um diagnóstico/regularização focal da proveniência da ausência; não repetir Wave 0, não criar env automaticamente e não aplicar migration até isso ser resolvido.

O checkpoint verde `COMUN_48_5_A4_R2_SCHEMA_GREEN_PROGRESSIVE_RIGHTS_FLAG_OFF` **não foi atingido**.

## A4-R1 — Provisionamento Chromium de CI endurecido (19/08/2026)

Estado atual: `COMUN_48_5_A4_R1_PROGRESSIVE_RIGHTS_GREEN_BROWSER_CI_STABLE_AWAITING_ROLLOUT` — PR #351 integrada; aguardando somente rollout controlado A4.

- causa-raiz: seis workflows ativos da PR executavam, em quinze jobs, `npx playwright install --with-deps chromium` de forma independente; os bloqueios observados ocorreram no provisionamento compartilhado antes da execução das suítes, sem evidência de defeito do A4;
- patch: a action local `.github/actions/setup-playwright-browser` restaura `~/.cache/ms-playwright` com chave exata por `runner.os`, `runner.arch`, versão real `@playwright/test` (`1.61.1`) e hash de `package-lock.json`; dependências de sistema continuam sendo garantidas separadamente;
- o helper `scripts/ci/install-playwright-browser.mjs` usa `npx --no-install`, timeout focal de 8 minutos e no máximo duas tentativas somente para falhas classificadas como rede/download, incluindo timeout explícito do processo de provisionamento; em Linux, o timeout encerra o grupo inteiro do processo para não deixar `apt-get` órfão segurando o lock do dpkg; falha emite `COMUN_BROWSER_PROVISIONING_FAILED` e mantém o check vermelho;
- Quality Performance, Experience Coherence, Core Journeys, Civic Graph, Civic Intelligence e Full Surface Migration passaram a usar a action compartilhada. Workflows de outros domínios ou caminhos não envolvidos no bloqueio não foram alterados cegamente;
- contrato estrutural local: `COMUN_BROWSER_PROVISIONING_CONTRACT_GREEN`; A4 focal `40/40`; typecheck, lint, build, unitário `207` arquivos/`1140` testes e `git diff --check` verdes;
- o script de contrato é executado explicitamente por Node e não é coletado como suíte Vitest. O workflow A4 disposable permanece local-only no CI e continua sem fixture Production;
- fechamento remoto: Preview exato `dpl_73czMy9gNUAxAV9mmTsXZnY1EssX` (`READY`, SHA `cc491f8ae16586ef0767270d5e33c94a68895011`), COST-02/CI `32280469519`, A4 disposable `32280469668`, Cultural `32280469488`, Quality `32280469534`, Experience `32280469448`, Core `32280469535`, Civic Graph `32280469743`, Civic Intelligence `32280469423` e Full Surface `32280469457` verdes;
- PR #351 foi marcada ready e mesclada no merge SHA `27c441a4fa03857ece2e022f6f64516d5188989d`; pós-merge COMUN CI `32284486940`/`32284594532`, Cultural `32284486924`, Quality `32284486879`, Experience `32284486935`, Core `32284486892`, Civic Graph `32284486908` e CAPTCHA `32284486941` verdes;

Após os primeiros checkpoints, quatro jobs Civic Graph e o job administrativo confirmaram timeout do apt mirror; as correções de grupo e descendentes não alcançaram o `apt-get` reparentado, que segurou o lock no retry. O candidato corretivo, somente após timeout, encerra o grupo, percorre descendentes Linux por PID e libera exclusivamente os dois lockfiles de apt/dpkg com `fuser`; resolve a falha após uma janela adicional de 5 segundos mesmo se `close` não chegar. Lock transitório também é retryable, com o mesmo limite de duas tentativas.

Migration A4 continua pendente em Production e `COMUN_CULTURAL_PROGRESSIVE_RIGHTS_ENABLED` continua OFF. Nenhuma escrita Production, publicação, Search, asset ou rollout foi realizado.

## A4-R1 — Fechamento pós-merge

- o merge funcional foi concluído no SHA `27c441a4fa03857ece2e022f6f64516d5188989d`; o deployment Production correspondente `dpl_AdzYY7S6VrhmUTNypfm3LoXpCtdr` ficou `READY`; o fechamento documental posterior não altera o runtime;
- o cache Chromium foi reutilizado com Playwright `1.61.1`, seguido de provisioning verde; a correção mantém retry limitado, encerra grupos/descendentes e libera somente locks apt/dpkg após timeout;
- migration `20260819130000_comun_cultural_progressive_rights.sql` permanece não aplicada em Production e `COMUN_CULTURAL_PROGRESSIVE_RIGHTS_ENABLED` permanece OFF;
- estado terminal: `COMUN_48_5_A4_R1_PROGRESSIVE_RIGHTS_GREEN_BROWSER_CI_STABLE_AWAITING_ROLLOUT`; nenhum write Production, fixture, publicação, Search, asset ou rollout A4 ocorreu.

## Estado do trabalho

DIAG → PATCH em `codex/48-5-a4-progressive-cultural-rights`, baseado em
`origin/main=826587f3e32177de68a288ed63bf231a91cd3425`. O A3 funcional
`a7a55861458be833048ecb20ec3b5d2ba7b4bb84` permanece ancestral.

Checkpoint terminal reservado: `COMUN_48_5_A4_PROGRESSIVE_CULTURAL_RIGHTS_GREEN_NO_INFERRED_CONSENT`.

## Diagnóstico dos contratos existentes

| Domínio | Raiz/submissão | Direitos existentes | Identidade | Publicação/storage |
| --- | --- | --- | --- | --- |
| Foto/documento | `comun_archive_submissions` + `comun_archive_submission_assets` | relação, fonte, declaração textual, confirmação e crédito; insuficiente para distinguir autoria, titular, exibição e reutilização | anônimo/nome/crédito personalizado | original privado; derivada e `comun_archive_items` somente por revisão |
| Arte | `comun_archive_artwork_submissions`, `comun_archive_artwork_rights`, safety e credits | autoria/titular, consentimento, exibição, impressão, exposição, educação, campanha, derivada, download, terceiros, licença, validade e retirada | anônimo/crédito/nome artístico/coletivo no novo contrato; créditos especializados existentes | original privado; derivadas públicas dependem de rights + safety + revisão |
| História Oral | `comun_archive_oral_history_suggestions`, participantes, consents, templates, sessions e withdrawals | consentimento separado para preservação, transcrição, texto, áudio, imagem, nome, educação, exposição, social, download; templates versionados | identificação completa, primeiro nome, artística, papel ou anônima | bruto/transcrição interna separados de versões e assets públicos; publicação fail-closed |
| Rádio | `comun_radio_contributions`, voice consents, music uses, safety, episodes e transcripts | voz, áudio COMUN, transcrição, cortes, citações, campanha, educação, nome; música possui rights próprio | anônimo/crédito/nome artístico/coletivo no novo contrato | proposta não é programa/episódio; audio público exige asset, consentimento, música, safety e transcript |
| Acervo A1 | `comun_archive_items` + assets + gates públicos | `rights_status`, licença/referência, status/visibility, `public_safe` e revisão; nenhuma projeção pública aceita sem gate | DTO público sanitizado | publicado + público + asset público aprovado; Search/coleções/relações continuam separados |

## Lacuna encontrada

Foto, Arte e Rádio ainda pediam, na entrada, uma declaração binária ou genérica.
O A3 também cria envelopes especializados com direitos em estado inicial, sem
reinterpretar autoria ou consentimento. História Oral já possui o contrato
granular adequado: sua etapa pública de sugestão não coleta consentimento de
gravação e agora explica isso expressamente.

## Patch arquitetural

- não foi criada entidade cultural genérica nem `generic_rights_jsonb`;
- foi criada uma migration pequena, forward-only, sem backfill, seed ou
  publicação: `20260819130000_comun_cultural_progressive_rights.sql`;
- Foto, Arte e Rádio recebem campos tipados de origem/autoria, escopo de uso,
  reutilização, licença declarada, identidade e `rights_state`;
- cada nova declaração ativa registra `rights_contract_version=a4-20260819-v1`
  e `rights_declared_at`; registros antigos ficam `rights_incomplete` e não são
  reinterpretados;
- autoria desconhecida e material de terceiro não confirmado resultam em
  `rights_review_required`, mesmo quando a pessoa escolhe um escopo de exibição;
- `review_only` nunca é tratado como autorização de publicação;
- reutilização licenciada exige licença explícita; música de terceiro continua
  no pipeline próprio de Rádio;
- a flag `COMUN_CULTURAL_PROGRESSIVE_RIGHTS_ENABLED` nasce OFF. OFF preserva o
  fluxo A3/A2 anterior; ON aplica as declarações progressivas aos novos envios;
- a criação de item fotográfico pelo admin passa a bloquear, quando A4 está ON,
  direitos incompletos ou escopo somente de revisão. Nenhum gate editorial foi
  substituído.

## Segurança e não-publicação

As raízes especializadas permanecem service-role-only/RLS privado. Não há mudança
de bucket, Search, coleção, feed, relação territorial, publicação automática ou
asset público. História Oral continua sem transformar sugestão em depoimento.

## Provas e gates

Implementados localmente:

- `lib/comun-cultural-progressive-rights.test.ts` e o contrato textual A4 cobrem
  30 cenários de decisão/segurança; a suíte focal passou `40/40`;
- gates locais finais: `npm run typecheck`, `npm run lint`, `npm run build`,
  `npm run test:unit` (`207` arquivos / `1140` testes) e `git diff --check`;
- `scripts/comun-cultural-progressive-rights-a4-disposable.sql` prova a
  migration, privilégios privados, constraints, estados especializados,
  rollback e `businessWritesAfterRollback=0`;
- `.github/workflows/comun-48-5-a4-disposable.yml` executa somente Supabase
  local no runner, sem URL, projeto ou secret remoto, e publica o marker
  `COMUN_48_5_A4_PROGRESSIVE_CULTURAL_RIGHTS_DISPOSABLE_GREEN`.

O runner Windows não possui Supabase CLI nem `psql`; por isso a prova SQL não
foi simulada localmente e permanece obrigatória no workflow CI, que instala o
CLI e verifica ausência de credenciais remotas. Pendentes: CI/Preview exatos,
disposable remoto do PR, merge e rollout controlado. Nenhuma fixture Production
foi criada e a flag A4 não foi ativada.

## Deferimentos

- consentimento de História Oral continua sendo registrado no fluxo de entrevista
  e nos templates/admin existentes, não no primeiro formulário de sugestão;
- licença musical continua fora do A4 e depende de `comun_radio_music_uses`;
- revogação jurídica ampla e cópias de terceiros não são prometidas: o produto
  mantém retirada/restrição do COMUN e auditoria conforme os contratos existentes;
- A5 e qualquer nova moderação/editorial estão fora deste patch.
