# Objetivo final e roadmap auditado do COMUN

Base de produção conferida em 06/10/2026: `4c896f50007c5d0f20783beb40d61a16f265c6cc`, após o PR #502. A reconciliação de 02/10 e os achados intermediários abaixo são históricos. A V1 continua incompleta; a situação atual e a fila sem amostra humana estão na seção seguinte.

## Posição geral e fila sem amostra humana — 06/10/2026

O produto está no fechamento técnico e operacional da V1, antes do ensaio integrado e do lançamento integral. Quatro domínios estão declarados verdes e seis continuam abertos; isso não representa 40% de conclusão. A visão futura e as entregas candidatas devem ser acompanhadas separadamente do que está integrado em produção.

| Camada                                           | Situação conferida                                                                                                                                             | Próximo trabalho sem amostra humana                                                                                          | Dependência preservada                                                                                                                                       |
| ------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Núcleo, identidade, ciclo pauta–ação e operações | Quatro domínios declarados verdes; critérios e provas históricas mantidos                                                                                      | Regressões, permissões e contratos da versão candidata                                                                       | Validação do ciclo integrado com pessoas reais                                                                                                               |
| Miniapps / Calçadas, 47.5                        | Motor disponível; foco de ficha e filtros corrigido nos PRs #500 e #502; 45 casos MapLibre passaram no #502, um caso exclusivo de mobile foi pulado no desktop | Corrigir recorte temporal e manter testes de lista/mapa e datas inválidas                                                    | Fechamento do piloto com janela e denominadores originais                                                                                                    |
| Memória, rádio e arte, 47.6                      | Conteúdo autorizado ainda exige evidência; PR #436 permanece aberto para identidade editorial da publicação da Rádio                                           | Reconciliar o candidato #436 com a base atual, testar revisão obsoleta e transação antes de integrar                         | Direitos, consentimentos e curadoria reais                                                                                                                   |
| Segurança e recuperação, 47.8/47.8A              | Controles internos e contratos não comprovam cópia durável ou restore                                                                                          | Verificar ferramentas e procedimentos de exportação/restauração em ambiente descartável; separar capacidades não comprovadas | Acesso ao ambiente correto, capacidade contratada e cópia independente; não é uma dependência de amostra humana, mas também não se resolve apenas com código |
| Coerência, busca e qualidade, 47.9A/B/C          | CI do #502 passou; busca lexical preservada; embeddings reais continuam bloqueados por capacidade do provedor                                                  | Regressões, semântica de filtros, estados vazios, fallback e contratos automatizados                                         | Dispositivos físicos, tecnologia assistiva, compreensão humana; credencial do provedor para embeddings                                                       |
| Conteúdo e governança, 47.10                     | Revisão editorial e equipe operacional ainda não comprovadas                                                                                                   | Manter ajuda, fluxos de revisão, retenção e critérios de evidência consistentes com o comportamento real                     | Pessoas responsáveis, substitutos, direitos e prazos confirmados                                                                                             |
| Ensaio e lançamento, 47.11                       | Ensaio integrado incompleto; gate integral fechado                                                                                                             | Preparar instrumentos de coleta, verificações sanitizadas e pacote por versão                                                | Três sessões reais, estabilidade medida e decisão final                                                                                                      |
| Escola COMUN R0                                  | PR #503 aberto, head `a8dbe550583526eae631deafa3c574fbcfb18993` na consulta; 24 micro-missões candidatas, progresso privado, flag desligada                    | Finalizar checks globais e validar integração no schema canônico antes de ativar                                             | Ambiente COMUN identificado e revisão humana do material; testes locais não comprovam ativação                                                               |
| Fábrica COMUN 49-D                               | Frente pós-V1 aceita; integração canônica documentada, sem rota, flag, schema ou ativação própria nesta base                                                  | Preservar Escola, comunidades, Pautas/Ações/Tarefas, Minha Participação e Observatórios como raízes; preparar piloto manual   | Escola R0 estabilizada para prática; competências compartilhadas antes de perfil público; demanda real antes de qualquer schema fabril                          |
| Serviços Públicos                                | PR documental #434 aberto; expansão fora do fechamento V1                                                                                                      | Revisar arquitetura e limites da proposta separadamente                                                                      | Decisão de escopo posterior; sem expansão automática                                                                                                         |

### Evidência técnica já integrada

- PR #500: navegação por teclado da ficha de Calçadas e isolamento dos tipos gerados pelo build de desenvolvimento.
- PR #501: jornadas centrais usam o Chromium completo; o problema de criação do contexto headless foi corrigido. O timeout anterior de Participar → Pautas teve causa não isolada e não foi atribuído a esse crash.
- PR #502: filtros mobile recebem foco, Escape/fechamento devolvem ao acionador e Limpar devolve à busca preservando lista/mapa. CI do candidato: 45 casos MapLibre aprovados e um skip de desktop explícito. Pós-merge: 35 jornadas públicas, cinco testes de acessibilidade, 30 PWA e nove de performance passaram; 95 checks do merge terminaram em success/skipped.
- Viewports de CI não substituem Android/iOS físicos ou tecnologia assistiva. Essas provas não promovem os seis domínios abertos nem autorizam `launch_publicly`.

### Correção candidata nesta rodada

O filtro de Calçadas derivava o relógio da maior `last_observed_at`: um conjunto inteiro de registros antigos continuava parecendo recente. A correção usa o instante fornecido pelo servidor ao carregar a página e mantém a referência estável durante os filtros, sem divergência entre HTML e hidratação. Recarregar a página renova o instante. Os recortes são inclusivos de zero a 30/90/365 dias, excluem datas futuras, ausentes ou inválidas quando o período está ativo e não alteram os dados nem a janela do piloto. Sem período, todos os registros continuam elegíveis para os demais filtros. A suíte de navegador usa datas fixas apenas no build descartável de CI.

