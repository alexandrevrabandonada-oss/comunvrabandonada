## Reconciliação com isolamento do miniapp — 08/10/2026

Base main `1e6602c3cf9c87e93365f088e04148e81f574531` incorporada por merge
normal sobre o candidato `922e5d82`. #518 integrado, sem dependência do #516:
servidor/porta/build próprios e recusa de reutilização. Runtime da memória,
leitor público e asserções visuais permanecem. O diagnóstico acrescenta leitura
real da memória fixture e HTTP 200, sem aceitar ausência como sucesso.

O candidato anterior terminou com 39 success, 87 skipped e sete failures,
incluindo os dez casos miniapp na pr-lane Quality `113449356818`. A causa exata
não foi reproduzida; não chamar de flake nem atribuir à Escola sem prova.
SQL/navegador locais NOT_RUN; CI focal PWA → miniapp precisa comprovar o novo
SHA. PASS anterior não é transferido. Os seis gates remotos da Escola e a
capacidade de recuperação do provedor continuam abertos.

Quality pós-merge #528 `113492802723` exigiu o SHA `f95299fa` e falhou após
30 tentativas com `COMUN_QUALITY_EXPECTED_SHA_NOT_DEPLOYED`. Vercel success
não certificou esse endpoint. Sem migration, flags, indexação ou promoção;
#523 permanece draft. As seções seguintes são checkpoints históricos.

Validação local desta reconciliação: 56 testes Node passaram, incluindo três
contratos do runner (URL/porta/build isolados, argumentos e propagação de
falha), 22 de seleção Quality e 31 da preparação da Escola. TypeScript,
ESLint focal, Prettier e diff-check verdes. Playwright descobriu os dez casos
em cinco viewports; descoberta não é execução. YAML e ordem PWA → miniapp
conferidos; app/components/lib/supabase idênticos ao pai `922e5d82`.

---

## Reconciliação com a base integrada — 08/10/2026

