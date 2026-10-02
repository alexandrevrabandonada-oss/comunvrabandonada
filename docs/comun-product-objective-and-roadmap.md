# Objetivo final e roadmap auditado do COMUN

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