A existência desta correção no documento não comprova merge ou deployment: conferir o PR e seu SHA antes de declarar publicação. Os PRs #503, #436 e #434 também não contam como entregas integradas nesta base.

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

## Roadmap pós-V1 canônico — organização, Escola e Fábrica

As frentes abaixo não alteram o gate de lançamento da V1. Trabalho de contrato, documentação e protótipo isolado pode avançar em paralelo, mas ativação pública, migrations e novos domínios de dados respeitam as dependências explícitas.

| Bloco | Entrega | Reuso obrigatório | Critério para avançar |
| --- | --- | --- | --- |
| 49-A — Núcleos permanentes | Tornar explícita a organização durável de pessoas por responsabilidade, sem transformar grupo de trabalho temporário em estrutura permanente | comunidades, memberships, papéis auditáveis, Minha Participação | núcleo real operando com responsáveis e revisão; nenhuma autorização derivada de texto livre de `scope` |
| 49-B — Ciclo estratégico | Objetivos, hipóteses, revisão e aprendizagem política ligados ao ciclo pauta → ação → resultado → memória | Pautas, Rodas, Ações, Tarefas, Resultados e Memória | um ciclo real completo sem duplicar ação, tarefa ou resultado |
| 49-C — Escola COMUN | Formação prática progressiva; R0 atual é a primeira implementação técnica | Auth comunitária, Pauta/Tarefa, Minha Participação, revisão editorial | R0 integrado e ensaiado; depois competências com evidência, mentoria/formador-aprendiz e extensões tipadas |
| 49-D — Fábrica COMUN | Converter problemas reais em prática, projeto, protótipo, teste, solução aberta e capacidade comunitária | Escola, perfis/Minha Participação, comunidades, grupos, Pautas, Ações, Tarefas, Observatórios e Memória | piloto prova demanda e reuso antes de schema fabril; nenhuma segunda hierarquia social ou educacional |

### 49-D — sequência da Fábrica COMUN

**49-D0 — Contrato canônico e experiência.** A Fábrica é um módulo do COMUN, não um segundo sistema. Entrada pública futura: “Tenho um problema”, “Quero fazer” e “Quero aprender”. Nenhuma dessas portas cria automaticamente uma nova raiz social. O contrato detalhado está em [comun-fabrica-canonical-integration.md](comun-fabrica-canonical-integration.md).

**49-D1 — Piloto operacional sem novo schema fabril.** Executar casos reais usando Pauta/Tarefa/Ação e Escola onde couber; registrar manualmente custo, risco, versões e resultado. Gate mínimo: 10 casos iniciados, 5 resolvidos e documentação suficiente para descobrir quais metadados fabris realmente não cabem nas estruturas existentes. O checkpoint ampliado permanece FC-MVP-25: 25 casos, 15 resolvidos, 5 projetos abertos, 3 operadores autônomos, 1 escola, 1 projeto de acessibilidade, 1 tecnologia ambiental e 1 solução reutilizada.

**49-D2 — Extensão mínima orientada por evidência.** Somente após o piloto, considerar estruturas especializadas para estado técnico do caso, versões de projeto/BOM e rastreabilidade. Essas estruturas devem apontar para objetos canônicos e nunca duplicar Pauta, Ação, Tarefa, Resultado, Comunidade, progresso da Escola ou identidade.

**49-D3 — Operação física.** Máquinas, filas, materiais, manutenção, instalações, falhas e segurança. Dados operacionais de máquina não viram reputação social; risco técnico possui gate humano próprio.

**49-D4 — Rede distribuída.** Nós parceiros e capacidades externas, replicação de soluções e encaminhamento para quem consegue fabricar. Só promover depois de existir demanda que justifique coordenação multi-nó.

### Contrato de integração da Fábrica

- **Escola:** cursos/trilhas da Fábrica usam o catálogo e o progresso compartilhados da Escola; não existe “curso da Fábrica” em banco paralelo. A prática real pode apontar para trabalho canônico e, quando necessário, para evidência fabril tipada posterior.
- **Perfis e competências:** competência é evidência derivada de prática revisada e participação em trabalho real, privada por padrão. Não criar ranking, XP público ou autoatribuição como prova de capacidade. Exposição pública exige escolha explícita.
- **Comunidades:** `comun_communities`, memberships e grupos existentes continuam sendo a organização social. Projetos da Fábrica podem pertencer a uma comunidade; equipe temporária usa grupo/tarefa. Um futuro Núcleo Fábrica pertence ao 49-A, não a uma tabela social nova.
- **Pautas, Ações e Tarefas:** o problema coletivo continua em Pauta; execução concreta continua em Ação/Tarefa. “Caso FC” é, no máximo, especialização operacional para fabricação e não substitui esses objetos.
- **Observatórios:** podem detectar demanda e receber resultados medidos. A Fábrica fabrica instrumento ou intervenção; não passa a ser dona do dataset ambiental, urbano ou de serviço público.
- **Memória/Acervo:** resultado, falha, versão e aprendizagem retornam ao ciclo de memória. Arquivos técnicos abertos podem ter projeção pública própria, mas direitos, retenção e publicação seguem os contratos existentes.
- **Minha Participação:** é o centro pessoal para missões, práticas, tarefas e projetos assumidos; não criar dashboard pessoal concorrente.
- **Segurança:** peças de risco, máquinas e instalações têm revisão humana e limites de responsabilidade. A Fábrica não usa gamificação para empurrar alguém a executar trabalho inseguro.

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