Base incorporada por merge normal: `6a3c39a3f30df166e4e581152ccef104a28a7536`
(#526), sobre o pai candidato `ec849235b1fa33dd4dad959a4748b6ddff438bfd`.
O novo checkpoint e sua árvore estão registrados no PR #523. Esta atualização
resolve o conflito do roadmap, conserva os registros das entregas e acrescenta
as ferramentas read-only de revisão da Escola já integradas em main.

O diff contra o pai candidato não altera app, components, lib, tests ou
supabase. Página, metadados, compartilhamento, migration, manifesto e flags
permanecem iguais. Não houve rebase ou reescrita do histórico.

PASS local da reconciliação: 17 testes Node (15 revisão da Escola e dois
contratos de coerência), execução offline do pacote, formatação e diff-check.
As provas de navegador, Auth e PostgreSQL dos checkpoints anteriores são
históricas; nenhum resultado foi transferido como aprovação do novo SHA.
SQL/browsers locais NOT_RUN nesta atualização. O novo checkpoint solicita
Preview e checks próprios com `[comun-preview]`.

#522 e #526 estão integrados. O #526 passou 10 checks e PostgreSQL 17 descartável
antes do merge; no merge, Vercel success e 4 checks success, 73 skipped, zero
falhas ou pendências na consulta. Isso não certifica Quality da base: a correção
#525 ainda aguarda sua última pr-lane nesta atualização. Skipped não é PASS.

Os seis gates da Escola continuam bloqueados pela migration `20261006134804`.
O manifesto segue `remotePromotionAllowed=false`; este merge incorpora apenas
ferramentas, sem promover schema. Antes de integrar #523: concluir #525/base,
baseline canônico read-only, transporte atômico/POST e recuperação revisados,
autorização específica de escrita e revalidação dos seis gates. Não há nova
migration, flag, indexação ou certificação de operação pública/V1.

As seções seguintes são evidências e estados dos checkpoints anteriores.

---

# 49-H/49-I — compartilhamento público com contexto

Data: 08/10/2026. Entrega candidata, sem merge, alteração de flags, indexação,
migration ou escrita Production. Usar, participar e organizar continuam sendo
escolhas independentes. Compartilhar ou consultar não cria inscrição, tarefa,
progresso, responsabilidade ou participação.

## Proveniência e reconciliação

- Main reconsultada: `2c5d974d3ddf1b2c027d85b156a3f8a5ae4618f1`.
- Dependência de produto: PR #523, branch
  `codex/comun-49-e3-contextual-guidance`, head
  `a655635af34033b879f520f6875ede2d0d60e7a5`, draft e não integrado.
- Trabalho isolado sobre esse head; publicação por avanço normal no mesmo
  draft #523. Os workflows relevantes aceitam PR contra main, não PR dependente
  contra branch Codex. Não incorpora o reparo independente de Quality #522.
- Candidato funcional: `f2cb25fa56a639f79cd4d228e483922fa922db67`.
  Tree: `e41a7164b205ac4dc7982ae7c26efde67b0b2929`.
- #522 reconsultado: OPEN, não merged, head
  `bf9eb8ab912ce9442e18e3ec50d2e01dba09a2de`. Seu reparo read-only não está em
  main; o caminho automático pós-merge de Quality não está certificado como
  corrigido em main.
- Árvore original com mudanças preexistentes preservada. Trabalho isolado em
  `D:/COMUN-49H-PUBLIC-SHARING`; publicação final pelo clone independente
  `D:/COMUN-49H-PUBLISH`, com SHA/tree idênticos, após C: impedir escrita
  do índice compartilhado do worktree. A tentativa inicial em C: ficou preservada após
  ENOSPC. Dependências próprias instaladas em D:, sem limpar outros trabalhos.

## Auditoria da jornada e entrega

| Superfície           | Problema observado                                                            | Alteração e limite                                                                                                                                                                                           |
| -------------------- | ----------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Pauta                | Metadata herdada podia divergir da pauta renderizada                          | Página e metadata usam a mesma leitura pública deduplicada por requisição; orientação/material do #523 preservados                                                                                           |
| Ação                 | Título/resumo genéricos, estado de release separado da publicidade            | Metadata respeita a release existente e não anuncia fixtures de Preview como publicação                                                                                                                      |
| Resultado            | Identidade em `?resultado=` era perdida ao limpar parâmetros                  | Detalhe estável `/comun/resultados/[slug]`, links atualizados e redirect do endereço antigo quando o resultado é público; nenhum novo modelo de resultado                                                    |
| Resultado e relações | Leitura recusava pauta privada, mas não ação/território privados relacionados | Recusa consistente das três relações antes de ler memória; regressões da fronteira de aplicação                                                                                                              |
| Dossiê               | Canonical dependia de configuração localhost/Preview                          | Origem canônica do contrato E0, título/resumo do snapshot publicado e datas editoriais reais preservadas                                                                                                     |
| Acervo               | Ausência de metadata própria no detalhe genérico                              | Reutiliza leitor que exige publicação, visibilidade pública e conteúdo entregável; redirects especializados preservados                                                                                      |
| Observatório         | Detalhe genérico sem metadata e sem filtro de status no leitor privilegiado   | Mesmo resultado autorizado na página/metadata; draft, archived e withdrawn não são anunciados. Observatórios especializados continuam com contratos próprios: adoção completa da distribuição ainda pendente |
| Material             | Consulta pública sem canonical/previews consistentes                          | Página e metadata usam o mesmo material allowlisted do catálogo; leitura não depende do schema/flag da Escola                                                                                                |

O compartilhamento existente foi ampliado: API nativa quando disponível,
Clipboard API como alternativa e diálogo com link selecionável se ambas
falharem. Cancelamento não copia nem declara sucesso. O diálogo aceita teclado,
Escape e devolve foco; nome acessível acompanha o rótulo visível após a cópia; o comando preserva URL/contexto e reinicia seu estado na
mudança de página. No celular, permanece no menu existente “Mais ações”.

Título, resumo e URL vêm da projeção pública que alimenta metadata. Campos
privados adicionais do leitor não são serializados. Query e fragmento são
removidos; protocolos, rotas privadas, caminhos codificados e metadata antiga
de outra página não podem virar URL compartilhada. O fallback para o início
usa somente a marca do produto, nunca o título privado do cabeçalho móvel.
Rotas de objetos ainda sem projeção explícita compartilham apenas o início do
COMUN; não são presumidas públicas. Esse comportamento conservador exige
adoção posterior nos detalhes especializados.

`pilot_noindex` permanece. Não há novas datas inventadas, JSON-LD de conteúdo
incompleto, abertura de busca/indexação, publicação automática ou alteração de
autorização editorial. A deduplicação é por requisição; não há cache duradouro
de publicação retirada.

## Evidências locais e seus limites

No candidato funcional acima: 1.473 unitários em 250 arquivos, 113 solo,
44 contratos COST-01/COST-02/inventário, 32 casos da jornada pública e
45 casos PWA em cinco viewports passaram no candidato funcional final.
ESLint, TypeScript e build de produção passaram. Prettier e diff-check são verificados no
checkpoint documental; o diff deste para o funcional deve conter somente os
dois documentos desta entrega. O pacote local de evidências vincula comandos,
SHA/tree e hashes, sem atribuir ao novo candidato provas de heads anteriores.
Uma tentativa de unitários falhou por ENOSPC em temporários C:; log preservado,
sem correção de produto. Repetição com TEMP/TMP em D: passou no mesmo código.
Ferramentas: Node 22.19.0, npm 10.9.3, Next 16.3.8, Playwright 1.61.1,
Chromium 1228, Windows. Não há promessa de integração universal.

| Prova                                                       | Escopo                                                                                                                                                                                      |
| ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Unitários da projeção/URL/adapters e boundary de resultados | Público/privado/rascunho/retirado, campos allowlisted, rotas privadas/codificadas, canonical antigo, relações privadas e identidade estável de resultado                                    |
| Navegador Chromium desktop e viewport móvel 390×844         | Cópia real pelo Clipboard API, metadados/h1, teclado, cancelamento/falha injetados nas APIs do SO, cópia manual/foco/Escape, ida ao material e volta, leitura sem JS, sem escrita observada |
| axe no diálogo manual                                       | Regras automatizadas do diálogo; não substitui tecnologia assistiva ou avaliação humana                                                                                                     |
| Suíte existente de pauta/ação/material                      | 32 casos incluindo os oito novos casos de compartilhamento; fixtures de ações locais não são publicação nem prova de operação real                                                          |
| Inventário                                                  | 242 páginas: a rota de material do #523 e o detalhe estável de resultado. Nenhuma verificação de findings ou rota obrigatória removida                                                      |
| Build/TypeScript/lint/solo/COST-01/COST-02                  | Validação de código e contratos; não certifica schema, flags ou Production                                                                                                                  |

Browser plugin indisponível: utilizado Playwright regular com Chromium
instalado. Screenshots da página e do diálogo em desktop/celular foram
inspecionados; sem overflow horizontal no caso testado. Capturas e logs locais
ficam no pacote `D:/COMUN-49H-QA`, fora do produto.

**NOT_RUN:** folha nativa real Android/iOS, aparelho físico, Safari/Firefox,
leitor de tela, ensaio humano/editorial, compartilhamento recebido em apps
terceiros e invalidação ponta a ponta de cada detalhe com dados reais de DB.
Mocks não são prova de RLS. Não houve mudança de schema, grant ou política;
nenhuma certificação nova de RLS é atribuída aos unitários/navegador.

## Diagnóstico remoto anterior preservado

- School: preflight #523 run `37786184351` bloqueou com
  `REMOTE_MIGRATION_PLAN_NOT_EMPTY:20261006134804_comun_learning_r0.sql`.
  Migration pendente preservada, sem aplicação ou exclusão do gate.
- Inventário: Civic run `37786184099`, Core Journeys `37786184073`, Experience
  `37786184360` e entity contract `37786184098` encontraram `241 !== 240`.
  O candidato atualiza a contagem exata, sem dispensar o contrato.
- Bootstrap de laboratório: ciclo `37786184337` encontrou Docker
  `toomanyrequests: Rate exceeded` e
  `COMUN_PAUTA_ACTION_CYCLE_LOCAL_RESET_FAILED_1`. Não chegou a comprovar RLS;
  não é classificado como defeito funcional da aplicação.
- Validator antigo: Civic `37778556477`, head `deb15b00...`, registra TS1109
  e TS1128 em `.next/dev/types/validator.ts`. O head posterior d7af teve Civic
  verde (`37784926033`), mas isso não certifica este candidato. Nesta entrega
  o dev server desta suíte tem saída `.next-pauta-action-cycle`; não há reparo
  amplo de CI. Build/TypeScript novos devem ser julgados separadamente.

## Correção demonstrada na revisão remota

O primeiro checkpoint `65227dc4f79e817d4bcb40e25d1a937bba2c8ff1`
teve Preview Git READY (`dpl_Gme2TAA3s2ozrwK1KcR7U9XRtj4C`), GitHub
Deployment Preview `6937990569` success e COST-02 success na run
`37790928713`. Esses resultados pertencem a esse SHA, não ao checkpoint final.

Core `37790929262` e PWA `37790929030` falharam em dez casos: os testes
esperavam status aninhado no botão e a mensagem antiga “Falha no link”.
Além de atualizar o teste para a recuperação manual exigida, corrigiu-se o
nome acessível: “Link copiado” visual agora também integra o nome acessível.
O status é associado por aria-describedby; o diálogo tem descrição própria.
Nenhuma regra axe foi desligada. No candidato final, os 45 casos PWA passaram,
inclusive nome/rótulo, foco, ausência de sucesso falso e regras axe.

Os cinco preflights 48.3 do primeiro checkpoint confirmaram a mesma migration
School pendente (A1 `37790929153`, C1 `37790929161`, D1 `37790928971`,
E2 `37790929121`, E3 `37790929279`). 48.2-A `37790929210` bloqueou com
`COMUN_48_2_A_BLOCKED_REMOTE_SCHEMA_DRIFT`. Seu artifact contém todos os sete
invariantes de schema/read-only verdadeiros e businessRowsRead=false, mas não
preserva as listas pending/unknown da comparação. Não se atribui essa falha
exclusivamente à School sem essa evidência, nem se altera o gate para passar.
Civic Intelligence `37790929019` passou, sem reprodução do validator antigo.

O checkpoint final solicita novo Preview exato pelo mesmo mecanismo Git. Sua
validação e a classificação final de checks ficam no corpo do PR e no pacote
local de evidência, para não criar outro SHA apenas para registrar seu próprio
Preview. Não há ready-for-review enquanto bloqueios aplicáveis persistirem.
A navegação direta ao primeiro Preview recebeu a proteção Vercel; HTTP 200 da
tela de login não foi contado como aplicação funcionando. Navegador remoto
protegido: NOT_RUN. Nenhuma proteção foi desativada.

## Próximo passo de produto

Concluir a revisão conjunta #523 + distribuição e adotar a projeção nos
observatórios especializados e demais detalhes públicos, mantendo seus gates.
Depois, ensaiar o link recebido e o retorno em aparelhos reais com pessoas,
antes de declarar distribuição universal ou sucesso de participação. Schema
da Escola, operação editorial, Quality automático e lançamento são decisões e
provas separadas. Mais rotas não encerram a V1 nem comprovam utilidade humana.

## Continuação — observatórios especializados e diagnóstico de schema

Base reconsultada: main `2c5d974d3ddf1b2c027d85b156a3f8a5ae4618f1`.
O #523 continuou draft em `a21ba56340409d30fd2cd94b6eac0718544b3f3b`.
Quality `37793676320` terminou SUCCESS antes de qualquer repetição; não houve
rerun. O inventário final daquele SHA foi 41 PASS, seis FAIL e 75 SKIPPED;
skipped não foi contado como aprovação.

Os seis failures foram separados por log: A1 `37793676549`, C1
`37793676602`, D1 `37793676779`, E2 `37793676924` e E3 `37793676446`
bloquearam por `REMOTE_MIGRATION_PLAN_NOT_EMPTY:20261006134804_comun_learning_r0.sql`.
48.2-A `37793676629` usava marcador genérico e não preservava as listas.
Nenhuma regressão funcional foi demonstrada por esses seis failures.
A falha inicial de bootstrap descartável em Security tinha passado na única
repetição do mesmo SHA; não se inventou sua causa SQL não preservada.

### Diagnóstico 48.2-A comprovado

Correção de observabilidade em `a9b67cff658bee9d8c78ee3af3cf5a6e3e8cbe76`:
artifact sanitizado antes do throw, somente versões/paths allowlisted,
PGOPTIONS read-only adicional, sem alterar a decisão fail-closed.
Run `37799177976`, artifact `11560037842`, `drift-diagnostic.json` SHA-256
`24f33392bf2347b1bd28bd235ff0627bd497467071c64fc9b2d345865c620278`:

- pendingNormalMigrations: `["20261006134804"]`;
- unknownRemoteMigrations: `[]`;
- observatoryMigrations: `[]`;
- failedSchemaControls: `[]`;
- businessRowsRead: false;
- exactExternalHardeningLedgerAccepted: true;
- transactionReadOnly: true.

Assim, o drift desse gate é exclusivamente a pendência da Escola, não alteração
de fingerprint nem defeito de schema do observatório. Continua BLOCKED; não
houve exclusão de pendência, repair, reload, migration ou escrita Production.
Os testes preservam bloqueio para versão desconhecida, pending e schema inválido.

### Dependência #522

#522 permanece OPEN/draft em `bf9eb8ab912ce9442e18e3ec50d2e01dba09a2de`;
não está em main. Patch revisado e portado com `cherry-pick -x` para
`59fecd59` nesta branch. O caminho automático pós-merge chamava transportador
capaz de schema write/reload. Agora consulta metadados com BEGIN READ ONLY,
conexão default_transaction_read_only e rollback; credencial restrita ao passo.
Migration/manifest byte-idênticos. 21 testes focais passaram; prova PostgreSQL
anterior do patch é reutilizada apenas para os arquivos idênticos, não como
ensaio de todas as mudanças desta rodada. Nenhum job pós-merge foi executado.

### Entrega de produto

Rios (INEA) e energia (ANEEL) usam uma leitura pública por requisição para
página e metadados, respeitando as flags existentes antes da projeção. Um
adapter allowlisted deriva título, resumo, território, período, data da
verificação/consulta, fontes e limitações dos DTOs públicos existentes.
Não copia filtros, sessão ou dados de relatos. O compartilhamento existente
usa essa mesma descrição/canonical, preservando noindex. Nada é anunciado
como tempo real, potabilidade, ano completo ou contagem de pessoas únicas.

A página oferece fontes/metodologia e retorno aos observatórios; Back preserva
contexto local, mas o link distribuído não leva query/fragmento. Flag fechada
retorna 404 sem snapshot ou metadados públicos. Nenhum snapshot, parser,
proveniência oficial, grant ou regra de publicação foi alterado.

A revisão visual identificou texto preto sobre o fundo escuro público. A
correção declara superfície de leitura clara somente nesses dois componentes;
a prova axe inclui agora o cabeçalho completo. Não houve redesign global.

### Plano revisável para a Escola — não executado

A release existente `supabase/releases/20261006134804-comun-learning-r0.json`
é local_candidate, remotePromotionAllowed=false e requiresPromotion=true.
Migration SHA-256 rastreado permanece
`5036a833b1b681487204349f8ebc58690228a2f5aa932943a81f60df1d3b6ba7`.
Não basta transformar o flag em enabled ou dispensar os preflights.

Uma rodada separada deve revisar o pacote de release, capturar baseline/ledger
read-only, demonstrar forward-only e controles Auth/RLS/owner isolation em
laboratório, definir contenção e obter autorização explícita antes de qualquer
escrita de schema. Schema instalado e ativação de produto são gates distintos.
Revisão editorial e responsabilidades reais não foram presumidas. Não houve
reload, mudança do manifest, atualização de fingerprints ou aplicação aqui.

### Provas e limites desta rodada

Resultados, SHA funcional final e checkpoint são registrados abaixo e no corpo
do PR. Os ensaios usam snapshots oficiais públicos já disponíveis em repositório
com URLs/tokens sintéticos; fixtures sintéticas unitárias verificam no-leak,
fonte privada rejeitada e data ausente explícita. Não são dados pessoais reais.
Não se certifica RLS por mocks nem operação Production pelo navegador local.

O teste anterior tentava Enter antes de o summary estar visível/focado; a
instrumentação registrou BODY recebendo a tecla. O ensaio agora exige ambos
antes de Enter, sem sleep, retry ou redução da asserção. Logs negativos foram
preservados. Telemetria agregada existente pode emitir POST técnico; o payload disponível é
conferido por allowlist exata sem sessão. Beacons cujo corpo o Chromium não
expõe são registrados como telemetria não inspecionada, não como prova de payload. A prova exige zero ações
ou mutações de negócio e credenciais remotas vazias no processo local; não
alega zero tráfego HTTP. Compartilhar não cria contribuição, vínculo ou tarefa.

Docker local: timeout objetivo de resposta do engine em 15 s. Nenhum restart
ou limpeza de containers alheios foi tentado. C: sem espaço exigiu TEMP/cache
em D: e dependências próprias na cópia isolada; Turbopack recusara a junction
fora da raiz. Sem alteração de produto para contornar essas falhas. O checkout
original e os artifacts anteriores foram preservados.

Aparelhos reais, Safari/Firefox, tecnologia assistiva real, folha nativa do SO,
recebimento em apps terceiros e ensaio humano: NOT_RUN. Observatórios de
transporte, território, panorama e demais detalhes especializados continuam
fora desta adoção focal. V1 e operação pública não estão certificadas.

Quality intermediário `37799177341` falhou no novo teste do diagnóstico:
a fixture negativa de histórico vazio lia o artifact do cenário anterior,
porque o shell bloqueia antes de gerar outro. Corrigiu-se o isolamento de
cada cenário e passou-se a exigir ausência de artifact nessa falha antecipada.
O bloqueio de histórico vazio e desconhecido não mudou; não foi erro de produto
nem dispensa de schema. Validação Linux final deve ser julgada pelo novo SHA.

### Candidato funcional desta continuação

SHA: `15a31d79d8ddd179a79e9c6f552f6730c43def3b`.

- PASS: 32 Vitest focais (projeção comum, snapshots de rios/energia, privacidade,
  autorização negativa por flag/fonte e data ausente).
- PASS: 21 Node do patch read-only Quality; três Node de coerência, diagnóstico
  e execução portátil do classifier (seis cenários positivos/negativos internos).
- PASS: 36 casos de navegador na suíte focal antes da última correção visual;
  após ela, os quatro casos especializados foram reexecutados e passaram,
  inclusive axe do cabeçalho, Clipboard API real, mobile/desktop, fontes e Back.
  Os outros 32 casos têm código funcional inalterado pela correção de contraste.
- PASS: quatro casos de indisponibilidade com foundation desabilitada (404,
  nenhum metadado público ou heading anunciado). A última correção visual não
  altera esse reader/gate.
- PASS: build de produção final, TypeScript, ESLint completo e focal, Prettier
  dos arquivos alterados e git diff --check.
- NOT_RUN local: harness POSIX completo do workflow e PostgreSQL descartável
  do #522 nesta rodada (Docker sem resposta). A prova portátil não substitui
  o shell Linux nem o banco; ambos têm evidências anteriores e novo CI em curso.
- NOT_RUN: navegador remoto protegido, aparelhos reais, Safari/Firefox, ensaio
  humano, integração de destinatário externo e tecnologia assistiva real.

A fonte do diagnóstico, asserts negativos, runtime e tests estão nesse SHA.
O checkpoint seguinte altera somente roadmap/relatório e solicita Preview pelo
mecanismo Git existente. Preview, checks e seus artifacts exatos ficam no corpo
do #523 e no manifesto externo de prova, sem outro commit só para registrar o
próprio SHA. O PR permanece draft enquanto houver bloqueios aplicáveis.

### Reconciliação do checkpoint `13beb078`

O Preview Git `dpl_BXtprBej18W6KF4rkiqs1Pp528A2` ficou READY para
`13beb078c6c2b61bc87998d85c7ad3fccb7d3352`; GitHub Deployment `6939835496`,
`environment=Preview`, status `success`, URL HTTPS Vercel. COST-02 passou na
run `37801806979`. Essas provas pertencem a esse checkpoint, não ao seguinte.

O CI de coerência `37801807231` encontrou uma falha de teste introduzida pela
formatação do componente: a frase obrigatória sobre ausência de tempo real
foi quebrada em duas linhas no JSX. O texto permanece renderizado. O teste
agora normaliza whitespace antes de exigir a mesma frase; não remove requisito
nem altera produto, snapshot ou fingerprint. A suíte remota anterior registrou
1.479 PASS / 1 FAIL; não é uma execução verde.

A execução local completa inicialmente encontrou cinco falhas adicionais de
checkout CRLF em quatro contratos preexistentes. Os arquivos correspondentes
foram restaurados byte a byte dos blobs Git, inclusive duas migrations, sem
alteração de conteúdo versionado. A nova execução passou: 1.480 testes / 251 arquivos, zero skipped. O log está no pacote
externo de evidências; não se alteraram expectativas para acomodar hashes.

O harness POSIX do diagnóstico passou em quatro testes por uma cópia externa
adaptada para Git Bash/Windows e transporte de Git simulado equivalente. Isso
não substitui Linux remoto nem prova PostgreSQL/RLS. Quality `37801807033`
ainda executava reset local na consulta; nenhum rerun foi solicitado. A migration
Escola permanece bloqueante. O próximo checkpoint inclui somente correção do
teste e este registro, e solicita um novo Preview exato.
