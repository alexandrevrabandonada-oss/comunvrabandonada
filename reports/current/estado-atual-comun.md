# Estado atual do COMUN

## Tijolo 48.0D-R1 — projeção sanitizada e mapa local — verde local, remoto inalterado

- baseline verificado forward-only: `origin/main` documental `118f1d4c88cc6915ef471ba59cfcfbcf0355d770`; produto/Production observado `6fefaa8e79de53e4c8bee1f4f4c16a71d5bc68c1`;
- branch isolada: `codex/tijolo-48-0d-relata-sanitized-local-map`;
- quarta barreira cumulativa: `COMUN_RELATA_LOCAL_PUBLIC_MAP`;
- migration local-only `20260803200000_comun_relata_sanitized_local_map.sql`, checksum no manifesto, `requiresPromotion=false`, `remotePromotionAllowed=false`;
- snapshots públicos do 48.0B preservados e bloqueados; nova projeção é aditiva e não publica Relata;
- política `relata-public-projection-v1`: células métricas 300/800/1.000 m, categorias templated, estados bloqueados/suprimidos/revisão/prévia local;
- confirmações first-party com cookie HttpOnly e hash server-side, sem criar relato ou alterar contagem de relatos;
- mapa/lista local com filtros, detalhe sanitizado, raio de incerteza e alternativa acessível; sem fotos, texto, protocolo, endereço ou status oficial;
- verificação: typecheck verde; testes focais de flags/projeção `9/9` verdes; Supabase CLI ausente, portanto migration não foi aplicada nem validada remotamente;
- Production permanece dormente; nenhum domínio, secret, flag remota ou bucket remoto foi tocado;
- recuperação R1: Docker Desktop `4.61.0`, Engine `29.2.1`, Supabase CLI `2.111.0`; conflito de porta e retry focal de gateway Storage foram infraestruturais;
- migration completa aplicada no Supabase descartável por reset forward-only; rehearsal `COMUN_RELATA_48_0D_DB_GREEN`, RLS/grants/restore/Storage verdes;
- Relata focal `39/39`, unitários `462/462`, E2E `20/20` em cinco viewports com Axe, surfaces `26/26`, typecheck/lint/build verdes;
- no-leak dormente: `/comun=200`, App V2/legado `200`, `/comun/relata`, mapa e APIs Relata `404` uniformes sem `405`;
- resultado do tijolo: `COMUN_RELATA_48_0D_MERGED_DORMANT_LOCAL_SANITIZED_MAP_GREEN_REMOTE_UNCHANGED`; branch ainda não publicada/mesclada, flags Production desligadas;
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
