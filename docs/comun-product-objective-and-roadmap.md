# Objetivo final e roadmap auditado do COMUN

> **Norte de produto (20/10/2026):** [SOC-D10 — Arquitetura integral da rede social do comum](#soc-d10--arquitetura-integral-da-rede-social-do-comum). O COMUN deve ser uma rede social de vida comunitária, útil e prazerosa sem exigir ativismo, preservando a potência cívica, cultural e econômica já construída. A visão e a implementação permanecem estados distintos.

## Feirinha — reconciliação da primeira conexão privada (20/10/2026)

Estado: CANDIDATO NO PR #549, sem aceite humano nem integração.
Base: main `d68aa0e7`, com U0 #546, PWA #559, Ajuda #558 e busca #553
integrados. Os históricos abaixo não substituem este checkpoint.

Preservar o contrato SOC-D08: contato e consentimento informados na
submissão atual; mensagem recuperável somente por escolha explícita,
identidade e origem compatíveis, prazo limitado e limpeza verificável.
Cliente Auth indisponível deve informar saída não confirmada, sem alegar
logout. O caso foi reproduzido na ação real com transporte controlado
e recebeu regressão focal. Nenhum novo schema, flag ou poder de acesso.

Exigir CI, Preview e provas próprias deste candidato. Browser com transporte
controlado e ensaio Auth/Postgres descartável são provas distintas; não
representam troca real entre moradores ou validação humana.

## Reconciliação do U0 residual — 20/10/2026

Estado: CANDIDATO NO PR #546; certificação do novo SHA pendente.
Base integrada: main `0e6dc4cd`, com busca #553, Ajuda #558
e armazenamento opcional PWA #559. A Production dessa base está READY
e sua API pública anuncia o SHA exato; isso não comprova aceite humano.

Este candidato preserva o recorte PWA já integrado e recupera o restante
da auditoria U0: rascunho de pauta por aba, limpeza por revisão, tarefas
e contagens públicas sem conteúdo interno e validação de referências de
prática na aplicação. O teste de storage negado mantém Ajuda/offline e
a criação de pauta como casos separados. Sem mudança de migration, flags,
Auth, indexação ou agendamento. Preflights da base são reconciliados com
os certificados de domínio existentes, sem dispensar leitura, TLS ou RLS.

Próxima dependência: certificar este candidato; depois reconciliar #549
para completar a conexão privada da Feirinha com consentimento atual.
Os checkpoints abaixo preservam o histórico e não substituem este estado.

## U0 — extração independente de armazenamento PWA (20/10/2026)

- **Falha de certificação e correção focal no #559:** a Quality
  `39502058415`, SHA `40b57091`, teve SUCCESS nas lanes local/P1T,
  acessibilidade e rede, mas a `pr-lane` falhou no teste
  `tests/miniapp-experience/miniapp-experience.spec.ts`, linha 37.
  O seletor global de `data-comun-app-v2-page="home"` resolveu dois
  elementos em desktop; a Quality do SHA anterior falhara pelo mesmo
  motivo em wide. A correção usa `main` como região semântica e
  **preserva um único home visível no main e uma ação primária**.
  Não elimina casos, não altera timeout, conteúdo de produto,
  autorização ou banco. A causa do segundo elemento extra-main
  ainda não foi demonstrada e não deve ser declarada resolvida.
  Novos gates completos obrigatórios no SHA corrigido; resultados
  anteriores são apenas histórico. `[comun-preview]` solicita novo
  Preview exato sem burlar a classificação COST-02.
- Checkpoint de Preview necessário: a Vercel ignorou o build anterior pela
  política de branch Codex; o commit documental marcado solicita Preview novo
  sem alterar runtime ou dispensar os checks do SHA resultante.
- Estado: **CANDIDATO EM BRANCH/PR, NÃO PRODUÇÃO**. Base exata `main`:
  `9b8612398d9d80f4e0ea2ac2c9b8874d567e419c`, após Ajuda #558.
- Problema delimitado: `sessionStorage` e `localStorage` podem lançar
  `SecurityError`; uma falha de persistência opcional não deve derrubar
  a navegação pública, nem inventar restauração da última rota.
- Mudança isolada do U0 #546: funções de leitura, escrita e remoção
  tolerantes à recusa em `lib/comun-pwa.ts`; integração em
  `components/comun-pwa-runtime.tsx` e `app/comun/offline/page.tsx`;
  contratos unitários e regressão Playwright em Ajuda/offline com storage negado.
- **Não inclui** `app/comun/pautas/**`, formulário de pauta, filtros de tarefas,
  Escola, preflights A1/C1/D1/E2/E3, migração, tabela, RPC, Storage remoto,
  flags, Auth, busca, indexação, automação ou mudança no produto em produção.
  Os caminhos bloqueados permanecem no U0 #546; Feirinha #549 não muda de base.
- Não considerar `SKIPPED` como `SUCCESS`. Exigir CI aplicável no
  SHA final, Preview exato, revisão de regressões e leitura pós-merge da Vercel.
  Sem prova humana/aparelho físico nesta extração. O merge deste recorte
  **não libera** nem modifica os gates de recuperação/migration da Escola.

## Checkpoint de publicação da Ajuda — 20/10/2026

- Escopo exclusivo do PR #558: orientar a pessoa conectada em
  `/comun/ajuda#conexao`, sem apresentar `/comun/offline` como diagnóstico.
- A `main` de referência é `1d41e89ec8a2d5e63361cc797de19e0b15bd57f4`;
  nela a busca pública #553 foi integrada e Production Vercel está READY.
- No SHA `16c07654`, os contratos de Ajuda, Coherence, a11y e COST-02
  passaram; uma lane cívica observou 14/15 testes PASS, com o
  controle de `semantic=0` não concluído dentro de cinco segundos.
  Essa falha não foi ignorada nem atribuída à Ajuda sem reprodução.
- O SHA `9b9fea23` corrigiu somente formatação da página Ajuda.
  O COST-02 registrou `checkpoint-stale` e o Preview Vercel desse
  mesmo SHA terminou CANCELED. Isso não habilita merge.
- A próxima revisão solicita um checkpoint Git/Preview exato,
  conservando verificadores, testes e os bloqueios de segurança.
  Somente após CI aplicável completa e Preview READY validar o
  SHA final será possível integrar a Ajuda por merge normal.
- Nenhuma migração, recuperação da Escola, alteração de flags,
  indexação, agendamento recorrente ou escrita no banco é autorizada
  por este checkpoint. O ensaio humano fica para o gate final.

## Checkpoint manual — Ajuda de conexão (20/10/2026)

- Base integrada de referência: `1d41e89ec8a2d5e63361cc797de19e0b15bd57f4` (busca pública #553).
- Origem: Home #554 e preflight Escola #557 integrados.
- Problema: a Ajuda enviava pessoas online para `/comun/offline`.
- Correção candidata: orientação em `/comun/ajuda#conexao`.
- Prova exigida: teclado e navegação com e sem JavaScript.
- Limites: sem novo endpoint, migração, cadastro ou envio.
- Estado: `CANDIDATO_EM_PR`; CI e Preview não transferíveis.
- Busca #553 já integrada; Escola, U0 #546 e Feirinha #549 preservam seus próprios gates.

## Correção de escopo dos preflights — 20/10/2026

Estado: CANDIDATO EM PR #553. A identidade CI no checkpoint `bd915b0d`
retornou MATCH, e os metadados exigidos pelo 48.2-A passaram. A pendência
`20261006134804_comun_learning_r0.sql` recusou a exigência global de plano vazio.
Os domínios já instalados agora podem receber certificado de metadados próprio,
somente sem alteração de migrations, com catálogo completo de 116 arquivos e
manifesto da Escola fixados por hash, ledger Hardening válido e transporte
read-only/TLS verificado. Schema ausente, drift desconhecido, catálogo alterado
ou migration do domínio pendente continuam recusados. Candidatos de schema
mantêm o caminho estrito anterior. A prova registra a Escola pendente e não
certifica plano global vazio, promoção, recuperação ou autorização de migration.

Esta separação remove acoplamento indevido da busca à promoção da Escola;
não remove os requisitos da Escola nem a avaliação final com três pessoas.
Gates remotos e Preview do candidato consolidado ainda precisam de provas
próprias antes de integrar. Automação permanece suspensa.

## Checkpoint de integração — 20/10/2026

**Linha integrada:** `main` no commit `28b5cb6ea2ce901a880679709ace26a023d3b4e9`
incorpora a Home #554, a preparação read-only de recovery da Escola #557
e contratos de competências/Fábrica até #515. Isto não declara
migração ou ativação da Escola ou da Fábrica em Production.

**Busca pública:** PR #553 ainda `DRAFT`, integração funcional candidata.
No SHA `3292ecd5`, todos os 104 checks chegaram à conclusão:
48 `SUCCESS`, 48 `SKIPPED`, 8 `FAILURE`. As oito falhas são
sete preflights remotos por drift/migração pendente da Escola e COST-02
(`checkpoint-stale`; Preview desse SHA não `READY`). Browser,
contrato V1, CI cívica e integração concluíram `SUCCESS` nesse SHA.

**Conciliação com a nova main:** preservadas integralmente as três
inserções canônicas de 49-C3/49-D1/D1.1/D1.2/D1.3 da `main`
e os incrementos de busca/regressão registrados na branch #553.
O merge técnico é distinto do merge do PR em Production.

**Próximo gate real:** concluir a reconciliação do PR com a nova `main`,
observar CI do SHA reconciliado, identificar projeto Supabase COMUN
autorizado, regularizar drift/migração na trilha de recovery com
backup/validação e obter Preview exato válido. Não dispensar checks,
agendar ORCH-V2, aplicar SQL remoto, ativar flags ou antecipar o
ensaio final com três participantes.

Os checkpoints anteriores abaixo são históricos; não revogam o
estado e as restrições deste checkpoint.

## Atualização operacional — 19/10/2026

**Integrado e verificado:** o PR #554 foi incorporado à `main` no commit
`64133f0a004846c03ef559f89c8bc47067ff04ec`. Os 35 checks exigidos
concluíram com sucesso; a Vercel registrou deployment Production `READY`
para esse SHA. A validação humana com três pessoas permanece para o final.

**Busca pública (#553):** continua candidata, em PR draft, reconciliada
com `main`. O contrato de consulta/contexto, Home e modo legado tem testes
em desenvolvimento; no SHA `9db6c2bf` as falhas locais específicas foram
uma asserção que contava `/api/comun/quality-metrics` como escrita de
domínio, formatação do teste e tipos temporários `.next/dev` inválidos.
A revisão seguinte isola métricas técnicas e reutiliza limpeza descartável
já protegida por testes. O status CI desse novo SHA permanece pendente.

**Bloqueios remotos independentes:** `COMUN_48_2_A_BLOCKED_REMOTE_SCHEMA_DRIFT`,
`REMOTE_MIGRATION_PLAN_NOT_EMPTY:20261006134804_comun_learning_r0.sql`
e COST-02 sem checkpoint Preview recente. Não promover o #553 ou alterar
banco, flags, indexação e Production para contorná-los. O projeto COMUN
não foi identificado na conexão Supabase disponível na verificação.

**Execução:** continuar manualmente, por trilhas, sem agendamento ORCH-V2;
a verificação de navegador e os ensaios dos três participantes continuam
distintos de CI, deployment `READY` e certificação V1 global.

Os checkpoints antigos abaixo são histórico, não o estado operacional
vigente. Esta atualização prevalece quando houver conflito de status.

## Checkpoint manual de integração — 19/10/2026

**Fonte de verdade:** `main` em `11c3bc362f8d14c0972f949e369b7cfa9f2a22ec` (merge #545); 20 PRs abertos na consulta GitHub. Esta seção foi **proposta no PR #554**, não integrada em `main`. A certificação do SHA final desta revisão permanece `PENDING/NOT_RUN`, não é Production.

**Decisão de execução:** executar manualmente por trilhas, com assistência de ferramentas e CI acionada pelas alterações reais, **sem ativar ou agendar ORCH-V2**. O #556 permanece draft e sua integração ao agendador/launcher Windows não está comprovada. Manter três pessoas reais para o ensaio final 47.11/50 COMUN UNO; antes disso utilizar navegadores, contratos, Auth/RLS em laboratório, teclado, axe, network e cenários sintéticos. Teste automatizado não substitui entendimento/consentimento das pessoas e ensaio final não autoriza ignorar gates técnicos.

### Trilha operacional única — reduzir WIP e integrar valor verificável

1. **P0 — continuidade e descoberta na Home (#554, draft):** um conjunto principal de entradas, acesso anônimo à busca e relato, conteúdo público com origem `remote/editorial_fallback/empty` distinguível, ausência de feed fictício, `legacy` preservada. No HEAD `0f0df307`: Experience Coherence passou; Quality/Performance `39335839689` terminou **230 PASS / 1 FAIL** no navegador (360×800, `?experiencia=legacy`, JS ativo). O trace textual registra navegação com `q=` vazio após digitar `comunidade-inexistente-49e`; origem precisa ainda não certificada. COST-02 `39335839634` **FAIL** (`preview-not-valid-for-checkpoint`). **Não fazer merge.** Revisão focal `8c010505` torna o contrato explícito: espera a shell interativa estabilizar e exige que o valor digitado conste na URL submetida. Isso NÃO comprova cura da perda de texto durante hidratação precoce; exigir regressão no SHA novo e investigação separada se voltar a falhar.
2. **P1 — preservar busca e continuidade privada sem sobreposição:** reconciliar #553 (retorno de filtros; preflights remotos recusam a migration de Escola), #546 (privacidade/continuidade) e #549 (consentimento atual da Feirinha) com o mesmo `main`. Revisar conflitos de `components/comun-app-v2-home.tsx` entre #553 e #554 antes de integrar. PRs abertos não equivalem a funcionalidades publicadas; nunca transportar verdes entre SHAs.
3. **P2 — descoberta cultural e relações com baixo atrito:** #552 (curadoria pública) e #551 (Jogos/Cidade em Disputa) continuam candidatos. Só promover quando catálogo, autoria, direitos, retorno, segurança e gates de cada SHA forem comprovados. Fábrica/competências (#511–#515), Editais #524 e módulos futuros não antecedem o fechamento das jornadas básicas e bloqueios críticos.
4. **Proteções não negociáveis:** Escola `20261006134804_comun_learning_r0.sql` continua dependente de recuperação real, autorização e preflights; **sem schema write, migração remota, flags, Production, indexação, alteração de TLS, remoção de checks, force-push ou merge automático** para obter verde. COST-02 e Preview do SHA exato são portas independentes. `SKIPPED`, `QUEUED` e `PENDING` não significam `PASS`.
5. **Saída desta trilha:** filtro e retorno em mobile/desktop, JS ligado/desligado, busca pública, teclado/foco e privacidade verdes no SHA integrado; Preview Git e COST-02 certificados; sem P0/P1; revisão técnica final e pós-merge. Só então declarar incrementos `INTEGRADO`; `PRODUÇÃO VERIFICADA` exige deploy/observação da própria `main`. Avaliação com as três pessoas fica no gate final, não é improvisada em PR intermediário.

**Estado desta passada:** teste endurecido no PR #554 e checkpoint da auditoria proposto no mesmo documento canônico. Nenhum merge, publicação, schema ou agendamento executado. Próxima ação única: conferir CI do novo HEAD, diagnosticar eventual perda de `q` e classificar COST-02/Preview; não forçar entrega incompatível com segurança.

> **Atualização transversal (14/10/2026):** [Consolidação de rede social, convivência, atratividade e sustentabilidade](#consolidação-canônica--rede-social-convivência-e-atratividade-14102026). Esta seção integra decisões e hipóteses ao roadmap único; não significa implementação nem lançamento.

## Estado atual da auditoria integral — U0.2

**Uma fila, uma entrega principal:** #546 permanece estacionado nos cinco preflights da Escola. Por instrução explícita de 14/10, SOC-D08 foi implementado no #549 draft, derivado e delimitado, sem duplicar correções nem integrar enquanto houver gates bloqueados. A revisão final demonstrou e corrigiu também troca de identidade entre abas; conferir as provas do último head no #549. Esta seção é o ponto de retomada; os registros abaixo preservam decisões e evidências históricas. A proposta de sequência consolida prioridades, sem revogar gates vigentes.

**Produto:** rede comunitária de vida cotidiana, ajuda mútua, organização de base, Feirinha (venda/troca/doação), ferramentas por pauta, observatórios, formação/Fábrica, cultura e memória. Todas compartilham busca, território, privacidade, continuidade e distribuição. Não é necessário transformar toda interação em pauta. Execução solo, sem orçamento adicional e sem participantes de teste disponíveis neste momento.

| Estado               | Resultado / próximo passo                                                                                                                                                                        |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Inventário estático  | 240 páginas / 46 famílias; 52 arquivos de ações / 187 exports async. Não certifica funcionamento ou disponibilidade                                                                              |
| Correções candidatas | Rascunho por aba com revisão para limpeza segura; tarefas públicas e contagens sem internas; controles administrativos explícitos; seleção e referência de prática protegidas na aplicação       |
| Verificação          | Baseline U0 e contagens históricas no relatório vinculado; provas SOC-D08 discriminadas por SHA ao final desta seção canônica e no #549. Não transferir aprovações.                              |
| Bloqueio             | #546: cinco preflights recusam 20261006134804 da Escola. SOC-D08 também alcança essa pendência no P1G. O antigo bloqueio de browser não se aplica às provas posteriores de Chromium registradas. |
| Escola               | Migration/manifest pinados intactos; ativação e atomicidade de referências no banco seguem pendentes                                                                                             |
| Item ativo           | #549 draft, SOC-D08: mensagem privada, sessão atual, Sair real e entrada pelos cards. Dependência explícita do #546; integração exige gates de main e schema resolvidos, sem bypass.             |

Fontes e limites estão no [checkpoint U0](../reports/current/comun-u0-product-inventory.md). O índice de ações não cobre automaticamente endpoints, `app/actions.ts` ou dependências transitivas; o arquivo central foi examinado apenas no rastreio focal.

Sequência única de produto: consolidar → operação solo/coerência → organização de base → Feirinha → ferramentas/observatórios → formação/cultura → distribuição → ensaio solo → uso comunitário. Segurança, recuperação e acessibilidade acompanham cada etapa. Migrations, flags, indexação e configurações dos provedores não foram alteradas neste pacote. O retorno do CI motivou ajuste focal de CA pinada nos cinco preflights históricos, mantendo verificação TLS, leitura e todos os gates.

## 49-E4 — candidato de continuidade em comunidades — 14/10/2026

Após #544/main `3694710f`, auditoria identificou perda da experiência legada
no submit dos filtros, link de limpeza e cartões da lista de comunidades.
Correção focal preserva o modo nos três pontos, sem schema ou nova capacidade.
Lint, tipos, build e nove testes de helpers locais PASS. Casos Playwright novos
preparados; execução local BLOCKED por download Chromium inválido, CI/Preview
PENDING. Não é entrega Production nem conclusão de 49-M/V1. Evidências:
[continuidade 49-E4](../reports/current/comun-49-e4-community-continuity.md).

O primeiro candidato remoto `ddbb4118` revelou bloqueio real sem JavaScript:
quatro casos falharam com a shell presa no carregamento. Correção opta pelo
fallback público existente apenas na lista de comunidades, sem mudar painéis
privados. Falhas preservadas; novos gates do SHA corrigido PENDING.

## Piloto UX da Home — descoberta familiar e conteúdo real (15/10/2026)

**Estado: CANDIDATO EM PR; não integrado nem validado com pessoas.** Vinculado a
SOC-D01 (valor sem reciprocidade), SOC-D05 (reutilizar antes de criar), SOC-D07
(medir uma jornada real), SOC-D09 (descoberta cultural) e ao inventário U0. Este
checkpoint é parte do roadmap único e não inicia outro programa de redesign.

### Problema observado no código e hipótese

A Home App V2 de `components/comun-app-v2-home.tsx` apresenta a entrada "Vi um
problema", três portas de intenção ("O que você quer fazer?") e depois três
cartões "Você escolhe como usar", antes de destacar uma pauta. A repetição exige
interpretação de caminhos parecidos antes de oferecer conteúdo concreto.
**Hipótese, não achado de ensaio humano:** reduzir entradas repetidas e
antecipar um conteúdo público elegível melhora compreensão e vontade de explorar
sem desorientar quem chega para relatar algo.

### Incremento piloto estritamente delimitado

1. **Home App V2:** manter "Vi um problema" como CTA primário, acrescentar
   acesso explícito à busca pública, preservar três portas e substituí-las como
   único grupo de escolha inicial; "Aprender a organizar" fica como link discreto,
   sem duplicar a coleção completa de cartões. A coleção existente continua em
   `/comun/participar` e na Home legacy para compatibilidade.
2. **Conteúdo antes de catálogo:** antecipar uma pauta pública com
   `source=remote`, quando houver, a partir do leitor existente. Se houver
   somente o fallback editorial canônico de Calçadas, exibir essa origem e
   esclarecer que ela não comprova participação nem resultados. Sem qualquer
   item elegível, explicitar ausência e oferecer o catálogo; não fabricar
   fotos, histórias, atividade, resultados ou contagens. Preservar em
   Acompanhamentos a pauta pessoal distinta quando a pessoa estiver logada,
   sem duplicar exatamente a mesma pauta.
3. **Sem novos poderes:** nenhum novo endpoint, autenticação, tabela, migration,
   feed, perfilamento, like, alteração de elegibilidade, ranking, telemetria,
   permissão, jogo, publicação, mensagem ou mudança em Production.
4. **Cuidado com conflito:** #553 também modifica este componente da Home
   (form da Busca Viva) e o próprio roadmap. Reconciliar os commits depois da
   conclusão de #553; não mesclar o piloto automaticamente. #550/#552 também
   propõem mudanças documentais independentes no roadmap. Preservar as alterações
   aprovadas ao reconciliar; #546/#549 e Escola seguem seus bloqueios próprios.

### Critérios de aceitação e contraexemplos

- Em `/comun` canônico, busca, relato e exploração continuam acessíveis,
  há somente um grupo principal de escolhas de intenção e pauta real aparece
  perto da entrada quando houver item elegível.
- Em `?experiencia=legacy` e `/comun/participar`, a jornada de orientação
  anterior e seus links persistem. Os links diretos/teclado continuam válidos.
- Sem pautas publicáveis ou fallback editorial autorizado, a Home mostra
  ausência, não uma pauta fictícia. Quando o fallback for usado, ele é
  identificado como editorial, sem confundir com publicação remota. Nunca
  expor dados privados ou contornar flags/editoria.
- Regressões existentes de navegação, browser, WCAG/Axe, foco, mobile 320–390,
  scroll, abertura/retorno e falta de conexão precisam passar no SHA exato.
- Antes do ensaio humano final, automatizar a jornada pública em mobile
  e desktop (inclusive sem JavaScript): descobrir uma pauta elegível ou ausência
  honesta, buscar, voltar sem perder a orientação e verificar foco/contraste.
  Os testes não medem compreensão, desejo de voltar nem confiança de pessoas.
- As três pessoas disponíveis ficam reservadas para o ensaio integrado de
  fechamento da V1 (47.11 e 50 como avaliação futura, sem antecipar conclusão).
  Nesse ensaio, verificar descoberta sem login, relato, participação, retorno,
  explicação de evidências, autonomia e acessibilidade; registrar tarefas,
  tempos, ajuda, dúvidas e decisão humana. Não declarar a Home aprovada por
  pessoas apenas porque passou em Playwright.

### Ordem de evolução, sem expansão especulativa

**P0** retirar redundância e apresentar a pauta real; **P1** validar descoberta
transversal dos leitores públicos propostos em #552, linguagem, hierarquia e
contraste da Home; **P1** ensaiar busca e retorno do #553; **P2** avaliar cultura,
Feirinha e jogos com conteúdo real, autoria e direitos; **P2** experimentar
conversa livre somente depois de fechar a primeira interação de ponta a ponta,
moderação, saída e proteção de dados. Manter Zen Brutalista com três níveis de
expressividade (calmo, contextual, cultural), acessibilidade e dispositivos
populares. Não padronizar interfaces culturais com urgência de denúncia.

**Prova inicial:** alteração isolada em branch, mais teste de continuidade;
ainda sem testes executados neste registro. Não equivale a merge, Preview READY,
disponibilidade pública ou validação humana. Próximo bloqueio: classificar CI do
piloto e coordenar merge/rebase com #553 sem dispensar gates.

### Checkpoint técnico do candidato — 16/10/2026

Branch isolada `codex/comun-home-discovery-pilot-20261015`, PR #554
draft. O primeiro head `5b9f7a1e` teve Experience Coherence e o
contrato sintético de continuidade **SUCCESS**, mas Core Journeys falhou
no Prettier do componente e COST-02 recusou ausência do marcador Preview.
Essas falhas não são testes verdes. A correção de estilo foi aplicada, assim
como um atributo público não sensível para distinguir o cartão `remote`,
o destaque `editorial_fallback` e o estado `empty`. Um teste de navegação
verifica as três possibilidades sem fabricar conteúdo.

O commit com marcador de Preview apenas solicita o build canônico em Git
e não comprova Vercel READY, deployment GitHub válido, CI verde, merge,
atualização de Production ou usabilidade humana. Preservar o bloqueio se
a CI ou o Preview não comprovarem o SHA exato. Conferir conflito funcional
com #553 (submissão segura da Busca Viva) antes de integrar. Não substituir
verificações de aparelhos reais por Playwright.

### Execução sob demanda — validação automatizada antes da coorte final (19/10/2026)

A coorte de três participantes reais não será consumida em cada PR ou
microcorreção. Ela será convocada quando o ciclo integrado da V1 estiver
tecnicamente pronto para o ensaio final. Enquanto isso, cada jornada deve
receber regressões automatizadas verificáveis com o SHA exato e testes de
navegação sem cadastro, teclado, mobile e comportamento sem JavaScript.
O piloto da Home permanece **candidato em PR**, não ensaiado com pessoas,
e a plataforma não ganha autorização de launch_publicly por esta decisão.
A automação agendada não é necessária para esse fluxo sob demanda.

## Continuidade independente — 12/10/2026

Candidato funcional `42f7ddd6`: cópia de texto da ouvidoria e protocolo agora
oferece alternativa manual selecionável quando o navegador recusa clipboard,
sem falso sucesso, envio automático ou perda de contexto. Cinco cenários Chromium,
teclado/foco, celular e Axe passaram em componentes reais com fixtures sintéticas;
build/TypeScript/ESLint focais passaram. Preview e integração ainda exigem gates
próprios. [Provas e limites](../reports/current/comun-copy-continuity.md).

A recuperação da Escola retoma pelo checkpoint versionado do #540, sem repetir
provas válidas: convite Gmail recebido/confirmado PASS; bateria restante de até
seis mensagens autorizada, ainda sem envios e bloqueada pela captura fiel Source.
#523 permanece separado e seus seis preflights continuam obrigatórios. Sem schema
write, flags ou indexação; não declarar Escola liberada ou V1 concluída.

## Recuperação da Escola — escopo separado, 08/10/2026

Revisão do #534: preparação elegível para integração após gates do SHA, sem
autorizar recuperação real. O crash foi reduzido a uma função que retorna 1:
na mesma biblioteca/PG17.6, hint_roles=anon reproduz signal 11; hint_roles vazio
retorna 42501. Finding permanece aberto e separado do restore PASS.
Caso mínimo e configuração/logs sanitizados preservados no pacote.
Novo gate externo: clone físico pode iniciar cron/webhooks/wrappers ao concluir;
isolamento não decorre do nome do projeto. Destino nominal proposto, tarifas,
autorização em etapas e campos ainda pendentes estão no
[pacote de decisão real](../reports/current/comun-escola-real-recovery-decision.md).
Sem upgrade, cópia privada, restore ou alteração Production nesta revisão.

#533 integrado e certificado em main `2151826f`. #523 continua draft em
`cf0e8e41`: Quality PASS e seis preflights de schema bloqueados.
A sessão do projeto correto foi disponibilizada em outro perfil Chrome;
identidade confirmada pelo hash do PRE. O painel Free não oferece backups,
PITR ou restore gerenciado em novo projeto nas condições atuais. A limitação
histórica de acesso ao dashboard está resolvida; recuperação real ainda não.

Esta passada compara backup lógico independente e Pro/recuperação gerenciada,
prepara captura protegida e ensaio sintético em cluster vazio. Cobertura DB,
Auth, Storage metadata/bytes e configurações externas são tratadas separadamente.
Uma falha de backend signal 11 em chamada não autorizada foi reproduzida somente
na imagem descartável pinada; não foi testada nem inferida em Production.
Ela continua finding aberto, sem alteração de grants para obter verde.
Resultados, limites, retenção proposta e operação real pendente estão em
[estratégia de recuperação](../reports/current/comun-escola-recovery-strategy.md).

PASS sintético em `4bc3e33b`: restauração após destruição da origem, 278 tabelas,
catálogo/dados/roles/grants/memberships, histórico/ledger, RLS A/B, negação de RPC
no cluster restaurado e arquivo separado. Evidência sanitizada e 80 focais PASS.
O crash anterior da instância padrão da imagem permanece FAIL separado.
Auth/Storage API, Vault, off-site/escrow e restore real não estão certificados.
Recomendação para decisão: Pro + backup físico diário efetivo + restore em novo
projeto, com lógico como segunda linha; sem contratação ou upgrade nesta rodada.

Próximo gate: comprovar snapshot recuperável real e restore isolado, com destino,
tratamento dos dados e responsáveis aprovados; depois autorização específica de
schema. Sem upgrade, migration Production, flags, abertura de indexação ou
certificação da V1 nesta passada.

## Fechamento exclusivo da Escola e #523 — 08/10/2026

#532 integrado em `636e3e1d`, Production Git READY no SHA exato, sem schema
write. Captura/read-only e equivalência PRE/POST auditadas por artifact/hash.
Quality de #523 `cf0e8e41` terminou verde após uma única reexecução dirigida
do 502 de Território, sem código; os seis preflights Escola continuam FAILURE.
O candidato permanece draft, com funcionalidades estáveis.

A revisão focal #533 exige POST e ledger aprovados antes do COMMIT, controles
SQL negativos e preservação de privilégios no laboratório. A captura confirmou
os direitos existentes do leitor Production; a fixture foi corrigida para
reproduzi-los sem mudar o destino real. Prova SQL funcional `775f86e9`, run
37863202153 PASS: POST/ledger divergentes abortam e preservam PRE, privilégios
preexistentes preservados, aplicação única e replay recusado. Os fingerprints
PRE/POST revisados permaneceram intactos. Checkpoints posteriores exigem gates
próprios, sem transportar aprovações por presunção.
Backup/ponto recuperável/acesso ao restore do COMUN permanecem BLOCKED, pois
o conector não expõe o projeto e o dashboard está sem sessão. Restore isolado
do provedor NOT_RUN. Responsáveis humanos ainda não designados; nenhuma
autorização de migration, flag ou indexação foi inferida. Próximo gate: fechar
recuperação/executor e autorizar separadamente a liberação da Escola. Evidências
e procedimento em [fechamento controlado](../reports/current/comun-escola-controlled-release-closure.md).
Não declara V1 concluída nem libera merge de #523 sem seus seis gates.

Base de produção conferida em 06/10/2026: `64bba7165033724bba3d8f8b98256aacd99dd450`, após os PRs #504, #505 e #506. A reconciliação de 02/10 e os achados intermediários abaixo são históricos. A V1 continua incompleta; a situação atual e a fila sem amostra humana estão na seção seguinte.

## Atualização transversal do produto — 06/10/2026

### Checkpoint integrado e fila de revisão — 08/10/2026

Consulta deste checkpoint: `main` em
`eb317e76f9d259c4436e4a791e6215d153ab7c99`. Código integrado não significa
schema promovido, flag ativada ou jornada pública certificada. A V1 permanece
incompleta; os checkpoints seguintes desta página são históricos.

| Tijolo                                                                                                         | Evidência confirmada                                                                | Estado e limite                                                                              |
| -------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| [#522 — Quality read-only](https://github.com/alexandrevrabandonada-oss/comunvrabandonada/pull/522)            | Merge `2d21df3d`; inspeção read-only verde no pós-merge                             | Integrado; a run falhou depois no seletor antigo de busca                                    |
| [#526 — Revisão da Escola](https://github.com/alexandrevrabandonada-oss/comunvrabandonada/pull/526)            | Merge `6a3c39a3`; revisão imutável e prova PostgreSQL descartável                   | Integrado; não autoriza promoção remota                                                      |
| [#525 — Seletor visível de busca](https://github.com/alexandrevrabandonada-oss/comunvrabandonada/pull/525)     | Merge `092a4afa`; 10 checks do candidato verdes, 35 skipped                         | Integrado; Quality pós-merge falhou por SHA sem build                                        |
| [#527 — Ensaio atômico da Escola](https://github.com/alexandrevrabandonada-oss/comunvrabandonada/pull/527)     | Merge `eb317e76`; 10 checks verdes, 75 skipped; SQL canônico descartável verde      | Integrado; pós-merge 4 verdes/73 skipped e Vercel success; não prova recuperação do provedor |
| [#528 — Escopo pós-merge do Quality](https://github.com/alexandrevrabandonada-oss/comunvrabandonada/pull/528)  | Candidato `986b3851`; 46 testes locais e Preview/COST-02 verdes                     | Draft; laboratório completo de Quality ainda em execução nesta consulta                      |
| [#523 — Coerência e compartilhamento](https://github.com/alexandrevrabandonada-oss/comunvrabandonada/pull/523) | Candidato reconciliado `922e5d82`; runtime preservado frente ao checkpoint anterior | Draft; gates remotos dependem da Escola; não transferir PASS entre SHAs                      |

Skipped não é PASS. O #525 alterou somente testes, delta ignorado pelo
classificador de build em Production. Quality job `113451932296` falhou após
30 tentativas com `COMUN_QUALITY_EXPECTED_SHA_NOT_DEPLOYED`. A falha permanece
registrada. O #528 reutiliza a classificação do build para declarar somente
deltas explicitamente sem runtime como não aplicáveis; mudanças de runtime,
schema, dependências, arquivos desconhecidos e diffs indisponíveis continuam
exigindo deploy do SHA exato. Não há certificação de Production por exclusão.

O [ensaio atômico canônico descartável da Escola](comun-escola-atomic-disposable.md)
comprovou rollback após schema, histórico e ledger, instalação única com POST e
ledger exatos, outros domínios preservados no escopo canônico v2 e replay
recusado. Não cobre integralmente schemas privados nem recuperação após COMMIT
no provedor. O manifesto permanece `remotePromotionAllowed=false` e a
preparação mantém `promotionReady=false`.

Fila de avanço, em ordem:

1. Concluir os checks do #528; integrar por merge normal somente se verdes;
   verificar o pós-merge e o SHA servido quando o delta exige build.
2. Identificar e allowlistar o ambiente canônico da Escola; capturar baseline
   e ledger em read-only, conferir PRE/POST e capacidade real de recuperação.
   As provas descartáveis já integradas não substituem essas evidências.
3. Revisar um pacote concreto de schema antes da autorização específica de
   promoção; o caminho automático de Quality permanece sem escrita de schema.
4. Reconciliar #523 com a base integrada, revalidar os gates do próprio SHA,
   integrar o candidato verde e conferir deploy. Sem amostra humana, priorizar
   coerência, projeção pública dos observatórios, compartilhamento e SEO;
   convites e dados privados continuam respeitando autorização.
5. Depois das provas técnicas, ensaiar recebimento/retorno com pessoas e
   dispositivos reais. Isso continua pendente e não é substituído por CI.

### Sequência de integração — 08/10/2026

Primeiro tijolo integrado: #522, merge normal
`2d21df3de4da10851840529a639944ee22141377`, árvore idêntica ao candidato
read-only revisado. O caminho automático de Quality deixa de transportar schema.
Na consulta desta preparação, o deploy Vercel informou success e os checks
pós-merge ainda executavam; certificação completa não presumida. Quality
`37811285564` confirmou inspeção de schema read-only verde e falhou depois no
seletor antigo da busca (cópia oculta de streaming). Integrar a correção focal
já validada no #523 antes de considerar a base certificada.

O #523 permanece draft em `ec849235b1fa33dd4dad959a4748b6ddff438bfd`.
Quality e Civic Intelligence concluíram success; consulta completa: 49 success,
6 failure, 87 skipped, nenhuma pendência. As seis falhas seguem bloqueadas pela
release da Escola; skipped não é aprovação. As descrições anteriores de #522
draft e Quality pendente abaixo são históricas.

O próximo pacote separado é a [revisão da release Escola](comun-escola-release-review.md):
bytes/catálogo imutáveis, captura preliminar read-only e prova PostgreSQL
descartável. Publicar a ferramenta não promove schema. O manifest permanece
local_candidate e remotePromotionAllowed=false. Baseline completo, transporte
atômico, POST e recuperação ainda precisam de prova antes de uma promoção.

Ordem: certificar #522 → integrar preparação da Escola → revisar/promover schema
em etapa própria → revalidar seis gates → integrar #523 → certificar deploy.
Ativação e ensaio humano seguem depois. Novas frentes de produto devem usar
essa base integrada, preservando as dependências e a distinção código/schema/flag.

O roadmap passa a tratar o COMUN também como infraestrutura para uma estrutura política permanente ligada à APS, à VR Abandonada e a organizações aliadas. Núcleos, estratégia, formação, competências, fábrica, Minha Participação, inteligência cívica, observatórios e ação institucional formam um ciclo organizativo: evidência → prioridade coletiva → formação e responsabilidade voluntária → ação → devolutiva → memória e renovação de capacidades.

Essa conexão existia distribuída em frentes do roadmap, mas não estava explícita como objetivo integrador nem como contrato de produto. O novo [49-E0 — contrato de produto único](comun-one-product-contract-49-e0.md) fixa os princípios e inclui a camada **49-M — Organização política permanente**. O E0 é um candidato em implementação; não altera o estado da V1, a autorização de lançamento nem a indexação atual.

| Trilha                                     | Papel no produto inteiro                                                                                                        | Estado do trabalho sem amostra humana                                                                                              |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| **49-E0 — COMUN ONE PRODUCT CONTRACT**     | Gramática comum, superfície pública, compartilhamento, busca, privacidade, continuidade e fricção                               | Contrato e testes focais aprovados localmente; prova renderizada ampliada no 49-E2 abaixo; adoção em todas as rotas ainda pendente |
| **49-M — Organização política permanente** | Vincula APS, VR Abandonada e aliadas a núcleos, decisões, tarefas, formação, ação institucional, prestação de contas e sucessão | Arquitetura e limites registrados; governança, pessoas e responsabilidades reais exigem validação da organização                   |
| **50 — COMUN UNO**                         | Ensaio da experiência completa, inclusive a relação com estrutura e ação política                                               | Etapa final; depende de jornadas com pessoas, dispositivos e operação reais                                                        |

## Produto e estrutura política permanente

O objetivo do COMUN é apoiar uma organização popular que aprenda, escolha prioridades, forme pessoas, atue no território e nas instituições, avalie consequências e transmita capacidade para novas lideranças. A associação e a VR Abandonada são parte da estrutura política do projeto; o COMUN é sua infraestrutura comum e também uma porta pública de conhecimento, participação e prestação de contas. O aplicativo não substitui a organização nem decide sua linha política.

“Máquina política” fica definida como capacidade coletiva organizada e durável: vínculo voluntário, responsabilidade clara, formação prática, decisão rastreável, trabalho público, resultados conferíveis e sucessão. O produto não converte participação em pontuação, não monitora militantes e não usa dados políticos para microsegmentação ou pressão.

## Próxima estrutura do roadmap integral

### Diretriz incorporada — movimento social moderno

O COMUN combina ferramenta pública, participação voluntária e organização com
formação permanente. **Usar, participar e organizar** são caminhos com valor
próprio, não categorias de pessoas ou uma progressão obrigatória. A pessoa pode
resolver uma necessidade sem se vincular; pode contribuir pontualmente; ou
construir continuidade num núcleo. Convites são contextuais e responsabilidades
dependem de aceite explícito.

| Entrega                                                     | Relação com o roadmap | Prova necessária                                                                         |
| ----------------------------------------------------------- | --------------------- | ---------------------------------------------------------------------------------------- |
| Inventário de entradas, utilidade e convites                | 49-E0 / 49-E          | Rotas e barreiras reais; funções públicas preservadas sem adesão                         |
| Orientação → prática → devolutiva → retomada                | 49-C / 49-F           | Materiais e registros conectados; formação não atribui tarefa nem função automaticamente |
| Núcleo → decisão → tarefa → ação → resultado → substituição | 49-A / 49-B / 49-M    | Responsáveis e vínculos concretos; memória e continuidade com substitutos                |
| Jornadas de uso pontual, contribuição e organização         | 50 COMUN UNO          | Provas técnicas e ensaio humano dos três caminhos, incluindo saída e retorno             |

VR Abandonada comunica e mobiliza; APS e aliadas dão base associativa e
capacidade de execução; COMUN conecta conhecimento, formação e continuidade;
atuação institucional encaminha demandas e devolve resultados à rede. São
papéis previstos no desenho, com responsabilidades reais ainda a confirmar.
O [contrato 49-E0](comun-one-product-contract-49-e0.md) detalha os critérios.

Esta diretriz está registrada na arquitetura candidata. Não significa que
convites, integrações ou núcleos já estejam implementados. O próximo trabalho
é inventariar as superfícies existentes antes de expandir telas ou cadastros.
Maturidade exige capacidade coletiva continuada, além das métricas de acesso.

O fechamento da V1 permanece prioritário e não se confunde com a visão futura. Depois dele, os tijolos 49-A a 49-L podem avançar em paralelo sob o contrato 49-E0: núcleos permanentes; ciclo estratégico; Escola e competências; Fábrica; Reflexo COMUN; continuidade; inteligência cívica; distribuição; páginas de referência e SEO; serviços e controle popular; observatórios; plataforma física/digital. A trilha 49-M integra essas capacidades à organização permanente. O 50 COMUN UNO fecha com coerência integral de jornadas, módulos, canais, estratégia organizativa, acessibilidade, privacidade, compartilhamento, SEO e operação.

O [contrato 49-E0](comun-one-product-contract-49-e0.md) descreve as relações entre os tijolos, a jornada político-organizativa, os limites de privacidade e os critérios de saída. Suas metas de baixa fricção e experiência humana permanecem metas até serem ensaiadas.

## Posição geral e fila sem amostra humana — 06/10/2026

### Implementação candidata 49-E1 — entradas e primeira prática

Participar oferece três caminhos independentes: buscar um assunto, conhecer
ações e conhecer comunidades. O componente serve às experiências canônica e
legacy. O convite explica que explorar não gera inscrição nem tarefa.
Participar e Ajuda abrem a orientação pública `/comun/ajuda/primeira-acao`:
escolher pergunta → conferir fontes → escolher contribuição → voltar ao que
mudou. Os destinos são rotas já existentes; não há gravação de progresso,
vínculo, atribuição, nova permissão ou ativação da Escola.

Esta entrega implementa navegação e orientação inicial, não o ciclo formativo
completo. Progresso privado da Escola, relações entre prática e tarefa, convites
em detalhes de pautas/ações e operação de núcleos continuam pendentes. A prova
de navegador deve verificar acesso anônimo, retorno, preservação da experiência,
acessibilidade, viewport móvel e consulta sem JavaScript; contratos locais não
substituem essa prova nem ensaio humano.

Validação local: TypeScript, ESLint, dez testes do contrato público, dois de
coerência e quatro de classificação de superfícies passaram. As duas páginas,
nas experiências canônica e legacy, responderam HTTP 200 com um h1 e os links
esperados no HTML servido. Os três testes de navegador foram preparados para
a suíte existente, mas a tentativa local parou no lançamento: Chromium ausente.
HTML servidor não comprova contraste, foco, overflow ou interação renderizada.

### Implementação candidata 49-E2 — orientação e retomada privada

Continuação do PR #520 sobre `74cc0ed1779f5432496c3f852ce92bed3524a3a1`,
preservando seu head inicial `af47674945bed9d9c10a2e499319f61027161683`.
Candidato funcional `1a46d5550a4ddd98ed467c322dcf1c6e480d4946`, tree
`fc4dd7095c2098aaf86f5c3db75fb53d0c5fa6c0`. Os comandos e limites da prova
estão em [evidência 49-E2](../reports/current/comun-49-e2-participation-continuity.md).
A árvore original com trabalho preexistente não foi modificada; a entrega foi
feita em worktree isolada. Continua candidata, sem merge, ativação ou lançamento.

Minha participação retoma um registro real da carteira existente e oferece
orientação conforme seu estado: registrar com cuidado, acompanhar sem confundir
envio com resultado, ou conferir o que a resposta mudou. O material público
retorna aos registros privados e oferece contribuição voluntária em Ações.
Nenhum progresso, tarefa, vínculo, envio, notificação ou resultado é criado
ao abrir essa jornada. A carteira continua sendo a autoridade do registro.
Somente uma fase pública allowlisted e `experiencia=legacy` atravessam a URL;
IDs, protocolos e conteúdo privado não são repassados à orientação.

Carregamento, falha HTTP e resposta inválida agora são estados distintos de
carteira vazia, com recuperação explícita. Registro retirado não recebe convite
para retomar. A inspeção renderizada demonstrou e corrigiu contraste no modo
legacy. A orientação sem JavaScript expôs outra falha: a shell permanecia no
fallback de carregamento. Orientação e Busca optam agora por conteúdo público
servido no fallback; nenhum painel privado ativa essa opção. O formulário da
busca pública também foi exercitado com JavaScript desabilitado.

Escola #503 foi consultada em `a8dbe550583526eae631deafa3c574fbcfb18993`:
draft aberto, checks concluídos sem falha/pending na consulta, flag desligada.
O progresso privado e a próxima micro-missão já existem na sua proposta, mas
não estão integrados em main. Dependências: validar a migração no schema
canônico completo, integrar a entrega, revisar materiais e autorizar ativação.
Não se oferece uma rota da Escola indisponível nem se duplica seu progresso.
Competências #510 (`d1affda48ed9dcf7ae6ea4fbeaf9e920c74de5e6`) e Fábrica
#514 (`dbf70931d15903ab820de224a017c6f3689e2124`) também continuam abertas;
seus PRs/Previews não certificam disponibilidade integrada.

Provas locais: 1.407 testes unitários, 50 focais, dois de coerência, quatro de
classificação de superfícies, 113 Solo, TypeScript, ESLint e build passaram.
Navegador Chromium: 12 casos de continuidade (360×800 e 1366×768) e seis de
Participar/orientação, incluindo consulta e busca sem JavaScript, passaram.
Axe não encontrou findings serious/critical nas superfícies avaliadas.
A carteira usa respostas interceptadas e exclusivamente sintéticas: os testes
provam UI, foco, retorno, reload, estados e ausência de chamadas de escrita,
não persistência, sessão Auth, RLS ou uso real em Production. A suíte pública
usa a aplicação local. Essa prova não substitui ensaio humano nem dispositivo
físico. O workflow dedicado preserva esses casos sem secrets Production.

O Solo revelou inventário desatualizado de 16 workflows já integrados; a mesma
falha foi reproduzida no main limpo `74cc0ed1`. Foram registrados somente esses
nomes conferidos no histórico e o novo workflow de UI; qualquer nome desconhecido
continua rejeitado. Nenhum workflow existente foi ativado ou executado por isso.

Próxima frente concreta: reconciliar a Escola com o schema canônico e integrar
seu progresso privado existente a Minha participação quando seu código estiver
integrado e a ativação for autorizada. Em paralelo, convites em detalhes de
ações/pautas podem usar a orientação pública sem atribuir compromisso.
`pilot_noindex`, gates V1, amostra humana e governança permanecem preservados.

O produto está no fechamento técnico e operacional da V1, antes do ensaio integrado e do lançamento integral. Quatro domínios estão declarados verdes e seis continuam abertos; isso não representa 40% de conclusão. A visão futura e as entregas candidatas devem ser acompanhadas separadamente do que está integrado em produção.

| Camada                                           | Situação conferida                                                                                                                                 | Próximo trabalho sem amostra humana                                                                                          | Dependência preservada                                                                                                                                       |
| ------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Núcleo, identidade, ciclo pauta–ação e operações | Quatro domínios declarados verdes; critérios e provas históricas mantidos                                                                          | Regressões, permissões e contratos da versão candidata                                                                       | Validação do ciclo integrado com pessoas reais                                                                                                               |
| Miniapps / Calçadas, 47.5                        | Motor disponível; foco e filtros corrigidos; recortes temporais integrados no #504, com 49 casos MapLibre aprovados e um skip de desktop           | Manter regressões de lista/mapa, recortes temporais e datas inválidas                                                        | Fechamento do piloto com janela e denominadores originais                                                                                                    |
| Memória, rádio e arte, 47.6                      | Salvaguardas da Rádio integradas no #506; contrato transacional reconciliado no #507, com 22 verificações em PostgreSQL descartável, ainda inativo | Validar contrato no schema canônico completo, medir locks e preparar migração e integração da aplicação antes de ativar      | Direitos, consentimentos e curadoria reais                                                                                                                   |
| Segurança e recuperação, 47.8/47.8A              | Controles internos e contratos não comprovam cópia durável ou restore                                                                              | Verificar ferramentas e procedimentos de exportação/restauração em ambiente descartável; separar capacidades não comprovadas | Acesso ao ambiente correto, capacidade contratada e cópia independente; não é uma dependência de amostra humana, mas também não se resolve apenas com código |
| Coerência, busca e qualidade, 47.9A/B/C          | CI do #502 passou; busca lexical preservada; embeddings reais continuam bloqueados por capacidade do provedor                                      | Regressões, semântica de filtros, estados vazios, fallback e contratos automatizados                                         | Dispositivos físicos, tecnologia assistiva, compreensão humana; credencial do provedor para embeddings                                                       |
| Conteúdo e governança, 47.10                     | Revisão editorial e equipe operacional ainda não comprovadas                                                                                       | Manter ajuda, fluxos de revisão, retenção e critérios de evidência consistentes com o comportamento real                     | Pessoas responsáveis, substitutos, direitos e prazos confirmados                                                                                             |
| Ensaio e lançamento, 47.11                       | Ensaio integrado incompleto; gate integral fechado                                                                                                 | Preparar instrumentos de coleta, verificações sanitizadas e pacote por versão                                                | Três sessões reais, estabilidade medida e decisão final                                                                                                      |
| Escola COMUN R0                                  | PR #503 aberto, head `a8dbe550583526eae631deafa3c574fbcfb18993` na consulta; 24 micro-missões candidatas, progresso privado, flag desligada        | Checks concluídos; validar integração no schema canônico e ativação separada                                                 | Ambiente COMUN identificado e revisão humana do material; testes locais não comprovam ativação                                                               |
| Serviços Públicos                                | PR documental #434 aberto; expansão fora do fechamento V1                                                                                          | Revisar arquitetura e limites da proposta separadamente                                                                      | Decisão de escopo posterior; sem expansão automática                                                                                                         |

### Evidência técnica já integrada

- PR #500: navegação por teclado da ficha de Calçadas e isolamento dos tipos gerados pelo build de desenvolvimento.
- PR #501: jornadas centrais usam o Chromium completo; o problema de criação do contexto headless foi corrigido. O timeout anterior de Participar → Pautas teve causa não isolada e não foi atribuído a esse crash.
- PR #502: filtros mobile recebem foco, Escape/fechamento devolvem ao acionador e Limpar devolve à busca preservando lista/mapa. CI do candidato: 45 casos MapLibre aprovados e um skip de desktop explícito. Pós-merge: 35 jornadas públicas, cinco testes de acessibilidade, 30 PWA e nove de performance passaram; 95 checks do merge terminaram em success/skipped.
- Viewports de CI não substituem Android/iOS físicos ou tecnologia assistiva. Essas provas não promovem os seis domínios abertos nem autorizam `launch_publicly`.

### Fechamento de filtros e estabilidade de navegador — integrado

O filtro de Calçadas derivava o relógio da maior `last_observed_at`: um conjunto inteiro de registros antigos continuava parecendo recente. A correção usa o instante fornecido pelo servidor ao carregar a página e mantém a referência estável durante os filtros, sem divergência entre HTML e hidratação. Recarregar a página renova o instante. Os recortes são inclusivos de zero a 30/90/365 dias, excluem datas futuras, ausentes ou inválidas quando o período está ativo e não alteram os dados nem a janela do piloto. Sem período, todos os registros continuam elegíveis para os demais filtros. A suíte de navegador usa datas fixas apenas no build descartável de CI.

PR #504 integrado: recortes de calendário corrigidos; 49 casos MapLibre passaram, com um skip explícito de desktop. PR #505 integrado: Chromium completo nas provas do grafo cívico; os 40 casos de produção passaram após o merge. Na base histórica `e4bac1ab378a5ddac4d180426e1cd586e4b3b57b`, os 86 checks terminaram em success/skipped. Os PRs #503, #436 e #434 continuam candidatos, sem contar como entregas integradas.

### Rádio — salvaguardas integradas e contrato transacional comprovado

O PR #506 restringe as cinco ações editoriais a admin/editor, exige consentimentos presentes e duração inteira positiva dentro do limite existente e interrompe a publicação quando qualquer uma das sete consultas editoriais falha ou o episódio não existe. Lista e detalhe públicos ocultam episódios quando a consulta de raiz, consentimentos, direitos musicais ou revisão de segurança falha. O contrato atual de banco foi preservado. Os 117 checks do head testado terminaram em success/skipped; 1.383 testes unitários e 24 casos de navegador da Rádio passaram. O merge manteve a árvore testada. Deploy de produção READY e endpoint de versão confirmaram a base acima.

Esse recorte ainda não resolve a concorrência entre revisão e commit nem gravações parciais. O PR #507 reconcilia a identidade editorial da PR #436 em SQL fora das migrações, sem chamada pela aplicação. Em PostgreSQL 17.10 descartável, 22 verificações passaram: permissões, publicação e repetição idempotente, oito bloqueios editoriais, dez alterações concorrentes e rollback após falha injetada. O digest cobre metadados editoriais e assets relacionados; não comprova imutabilidade dos bytes armazenados ou revogação de URLs.

Antes de ativar o contrato, faltam validar a cadeia canônica completa, avaliar os locks, identificar o ambiente COMUN autorizado e preparar migração e integração da aplicação. Esse acesso é uma dependência de ambiente, não de amostra humana. Direitos, consentimentos e curadoria reais permanecem distintos dos testes automatizados. O contrato não promove os seis domínios abertos nem autoriza `launch_publicly`.

Data da reconciliação: 2026-10-02. Base de código: `3fee4feb29b390e659e95fbef7d280d9fac6dfac`.

## Produto que queremos entregar

O COMUN deve permitir que uma pessoa descubra uma pauta da cidade, entenda as evidências, contribua com segurança, receba uma devolutiva, participe de uma decisão e ação e acompanhe o resultado e sua memória pública. A V1 está concluída quando esse ciclo funciona de ponta a ponta com pessoas reais, conteúdo autorizado e uma equipe capaz de operar e recuperar o serviço.

O critério de sucesso é a conclusão desse ciclo. Quantidade de telas, commits, registros importados e checks verdes são indicadores auxiliares. Medir conclusão de tarefas, tempo de devolutiva frente ao prazo declarado, decisões com justificativa, ações com resultado verificável e incidentes de privacidade. Os valores devem vir de observações reais, com janela e denominador preservados.

O escopo vinculante está em [comun-v1-launch-scope.md](comun-v1-launch-scope.md). Chat em tempo real, feed algorítmico infinito, aplicativos nativos, monetização, publicação autônoma por IA e expansão de Serviços Públicos ficam fora deste fechamento.

## O que foi auditado e o que essa evidência permite afirmar

Foram reconciliados o programa de dez domínios, escopo V1, issue [#95](https://github.com/alexandrevrabandonada-oss/comunvrabandonada/issues/95), contratos do auditor, fechamento do piloto, governança, dependências, recuperação e resultados do ensaio humano. O inventário da base contém 232 declarações de páginas em `app/comun` e 70 handlers em `app/api`. Inclui páginas administrativas, dinâmicas e capacidades fora da V1: esses números não representam cobertura de testes nem páginas públicas entregues.

Há quatro domínios **declarados verdes** e seis incompletos em `lib/comun-launch-program.ts`. Não é uma porcentagem de conclusão do produto. A auditoria HTTP cobre nove rotas públicas, três redirecionamentos administrativos anônimos, assets e headers. O estado declarado dos domínios precisa ser sustentado pelas respectivas provas; o auditor não lê e revalida cada prova histórica.

O PR [#481](https://github.com/alexandrevrabandonada-oss/comunvrabandonada/pull/481) foi integrado e verificado em produção. O PR [#482](https://github.com/alexandrevrabandonada-oss/comunvrabandonada/pull/482) passou nos checks e foi integrado nesta base: contratos dos assets e preparação sem indexação. O deploy de produção `dpl_2oT3WvkdsAjytF6YCmC9U1rjdxBT` está READY no SHA desta base; robots e sitemap retornaram HTTP 200 com tipos corretos e `X-Robots-Tag: noindex, noarchive`, também confirmado na home. A consulta do manifest pelo conector não produziu resposta utilizável nesta rodada e não foi contada como prova. O PR [#483](https://github.com/alexandrevrabandonada-oss/comunvrabandonada/pull/483) tem correção de landmarks e salto ao conteúdo comprovada em Preview; passou no último check de Quality e foi integrado em `cdda931e1080f18601e923f9eaa91968fe916ba3` em 2026-10-02. A verificação do deploy de produção correspondente está em andamento. Preview não comprova a publicação em produção.

Nas consultas de interface de 2026-10-01, Acervo mostrou 860 itens da campanha de identificação e nenhuma publicação editorial naquele recorte; Rádio mostrou nenhum episódio publicado e zero entradas da grade no recorte observado. Inventário de identificação não comprova autorização editorial. Esses valores não substituem auditoria de todo o banco.

## Matriz de fechamento da V1

| Domínio                  | Estado declarado | Evidência e trabalho necessários                                                                                                               | Responsável funcional      |
| ------------------------ | ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------- |
| Núcleo público           | Verde            | Revalidar descoberta, busca, páginas públicas e estados vazios na versão candidata; conservar provas por SHA                                   | Produto e QA               |
| Identidade e comunidades | Verde            | Revalidar acesso por papéis, participação, saída e privacidade; anonimato não testa autorização autenticada                                    | Identidade e operação      |
| Ciclo pauta–ação         | Verde            | Demonstrar contribuição, decisão, devolutiva, ação e resultado ligados na mesma jornada real                                                   | Produto e moderação        |
| Miniapps                 | Em andamento     | Executar fechamento read-only do piloto de Calçadas na versão atual; preservar janela, amostra e denominadores; corrigir problemas encontrados | Operação do piloto         |
| Acervo, rádio e arte     | Exige evidência  | Completar conteúdo editorial real, direitos, consentimentos, curadoria e publicação; comprovar busca, acesso e tratamento de indisponibilidade | Curadoria                  |
| Operações                | Verde            | Revalidar triagem, prazos, escalonamento, equipe principal e substituta e rastreabilidade na candidata                                         | Coordenação operacional    |
| Segurança e resiliência  | Bloqueado        | Comprovar cópia durável independente e recuperação descartável de dados, Auth e Storage dentro dos objetivos definidos                         | Infraestrutura e segurança |
| Qualidade e performance  | Exige evidência  | Encerrar regressões; executar dispositivos físicos, segunda plataforma, tecnologia assistiva e zoom de 200%; relacionar falhas às tarefas      | QA e acessibilidade        |
| Conteúdo e governança    | Bloqueado        | Revisar conteúdo real, direitos, consentimento, responsabilidade, prazos e devolutiva; registrar revisão sem expor dados privados              | Curadoria e governança     |
| Ensaio de lançamento     | Bloqueado        | Ensaio integrado com três pessoas reais, tempos e tarefas registrados, fechamento dos incidentes e go/no-go                                    | Produto e operação         |

Inteligência cívica e coerência da experiência atravessam esses domínios. A busca técnica e contratos de projeção não comprovam embeddings ou respostas geradas com provedor real. Permanecem as limitações documentadas de provedor e validação humana; nenhuma capacidade deve ser promovida apenas porque não aparece como domínio separado.

## Roadmap de execução e critérios de saída

| Ordem                       | Entrega                                                                                                                     | Critério de saída                                                                                                                                      |
| --------------------------- | --------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1 — auditoria confiável     | Separar contrato estrutural HTML, marcadores de payload e procedência editorial; corrigir assets e acessibilidade pendentes | Testes de falso positivo e falso negativo passam; execução atual gera achados sanitizados; streaming recebe confirmação no navegador quando necessário |
| 2 — miniapps, 47.5          | Reexecutar fechamento do piloto e resolver achados técnicos e operacionais                                                  | `green_evidence_complete` com amostra real adequada, janela original e nenhum P0/P1 aberto                                                             |
| 3 — memória e cultura, 47.6 | Conteúdo autorizado e jornadas de publicação, consulta e memória                                                            | Provas reais de curadoria, direitos, consentimentos, funcionamento e responsável operacional                                                           |
| 4 — recuperação, 47.8       | Resolver capacidade de backup de Auth/Storage e cópia independente; ensaiar restauração isolada                             | Recuperação comprovada por categoria, tempos medidos e responsáveis principal/substituto; sem restauração sobre produção                               |
| 5 — qualidade, 47.9         | Validar tarefas em dispositivos físicos e acessibilidade; corrigir regressões                                               | Matriz executada e sanitizada, falhas impeditivas resolvidas e jornada compreensível às pessoas participantes                                          |
| 6 — governança, 47.10       | Fechar regras, conteúdo de lançamento, prazos e devolutivas                                                                 | Conteúdo e equipe reais revisados, direitos e responsabilidades documentados                                                                           |
| 7 — ensaio, 47.11           | Ensaiar ciclo integrado e operação; consolidar candidato e go/no-go                                                         | Dez domínios sustentados por provas atuais, nenhum bloqueador aberto e pacote revisável                                                                |
| 8 — lançamento              | Apresentar resultado ao gate existente `launch_publicly`                                                                    | Decisão humana final; só depois reconciliar indexação e comunicação de lançamento                                                                      |

Correções técnicas podem avançar em paralelo. A ordem acima expressa dependências de evidência, sem inventar datas ou disponibilidade da equipe. Não cria gates intermediários adicionais.

## Roadmap pós-V1 canônico — organização, Escola, competências e Fábrica

As frentes abaixo não alteram o gate de lançamento da V1. Contratos, documentação e protótipos isolados podem avançar em paralelo; ativação pública, migrations e novos domínios de dados respeitam as dependências explícitas.

**49-A — Núcleos permanentes.** Organização durável de pessoas por responsabilidade, reutilizando comunidades, memberships, papéis auditáveis e Minha Participação. Avança quando houver núcleo real operando com responsáveis e revisão, sem derivar autorização de texto livre.

**49-B — Ciclo estratégico.** Objetivos, hipóteses, revisão e aprendizagem ligados ao ciclo pauta → ação → resultado → memória. Reutiliza Pautas, Rodas, Ações, Tarefas, Resultados e Memória. Avança quando existir um ciclo real completo sem duplicar ação, tarefa ou resultado.

**49-C — Escola COMUN.** Formação prática progressiva; R0 é a primeira implementação técnica. Reutiliza Auth, Pauta/Tarefa, Minha Participação e revisão editorial. Avança quando R0 estiver integrado e ensaiado sem quebrar progresso concluído.

**49-C1 — Competências com Evidência.** Transforma prática revisada e trabalho real em afirmações escopadas de capacidade. Reutiliza Escola, Tarefas/Ações e Minha Participação. Avança com competência privada por padrão, revisão independente, zero promoção por curso concluído e zero ranking.

**49-C2 — Experiência de competências.** Apresenta estados, privacidade, publicação e matching dentro de Minha Participação. Reutiliza 49-C1 e Minha Participação. Avança com view model sanitizado, atenção priorizada e publicação e matching separados; conexão real somente após schema e RLS.

**49-C3 — Sugestões privadas de tarefas.** Usa competências demonstradas com consentimento de matching para sugerir tarefas canônicas em ações elegíveis. Não atribui pessoas, não cria ranking e não copia tarefas. Avança somente com requisitos de competência explícitos, capacidade preservada e aceite pelo fluxo canônico.

**49-D — Fábrica COMUN.** Converte problemas reais em prática, protótipo, solução aberta e capacidade comunitária. Reutiliza 49-C, 49-C1, 49-C2, comunidades, Pautas, Ações, Tarefas, Observatórios e Memória. Avança quando o piloto provar demanda e reuso antes de qualquer schema fabril, sem criar segunda hierarquia social ou educacional.

### 49-C1 — Competências com Evidência

**Decisão:** concluir conteúdo não cria competência. Uma afirmação de competência só pode ser demonstrada com evidência revisada, escopo explícito e revisão independente da própria pessoa. O contrato detalhado está em [comun-competency-evidence.md](comun-competency-evidence.md).

**Privacidade:** competência fica privada em Minha Participação por padrão. Publicação é opt-in separada e nunca expõe automaticamente reviewer, links privados, volume de trabalho, localização, disponibilidade ou histórico bruto.

**Matching:** a pessoa pode autorizar o uso privado de competência demonstrada para receber sugestões de tarefas. Sugestão não cria atribuição, papel, autorização administrativa ou habilitação profissional.

**Catálogo inicial:** práticas validadas da Escola podem gerar evidências candidatas para Formulação de problema e objetivo, Investigação/evidências, Escuta/facilitação e Ciclo estratégico. A claim continua exigindo sua própria revisão.

### 49-C2 — Experiência em Minha Participação

**Estados:** construindo evidência → aguardando revisão → demonstrada → precisa revisar → arquivada. Itens que exigem ação aparecem primeiro; a superfície não funciona como vitrine de prestígio.

**Controles separados:** visibilidade pública e uso privado para sugestões de tarefas são consentimentos distintos.

**Privacidade:** o view model não transporta reviewer, sourceId, reflexão, tarefa/pauta privada ou nota de revisão. O componente preparado em `components/comun-competency-panel.tsx` recebe somente projeção sanitizada.

**Ativação:** o painel ainda não é conectado à superfície real. Isso só ocorre depois de schema/RLS, loader owner-only, mutations auditáveis e feature flag OFF-by-default. Ver [comun-competency-experience.md](comun-competency-experience.md).

### 49-C3 — Sugestões privadas de tarefas

**Regra:** matching produz sugestão, nunca assignment. A pessoa continua assumindo a tarefa pelo fluxo canônico de Ações.

**Escopo inicial:** somente tarefas abertas/em andamento, com vaga, não vencidas, dentro de ações elegíveis e com requisitos de competência explicitamente revisados.

**Privacidade:** perfil público não é requisito; matching privado exige opt-in. A projeção de sugestão não contém userId, reviewer, sourceId ou evidência privada.

**Persistência:** requisitos de competência por tarefa continuam fora do banco até 49-C1/C2 estarem integrados e existir autoria/RLS definidos. Ver [comun-competency-task-suggestions.md](comun-competency-task-suggestions.md).

### 49-D — Fábrica COMUN

**49-D0 — Contrato canônico.** A Fábrica é módulo do COMUN, não segundo sistema. Entrada futura: “Tenho um problema”, “Quero fazer” e “Quero aprender”. Ver [comun-fabrica-canonical-integration.md](comun-fabrica-canonical-integration.md).

**49-D1 — Piloto sem novo schema fabril.** Executar casos reais usando Pauta/Tarefa/Ação e Escola; registrar manualmente custo, risco, versões e resultado. Gate mínimo: 10 casos iniciados, 5 resolvidos e lacunas de dados demonstradas. Checkpoint ampliado FC-MVP-25: 25 casos, 15 resolvidos, 5 projetos abertos, 3 operadores autônomos, 5 pessoas em formação, 1 escola, 1 projeto de acessibilidade, 1 tecnologia ambiental e 1 solução reutilizada.

O contrato candidato do piloto está em [comun-factory-pilot-contract.md](comun-factory-pilot-contract.md). O Caso FC é projeção técnica: trabalho real de design, protótipo, teste, fabricação ou instalação exige Tarefa canônica. R2/R3 exigem evidência de teste para instalação; R3 exige aprovação qualificada para fabricar/instalar; R4 fica bloqueado no fluxo comunitário comum.

**49-D1.1 — Playbook e evidência do piloto.** Os dez desafios iniciais e o ritual operacional estão em [comun-factory-pilot-playbook.md](comun-factory-pilot-playbook.md). O avaliador `comun-factory-pilot-evaluation.ts` separa o gate D1 mínimo do FC-MVP-25 e nunca converte fixtures em execução real. D1 mínimo exige 10 casos iniciados, 5 resolvidos, ao menos um caso de não fabricação, ao menos uma revisão real e registros consistentes de custo e versão.

**49-D1.2 — Entrada e triagem.** A Fábrica não cria segundo intake cívico. Problema da cidade segue para o Relata; reparo/objeto ou pedido de protótipo entra em triagem privada; aprendizagem retorna à Escola; componente crítico exige encaminhamento qualificado. Nenhuma entrada persiste Caso FC automaticamente. Ver [comun-factory-intake-routing.md](comun-factory-intake-routing.md).

**49-D1.3 — Autorização de máquinas.** Competência demonstrada não libera equipamento automaticamente. Uso exige briefing de segurança, autorização humana escopada e vigente e compatibilidade com o risco do Caso FC. R3 força supervisão qualificada; R4 fica bloqueado. Ver [comun-factory-machine-authorization.md](comun-factory-machine-authorization.md).

**49-D2 — Extensão mínima orientada por evidência.** Só depois do piloto, considerar estado técnico do caso, versões/BOM e rastreabilidade. Nunca duplicar Pauta, Ação, Tarefa, Resultado, Comunidade, competência, progresso da Escola ou identidade.

**49-D3 — Operação física.** Máquinas, filas, materiais, manutenção, instalações, falhas e segurança. Dados de máquina não viram reputação social.

**49-D4 — Rede distribuída.** Nós parceiros e capacidades externas, replicação e encaminhamento. Só promover quando existir demanda real multi-nó.

## Pendências que exigem fatos externos ao código

O relatório histórico do piloto em `reports/current/comun-tijolo-47-5-miniapps-pilot-closeout.json` contém métricas zeradas de uma execução antiga. Não descreve a utilização atual. A janela terminou em 2026-08-06: passagem do tempo não encerra o piloto nem autoriza alterar denominadores.

O ensaio integrado registrado em `reports/current/comun-integrated-human-rehearsal-results.md` continua `INCOMPLETE`. Um acesso em computador e celular não comprova sessão integrada com três pessoas, tempos, segunda plataforma ou testes assistivos físicos.

O plano de recuperação em [comun-security-backup-recovery.md](comun-security-backup-recovery.md) declara bloqueadores de capacidade nativa de Auth e cópia durável independente. Seus RPO/RTO são objetivos a medir, não garantias já cumpridas. Alterações de plano com custo e consentimentos editoriais exigem fatos e escolhas reais; não devem ser simulados.

## Como manter o fechamento auditável

Para cada lacuna registrar domínio, versão/SHA, observação, causa, correção, teste, URL da execução e prova de operação aplicável. Distinguir teste automatizado, Preview, produção, ensaio humano e teste físico. Reexecutar somente os checks pertinentes e as provas afetadas pela mudança. Não publicar payload privado em artefatos.

O auditor estrutural usa `parse5`, verifica HTTP/content-type e título no conteúdo principal exposto pelo HTML, preserva inspeção do payload completo e classifica somente sintaxe conhecida de `placeholder` e a explicação estática revisada da página de segurança. Não comprova CSS computado, hidratação, direitos autorais ou operação humana. Achados de streaming exigem observação do navegador. Nesta continuação, Segurança foi confirmada em navegador no domínio canônico: título correto, um h1, um main, destino do salto ao conteúdo presente e explicação estática de fixtures renderizada. Não houve erro de aplicação capturado; o único erro observado veio da extensão do navegador. Isso confirma a limitação da inspeção exclusiva do HTML servidor, sem comprovar procedência de dados ou todos os fluxos. Resultados não promovem automaticamente estados dos domínios.

Esta reconciliação é a base para fechar lacunas; não declara auditoria completa de todas as 232 páginas, 70 APIs, permissões autenticadas ou dados privados. Essas superfícies devem ter cobertura relacionada às jornadas V1 e aos contratos de autorização antes de qualquer afirmação de conclusão total.

## Continuação da auditoria renderizada — 2026-10-02

Produção `cdda931e1080f18601e923f9eaa91968fe916ba3`, deploy `dpl_7MnfTpiBfVUdw26HY2WJkLEqhiCu`, READY, aliases canônicos e nenhum aliasError.

| Rota          | Resultado observado em navegador desktop                                                        | Lacuna                                                                                 |
| ------------- | ----------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| Início        | Um h1, um main e conteúdo real renderizado                                                      | Nenhuma falha estrutural neste recorte                                                 |
| Comunidades   | Um h1, um main, nenhum marcador sintético visível consultado                                    | Payload de servidor ainda exige classificação; não há prova de todos os dados          |
| Participar    | Um h1, um main e opções renderizadas                                                            | Envio e devolutiva ainda precisam de prova de jornada                                  |
| Calçadas      | Carregamento transitório concluído; um h1, um main, um registro público e localização protegida | O número público não mede participação do piloto; amostra e fechamento ainda pendentes |
| Acervo        | Um h1, um main, sem main aninhado                                                               | Direitos e publicações editoriais ainda exigem prova                                   |
| Rádio         | Um h1 e um main                                                                                 | Conteúdo editorial real ainda pendente                                                 |
| Observatórios | Um h1, dois main, sendo um aninhado                                                             | Remover main interno do hub; incluir regressão de landmark e salto ao conteúdo         |
| Segurança     | Um h1, um main e explicação legítima de fixtures                                                | Não inferir vazamento dessa explicação; HTML servidor não comprova a tela renderizada  |

A inspeção não encontrou overlays de framework ou erros de aplicação nas páginas consultadas; logs capturados continham somente erros da extensão de metadados do navegador. Confirmação de estrutura não equivale a verificação de todos os controles, autorização autenticada, responsividade ou dispositivos físicos.

A correção proposta em Observatórios troca somente o elemento de agrupamento interno por div, preservando classes e conteúdo, e mantém o main da shell como único marco principal. A regressão percorre a página e verifica foco após o salto ao conteúdo e regras axe de landmarks.

## Reconciliação dos checks — 2026-10-02, continuação

No head `3dcaf37842d13defdccdfd7758f5e5654b4dd864`, a run [36958777277](https://github.com/alexandrevrabandonada-oss/comunvrabandonada/actions/runs/36958777277) de Coerência passou, incluindo a regressão de Observatórios no ambiente local descartável. Isso é prova automatizada, não teste físico nem observação visual da funcionalidade no Preview desativado.

A run Quality [36958777230](https://github.com/alexandrevrabandonada-oss/comunvrabandonada/actions/runs/36958777230) falhou nos sete viewports de Observatórios com HTTP 404: seu segundo ponto de entrada do teste não recebia a flag local. A correção limita FOUNDATION enabled e adapter disabled ao passo E2E local também nessa bateria. Nenhuma flag do serviço publicado é alterada.

A run preflight [36958777361](https://github.com/alexandrevrabandonada-oss/comunvrabandonada/actions/runs/36958777361) produziu artefato com todos os checks de schema/RLS verdadeiros e leitura de conteúdo de negócio falsa, mas bloqueou a comparação de metadados. O verificador antigo comparava a migração externa de Hardening com o histórico normal. A proposta reconhece somente essa versão local após validar release, caminho, hash, fingerprints e estado applied pelo contrato estrito já usado nas outras lanes. Migração desconhecida, pendência normal, schema/RLS inválido ou ledger ausente continuam bloqueando. A comparação remota desconhecida permanece intacta.

Onze testes locais de planner/workflows passaram, incluindo execução do passo real com substitutos de psql/git que exigem transação read-only. A validação remota das duas correções e a integração do PR continuam pendentes. Nenhum domínio foi promovido.

## Fechamento de dependências e limites atuais — 02/10/2026

O [PR #486](https://github.com/alexandrevrabandonada-oss/comunvrabandonada/pull/486) foi integrado após todos os workflows aplicáveis passarem. O deploy de produção ficou READY no SHA acima, e o endpoint de versão confirmou esse SHA. Os assets servidos são idênticos aos da versão instalada MapLibre 6.11.2. A versão 5.14.0 com achado crítico foi substituída. O lockfile candidato auditado retornou zero achados; isso não fecha segurança, resiliência ou lançamento.

| Frente                         | Evidência atual                                                                                                                                | Pendência preservada                                                                                                                            |
| ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| Dependências e distribuição    | Quatro rotas principais 200; PMTiles Range 206; worker/shared 200, MIME JavaScript e hashes corretos; www 308                                  | Quality pós-merge passou; repetição de coerência ainda em execução                                                                              |
| Quatro consumidores de mapas   | 14 casos de renderização de produção passaram; filtros, seleção e listas alternativas cobertos; fixtures do Observatório existem somente em CI | Navegador remoto ainda mostra mapa indisponível; causa não comprovada; dispositivos físicos/WebGL2, fluxo real de Relatar e adapter/ledger real |
| Coerência e PWA                | 154 casos de coerência passaram; certificação PWA anterior passou na única repetição, sem aumentar limites nem remover critérios               | Causa do timeout inicial não estabelecida; tecnologia assistiva, segunda plataforma e zoom de 200%                                              |
| Recuperação, conteúdo e ensaio | Critérios existentes preservados                                                                                                               | Cópia durável/restore medidos, conteúdo autorizado, piloto e ensaio integrado com pessoas reais                                                 |

A lista pública de Calçadas permaneceu utilizável após voltar do mapa indisponível e apresentou um registro com localização protegida. Um registro não comprova cobertura da cidade nem conclusão do piloto. A certificação pós-merge atual é a run [37067289731](https://github.com/alexandrevrabandonada-oss/comunvrabandonada/actions/runs/37067289731), concluída com sucesso. CI do merge, jornadas principais e grafo cívico também passaram; a repetição pós-merge de coerência ainda estava em execução no momento deste registro. Provas por versão e limitações estão em [comun-maplibre-security-migration.md](comun-maplibre-security-migration.md). Nenhum domínio foi promovido, nenhum conteúdo foi inventado e nenhuma configuração remota de acesso ou lançamento foi alterada.

## Continuidade candidata da Escola — 07/10/2026

PR #503 permanece separado do PR #520 e ainda não significa integração ou
ativação. A prova Auth/Postgres/navegador passou na run `37653193110` para
`3e465262fb60b935c7ff770da0503db58165fda8`: A/B, dados privados não vazios,
concorrência sincronizada, retomada e reload móvel/desktop, limpeza sintética e
zero findings. O SHA/tree efetivamente testado, equivalência limitada e hash do
artifact estão em [prova canônica](../reports/current/comun-escola-canonical-auth-proof.md).

A próxima alteração candidata conecta Minha participação à atividade realmente
iniciada: sessão server-side, snapshot owner e seletor existentes, título/etapa
mínimos e destino público do catálogo. Prática pendente de envio, revisão,
ausência de atividade e indisponibilidade têm estados distintos. Não há segundo
modelo de formação, progresso ou tarefa; abrir a jornada não cria vínculo,
inscrição, responsabilidade ou resultado. Reflexões/notas/IDs pessoais não são
repassados à orientação ou URLs. O resumo permanece disponível sem JavaScript.

A prova anterior não valida essa mudança nova: o novo checkpoint deve executar
Minha participação → resumo A/B → retomada → etapa persistida/reload em stack
descartável. Até o artifact correspondente, esta ampliação é PENDING.
Flags, migrations e Production permanecem inalterados. Competências #510 e
Fábrica #514 seguem dependências abertas, não capacidades presumidamente ativas.
Revisão editorial/ensaio humano e decisões de integração/ativação são gates
separados; nenhuma maturidade de domínio é promovida automaticamente.

## Busca pública — candidato reconciliado com a base integrada — 08/10/2026

O #519 incorpora main `3530f8aa` por merge normal, sem rebase/force. O pai
`7dfa3b29` terminou com 23 checks success, 80 skipped e uma falha Security
`112793364913`: restore de banco verde, mas
`COMUN_STORAGE_SIGNED_URL_NOT_ACTIVE` no ensaio antigo de um segundo.
A base incorpora #518, #528 e #530; a janela do ensaio foi corrigida e passou
em Supabase descartável no #530. Essa aprovação não é PASS deste candidato.

A implementação de busca e sua prova de integração são idênticas ao pai.
A run focal `37621724132` comprovou 15 contratos e 25 casos PostgREST reais:
visibilidade pública do território, publicação da obra e da raiz do Acervo,
descarte de resposta parcial em onze fontes e fallback do mapa. O controle
anterior produziu 13 falhas esperadas e 12 aprovações. São evidências do pai;
esta reconciliação exige novos checks próprios antes de merge. A fixture
local reduzida não certifica RLS completo nem ausência de vazamento histórico.

O PR continua draft. Nenhuma query canônica, migration Production, flag,
indexação ou alteração de recuperação do provedor foi executada.
Skipped e pending não contam como PASS. O registro seguinte é histórico.

## Busca pública — correção candidata de exposição

A busca unificada usa `service_role`. A leitura de territórios não filtrava `visibility=public`, e a leitura de obras filtrava apenas o estado da obra, sem exigir raiz publicada/pública no Acervo. O candidato acrescenta esses filtros. As onze fontes descartam dados parciais quando sua resposta inclui erro; fontes saudáveis e fallback do mapa continuam disponíveis.

Quinze testes da função completa usam respostas de banco simuladas. Na base `74cc0ed1779f5432496c3f852ce92bed3524a3a1`, doze falharam: filtros ausentes e dados parciais consumidos nas onze fontes. Após a correção, os quinze passaram. Isso comprova a regressão e os contratos da consulta, não a ausência de vazamento histórico ou a equivalência de produção. Não houve leitura de dados privados do ambiente canônico. A semântica real dos filtros relacionais ainda deve ser conferida em Supabase descartável e no ambiente autorizado. Não é uma auditoria completa de autorização de todas as fontes de busca.

## Escola: captura real e lacuna de recuperação — 08/10/2026

A senha do banco foi renovada pelo usuário; a conexão read-only foi comprovada.
O banco real e roles sem senhas foram capturados em arquivos locais cifrados,
reabertos e ensaiados em cluster offline. O restore exigiu suplemento de bootstrap
GraphQL capturado da origem. Os dados COPY e sequences conferem; equivalência
integral do schema, Auth/Storage/Vault e custódia independente continuam BLOCKED.
Isso não é liberação da Escola nem prova integral de recuperação do projeto.

A correção candidata dos dois leitores de release carrega a CA pública Supabase
preservando verify-full/hostname. Até integração e certificação, esses caminhos
não estão certificados. Não houve migration, mudança de flag ou dispensa dos
seis preflights do #523. Evidências e limites:
[revisão da captura e TLS](../reports/current/comun-escola-real-capture-and-tls-review.md).

# Evidência adicional Escola — 09/10/2026

A correção TLS #535 foi integrada em `041f6b17`, com deploy Git READY e sete
smokes GET/SHA servido PASS. A certificação pós-merge permanece BLOCKED por CA
ausente nos dois scripts CI read-only e duas falhas remotas de navegação em
Core Journeys. Patch focal de CA preparado separadamente; nenhum gate dispensado.

Recuperação real parcial avançou: 278 tabelas restauradas offline, 2.582 arquivos
Storage cifrados/restaurados como bytes e cópia privada no Drive verificada; API
Auth leu os seis usuários restaurados e login sintético/recusas/cleanup passaram
na segunda cópia offline. Storage API v1.80.2 pinned restaurou/leu todos os 2.582
objetos e recusou 863 acessos anônimos privados; metadata/history inalterados.
O bloqueio inicial da imagem 0067 e uma interrupção do executor foram preservados;
uma retomada limitada comprovou o resultado posterior. Custódia independente da
chave, CHECK canônico e configuração externa
continuam BLOCKED/NOT_RUN conforme
`reports/current/comun-escola-readonly-ci-ca-recovery.md`. Migration Escola
Production não executada; #523 draft e seis preflights preservados. Não declarar
liberação, recuperação integral ou conclusão da V1.

## Recuperação em disco E: — 09/10/2026

Dois exports cifrados da cópia anterior foram verificados e restaurados em containers novos offline. PG17.6: 278 tabelas, 6 auth users, fingerprint do restore anterior idêntico, zero findings; Storage: 2582 arquivos/357014118 bytes e size+MD5 conferidos. Comparação integral com o PRE capturado isolou um CHECK reagrupado e oito ACLs owner implícitas: parser 17.6 provou a mesma árvore semântica, com três controles negativos, e os direitos efetivos conferem. Fingerprints brutos continuam distintos; gates Production não foram alterados. Nova chave preservada em Drive privado separado dos ciphertexts E:, readback/descriptografia dos dois exports sem DPAPI PASS. Não é nova captura Production nem prova integral de API/configuração na nova cópia. Crash supautils e configurações externas permanecem abertos; seis preflights #523 preservados. #536 head 98963025 tem Core/Civic/Experience/Full Surface PR verdes; MapLibre 37959856195 tem 49 PASS/1 FAIL no retorno Lista → Mapa, causa UNPROVEN; Quality em execução. Certificação pós-merge permanece pendente. Preparada CA restrita à captura PRE da Escola, com 71 testes Node PASS. Evidências e limites: [relatório CI/recuperação](../reports/current/comun-escola-readonly-ci-ca-recovery.md). Autorização de migration recebida; execução ainda NOT_RUN até cumprir requisitos. Escola não liberada; zero migration Production nesta retomada.

### Escola — recuperação em E: e gates preservados, 09/10/2026

No candidato #536 ce0566d9, captura PRE e ensaio atômico 37962260855 passaram na mesma run, com hash da captura vinculado à prova. Custódia independente da chave e mapping de 2582 objetos restaurados passaram; CHECK/ACLs têm equivalência delimitada, sem mudar fingerprints Production. Biblioteca supautils oficial corrigida passou recusas no laboratório/restauração; imagem antiga continua afetada. Bundle reproduziu SHA/tree fora do produtor; 71 testes no consumidor passaram. Inventário: 41 SUCCESS, 82 SKIPPED separados e Quality ainda em execução na consulta. Autorização da migration recebida; acesso protegido PostgreSQL, configuração externa, renovação do backup de negócio e entrada Production controlada ainda bloqueiam aplicação. Seis preflights #523 preservados; zero escrita Production, flags/indexação intactas. Avisos npm preexistentes foram registrados separadamente, sem atualização automática. Escola não liberada. Este complemento documental não transfere provas para um SHA funcional diferente.

# Atualização Escola — ensaio controlado, 2026-10-09

Complemento posterior: #537 integrado em `c4dfd5a7`, mesma tree do candidato;
deploy Git READY, SHA servido exato, smokes e CI atual aplicável passaram. Entrada
Production separada em preparação, com recuperação real e acesso protegido ainda
bloqueados. D: voltou NTFS/Healthy, sem prova de integridade de cada arquivo e sem
credencial esperada localizada; execução permanece em E:. Nenhuma migration
Production aplicada e os seis preflights #523 permanecem obrigatórios. Evidências
e limites: [entrada Production](../reports/current/comun-escola-production-entry-preparation.md).

PR #536 integrado em `eb2cb0156adf223d608e222677cccc00bf84e071` após 42 SUCCESS / 82 SKIPPED / zero failures/pending. Deploy Git READY, SHA servido confirmado, smokes GET, Quality/Civic/Core pós-merge PASS; Experience ainda pendente na captura. Nenhuma outra integração até certificar o pós-merge aplicável.

Ensaio controlado local provado em `c4f4facafa1674352bd5b93d5c660b3bd4f45b3c`: verificações de catálogo privado e privilégios antes do COMMIT, rollback schema/history/ledger/drift, replay recusado e resposta perdida do COMMIT reconciliada read-only, sem retry de escrita. Nova lane descartável sem secrets Production preparada para repetir essa prova no novo SHA. Evidências e limites em `reports/current/comun-escola-controlled-rehearsal.md`.

Próximo passo: concluir checks pós-merge e do candidato; recuperar acesso PostgreSQL protegido e renovar/ensaiar backup real antes de qualquer schema write. Executor remoto não certificado; migration Escola NOT_RUN; seis preflights do #523 preservados. Recuperação completa, flags, indexação e operação pública continuam não certificadas.

## Escola — novo backup real e restauração isolada, 10/10/2026 UTC

Preparação #538 integrada/certificada em main `400b17b350a00de913b6e802586c890c1e2999d9`, tree igual ao funcional `73d28606`. Acesso protegido E: passou com TLS autenticado; o 28P01 anterior não permanece bloqueante. Novo snapshot real read-only foi cifrado, restaurado e conferido em 278 tabelas, com diferença de collation delimitada. Roles/owners/versões de extensão conferiram. Auth sintético, proteção Google/hCaptcha offline e Storage API/2.582 objetos tiveram provas separadas vinculadas aos respectivos containers. Custódia independente da chave passou no novo backup. Nenhuma escrita Production.

Configuração externa completa continua BLOCKED: capturas cifradas e readback não equivalem à entrega externa de e-mail ou login Google real; o SMTP gerenciado não acompanha o dump. Crash original supautils permanece aberto. A nova captura PRE mantém fingerprints, cinco ledgers aceitos, Escola ausente e zero findings. Nenhum recibo completo foi emitido; migration permanece NOT_RUN e os seis preflights #523 continuam bloqueantes. Próximo elo: fechar recuperação externa, revisar recibo real e renovar os pontos temporais exigidos antes da aplicação única autorizada. Não contratar plano nem alterar flags/indexação. Evidências e limites: [recuperação real atualizada](../reports/current/comun-escola-fresh-real-recovery-20261010.md).

Continuação: seis templates restaurados e convite enviado pelo Auth real a SMTP loopback PASS; entrega externa NOT_RUN. Tentativa OAuth combinada falhou e permanece separada, com discovery externo indisponível no namespace sem rede. Fixtures removidas; todas as 27 tabelas Auth conferem com o snapshot original. 24 testes de entrada passaram, sem alterar controles. #523 continua draft/CONFLICTING, cf0e8e41, 45 SUCCESS/76 SKIPPED/seis FAILURE na consulta atual; Quality SUCCESS. Backup de 00:41Z excedeu uma hora e deverá ser renovado antes de escrita. [Decisão gratuita de recuperação externa](../reports/current/comun-escola-external-recovery-free-decision.md) preparada sem contratação ou alteração Production. Migration ainda NOT_RUN.

Passada autônoma seguinte: redirect Google HTTP302 passou com discovery real em
laboratório vazio, sem dados do backup e sem abrir a rede do restore. Login/callback
aprovado e entrega externa continuam NOT_RUN. Auditoria preservou 16 artifacts e
17 capturas cifradas; identificou três parâmetros numéricos capturados como
`<redacted>` (mínimo de senha, limite de e-mail, OTP de MFA telefone). Labels foram
recapturados read-only, sem salvar Source; nenhum default substituiu os números.
Finding `CONFIG_CAPTURE_VALUES_REDACTED` impede replay completo. SMTP independente,
configuração externa e renovação do backup continuam bloqueantes; migration NOT_RUN.

Suplemento posterior resolveu autonomamente os três parâmetros pela UI visual,
com imagens cifradas, sem alterar valores ou capturas antigas. Laboratório vazio
iniciou Auth com os 16 parâmetros e AAL1 15m; redirect Google real novamente PASS.
O finding dos números mascarados está resolvido por suplemento, mas entrega SMTP,
callback/login nominal e recuperação externa completa continuam não certificados.
Nenhuma migration ou configuração Production alterada.

Em 10/10 às 22:53 UTC, uma única mensagem sintética autorizada passou SMTP Brevo
e chegou à caixa de entrada Gmail, com identidade/texto conferidos. Entrega direta
PASS; entrega pelo Auth restaurado NOT_RUN. Remetente reescrito e pixel do provedor
impedem inferir configuração de autenticação certificada. Google Cloud continua
bloqueado pela exigência de duas etapas; login/callback não provados. Recuperação
externa integral BLOCKED, backup precisa renovação antes da entrada controlada,
recibo/permit não emitidos. Migration NOT_RUN; seis preflights #523 preservados.
Provas sanitizadas e limites no [relatório atual](../reports/current/comun-escola-fresh-real-recovery-20261010.md).

Continuação às 20:12 BRT: titular ativou duas etapas e acesso Google PASS. Cliente
Production consultado e preservado; novo cliente exclusivo do laboratório criado
com autorização específica, credencial cifrada/readback PASS. Docker recuperado
pelo comando oficial; Auth vazio pinned passou discovery/redirect com esse cliente.
Login/callback/troca de código NOT_RUN; ensaio representativo não equivale a replay
da credencial Production. Recuperação externa integral permanece BLOCKED, sem
recibo/permit, migration ou alterações Supabase. Seis preflights preservados.

Às 20:23 BRT, login Google especificamente autorizado no laboratório vazio passou
callback/troca de código, `/user` e logout; uma identidade de ensaio, zero sessões
ao final. Primeiro 504 preservado e causa exata não comprovada; uma retomada com
fluxo novo passou. Dump privado cifrado e containers removidos. Cliente separado
é prova representativa, não replay Production. Próximo gate preparado: convite
Auth com template capturado → Brevo → Gmail → confirmação local, autorizado
e executado no ensaio registrado abaixo. Recuperação integral ainda BLOCKED, recibo
não emitido, migration NOT_RUN e seis preflights preservados.

Convite adicional especificamente autorizado foi enviado uma única vez pelo Auth
do laboratório vazio via relay Brevo e recebido no Gmail. Confirmação local e
logout PASS; nenhum acesso ao backup real/Production, containers removidos.
Assunto textual mascarado limita fidelidade: suplemento visual read-only resolveu
o valor original, sem repetir envio. SMTP substituto não é replay do gerenciado;
outros cinco fluxos externos NOT_RUN. Recuperação integral NOT_CERTIFIED, backup
expirado, migration NOT_RUN e seis preflights intactos. Evidências e limites no
relatório atualizado.

Continuação de 10/10: CI do #540 terminou 8 SUCCESS/34 SKIPPED; não é liberação
da Escola. Guard de captura passou 13 testes e recusou assuntos mascarados em
convite/mudança de e-mail. MIME recebido comprovou reescrita do link Auth pelo
tracking Brevo; a confirmação local usou o link original. Recuperação externa
integral permanece NOT_CERTIFIED. Sessão do dashboard expirada bloqueia recaptura
do assunto restante. Resolver fidelidade e contratos externos antes de renovar
backup, emitir permit ou executar a única migration autorizada condicionalmente.
Em paralelo, #523 foi reconciliado com main em worktree isolada; seu novo
checkpoint exige gates próprios. Sem nova funcionalidade, flags ou indexação.

Preparação API de recuperação — 11/10: o segundo MIME SMTP recebido ainda prova
reescrita Auth após configuração salva. Implementado relay API exclusivo do
laboratório com tracking false, destinatário único, aprovação vinculada ao link e
marcador persistente sem retry após resultado incerto. 90 testes locais PASS,
zero skipped; isso não substitui entrega externa. Chave API exclusiva autorizada,
cifrada e validada read-only no plano Free, sem mudança de transporte Production.
Convite API único especificamente autorizado foi aceito e recebido, mas também
teve link reescrito e duas imagens: FAIL de fidelidade externa, confirmação do
link recebido NOT_RUN e nenhum reenvio. Laboratório arquivado/limpo, zero sessões.
18 contratos adicionais passaram em Linux sem rede; CI inclui o novo adaptador,
sem secrets Production. Assunto change-email Source, demais fluxos e recuperação
integral continuam bloqueados/não executados;
backup expirado, permit não emitido, migration NOT_RUN e seis preflights preservados.
Evidências e limites no [relatório de recuperação](../reports/current/comun-escola-fresh-real-recovery-20261010.md).

Autocorreção do transporte — 11/10: changelog Brevo esclarece que false anonimiza
métricas, sem desligar tracking; não repetir SMTP/API nem atribuir bug ao provedor
sem prova. #540/4cbab9ed terminou 11 SUCCESS e 78 SKIPPED, zero failure/pending.
Adaptador do Gmail já conectado preparado sem conta/credencial/scope novo, com
21 testes focais PASS. Convite Gmail único especificamente autorizado passou
recebimento, link exato sem tracking e confirmação real desse link no Auth local,
logout e zero sessões. Laboratório cifrado/limpo; 93 contratos locais passaram.
Isso não equivale a recuperação durável integral da configuração. Migration permanece
NOT_RUN até fechar recibo integral, backup renovado e PRE fresco.

### 49-E3 — porta de entrada e organização disponível (13/10/2026)

Implementação #544 sobre main `b9c78c2c5c0affc5ee452010da0185747534eae9`.
Home canônica, home legacy pública e Participar reutilizam os três caminhos:
usar fontes/busca, participar de ações existentes e aprender a organizar.
Organizar leva à orientação pública existente, depois a comunidades, com retorno
pelo navegador e endereço público favoritado. Não há armazenamento de identidade,
progresso, inscrição, tarefa ou responsabilidade nesta navegação.

A orientação informa o limite real desta entrada: não cria nem administra núcleos.
É um passo 49-E0/E em direção a 49-M, não implementação de governança ou operação
de núcleos. Formação permanente completa e responsabilidades reais continuam
pendentes. A Escola #523 e recuperação #542 permanecem independentes e bloqueadas;
nenhuma migration, flag ou indexação foi alterada.

Provas e estados: [relatório 49-E3](../reports/current/comun-49-e3-entry-paths.md).

O preflight A7 mantém a inspeção de metadados e ledger somente leitura. Sua
validação específica reconhece apenas a única migration Escola R0 já classificada
como fora do escopo A7, com SQL e manifest fixados por hash. O plano registra essa
pendência; bytes alterados, duplicatas, migrations adicionais, saída inválida ou
operações de escrita bloqueiam. Os planners compartilhados mantêm seu contrato
anterior. A liberação da Escola continua dependendo dos gates próprios.

## Consolidação canônica — rede social, convivência e atratividade (14/10/2026)

> Este registro integra ao **roadmap único** as conclusões de concepção do COMUN discutidas em outubro de 2026. Não abre outro roadmap, não altera a ordem dos gates V1/49/50, não declara funcionalidades prontas e não autoriza merge, migration, flags, indexação ou lançamento. Diferenciar sempre **princípio de produto**, **hipótese a validar**, **capacidade existente** e **entrega certificada**.

### Tese de produto e critérios inegociáveis

**O COMUN é uma infraestrutura digital de convivência, descoberta, cultura, reciprocidade, conhecimento e organização coletiva.** Não é apenas uma plataforma de campanhas, denúncias ou gestão cívica, tampouco uma cópia do feed comercial. Sua utilidade e sua atratividade devem existir também para quem não deseja atuar politicamente. O propósito é ampliar possibilidades da vida, não maximizar tempo de tela nem converter lazer em militância.

1. **Direito de simplesmente estar.** Conversar, criar, guardar, explorar, divertir-se ou não participar são escolhas legítimas. Não exigir produtividade social, sequência diária, cadastro prematuro ou compromisso político.
2. **Autonomia e fricção mínima.** Conteúdo público útil sem login; pedir identificação somente quando a operação realmente exigir. Nenhum fluxo deve depender de conhecer a arquitetura interna, ser rápido apenas na primeira tela ou afirmar persistência não comprovada.
3. **Expressão sem placar humano.** Permitir criações, perfis e acompanhamento de autores, sem comprar alcance, ranquear pessoas por seguidores, exigir viralização ou transformar popularidade em poder deliberativo.
4. **Convivência e organização distintas, interoperáveis.** Conversas livres, construção coletiva de conhecimento e decisões formais têm competências, direitos e procedimentos diferentes. A praça não deve se tornar assembleia obrigatória.
5. **Segurança e direitos antes de crescimento.** Privacidade, acessibilidade, proteção de dados sensíveis, recurso de moderação, autoria, consentimento, saída e portabilidade são critérios de aceitação, não diferenciais de marketing.

### Mapa de decisões e hipóteses — reaproveitar módulos existentes

- **Entrada e experiência inicial.** Oferecer descoberta prazerosa, utilidade cotidiana, troca e participação, sem remover o atalho de relato urgente. Uma visita curta pode terminar satisfatoriamente.
  - **Estado e cautela:** Hipótese de reorganização visual; 49-E3 já fornece caminhos cívicos, não valida prazer social.
- **Descoberta e recomendação.** Evoluir exploração pública por interesses declarados, cronologia opcional e diversidade, sem perfilamento sensível, compra de alcance ou feed infinito obrigatório. Preservar escolha e explicabilidade.
  - **Estado e cautela:** Auditar primeiro fontes públicas e permissões; recomendação algorítmica sofisticada não é pré-requisito.
- **Convivência espontânea.** Permitir expressão cultural, humor, fotografias, conversas e vínculos sem vincular tudo a pautas ou tarefas.
  - **Estado e cautela:** Hipótese de produto; não presumir rede social espontânea implementada.
- **Feirinha popular.** Reutilizar ofertas, necessidades, organizações e conexões privadas existentes. Reduzir o caminho do cartão até 'Tenho interesse' / 'Posso ajudar', com flags e autorização respeitadas. Avaliar depois publicações por moradores individuais.
  - **Estado e cautela:** Há base de Feirinha organizacional; interação popular geral e jornada completa ainda precisam de prova real.
- **Cultura e prazer.** Dar visibilidade a Acervo, Rádio, Arte, história local, jogos leves, coleções e criações, valorizados por si, nunca como isca para mobilização.
  - **Estado e cautela:** Curadoria, licenças, fontes reais, conteúdo suficiente e desempenho são gates.
- **Praça e jardim.** Combinar novidades e conversas passageiras com conteúdos duráveis, coleções, memória revisável e descoberta transversal.
  - **Estado e cautela:** Não criar sistema novo de coleções sem auditar salvar/publicar/Acervo existentes.
- **Identidade e vínculos.** Pessoa com apresentação controlável, pseudônimo/contextos distintos quando seguro, comunidades e papéis de representação separados. Possibilidade de acompanhar pessoas, assuntos, lugares e iniciativas.
  - **Estado e cautela:** Não misturar vínculo público, autorização deliberativa e dado sensível.
- **Reconhecimento e confiança.** Agradecimentos e sinais contextuais de transação/colaboração; sem score global de pessoas, reputação política nem privilégio de voto por seguidores.
  - **Estado e cautela:** Sempre permitir correção/contestação e evitar avaliações como prova universal de honestidade.
- **Conversa e inteligência coletiva.** Expressão livre com opções progressivas (experiência, pergunta, fonte, proposta). Preservar originais, conflitos, fontes, revisões, propostas, responsáveis e resultados.
  - **Estado e cautela:** Não obrigar classificação nem converter contagem de reação em decisão; IA auxilia, não arbitra fatos ou consensos.
- **Territórios e segurança.** Proximidade voluntária/geral, nunca endereço residencial obrigatório; separar canais de denúncia sensível de convivência comum.
  - **Estado e cautela:** Pseudônimo não garante anonimato forte; acesso e retenção devem ser auditados.
- **Governança e moderação.** Regras comuns, competência local delimitada, transparência, recursos e redução progressiva da concentração técnica/institucional; comunidade não pode votar para retirar direitos fundamentais.
  - **Estado e cautela:** Governança participativa não substitui resposta técnica a incidente nem validação social.
- **Sustentabilidade.** Participação básica gratuita; vedar comercialização de dados, anúncios comportamentais e compra de autoridade. Examinar contribuições, serviços opcionais, financiamento diversificado e remuneração operacional.
  - **Estado e cautela:** Separar contas da associação, recursos vinculados, contratos e dados protegidos; não assumir receita sem demanda.
- **Crescimento orgânico.** Priorizar densidade de relações em território/assunto, utilidade individual desde o primeiro acesso, primeiro vínculo completo e compartilhamento externo de conteúdos públicos úteis.
  - **Estado e cautela:** Não fabricar usuários, interações, eventos, avaliações ou conteúdo; não forçar convites nem abrir grupos vazios por categoria.
- **Design e acessibilidade.** Base Zen Brutalista coerente e acessível, com apresentações adequadas a leitura, cultura, Feirinha e denúncias. Teclado, leitor de tela, contraste, zoom e baixo desempenho são obrigatórios.
  - **Estado e cautela:** A identidade gráfica das campanhas não deve impor sensação permanente de urgência a todo o aplicativo.
- **Dados e IA.** Minimização, finalidade específica, transparência de fontes e do trabalho automatizado, direito de corrigir; não encaminhar dados privados a serviços externos sem salvaguardas adequadas.
  - **Estado e cautela:** Não inferir opiniões ou filiações, não apresentar síntese da IA como verdade/consenso e não criar observabilidade invasiva.

### Execução no roadmap existente — uma etapa de cada vez

**Ordem sugerida, sujeita aos gates e à auditoria U0–U8 já estabelecida no #546; estes itens não são novo eixo de releases:**

1. **Integridade da base e desbloqueios já existentes.** Concluir a revisão de privacidade/continuidade, diferenciar falhas próprias dos PRs e migração pendente da Escola. Nenhuma dispensa de gate, push de schema ou merge implícito.
2. **U0: inventário e experiência solitária.** Verificar no código e no ambiente disponível como pessoa sem conta encontra conteúdo público real e útil; checar estados vazios, autoria, datas, licenças, navegação e retorno. Nunca inventar movimento social.
3. **Primeiro vínculo completo na Feirinha.** Auditar todas as flags, rotas e permissões; tratar falhas de armazenamento de rascunho, contato e consentimento; permitir chamada direta do item apenas quando a rota real está habilitada; validar fluxo de oferta/necessidade a acompanhamento.
4. **Descoberta transversal mínima.** Selecionar conteúdos públicos publicados e elegíveis de Acervo, Rádio, Feirinha, comunidades e informações territoriais; mostrar exemplos reais, com diversidade e links contextuais, sem novo feed infinito, ranking ou schema antecipado.
5. **Convivência, identidade e memória.** Auditar recursos atuais de publicação, conversa, perfis, salvar e histórico. Acrescentar somente lacunas demonstradas. Separar claramente conversa, interpretação coletiva e deliberação vinculante.
6. **Coleções, criação e cultura.** Validar valor individual de guardar/revisitar e possibilidade de criação compartilhada; preservar autoria e permissões. Jogos e gamificação somente por prazer/uso demonstrado, nunca obrigação ou pontos cívicos.
7. **Autonomia comunitária e sustentabilidade.** Implementar progressivamente governança, portabilidade, custo operacional e prestação de contas quando houver requisitos reais; financiamento não compra visibilidade nem decisão.
8. **Integração e aferição 50 COMUN UNO.** Ensaiar todos os caminhos do mesmo produto com acessibilidade, segurança, operação e conteúdo reais. Não converter checks automatizados em prova de confiança, pertencimento ou adoção humana.

**Critério transversal de aceite:** verificar valor para uma pessoa sozinha, interação completa entre duas pessoas, descoberta/compartilhamento público seguro, retorno contextual, autonomia dos espaços e ausência de pressão artificial para permanecer online. Medir tarefas concluídas, reciprocidade, resultados externos, diversidade das oportunidades, acessibilidade e concentração de visibilidade; tempo de sessão não é objetivo máximo. Instrumentar de forma agregada e mínima. Validação humana permanece pendente até acontecer.

### Relação com os PRs e limites conhecidos em 14/10/2026

- [#544](https://github.com/alexandrevrabandonada-oss/comunvrabandonada/pull/544) integrou os três caminhos públicos de entrada. Isso não confirma uma experiência social/cultural atrativa.
- [#545](https://github.com/alexandrevrabandonada-oss/comunvrabandonada/pull/545) trata continuidade de navegação de comunidades. Preservar seus gates, sem duplicar solução.
- [#546](https://github.com/alexandrevrabandonada-oss/comunvrabandonada/pull/546) reúne inventário U0 e revisão de continuidade/privacidade. É a trilha de auditoria já aberta; não presumir que mudanças candidatas estão em produção.
- [#547](https://github.com/alexandrevrabandonada-oss/comunvrabandonada/pull/547) foi fechado sem merge como substituído pelo #546. Seus cinco arquivos foram preservados naquele candidato. O #546 é a única frente de integração da correção; não reabrir trabalho concorrente nem considerar a solução integrada à main.
- A migration da Escola `20261006134804_comun_learning_r0.sql` permanece bloqueio separado. Este registro é exclusivamente documental, sem autorização para alterar schema, flags, indexação ou abrir piloto.

### Últimas decisões estruturais para encerrar a fase conceitual aberta

Este bloco registra decisões de **arquitetura de experiência**, não comprova
implantação. A descoberta concreta no código prevalece sobre pressupostos.
Novas ideias devem ser vinculadas a estes identificadores e não virar um
backlog paralelo. Após esta consolidação, voltar à execução sequencial.

- **SOC-D01 — Relação mínima completa, antes de um feed social.** A unidade
  central da experiência não é a postagem nem a organização: é uma interação
  voluntária que pode começar em conteúdo, pessoa, objeto, tema ou lugar,
  receber uma resposta e alcançar um desfecho compreensível. Deve existir
  valor mesmo sem reciprocidade, quando a interação não pede resposta.
  **Decidido como critério de produto; modelo de dados e UI a auditar.**
  Prova inicial: uma pessoa sozinha consegue descobrir algo útil; duas pessoas
  conseguem realizar uma troca ou conversa com retorno e encerramento.
- **SOC-D02 — Direito à ausência, ao silêncio e à saída.** Não criar mecanismos
  para punir inatividade, produzir culpa, forçar convites, exigir presença
  contínua, disparar notificações excessivas ou tornar o feed interminável por
  padrão. A pessoa controla assuntos, notificações e vínculos; exportação,
  exclusão e revogação respeitam retenção legítima, segurança e direitos de
  terceiros. **Princípio decidido; contratos de produto e lei a verificar.**
  Prova: sair da jornada, voltar depois e silenciar um espaço não devem causar
  perda indevida de conteúdo ou direitos.
- **SOC-D03 — Conflitos, danos e confiança operacional.** Antes de abrir troca
  entre desconhecidos e espaços públicos amplos, definir o menor circuito de
  denúncia de abuso, bloqueio/silenciamento, análise responsável, sanções
  proporcionais, recurso e registro auditável. Abranger assédio, perseguição,
  discriminação, golpes em trocas, divulgação de endereço e abuso de poder
  local; prever limites da moderação voluntária e segurança de menores.
  Não oferecer mediação obrigatória entre vítimas e possíveis agressores.
  **Diretriz decidida; capacidade operacional e regras detalhadas pendentes.**
  Prova: pessoa pode se proteger e contestar decisões sem expor dados privados.
- **SOC-D04 — Vida fora da tela e circulação sem aprisionamento.** O objetivo
  não é substituir todos os grupos de WhatsApp, redes sociais e encontros
  existentes. Páginas públicas autorizadas devem circular em links claros,
  com contexto, direitos, datas e acessibilidade. Encontros e iniciativas
  podem ter resultado presencial sem exigir que as pessoas voltem ao COMUN
  para provar participação. **Decidido como critério transversal.**
  Prova: link recebido fora do COMUN funciona sem login indevido, e a pessoa
  consegue concluir sua finalidade sem ser empurrada para outra tarefa.
- **SOC-D05 — Disciplina contra proliferação de funcionalidades.** Antes de
  aprovar qualquer recurso novo, demonstrar: necessidade cotidiana concreta,
  reuso ou lacuna comprovada nos módulos existentes, percurso mínimo de
  ponta a ponta, ausência de exposição de dados, acessibilidade, custos de
  manutenção/moderação, caminho de saída e teste verificável. Preferir remover
  fricção a criar módulo. O que falhar nesses critérios fica como hipótese,
  não como compromisso de entrega nem nova migration. **Regra decidida.**
  Prova: a proposta especifica qual experiência real melhora e o que não será
  construído.
- **SOC-D06 — Origem, autoria e preservação de conteúdo.** Toda descoberta
  editorial, acervo, evento e oferta deve distinguir fonte, autor, data,
  atualidade, licença/consentimento e condição de publicação; conteúdo
  comunitário e dado científico não possuem o mesmo tipo de validação.
  Criação coletiva preserva crédito, versões e possibilidade de contestação.
  **Princípio decidido; mecanismos específicos a auditar.**
  Prova: um conteúdo pode ser entendido, atribuído, corrigido ou retirado
  sem falsificar o histórico.
- **SOC-D07 — Critério de sucesso e parada.** Uma hipótese social só vira
  funcionalidade prioritária quando melhora uma experiência identificável
  sem piorar segurança, compreensão ou autonomia. Para o próximo ciclo,
  concentrar-se em: valor sem conta, primeira relação completa, descoberta
  pública contextual e operação sustentável. Evitar novas especulações de
  interface até registrar evidência técnica ou humana relevante.
  **Prioridade de execução decidida, não resultado de pesquisa de usuários.**

### Protocolo permanente de registro de decisões

Cada nova conversa sobre o COMUN que produza decisão relevante deve atualizar
**este mesmo arquivo** (ou o PR que o modifica até a integração), registrando
identificador estável, data, escopo, hipótese ou decisão, razão e contrapartida,
módulo reutilizado, critério verificável, risco/limite e estado do trabalho.
Estados admitidos: `HIPÓTESE`, `PRINCÍPIO DECIDIDO`, `PLANEJADO`,
`CANDIDATO EM PR`, `INTEGRADO`, `PRODUÇÃO VERIFICADA` e
`VALIDAÇÃO HUMANA`; jamais tratá-los como equivalentes.

- **Decidir não é implementar.** Não marcar código ou experiência como pronta
  porque esta documentação mudou.
- **PR aberto não é roadmap integrado na main.** Até merge certificado,
  comunicar explicitamente que o conteúdo está proposto na branch.
- **Não multiplicar documentos concorrentes.** Relatórios/ADRs de evidência
  podem complementar, mas o ponto de entrada e as prioridades ficam aqui.
- **Decisão contestável.** Mudanças futuras podem revisar princípios,
  desde que registrem a razão, o impacto e o que foi substituído.

### Checkpoint de execução e contrato da primeira conexão — 14/10/2026

Consulta direta ao GitHub nesta passada: #548 e #545 abertos, prontos para
revisão; #546 draft; #547 fechado como substituído. Nenhum deles integrado.
Os seis workflows retornados para #548 em `d074c768` concluíram: quatro
SUCCESS e dois SKIPPED. Este inventário não substitui regras/check-runs
completos nem certificação pós-merge.

No #546, `415d916e`, Experience Coherence concluiu SUCCESS. Quality
`38593422354`, job `115957725094`, passou nas jornadas integrais,
smokes, acessibilidade, PWA, performance e regressões estáticas; falhou
na formatação de `lib/comun-pwa.test.ts`. A asserção foi formatada no
candidato `acfad9ab`, sem alterar seu comportamento. Todos os gates do
novo SHA precisam de resultado próprio; não transportar aprovações.
Os cinco preflights da Escola permanecem bloqueios separados.

**SOC-D08 — Rascunho de conexão não autoriza compartilhar contato.**
Estado: `PRINCÍPIO DECIDIDO`; implementação e validação pendentes na
jornada existente da Feirinha. Razão: recuperar texto deve facilitar a
continuidade sem confundir a identidade atual com quem escreveu antes.
Reutilizar formulário, Auth, action e Minha Participação existentes.

- Não persistir nem restaurar contato ou consentimento no rascunho.
  Exigir contato informado e consentimento explícito na submissão atual.
- Restaurar mensagem somente por escolha explícita e quando sua origem
  puder ser vinculada com segurança à jornada e à identidade compatível.
  Mensagens também podem conter dados pessoais: não tratá-las como públicas.
- Definir prazo e descarte verificáveis antes da implementação; limpar
  rascunhos incompatíveis, antigos e o formato legado. A saída pela interface
  real deve impedir que outra conta receba o rascunho da conta anterior.
- Falha de storage mantém texto em memória enquanto a página estiver aberta,
  informa a ausência de persistência e não bloqueia navegação ou submissão.
- Retomar após Auth exige nova validação de item, organização e autorização.
  Conexão enviada, aceita ou recusada não prova compra, reserva ou entrega.

Critérios mínimos antes de ampliar os cartões públicos: storage recusado;
retorno Auth; duas identidades sintéticas no mesmo navegador e item;
logout pela interface/action reais; outro item; item despublicado;
submissão duplicada; aceite, recusa e retirada segundo permissões.
Não filtrar pageerror nem substituir logout por mensagem direta ao worker.
Provas sintéticas não equivalem a troca real entre moradores.

**Próximo incremento único:** concluir a certificação do #546 no SHA novo
ou preservar o bloqueio exato; depois implementar esta continuidade da
Feirinha antes das chamadas diretas dos cartões. Descoberta cultural segue
na sequência já registrada. Nenhuma migration, flag ou indexação autorizada
por este checkpoint; compreensão e atratividade humanas continuam pendentes.

### SOC-D09 — Jogos no COMUN: brincar, criar e publicar em comunidade

**Data:** 14/10/2026. **Estado:** `PRINCÍPIO DECIDIDO` para integrar
jogos à experiência do COMUN; `HIPÓTESE/PLANEJADO` para interface,
publicação de terceiros e arquitetura executável. Não implementado.

**Decisão de produto:** reservar um destino reconhecível **Jogos**,
integrado à descoberta cultural e aos perfis do mesmo COMUN, e não
uma rede, login, moeda, reputação ou produto paralelo. O acesso deve
oferecer diversão independente de ativismo ou de tarefas educativas.
A entrada pode ter destaque próprio na navegação quando houver
catálogo real e experiência jogável; não criar aba vazia.

- **Primeiro jogo de referência: `Cidade em Disputa`.** RPG autoral
  sobre Volta Redonda, não reduzido a propaganda eleitoral.
  Respeitar três jornadas iniciais já definidas: **História de
  Volta Redonda**, **Meio Ambiente** e **Política**. Priorizar
  exploração, escolhas e consequências, preservando criatividade,
  livre interpretação e prazer de jogar. Distinguir fonte científica
  ou documental de ficção e hipótese; identificar artigos e datas
  para afirmações factuais. Não exigir adesão ideológica nem
  pontuar jogador por opiniões políticas. Inspirar-se em exploração
  retrô sem reutilizar assets protegidos de jogos comerciais.
  A beta web existente deve ser auditada e reutilizada, não refeita:
  a distribuição e os limites de mobile não equivalem a integração
  certificada no COMUN. Preservar distinção entre a build atual
  e as três jornadas conceituais, sem anunciá-las como concluídas.
- **Jogos com finalidades diversas.** Abranger narrativas, puzzles,
  estratégia, humor, aventuras, jogos cooperativos e experiências
  de curta duração. Não reduzir a aba a quizzes cívicos,
  gamificação da militância ou missões da Escola.
- **Integração social com baixo atrito.** Cada jogo pode ter página
  pública com descrição, imagens autorizadas, créditos, autoria,
  requisitos, idioma, acessibilidade, idade/conteúdo, fonte e
  links de compartilhamento. Pessoas podem descobrir o criador,
  conversar, guardar e divulgar se os recursos existentes
  permitirem; o jogo permanece útil sem respostas ou cadastro.
  Conquistas e progresso são privados por padrão; compartilhar
  é opt-in, sem placar moral, pontuação cívica ou seguidores
  convertidos em autoridade.
- **Criação comunitária com autonomia.** Qualquer criador elegível
  pode propor um jogo próprio, inclusive não educativo.
  Publicação deve seguir processo de proposta/triagem,
  demonstração verificável, revisão de autoria e direitos,
  segurança e acessibilidade, decisão motivada, publicação,
  denúncia e eventual retirada/recurso. Critérios públicos
  protegem pluralidade estética e de ideias; não usar curadoria
  para exigir alinhamento político.
- **Segurança de código de terceiros: limite inegociável.**
  Na fase inicial, aceitar apenas metadados, imagens permitidas
  e link externo previamente revisado para jogo hospedado
  pelo criador, deixando claro quando se sai do COMUN.
  Não aceitar/executar uploads de HTML, JavaScript, ZIP,
  binários, Unity WebGL ou outras aplicações arbitrárias no
  mesmo domínio/ambiente privilegiado. Futuro embed/hosting
  só após arquitetura de origem isolada, CSP, sandbox efetivo,
  verificação de arquivos, limites de recursos, proibição
  de acesso a sessão/cookies/identidade do COMUN,
  revisão de dependências e mecanismos de desligamento.
  Iframe isolado por si só não prova segurança.
- **Privacidade e acesso.** Jogar conteúdo público sem cadastro
  quando tecnicamente possível; nenhum rastreador de
  terceiros oculto, monetização predatória, compras de
  influência ou anúncios comportamentais. Não ceder dados
  de membros a criadores. Controles mobile, teclado,
  leitura alternativa para quem não consegue jogar,
  opção de reduzir movimento/sons, baixo consumo de dados
  e estados de carregamento/erro são critérios de qualidade.
  Jogos com chat, multiplayer, menores ou pagamentos
  requerem avaliação e regras próprias; não pertencem ao MVP.

**Implantação incremental dentro de 49-E / U0–U8 / 50 COMUN UNO:**

1. **Inventariar antes de construir.** Localizar jogos existentes
   e suas licenças, builds e compatibilidade mobile/web.
   A árvore `app/comun` não possuía rota `jogos` na consulta
   de 14/10; não declarar o RPG ou outros jogos integrados.
2. **Experiência piloto sem schema novo.** Prototipar página
   `/comun/jogos` com 1 jogo real autorizado e jogável
   ou demonstração efetiva claramente identificada, créditos,
   condições de acesso e retorno ao COMUN. Reutilizar
   navegação, descoberta, acervo e compartilhamento;
   se não houver jogo elegível, manter a hipótese no roadmap
   em vez de mostrar acervo fictício.
3. **Curadoria comunitária controlada.** Validar pequena
   seleção de jogos de terceiros por link, antes de permitir
   submissão aberta. Medir demanda, moderação, qualidade,
   custo operacional e capacidade de retirada.
4. **Proposta de publicação.** Somente após critérios
   comprovados, disponibilizar envio de metadados
   e link de demonstração, com fila de revisão,
   comunicação do estado e recurso; sem upload executável.
5. **Evolução social e técnica.** Avaliar comentários,
   coleções, colaboração criativa, jogar em grupo,
   hospedagem isolada e ferramentas de criação apenas
   diante de demanda real e testes de segurança.

**Critério de aceite:** alguém consegue encontrar e iniciar
um jogo real, entender quem o criou, jogá-lo com os
controles disponíveis e retornar ao COMUN sem exposição
indevida; um criador consegue submeter e acompanhar uma
proposta sem abrir superfície para execução de código
desconhecido. Reprovar experiência ruim em celular,
conteúdo artificial, autoria falsa, ausência de moderação
ou pressão para participar politicamente.

**Evidência existente reconciliada (14/10/2026):**
a beta pública do RPG já foi entregue fora do COMUN, na landing
`landingmissao`, pelo
[PR #36](https://github.com/alexandrevrabandonada-oss/landingmissao/pull/36)
(merged). Entrada:
[VR: Cidade em Disputa — Beta](https://www.alexandrevrabandonada.online/jogar/cidade-em-disputa).
A aplicação carrega um runtime Unity/WebGL separado após o clique,
pela origem `jogo.alexandrevrabandonada.online`, com manifesto de
versão, controles mobile e desktop, feedback e save no navegador.
O código da landing não comprova que o jogo já esteja dentro
do COMUN nem que as jornadas História/Meio Ambiente/Política
estejam completas. Ver
[`docs/GAME_BETA_RELEASE.md`](https://github.com/alexandrevrabandonada-oss/landingmissao/blob/main/docs/GAME_BETA_RELEASE.md).
Ensaios em viewports Chrome existem; aparelho físico e leitor de tela
continuam sem certificação específica.

**SOC-D09.A — Primeira experiência integrada, sem duplicar runtime.**
Estado: `PLANEJADO`, sem implementação COMUN. Primeiro publicar
na descoberta/aba Jogos um cartão de jogo **real**, com imagem
autorizada, autoria, indicação de beta, objetivo, controles,
compatibilidade, limitações e ação direta **Jogar**.
No primeiro ciclo, a ação aponta à entrada pública já existente
com link externo claro e retorno previsível ao COMUN; não duplicar
o player em outra rota ou origem nem carregar WASM no feed inicial.
Se houver uma futura incorporação, verificar CSP, origem,
permissões, foco, fullscreen, performance, isolamento e
persistência de save em dispositivos reais.
Não pressupor transferência de saves entre hosts/domínios,
não exigir login COMUN e não sincronizar escolhas narrativas
ou inferências políticas com o perfil.

**SOC-D09.B — Comunidade de criadores, não depósito de arquivos.**
Estado: `PRINCÍPIO DECIDIDO` para experiência;
`HIPÓTESE` para infraestrutura. A página de cada jogo mostra
quem criou, autoria e licença, atualizações, suporte e formas
de contato opcionais. O criador pode propor, revisar,
despublicar e recorrer; pessoas podem descobrir e divulgar
o projeto sem pontuação competitiva obrigatória. Divulgação
editorial não é endosso da qualidade factual ou de segurança
e nunca deve ser comprada.

**SOC-D09.C — Ordem de investimento e critérios de promoção.**
Estado: `PLANEJADO`. O primeiro jogo publicado serve como
caso de teste técnico e de atratividade: descoberta pública
sem conta; jogo abre a partir do celular; não baixa runtime
antes da escolha explícita; retorno à plataforma; save
preservado no mesmo host; aviso de saída externa e privacidade;
créditos/licenças presentes; opção de feedback clara.
Depois de uma jornada demonstrada, selecionar poucos
jogos comunitários com curadoria. Não publicar formulário
aberto de submissão de jogos, embutir código de terceiros,
criar chat/multiplayer ou mover o save para a conta COMUN
antes de testar necessidade, custos e segurança.

**Distinção histórica:** o RPG Unity/WebGL já publicado
não deve ser confundido automaticamente com propostas
separadas de city-builder/RTS sobre Volta Redonda.
Mecânicas de construção, multiplayer, política territorial
ou conteúdo novo do RPG exigem evidência própria;
não integrar projetos diferentes por similaridade de nome.

**SOC-D09.D — Candidato técnico de entrada pública (15/10/2026).**
Estado: `CANDIDATO EM PR`, não integrado. O
[PR #551](https://github.com/alexandrevrabandonada-oss/comunvrabandonada/pull/551)
introduz a rota `/comun/jogos` e o cartão de uma beta real,
acessível pelo Explorar legado e App V2 com retorno preservado.
A ação de jogar abre a landing pública externa em nova aba,
sem iframe, sem carregar Unity antes da escolha e sem
transferência de dados de conta ou save pelo COMUN.
Atualiza a matriz de superfícies para reconhecer a rota
`public_web` e 241 páginas, preservando as outras regras
e casos negativos. Ensaio de navegador avalia os viewports,
contraste, foco, link/retorno e ausência de preload externo.

**Gate:** o #551 depende deste contrato SOC-D09, dos
workflows aplicáveis e de revisão antes de qualquer merge.
Falhas de preflight remoto por CA, migration da Escola e
bloqueios de #546/#549 continuam independentes; não dispensar
nem confundir sucesso local com Produção ou prova humana.
Este é um incremento de descoberta, não uma comunidade de
criadores já operacional nem hospedagem de jogos.

**SOC-D09.E — Contrato de publicação comunitária (15/10/2026).**
Estado: `PRINCÍPIO DECIDIDO`; fluxo público e
infraestrutura ainda `PLANEJADOS`.

O criador conserva a autoria e os direitos sobre seu jogo;
publicá-lo no catálogo do COMUN **não** implica cessão
exclusiva, transferência de código, licenciamento aberto
obrigatório ou acesso a dados dos participantes. A licença
de divulgação necessária para título, descrição, imagens
autorizadas, créditos e link é específica e revogável,
respeitadas obrigações legítimas de auditoria/retenção.

A proposta de jogo deve poder informar: nome e contato
protegido do responsável; link externo de demonstração
funcional; descrição, gênero e idioma; plataformas,
controles e recursos de acessibilidade; licença de
imagens/músicas e demais terceiros; conteúdo sensível/faixa
etária indicada; publicidade, compras e coleta de dados
existentes no destino; e canal para correção/retirada.
Contato privado do criador não deve aparecer na vitrine.

A curadoria é **prévia à exposição pública** e baseada em
segurança, autenticidade de autoria, direitos, qualidade
mínima de funcionamento, compatibilidade e regras claras.
Ela não exige concordância política nem preferência
estética institucional. Informar o motivo da recusa,
permitir correções e recurso; não oferecer publicação
automática, aprovação por popularidade ou prazo fictício.
A moderação só poderá escalar quando houver capacidade
humana de analisar e remover jogos com prontidão.

Estados mínimos da futura proposta: `rascunho`,
`enviada`, `em_revisao`, `ajustes_solicitados`,
`aprovada`, `publicada`, `retirada` ou
`recusada`. Estes estados são especificação conceitual,
**não** tabelas ou endpoints autorizados.

**Gate de continuidade:** antes de desenvolver formulário,
reutilizar serviços de propostas/curadoria já existentes
somente se oferecerem o mesmo contrato de privacidade,
autoria, recurso e operação. Se não houver equipe para
moderar, manter convite privado e seleção manual de poucos
jogos, sem criar superfície pública de submissão.
Não construir hospedagem executável no mesmo domínio.

**SOC-D09.F — Auditoria de reaproveitamento da curadoria cultural (15/10/2026).**
Estado: `AUDITORIA DE CÓDIGO`; implicações arquiteturais
`PRINCÍPIO DECIDIDO`; integração técnica `NÃO IMPLEMENTADA`.

A mesa existente `/comun/admin/curadoria` agrega filas
específicas de `comun_archive_submissions` (foto/documento),
`comun_archive_artwork_submissions` (arte),
`comun_archive_oral_history_suggestions` (história oral)
e `comun_radio_contributions` (rádio).
O tipo `CulturalSpecialization` e o projetor de
`lib/archive/cultural-curation-worklist.ts` possuem
essas quatro especializações; nenhuma é "jogo".

Reaproveitáveis conceitualmente e após testes:

- Separação de contribuição privada, revisão de direitos,
  avaliação de risco, preparação editorial e publicação
  explicitamente autorizada.
- Fila com status, visibilidade do próximo passo, motivos
  de bloqueio, responsabilidades e possibilidade de retirada.
- Contratos `lib/editorial-operation.ts`, critérios de
  autoria e direitos de `docs/acervo-artistas-locais.md`
  e proteção de contatos/sanitização de `docs/operacao-comun.md`.
- Princípios de limites de envio e protocolo de recebimento
  sem promessa de publicação vistos no Acervo.

**Não reaproveitar sem adaptação e revisão:**

- `/api/comun/archive/submissions` recebe fotografia e
  requer um envelope de upload, direitos e vínculo ao
  acervo fotográfico; um link de jogo não é uma fotografia.
- `/api/comun/archive/suggestions` complementa um item
  de Acervo já publicado; não cria um jogo candidato.
- O fluxo save-first de contribuição cultural possui
  intenções pré-definidas e flag própria; a opção
  genérica "não sei" não pode converter silenciosamente
  uma submissão em jogo nem aprovar link executável.
- A fila `/comun/admin/curadoria` não pode exibir
  contribuições de jogos sem fonte autorizada, estados,
  papéis e auditoria específicos. Reutilizar componentes
  de UI é diferente de compartilhar tabelas ou grants.

**Menor caminho honesto sem migration:**

1. Certificar primeiro o catálogo #551 e sua navegação,
   preservando bloqueios de CI/ambiente.
2. Convidar manualmente poucos desenvolvedores com
   critérios públicos, por canais existentes e controlados;
   não dizer "envie seu jogo" com um botão inoperante.
3. Curar somente metadados públicos e links de destinos
   externos avaliados, com autoria/licença, adequação
   etária, avisos de privacidade/monetização e processo
   claro de retirada. Não usar contas ou contatos pessoais
   de outras fontes sem finalidade compatível.
4. Quando existir capacidade de curadoria e necessidade
   observada, propor **um único fluxo** de indicação de
   jogo com rascunho privado, protocolo, avaliação e
   resultado comunicável. Antes de migrations, provar
   que as abstrações editoriais existentes podem ser
   reutilizadas sem compartilhar schemas indevidos.
5. Manter jogos comunitários independentes de
   verificação de identidade civil pública, de
   posição política e de exigência de código aberto.

**Checklist de revisão futura para publicador humano:**
direito autoral e assets; link de origem íntegro;
demonstração efetivamente carregável; privacidade
e rastreadores do destino; acessibilidade e controles;
classificação de conteúdo e menores; monetização
informada; risco de fraude/malware; canal de retirada;
conflito de interesse na curadoria. Aprovação editorial
não equivale a auditoria de segurança universal nem
endosso sobre afirmações narrativas do jogo.

**SOC-D09.G — Evidência dos PRs, sem perder o bloqueio.**
Na consulta de 15/10/2026, o PR documental #550 havia
passado seus checks mas seguia aberto; o PR de entrada
#551 estava em draft. O #551 possuía três checks falhos:
`remote-read-only-preflight` (ausência de certificado CA),
`COMUN Quality / isolated a11y` (limitação de pulls
Docker seguida de porta local ocupada) e `pr-lane`
(erro HTTP 502 do Supabase local após reset descartável).
Isso não é comprovação de falha funcional da nova
rota, mas **impede certificação do PR**. Não desligar
TLS, não falsear resultado, não contornar QA. Os
demais checks aprovados valem apenas para seus
próprios escopos e SHA.
Quando os estados mudarem, atualizar este registro
com evidence link e SHA, sem reescrever a história.

**Relações canônicas:** SOC-D01 (experiência e relação),
SOC-D02 (ausência e saída), SOC-D03 (segurança),
SOC-D05 (anti-proliferação), SOC-D06 (autoria),
SOC-D07 (evidência). Não interromper a prioridade atual
de privacidade/continuidade da Feirinha, os PRs em curso,
ou a migration pendente da Escola. Nenhuma alteração
de schema, flags, Production ou indexação autorizada.

### SOC-D09.H — Encaixe definitivo de Jogos na arquitetura COMUN

**Decisão em 15/10/2026:** Jogos é uma **experiência cultural e social**
transversal, não um novo produto, uma escola disfarçada nem um catálogo de
executáveis. Existe para divertir, criar, descobrir pessoas e obras, por livre
iniciativa de jogadores e autores. A finalidade cultural independe da adesão
política e da produção de dados para a rede. Estado: `PRINCÍPIO DECIDIDO`;
arquitetura de publicação de terceiros: `HIPÓTESE`; primeira rota do catálogo:
`CANDIDATO EM PR #551`, não integrada.

**Arquitetura de experiência e responsabilidades (sem duplicação):**

- **Descobrir / Cultura:** principal porta para jogos publicados. A vitrine
  `/comun/jogos` é destino específico, acessível a partir de Explorar e links
  públicos; a primeira presença na navegação principal **não é obrigatória**
  enquanto a experiência ainda for estreita. Promover um atalho principal
  somente se houver conteúdo verdadeiro, continuidade e demanda observada.
  Não criar página vazia nem alimentar a home com jogos fictícios.
- **Jogos:** ficha pública da obra e lançamento explícito do jogo, com
  créditos, estágio de desenvolvimento, requisitos e informação sobre saída
  externa. Um jogo é um **conteúdo cultural interativo**, não é por si só
  uma tarefa, denúncia, miniapp cívico, curso ou comunidade política.
- **Pessoas / Comunidades:** descobrir o autor e, com consentimento, conversar,
  compartilhar a experiência ou colaborar. Jogar não concede associação,
  papel, competência, reputação cívica nem permissão administrativa.
  Não criar segundo perfil social especializado para jogos.
- **Escola / Fábrica:** oferecem aprendizagem de criação digital e
  colaboração em projetos **por opção do criador**. Um curso não publica
  jogo automaticamente; um jogo publicado não cria competência certificada.
  Reutilizar apenas capacidades existentes e autorizadas.
- **Acervo / Curadoria:** inspiração para direitos, proveniência, revisão,
  retirada e recurso. Não inserir links de games nas tabelas de fotos,
  arte e áudio como se fossem registros da mesma natureza. O editor de
  jogos exigirá contrato específico antes de qualquer submissão pública.
- **Miniapps:** permanecem ferramentas para necessidades práticas;
  não se confundem com jogos, mesmo quando uma interação usa mecânicas
  lúdicas. Não abrir motor universal de plugins por causa da aba Jogos.

**Contrato de entrada em jogo (versão inicial):** abrir uma ficha sem login,
informar beta/autoria/origem externa e acionar `Jogar` voluntariamente.
Somente após esse ato a pessoa deixa o domínio COMUN e carrega o runtime
externo. Não injetar SDK, sessão, pixel, token ou identificador de integrante
do COMUN no jogo. Não transferir escolhas políticas, comportamento,
salvamento local ou estatísticas individuais do RPG para o perfil social.
Oferecer alternativa informativa de conteúdo quando a execução exigir
hardware, dados, movimento ou controles não disponíveis. Não prometer
que a abertura em nova aba preserva contexto de todos os navegadores:
validar celular, foco e retorno.

**Curadoria e pluralidade:** publicação aberta significa critérios
transparentes e tratamento imparcial, **não** upload automático. O criador
conserva seus direitos e pode solicitar retirada, correções e recurso.
Jogo não precisa ensinar política, ser de código aberto ou concordar com o
COMUN. Conteúdo de terceiros continua sob responsabilidade do publicador
original; informações sobre monetização, trackers e faixa etária são
visíveis antes do clique. Ao encontrar conteúdo possivelmente perigoso,
não promovê-lo sem revisão. Não declarar jogos externos "seguros" apenas
porque o link foi aprovado editorialmente.

**Ritmo de execução, subordinado ao roadmap 49-E / U0–U8 / 50:**

1. **Fechamento técnico existente:** preservar prioridade de integridade,
   privacidade, Feirinha e bloqueios certificados da Escola; #550 é
   documentação e #551 permanece separado e bloqueado até gates completos.
2. **Caso de referência:** demonstrar em Preview a jornada completa:
   `Explorar → Jogos → Cidade em Disputa → Jogar → Retornar`.
   Testar mobile, ausência de pré-carregamento, acessibilidade básica,
   memória/autoria verificáveis e convite sem login. Não afirmar
   sucesso humano com teste automatizado.
3. **Catálogo editorial mínimo:** selecionar poucos jogos realmente
   acessíveis por link, manualmente, com diversidade de estilos,
   autoria e condições de publicação revisadas. Validar capacidade
   de checar links, reclamações e retiradas.
4. **Criação comunitária:** só então ensaiar em operação o contrato
   `SOC-D09.E/F` de proposta e revisão. Se o fluxo não puder ser
   atendido, manter curadoria por convite em vez de abrir fila pública
   sem acompanhamento.
5. **Experiência coletiva avançada:** avaliar salvar, perfis de
   criadores, comentários, multiplayer e eventual embed isolado
   com evidência de valor, riscos e custo. Sem migrations especulativas,
   feed infinito, gamificação da participação ou loja paralela.

**Critérios de promoção:** a pessoa consegue jogar por prazer sem contribuir;
o catálogo exibe somente obras autorizadas, com acessibilidade e autoria
claras; os links não recebem dados do COMUN; decisões editoriais podem
ser corrigidas e revertidas; a operação de curadoria tem responsável e
capacidade real; custos de suporte não inviabilizam a Feirinha ou
a organização de base. Se a primeira jornada não funcionar, **não**
abrir o fluxo de publicações de terceiros nem colocar Jogos como
prioridade máxima da navegação.

**Decisão de não fazer agora:** não hospedar jogos arbitrários; não
lançar loja, criador monetizado pela atenção, recompensas por convites,
ranking público ou sincronização de progresso; não abrir submissões
automáticas, chat infantil ou eventos multiplayer. Nenhuma destas
exclusões impede pesquisa futura com nova evidência e revisão formal
neste mesmo documento.

### Regra antidesvio

**Existe um roadmap canônico, este documento.** Concepções novas entram como princípio, hipótese, critério de aceite ou incremento ordenado de uma trilha existente, com link para evidência real. Não abrir módulos paralelos apenas por atratividade conceitual; não confundir possibilidade idealizada, código candidato, Preview e Production. A cada passada, registrar decisão, área afetada, responsável técnico se houver, prova/ausência de prova e próximo bloqueio único.

### SOC-D08 — decisão de execução (14/10/2026)

Estado: `CANDIDATO EM PR` nesta branch; não integrado nem disponível por este registro.
Base escolhida: #546 `d39656f4732f4c873e2236186f7b5e6713f1c211`, descendente
da main `8b0ba0d2c90295a6579e8e8808a9e765583e86c9`. Dependência explícita
das proteções de storage/PWA preservadas no #546; não duplicá-las. Os cinco
preflights da Escola permanecem bloqueantes e o #546 estacionado.

**Retenção decidida antes da implementação:** somente mensagem e chave técnica
de idempotência, em sessionStorage, por no máximo 30 minutos desde o salvamento
explícito. Item e escopo opaco da conta/login validado no servidor delimitam a
recuperação. Nunca guardar contato ou consentimento. Não há auto-save nem
restauração automática; conteúdo potencialmente sensível exige escolha a cada
salvamento/retomada. Expiração é conferida ao ler/recuperar; descarte tentado
também em envio concluído, saída e incompatibilidade. Falha de remoção não pode
tornar um rascunho incompatível visível. Não prometer apagamento físico quando
o navegador negar acesso; a conta/login diferente continua impedida de recuperar.

**Compromisso de menor escopo:** antes do login a mensagem fica só em memória.
A pessoa pode selecioná-la para copiar manualmente antes de entrar. Não vincular
rascunho anônimo à primeira conta que fizer login e não transportar texto ou
contato na URL. Depois de autenticar, preencher contato e consentimento atuais.
Isso reduz a recuperação anônima para proteger contra troca de identidade.

Critérios: storage recusado não quebra digitação; retomada exige item/conta/login
compatíveis e escolha explícita; contato vazio e consentimento desmarcado;
logout real e troca de conta não recuperam texto anterior; servidor/RPC revalidam
publicação, organização e permissões antes da escrita. Nenhuma tabela/flag nova.

Prova da decisão SOC-D08: [relatório focal](../reports/current/comun-soc-d08-private-connection-continuity.md).
O cenário de banco reutiliza literalmente o A5 canônico; a prova Auth descartável
é separada da simulação de transporte usada pelo navegador. Testes sintéticos não
certificam Auth real, RLS ou uso humano. A validade do rascunho é de 30 minutos;
remoção física depende de acesso ao navegador e é tentada ao ler, descartar,
sair ou concluir envio, sem promessa de apagamento quando o storage é recusado.
Nenhuma tabela, migration, grant, RLS, flag ou indexação foi modificada.
Próximo incremento único após esta jornada: descoberta pública contextual de
conteúdos reais publicados dos módulos existentes, sem feed infinito ou catálogo paralelo.

SOC-D08, saída honesta: finding reproduzido na action de logout — resposta Auth
com erro era tratada como sucesso. Candidato passa a mostrar saída não confirmada
na Conta, sem mudar escopo de signOut ou configuração Auth; retry depende do clique
explícito. Critério: Sair real com sucesso limpa/encerra; erro mantém aviso e opção
de nova tentativa, sem anunciar sessão encerrada. Ainda candidato, não integrado.

SOC-D08 — checkpoint de prova e acesso (14/10/2026): no #549 empilhado sobre #546,
`d1688c6eefacc440a9c76b6eabd81220d41e1f59` passou os dois domínios da run
38659830598: 36 cenários renderizados (celular/desktop) e Auth/Postgres reais
descartáveis separados. A prova Windows também passou 36/36, sem filtros de
pageerror. Não é operação Production nem validação humana. Após essa prova,
o candidato acrescenta links dos cards públicos às ações existentes, apenas
com A1/A2/A5 habilitados e organização presente na projeção pública.

Decisão de continuidade pública: transportar somente origem `feirinha` e modo
de experiência allowlisted; retorno direto disponível à listagem ou organização.
Contato, mensagem, sessão e query arbitrária não entram na URL. O diretório atual
não possui filtros implementados; não inventar filtros nesta entrega. O histórico
do navegador permanece nativo. Critério novo: card → autenticação real da action
com transporte controlado → formulário vazio de contato/consentimento → retorno
à Feirinha no mesmo modo; completar no novo SHA antes de chamar PASS.
Estado continua `CANDIDATO EM PR`; não integrar com dependência/gates bloqueados.

SOC-D08 — fechamento local: #549, funcional `71c4d803`, 40/40 casos de navegador
PASS com transporte controlado (Windows), 47 focais, TypeScript e ESLint focal
PASS. Cards → login → retorno legacy sem query privada, contato ou consentimento
restaurados; teclado/Axe/overflow cobertos. O formulário prévio já possuía prova
real Auth/Postgres separada em `d1688c6e`; exigir conclusão da run do candidato
posterior, não transferir esse PASS. P1G chegou ao mesmo bloqueio da Escola
(run 38660853963, migration 20261006134804 pendente); TLS corrigido sem reduzir
controles. Estado final desta implementação permanece `CANDIDATO EM PR` (#549
draft, dependente do #546). Integração, Production e validação humana não provadas.
Próxima ação executável: reconciliar runs/Preview do head na descrição do #549;
integração exige dependência resolvida e gates de main no SHA exato. A próxima
entrega de produto continua descoberta pública contextual, ainda PLANEJADA.

SOC-D08 — correção adicional demonstrada na revisão final: a aba A mantinha texto
de A após outra aba entrar como B (regressão de navegador reproduzida). Dois
controles de action também falharam antes da correção: formulário de outra conta
e de login anterior eram aceitos. O ator continua exclusivamente getUser; os
handles opacos do formulário apenas recusam estado stale, não concedem autoridade.

Decisão: notificações efêmeras entre formulários usam BroadcastChannel com
apenas tipo e hashes opacos de conta/login, nunca mensagem/contato/consentimento.
São sinais não confiáveis de invalidação, não outro sistema de Auth. Troca de
contexto apaga memória e solicita refresh dos Server Components existentes.
Perda de foco/visibilidade esconde os campos e exige nova resposta servidor antes
de mostrá-los; mantém mensagem em memória somente no mesmo login, mas zera
contato/consentimento. Falha da atualização permanece fechada com Reabrir item.
Mesmo sem canal, o servidor recusa contexto obsoleto antes de qualquer RPC; a
resposta esconde e limpa os campos. Não há polling, endpoint/tabela nova, storage
de identidade ou mudança do Auth. O fallback de foco foi ensaiado com eventos
sintéticos; isso não certifica troca de janela física, Safari ou Firefox.

Prova local ampliada SOC-D08 entre abas: 48/48 cenários PASS, incluindo recusa
de envio stale quando o canal é negado e preservação da mensagem no mesmo login.
57 focais, TypeScript, ESLint e build de fixture PASS. Isso continua prova sintética
renderizada, separada de Auth/Postgres real. Exigir runs/Preview do novo head no
#549 antes de atribuir PASS remoto. Sem integração enquanto Escola/gates bloqueados.

SOC-D08, Sair entre abas: regressão demonstrou que o logout real na Conta de
outra aba não limpava o formulário original. A limpeza existente passa a emitir
apenas logout-requested, sem identidade/segredo/draft. Receptor oculta e limpa
memória, tenta descarte e exige Reabrir para ler a sessão atual; não presume que
signOut teve sucesso. O fluxo de erro/retry da Conta permanece. Critério: Sair
real em B não deixa textarea de A exposto; canal recusado continua sem quebrar
a interface e o servidor não aceita formulário stale. Sem novas capacidades
de Auth, grants, flags, schema ou operações Production.

Fechamento local do complemento Sair entre abas: 50/50 casos de navegador PASS,
zero skipped/flaky no JSON. Mantidos casos anteriores, pageerror integral e
timeouts originais. Unitários focais, ESLint e build da fixture PASS; exigir
CI/Preview do novo head do #549. Permanecem NOT_RUN aparelhos reais, Safari/Firefox,
leitor de tela humano, troca física de janelas e ensaio de compreensão.

### SOC-D08 — estado de encerramento da passada

`CANDIDATO EM PR` #549, remoto `da6495f651c554346313aaf5dbad62738ecb1ac4`.
Entrega funcional: cards → login → contato/consentimento atuais → enviar →
acompanhar/aceitar/recusar/retirar, com privacidade do rascunho, troca de conta e
Sair entre abas. Local 50/50 navegador PASS; 1.540 unitários, Auth/Postgres real
descartável, Full Surface e Security local-only PASS no SHA remoto. Preview Git
READY e GitHub Preview success exatos. Isso não é disponibilidade Production.

Bloqueios: P1G recusa schema da Escola, preservando dependência #546; navegador
Linux encerrou o processo em dois casos diferentes, attempts 1 e 2 da run
38663191350, ambos 49 PASS/1 FAIL. Sem terceira reexecução equivalente. GitHub
final: 9 SUCCESS, 42 SKIPPED, 2 FAILURE, zero pending. COST-02 SKIPPED, não PASS.
Não integrar, ativar flags ou abrir indexação. Causa raiz do encerramento nativo
ainda não demonstrada; diagnóstico passivo preparado no relatório, sem atribuir
OOM/GPU/produto por suposição. Evidências e hashes ZIP preservados.

Checkpoint documental local, não enviado para provocar outra CI. Próxima ação
executável: captura de exit code/signal/memória no mesmo browser/ambiente Linux,
com observabilidade adicional; não repetir auditoria geral ou provas Auth verdes.
Decisão do titular: nenhuma tarefa rotineira solicitada nesta rodada. Schema da
Escola continua frente separada, sem autorização operacional presumida por este
checkpoint. A próxima entrega de produto continua descoberta pública contextual
de conteúdos reais autorizados; não iniciada enquanto esta unidade permanece
bloqueada. NOT_RUN: aparelhos reais, Safari/Firefox, leitor de tela humano, troca
física de janelas e compreensão. Não declarar V1 concluída.

#### SOC-D08 — diagnóstico de continuidade em Linux (2026-10-14)

PR #549 draft, head `adc9815a633ca360f37f163a5450b9c07330609e`: transporte
Auth/Postgres real PASS; 49/50 UI Linux PASS e 1 FAIL por saída nativa SIGTRAP,
confirmada com diagnóstico passivo. Causa raiz ainda não demonstrada. Preview
exato READY/Deployment success; COST-02 SKIPPED. Escola/P1G continua bloqueado
pela migration pendente. Sem integração ou alteração Production. Evidência e
hashes no relatório SOC-D08; próxima etapa é stack/core mínimo, não rerun cego.

#### SOC-D08 — mitigação validada, integração ainda bloqueada

Head remoto `5de169eb1c3b90f006a6b077a34879da691fc905`: atualização fixada
do Playwright 1.61.1 para 1.64.1, sem mudança de runtime do produto, passou
duas execuções Linux consecutivas de 50/50 e Auth/Postgres real. Stacks SIGTRAP
anteriores preservados; causa interna não declarada resolvida. Preview exato
READY e Deployment success; COST-02 SKIPPED. Full Surface admin com um rerun
dirigido após colisão de porta e Security Resilience ainda pendentes. Escola
continua bloqueando P1G/#546; #549 permanece draft, sem merge/Production.

Atualização SOC-D08: Security Resilience PASS no mesmo SHA 5de169eb; somente
admin Full Surface segue PENDING. P1G/Escola continua FAIL/BLOCKED.

Fechamento SOC-D08 no head remoto 5de169eb: Full Surface completo PASS,
inclusive admin (35 testes, attempt 2 após colisão de porta; histórico e retry
502 preservados). Merge ref tem tree idêntica ao head, conferida pela Git API.
Checks finais: 13 SUCCESS, 42 SKIPPED, 1 FAILURE (P1G/Escola), zero PENDING.
PR #549 continua CANDIDATO EM PR/draft, dependente do #546, sem reviews; não
INTEGRADO nem PRODUÇÃO VERIFICADA. Descoberta pública contextual permanece
o próximo incremento único PLANEJADO, sem abertura de nova fila.

### SOC-D08-R1 — revisão crítica da Feirinha (15/10/2026)

**DECISÃO / CANDIDATO EM PR #549, não aprovação humana.** Head revisado
5de169eb, base #546 d39656f4, main 8b0ba0d2; 13 SUCCESS/42 SKIPPED/1 FAILURE
(P1G/Escola), zero pending. Achado P2 R549-F01: aviso de storage indisponível
calculado, mas não exibido antes da digitação. Correção mínima renderiza o aviso
já existente; regressão browser red antes e 6 casos green depois, inclusive
remoção legada recusada sem revelar campos antigos. Sem mudança de auth/schema,
retenção ou permissões. Novo commit exige seus próprios checks/Preview; não
transportar as aprovações anteriores. A revisão separa componentes/actions reais
com transporte controlado de Auth/Postgres real em prova distinta; não equivale
a E2E único ou validação humana. [Revisão e fontes](../reports/current/comun-soc-d08-review-and-discovery.md).

### SOC-D09 — descoberta pública contextual (15/10/2026)

**DECIDIDO COMO PRÓXIMO INCREMENTO ÚNICO / PLANEJADO.** Motivo: encontrar algo
apreciável/útil sem conta nem obrigação coletiva. Consequência: seção pequena
“Para conhecer com calma” no Explorar existente, até 2 itens por categoria
Acervo/Rádio/Feirinha, máximo 6, com contexto/fonte/data/direitos e retorno, sem
feed, ranking ou schema novo. Cultura e oferta têm valor sem contrapartida.

Inventário por GET público e código: Acervo e Rádio exibem vazio; nenhuma oferta
individual elegível confirmada; ações/território em preparação. Quatro cartões
de comunidades não provam operação: helper pode retornar seed em erro. Leitores
que colapsam falha em vazio não são contrato suficiente para a nova seção.
Não inventar conteúdo nem chamar estado vazio de banco sem registros.

Dependências: amostra real publicamente elegível com proveniência suficiente,
readers ready/empty/unavailable sem seed e revalidação dos detalhes. CTA da
Feirinha depende de #549/#546; acesso cultural não é dependência automática da
migration Escola. Critério: omitir categorias vazias, isolar falha por fonte,
nenhum dado privado/rascunho/retirado, abrir e retornar em celular/teclado sem
login/escrita automática, pilot_noindex e gates preservados. Sem amostra e com
essas lacunas, fica especificação concreta, sem criar outra pilha de código.

Bloqueio Escola conferido no #542/921351c3: Subject Confirm Email Change já
resolvido; faltam configuração CAPTCHA real LAB_ONLY/hostname/recibo, desafio
humano e cinco fluxos, Gmail 0/6; backup fresco/restore/permit ainda não prontos.
Próxima ação é a rotina existente do #542 por canal protegido, não novo
procedimento nem busca de secrets nesta passada. Integração elegível futura:
Escola/preflights → #546 e certificação pós-merge → #549 reconciliado/gates/review
com certificação própria. Nenhum gate dispensado ou merge realizado.

### Incremento ordenado — continuidade da busca pública — 15/10/2026

Estado: `CANDIDATO EM PR`, não integrado. Decisão: preservar a intenção na busca
existente `/comun/buscar`, no detalhe e no retorno. Base main `8b0ba0d2`, sem
alterar ou depender do #552; não cria identificador SOC, outra busca ou feed.
Reutiliza leitores híbrido/lexical, filtros públicos e shell existente. Consulta,
tipo, pauta e território acompanham retorno local validado; retirada é reconsultada;
falha parcial não vira vazio. Limpar filtros mantém consulta. Paginação/ordenação
não existem nesta superfície e não foram inventadas.

Privacidade: padrão existente de consulta pública em URL, com aviso. Formulários
validam navegação POST antes do GET; padrões evidentes de contato, UUID e segredo
são recusados, sem prometer detectar todo dado pessoal. Contextos usam slugs
públicos, resolvidos no servidor. Sem storage de consulta ou telemetria nova.
Entrada sensível digitada fora do formulário já pode ter chegado ao histórico ou
provedor: a aplicação não pode apagá-la retroativamente.

Critério: filtros → detalhe → retorno/histórico, foco, nova aba/link direto,
retirada, vazio/falha total/parcial, teclado/axe e móvel. Navegador controlado não
certifica Auth/RLS nem conteúdo real. Comandos, evidências e limites em
`reports/current/comun-search-context-20261015.md`.

Dependências: #552 draft independente; Escola/#523/#542 preservados, sem migration
nem dispensa dos preflights. Próximo bloqueio único: certificar gates remotos e
Preview do novo SHA. Aparelhos reais e validação humana continuam NOT_RUN.

Evidência do incremento de busca: #553 draft, funcional `ca4e7325`;
46 focais/adjacentes, 16 browser local, 16 browser remoto e Auth/Postgres A/B
com limpeza PASS (run 38792046636). Matriz disclosure/controle negativo PASS
(run 38792046468). Preview Git/GitHub no SHA funcional comprovado. Não é integração,
Production ou validação humana. Bloqueio observado em 48.2-A: CA TLS ausente no
runner antes de SQL, separado da dependência Escola; não enfraquecer TLS ou gates.
Checks posteriores à atualização documental exigem inventário próprio no PR.

Autocorreção de busca na mesma frente: logs de Civic/Quality demonstraram perda
de foco ao alternar semântica e expectativa legada de preservar snapshot na falha
de rede. Controle agora mantém foco; teste de rede exige indisponibilidade, zero
resultado obsoleto e retry. 18 browser locais PASS no diff corrigido, sem remover
os casos anteriores. CI e Preview do novo commit exigem certificação própria.

### Execução permanente por ciclos — 15/10/2026

Decisão operacional, sem alterar a estratégia: cada ciclo iniciado pelo orquestrador
lê este roadmap e `reports/current/comun-execution-checkpoint.json`, reconcilia o
estado vivo, escolhe uma entrega elegível, implementa a menor solução suficiente,
valida regressões e registra provas/commits antes de reavaliar a fila. Não cria
outro roadmap, timer ou processo residente. Máximo de uma entrega por ciclo e duas
tentativas equivalentes de correção por finding; bloqueio externo ou limite exige
estado recuperável, não falsa conclusão global. Estes limites regulam a execução,
não substituem critérios de aceitação.

Retomada #553 no head `f2aaea03`: browser/Auth-Postgres run 38795799390 e CA contract
38795799146 PASS; COST-02 do contrato vigente PASS. Sem reviews; draft mantido.
Preflights alcançam os bloqueios de schema depois da correção TLS; não repetir
provas aprovadas nem tratar skipped/pending como PASS. Quality/Civic ainda exigem
resultado próprio. Próxima ação: concluir sua classificação e só então reavaliar
uma entrega independente. Escola #542: Source Subject já resolvido; falta o par
Turnstile exclusivo do laboratório, CAPTCHA humano e cinco fluxos. Gmail 0/6;
backup só após esses requisitos. Não procurar segredos nem renovar provas temporais
neste ciclo. Nenhum merge, schema write, deployment Production, flag ou gasto.

Nota de conciliação (19/10/2026): as regras históricas de ciclos acima não reativam nenhum agendamento; a execução atual do COMUN continua manual por trilha, mediante comando explícito, sem ORCH-V2 agendado. A busca do PR #553 permanece candidata até cumprir gates remotos e certificação no novo SHA.

## Norte de produto: a rede social do comum (20/10/2026)

### SOC-D10 — Arquitetura integral da rede social do comum

**Estado:** objetivo de produto e princípios `PRINCÍPIO DECIDIDO`; jornadas,
rótulos, perfil público, publicação espontânea e descoberta integrada
`HIPÓTESE A VALIDAR`; etapas abaixo `PLANEJADAS`. Esta decisão unifica
os registros de SOC-D01 a SOC-D09, as frentes 49-E/U0–U8/50 e o contrato
V1. Não substitui os critérios existentes, não reabre migrações nem declara
implementação ou validação humana.

**Objetivo final:** o COMUN é uma **rede social de vida comunitária** na
qual qualquer pessoa pode descobrir, conversar, criar, preservar memórias,
trocar bens e conhecimentos, compartilhar cultura, acessar ferramentas
úteis e, se quiser, construir ações coletivas e cobrar resultados. O
valor da rede não depende de ativismo, conta, popularidade ou permanência
em tela. A mesma infraestrutura permite a alguém **simplesmente viver e
conviver** e a outra pessoa **agir politicamente com baixa fricção**,
sem transformar toda manifestação cultural em campanha ou toda conversa
em votação.

**Decisão de coerência:** não redesenhar a home isoladamente. Reorganizar
a experiência transversal de pessoas, conteúdos, lugares, relacionamentos
e tarefas a partir das rotas e contratos existentes. O COMUN deve parecer
uma rede de pessoas e possibilidades com ferramentas cívicas profundas,
não um painel institucional acrescido de ícones sociais; tampouco deve
virar um feed extrativista que esconde os instrumentos de organização.

### SOC-D10.A — Cinco intenções humanas que atravessam todos os módulos

- **Descobrir:** encontrar uma memória, autora, música, jogo, oferta,
  problema, proposta, informação ou comunidade, por assunto ou lugar.
  A descoberta é útil por si só e não exige cadastro.
- **Expressar e conviver:** publicar algo cotidiano, trocar ideias,
  perguntar, comentar e conhecer pessoas sem converter toda interação
  em pauta formal ou exigir posicionamento político.
- **Guardar e criar:** conservar coleções, memória, obras, conhecimento
  ou trabalho próprio, com autoria, licenças e controles de visibilidade.
  O que dura não deve desaparecer num fluxo de novidades.
- **Trocar e cooperar:** encontrar bens, serviços, empréstimos,
  doações, ajuda mútua, organizações e, futuramente, ofertas
  individuais com proteção de contato e consentimento.
- **Cuidar e transformar:** relatar problema, entender evidências,
  acompanhar, propor, deliberar, assumir tarefa e verificar
  resultados. Este caminho exige clareza e devolutiva, não
  adesão ou formação prévia.

Estas são **intenções**, não cinco bancos, feeds, níveis de usuário
ou novos aplicativos. Uma obra cultural pode ficar só no Acervo;
uma oferta pode gerar uma conexão privada; um relato sensível
não pode virar postagem pública automaticamente; uma conversa
pode, com consentimento, inspirar uma pauta. A travessia entre
intenções é **opcional e explícita**.

### SOC-D10.B — Camada social comum sem apagar os domínios

Cada superfície deve tornar reconhecíveis, quando aplicável:
**quem publicou** (e sob que papel), **o que é**, **onde/se relaciona
a um lugar**, **quando e de onde vem**, **para quem está visível**,
**qual ação faz sentido**, **como voltar ou acompanhar** e
**qual é o estado do processo**. Isto é contrato de apresentação
e navegação, não uma migração para tabela universal de eventos.

- **Pessoa:** identidade e presença voluntárias; não é sinônimo
  de conta administrativa nem de integrante de organização.
- **Organização/cooperativa:** perfil e direitos de representação
  próprios, sem herdar automaticamente a identidade civil ou
  reputação do seu representante.
- **Conteúdo:** publicação cotidiana é diferente de memória
  editorial, obra, episódio, jogo, pauta, resultado, oferta,
  necessidade, protocolo ou evidência. Cada domínio conserva
  suas regras, moderação, direitos e estados.
- **Contexto:** assunto, comunidade e território podem conectar
  obras e ações, mas localização residencial e filiação política
  não devem ser inferidas ou expostas.
- **Relação:** acompanhar autor, tema, coleção, território ou
  pauta não é tornar-se membro nem aceitar responsabilidade.
  Participação, contato, representação e tarefa são vínculos
  separados com consentimentos separados.
- **Retorno:** histórico e itens guardados são privados por
  padrão; notificações indicam respostas reais e estados
  relevantes, jamais urgência inventada para estimular visitas.

**Lacuna auditada no código da main:** `/comun/conta` já permite nome,
bio e visibilidade; `/comun/minha-participacao` é uma área privada
densa, não um perfil social público completo. A home App V2 prioriza
relatar/pautas/atenção; `/comun/explorar` agrega sobretudo categorias
e atalhos. A Feirinha tem diretório e conexões organizacionais
protegidas. Acervo/Rádio/Arte têm contratos editoriais.
NÃO inferir publicação espontânea livre, seguindo pessoas,
mensagens sociais gerais ou timeline personalizada como
funcionalidades prontas. Não inventar contas ou registros
para povoar estas experiências.

### SOC-D10.C — Identidade: perfil, presença e área privada são coisas diferentes

**Decisão:** evoluir o cadastro mínimo atual para uma identidade
de expressão social por camadas, com visibilidade escolhida,
sem exigir nome civil ou militância; implementar somente
depois de auditar Auth, RLS, bloqueio e moderação:

1. **Conta e segurança (privado):** acesso, dados sensíveis,
   contatos, consentimentos, exclusão/portabilidade e
   configurações. Nunca funcionam como vitrine pública.
2. **Minha área (privado):** continuidades, itens salvos,
   respostas, contribuições, trocas, rascunhos e
   notificações relevantes. Preservar a base já existente
   de `Minha participação`, mas tornar compreensível
   para quem não participa de ações cívicas.
3. **Perfil social (publicação opt-in):** apresentação,
   nome escolhido, bio, imagem autorizada, interesses
   declarados e obras/publicações que a pessoa
   decidiu tornar visíveis. Seções como criações,
   memória, atividades públicas e vínculos públicos
   são facultativas, nunca histórico automático
   da área privada. Sem ranking, contador de prestígio
   ou exposição compulsória de seguimentos.
4. **Perfis de coletivos:** comunidade, associação,
   cooperativa ou projeto têm contexto e autoria,
   representação verificada e responsabilidade
   específica. Uma pessoa pode ter vários papéis;
   nenhum papel se torna público sem contrato explícito.

**Perguntas a validar:** pseudônimo público x identidade
legal em determinadas transações; consentimento por
publicação ou por coleção; possibilidade de acompanhar
autores; descoberta da pessoa por interesse e território
amplo; formas de contato seguras. Não transformar
relações de trabalho, denúncia, competência, organização
ou doações em métrica de status pessoal.

### SOC-D10.D — Publicar e interagir: liberdade social com regras claras

**Primeira hipótese de criação espontânea:** um gesto leve
de expressão (texto breve, foto autorizada, pergunta ou
link cultural) que possa existir sem pauta formal.
No momento de publicar, a pessoa compreende autoria,
destino e audiência: `público`, `comunidade autorizada`
ou `privado/rascunho` conforme os controles que forem
efetivamente desenvolvidos. Pré-visualização e revisão
de dados pessoais são essenciais; ausência de conta
não pode transformar criação em perda silenciosa.

**Ações comuns candidatas:** apreciar, comentar ou responder,
guardar, compartilhar com contexto, acompanhar e
propor colaboração. Não introduzir todas na V1.
Uma reação não é voto político, avaliação de
confiabilidade, prova jornalística ou consentimento
para republicar. Comentários e mensagens gerais
exigem bloqueio, denúncia, moderação e limites de
abuso antes de abertura pública. Nada de DM irrestrita
para menores ou contato automático entre desconhecidos.

**Conversão voluntária entre domínios:** de uma lembrança
para coleção; de uma conversa para sugestão de pauta;
de uma oferta para conexão privada; de um conteúdo
público para ação verificável. Exigir ação consciente
e registro da origem e dos consentimentos. Conteúdos
sensíveis, contatos ou registros privados não se
tornam públicos por linkagem nem por resumos de IA.

### SOC-D10.E — Descoberta e engajamento sem captura de atenção

**A hipótese de descoberta não é um feed algorítmico único.**
Oferecer modos distintos com escolhas visíveis:
`Conhecer` (curadoria diversificada de conteúdo público),
`Novidades` (recentes com contexto e regras compreensíveis)
e, quando houver relação real consentida,
`Acompanho` (autores, comunidades e assuntos).
Não depender de inferência de crenças, condições de
saúde ou filiação política. Não comprar distribuição
nem ranquear pessoas por engajamento. Controles
de silenciar, não recomendar e desfazer acompanhamento
são requisitos anteriores a personalização.

**O que torna a experiência prazerosa:**
surpresa relevante, humor, beleza, memórias locais,
descoberta de pessoas, possibilidade de criar, troca
útil e retorno humano. O design expressivo é
contextual: cultura e jogos podem ser mais visuais;
relatos sensíveis exigem calma e proteção; cooperativas
precisam mostrar objeto, condição, autoria e ação;
informações públicas precisam preservar fontes e
limites. O Zen Brutalista é linguagem compartilhada,
não o mesmo cartão pesado repetido em toda rota.

**Engajamento legítimo:** a pessoa volta porque recebeu
resposta, descobriu algo, encontrou companhia,
continuou sua criação ou acompanhou uma consequência.
Sem streaks, FOMO, culpa, notificações artificiais,
reproduções automáticas inesperadas ou scroll infinito
obrigatório. Tempo de tela, volume de posts, curtidas
e seguidores não são objetivos máximos.

**Conteúdo insuficiente:** priorizar qualidade,
curadoria e reaproveitamento de obras autorizadas.
Se uma fonte falhar, exibir estado próprio e opções
honestas; não substituir indisponibilidade por "vazio"
nem dados sintéticos por vida social fictícia. Variar
conteúdo e relevância, não simular movimentação.

### SOC-D10.F — Arquitetura de navegação a prototipar, sem trocar rotas

Manter inicialmente os caminhos da App V2 e seus
contratos de shell. Hipótese de cinco gestos
compreensíveis no celular, preservando acesso
rápido à denúncia:

- **Início:** uma capa viva e concisa, alternando
  descoberta pública, conteúdo cultural, oportunidade
  de troca, assunto do território e retorno pessoal
  quando houver. Não é painel cívico nem feed infinito.
- **Explorar:** busca transversal por palavras, assunto,
  lugar e categoria; conteúdos publicados de Acervo,
  Rádio, jogos, Feirinha, comunidades, pautas e ferramentas.
  Filtrar por tipo não exige conhecer nomes internos.
- **Ação central:** acesso simples a `Vi um problema`
  e opções contextuais de `Compartilhar`,
  `Contribuir`, `Oferecer` e `Propor`
  apenas quando a respectiva jornada é real.
  Não sacrificar o relato em um menu genérico confuso.
- **Participar / Comunidades:** vínculos e atividades
  coletivas por escolha, com possibilidades de entrar,
  conversar e cooperar. O rótulo final depende
  de teste de compreensão; não ocultar ferramentas
  cívicas em nome da estética social.
- **Você:** porta para Minha área e, se autorizado,
  perfil social público, sem confundir dados privados
  e publicações. Caixa permanece comunicação e
  acompanhamento privado, não quinto feed.

**Lacuna exata na navegação atual:** o contrato
`COMUN_ROOT_TABS.explorar` ainda aponta para
`/comun/observatorios/panorama` com o rótulo
"Entender", enquanto existe uma rota distinta
`/comun/explorar` com cartões de categorias.
O redesenho precisa avaliar se `Explorar`
se torna entrada abrangente, preservando
"Entender a cidade" como intenção cívica
acessível em um toque, sem alterar rotas
ou tabs antes de testar.

**Não decidir por layout imaginado:** produzir
protótipos de jornadas em 360–430 px, desktop,
teclado, leitor de tela, zoom e conexão limitada;
comparar com navegação existente antes de alterar
`COMUN_ROOT_TABS`, shell ou rotas. Mostrar a
home para visitante anônimo, novo membro sem
relações e membro retornando. A capa só exibe
cards com registros elegíveis, títulos e imagens
autorizados e links seguros; jamais contadores
ou rostos fictícios.

### SOC-D10.G — Redesenho coordenado das áreas existentes

- **Home + Explorar:** abrir caminhos sociais, culturais,
  econômicos e cívicos simultaneamente; diversidade
  moderada, continuidade, busca e conteúdo real.
- **Perfil + Minha participação + Conta:** separar
  expressão pública opcional, vida pessoal privada,
  relações e pendências. Reduzir linguagem de
  gestão para visitantes comuns sem esconder
  responsabilidades assumidas.
- **Comunidades e territórios:** não só entidades
  organizadoras, mas lugares para pertencimento,
  cultura, conversas e atividades; distinguir
  grupo de afinidade, comunidade territorial,
  projeto e representação institucional.
- **Acervo + Rádio + Arte + Jogos:** obras, autores,
  coleções e memória com vida própria; perfis
  dos criadores e compartilhamento contextual
  somente com conteúdo publicado/licenciado.
- **Feirinha + cooperativas:** objetos e necessidades
  descobertos diretamente, informações de origem,
  modalidade e condição, conexão privada protegida,
  acompanhamento após manifestação de interesse.
  Pessoas físicas entram só em fase posterior com
  contrato antisscam, moderação e direitos.
- **Relata + observatórios + pautas:** acesso público
  ágil e canal sensível privado; evidências e
  transparência com estados verificáveis; conversas
  espontâneas não viram deliberações por contagem
  de likes ou compartilhamento automático.
- **Escola + Fábrica + projetos:** formação e fazer
  conjunto a pedido de quem cria; não requisitos
  de uso, nem mecanismo de poder social.
- **Operação + governança:** aprovações, apelação,
  combate a golpes e assédio, transparência de
  incentivos e capacidade humana, preservando
  o núcleo existente de curadoria e auditoria.

### SOC-D10.H — Experimentos ponta a ponta e métricas de valor

As primeiras provas de **comportamento do produto** não
podem ser contagem de telas ou commits. Ensaiar com
pessoas reais, em dispositivos físicos e conexão
representativa, jornadas independentes:

1. **Visitante curioso:** encontra e compartilha uma
   obra ou história local publicada sem entrar.
2. **Pessoa que precisa de ajuda:** registra ou
   entende um problema cívico, preserva privacidade
   e recebe orientação/devolutiva compreensível.
3. **Criadora cultural:** apresenta trabalho,
   entende autoria/audiência/revisão e pode
   corrigir ou retirar com segurança.
4. **Troca recíproca:** encontra oferta/necessidade,
   manifesta interesse e obtém desfecho verificável
   sem expor contato publicamente.
5. **Vínculo comunitário:** encontra grupo ou pessoa
   de interesse, escolhe acompanhar ou participar,
   recebe retorno e pode sair do vínculo.
6. **Pessoa que volta:** retoma uma conversa,
   obra guardada ou responsabilidade real, sem
   notificações artificiais ou perda de contexto.

Registrar por jornada: sucesso ou fracasso da
tarefa, número de passos, pontos de dúvida,
estados vazios/falha, exposição indevida,
possibilidade de retorno, acessibilidade,
tempo de resposta percebido e desejo
espontâneo de reutilizar a experiência.
Não fazer telemetria individual invasiva.
Dados quantitativos precisam de denominador
e consentimento pertinentes; feedback humano
não pode ser substituído por automatização.

**Critério norte:** "alguém abre o COMUN sem
obrigação e encontra uma coisa boa de fazer;
alguém chega com urgência e encontra ajuda
sem fricção; ambos conseguem voltar e construir
relações com liberdade". Nenhuma experiência
é requisito para a outra.

### SOC-D10.I — Sequência de implementação sem reiniciar o produto

1. **Reconciliar o trabalho aberto:** finalizar,
   integrar ou encerrar com justificativa os
   PRs existentes respeitando todos os checks,
   migrations, segurança e bloqueios externos.
   Não abrir features concorrentes nem liberar
   indexação, produção ou flags por este plano.
2. **Inventário social e matriz de públicos:** mapear
   perfis, autorizações, conteúdo real, relacionamentos,
   busca, cards, curadoria e estados existentes,
   incluindo falhas de dados e seed. Confirmar
   quanto da V2 já pode ser reaproveitado.
3. **Protótipos de jornada integrados:** testar
   visitante, membro, criador, pessoa de trocas
   e pessoa em demanda cívica, incluindo
   primeira sessão e retorno. Comparar IA/UX
   móvel e desktop com rotas existentes.
4. **Descoberta real e coerente:** orquestrar
   leituras públicas seguras de algumas fontes
   já existentes, com diversidade, contexto,
   fallback honesto e retorno; sem novo banco
   e sem inventar conteúdo. A decisão
   SOC-D09 de descoberta contextual segue
   esta trilha, não cria outra home.
5. **Núcleo pessoal e social mínimo:** reduzir
   fricção da área privada, depois testar
   perfil público opt-in e uma publicação
   espontânea moderável; autorizações e
   moderação são gates antes de abrir uso.
6. **Relações + cultura + reciprocidade:**
   articular seguir/salvar, conversas seguras,
   descoberta dos autores, Feirinha,
   cooperação e comunidade, sem criar
   módulos homônimos ou perfis paralelos.
7. **Aferição e escala:** ensaio humano,
   qualidade, observabilidade mínima,
   operação/moderação sustentável;
   só depois ampliar catálogo, jogos
   comunitários, economia individual
   e recomendações opt-in.

Cada incremento deve indicar **rota atual
reutilizada, dor real, efeito sobre Auth/RLS,
público ou privado, custo de manutenção,
risco social, teste acessível, critério
de aceitação e ação reversível**. Não
implementar nova tabela ou "feed" antes
do inventário e da revisão formal.
Este registro é design de produto; nenhuma
subida de migration, abertura de publicação,
alteração de produção ou novo lançamento
é autorizada.

### Reconciliação do identificador duplicado SOC-D09

O título histórico `SOC-D09 — descoberta pública
contextual (15/10/2026)` era uma colisão
com `SOC-D09 — Jogos no COMUN` já integrado.
Para referências futuras, **SOC-D09-JOGOS**
designa o conjunto de Jogos e
**SOC-D09-DESC** a descoberta contextual;
os identificadores históricos SOC-D09
permanecem como aliases nos registros,
PRs e relatórios antigos. Não se mudam
decisões, links ou dependências por
esta distinção documental.
