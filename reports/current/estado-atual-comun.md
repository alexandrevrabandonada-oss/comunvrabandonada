# Estado atual — atualização 48.0M (05/08/2026)

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
