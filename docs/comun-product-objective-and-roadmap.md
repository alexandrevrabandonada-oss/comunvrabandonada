# Objetivo final e roadmap auditado do COMUN

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
