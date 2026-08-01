# Inventário e grafo de rotas da experiência V1

Leitura canônica em 1º de agosto de 2026. O núcleo `/comun` contém **189 páginas**.
O auditor verifica o catálogo exato; a tabela abaixo registra as superfícies e
famílias relevantes com decisão de produto. Rotas dinâmicas mantêm seus deep
links atuais. Nenhuma rota é retirada neste tijolo.

Legenda de público: público, pessoal autenticado ou administrativo autorizado.

| rota/família                                    | nome público             | público         | propósito e fonte canônica            | entrada principal / ação principal      | retorno e estado                   | duplicações / deep links                               | decisão                     |
| ----------------------------------------------- | ------------------------ | --------------- | ------------------------------------- | --------------------------------------- | ---------------------------------- | ------------------------------------------------------ | --------------------------- |
| `/comun`                                        | Início                   | público         | orientar e priorizar; hubs públicos   | logo / explorar território              | navegação global; estado editorial | raiz `/` é entrada institucional                       | manter + piloto N2          |
| `/comun/explorar`                               | Explorar                 | público         | agregar caminhos públicos             | rodapé/contexto / abrir recorte         | Início; filtros                    | sobreposição parcial com Home                          | revisar após ensaio         |
| `/comun/buscar`                                 | Buscar                   | público         | busca editorial agrupada              | cabeçalho / buscar                      | Início; query preservada           | alias `/comun/busca`; `?q=&tipo=&pauta=`               | manter                      |
| `/comun/busca`                                  | Buscar                   | público         | compatibilidade                       | deep link / redirecionar                | 308 para Buscar                    | duplicação deliberada                                  | redirecionar                |
| `/comun/territorios` e `[slug]`                 | Territórios              | público         | leitura territorial; central hub      | navegação / abrir território            | lista ou origem                    | slugs compartilháveis                                  | manter                      |
| `/comun/comunidades`                            | Comunidades              | público         | diretório de comunidades              | navegação / abrir comunidade            | Início                             | lista canônica                                         | manter                      |
| `/comun/c/[slug]`                               | Comunidade               | público         | casa organizativa; communities        | lista/território / ver pauta            | comunidade/lista                   | `/participar` é ação contextual                        | manter                      |
| `/comun/c/[slug]/participar`                    | Participar da comunidade | público/pessoal | vínculo moderado                      | comunidade / solicitar entrada          | comunidade; estado explícito       | deep link de convite                                   | manter                      |
| `/comun/pautas`                                 | Pautas                   | público         | listar processos coletivos            | Home/território / abrir pauta           | origem/lista                       | cards em Home não duplicam fonte                       | manter                      |
| `/comun/pautas/[slug]`                          | Pauta                    | público         | processo completo; pauta spaces       | listas/contexto / próxima ação          | trilha comunidade-pauta            | registros e memórias aninhados                         | manter + piloto N1          |
| `/comun/pautas/[slug]/registros/[recordSlug]`   | Registro da pauta        | público         | detalhe revisado                      | pauta/mapa / acompanhar                 | volta à pauta                      | deep link preserva contexto                            | manter                      |
| `/comun/pautas/[slug]/memoria/[memorySlug]`     | Memória da pauta         | público         | consequência preservada               | pauta/resultado / consultar fonte       | volta à pauta                      | deep link                                              | manter                      |
| `/comun/acoes` e `[slug]`                       | Ações                    | público         | ação coletiva e consequência          | pauta/Home / participar                 | pauta/origem e estado              | Agenda é nome evitado                                  | manter                      |
| `/comun/resultados`                             | Resultados               | público         | consequências verificadas             | Home/pauta / abrir processo             | pauta quando disponível            | não confundir com atividade                            | manter                      |
| `/comun/protocolo-popular`                      | Protocolo Popular        | público         | orientar protocolo oficial            | pauta/participar / registrar            | pauta/origem                       | acompanhar usa número do protocolo                     | manter                      |
| `/comun/acompanhar` e `[protocol]`              | Acompanhar protocolo     | público         | status por protocolo                  | confirmação / consultar                 | Protocolo Popular                  | deep link e `/ouvidoria`                               | manter                      |
| `/comun/calcadas`                               | Mapa das Calçadas        | público         | miniapp territorial                   | Home/pauta / registrar calçada          | volta à pauta                      | mapa, lista e filtros                                  | manter                      |
| `/comun/calcadas/registros/[slug]`              | Registro de calçada      | público         | ficha revisada                        | mapa / acompanhar                       | mapa/pauta                         | família antiga compatível                              | revisar consolidação futura |
| `/comun/calcadas/mobilizacao`                   | Mobilização              | público         | participar de ação                    | pauta/mapa / participar                 | Calçadas                           | deep link                                              | manter                      |
| `/comun/calcadas/prioridades`                   | Prioridades              | público         | acompanhar encaminhamentos            | mapa / abrir item                       | Calçadas                           | filtros                                                | manter                      |
| `/comun/calcadas/resultados`                    | Resultados das Calçadas  | público         | consequência e memória                | mapa/pauta / abrir resultado            | Calçadas                           | recorte de Resultados                                  | manter                      |
| `/comun/mapa` e `[slug]`                        | Mapa Popular             | público         | leitura territorial ampla             | Explorar / abrir ficha                  | origem/lista                       | não substitui Calçadas                                 | manter                      |
| `/comun/mapa/contribuir`                        | Registrar situação       | público/pessoal | contribuição situada                  | mapa/pauta / registrar                  | `returnTo` allowlisted             | `origem` e `pauta` preservados                         | manter                      |
| `/comun/mapa/contribuir/confirmacao`            | Registro recebido        | pessoal         | retorno explícito                     | mutation / acompanhar                   | origem preservada                  | deep link pós-envio                                    | manter                      |
| `/comun/acervo` e `[slug]`                      | Acervo                   | público         | memória cultural                      | Home/rodapé / abrir memória             | Acervo/origem                      | subcoleções                                            | manter                      |
| `/comun/acervo/contribuir*`                     | Contribuir com o Acervo  | público/pessoal | submissão moderada                    | Acervo / contribuir                     | Acervo; privacidade explícita      | artista tem rota própria                               | manter                      |
| `/comun/acervo/colecoes*`                       | Coleções                 | público         | agrupamento editorial                 | Acervo / abrir coleção                  | Acervo                             | deep link                                              | manter                      |
| `/comun/acervo/historias-orais*`                | Histórias orais          | público         | memória e voz autorizada              | Acervo / ouvir ou contribuir            | Acervo                             | direitos e retirada próprios                           | manter                      |
| `/comun/acervo/musica*`                         | Música                   | público         | memória musical                       | Acervo / abrir item                     | Acervo                             | Rádio é programação, não duplicação                    | manter                      |
| `/comun/arte*` e `/comun/acervo/arte*`          | Arte                     | público         | arte territorial e catálogo           | Home/Acervo / abrir obra                | origem/coleção                     | duas entradas históricas coerentes por redirect futuro | revisar sem remover         |
| `/comun/radio` e subrotas                       | Rádio                    | público         | programas, grade e episódios          | Home/rodapé / ouvir episódio            | Rádio/pauta                        | contribuir e direitos separados                        | manter                      |
| `/comun/observatorios*`                         | Observatórios            | público         | dados, metodologia e campanhas        | pauta/Explorar / consultar ou registrar | observatório/pauta                 | mapa, dados e campo                                    | manter                      |
| `/comun/dossies*`                               | Dossiês                  | público         | síntese editorial versionada          | pauta/busca / abrir dossiê              | pauta/lista                        | snapshot público                                       | manter                      |
| `/comun/projetos*`                              | Projetos                 | público         | iniciativas ligadas a pauta           | pauta/território / abrir projeto        | origem/lista                       | não substitui ação                                     | manter                      |
| `/comun/participar`                             | Participar               | público         | escolher forma por tempo/consequência | navegação / escolher caminho            | Início/origem                      | sheet contextual aponta aqui                           | manter                      |
| `/comun/relatar*`                               | Relatar                  | público/pessoal | relato rápido                         | Participar / enviar relato              | confirmação                        | ação distinta de registrar                             | manter                      |
| `/comun/entrar`                                 | Entrar                   | público         | autenticação contextual               | ação protegida / entrar                 | `returnTo` allowlisted             | criar/recuperar separados                              | manter                      |
| `/comun/criar-conta`                            | Criar conta              | público         | identidade comunitária                | login/ação / criar conta                | onboarding/origem                  | deep link com `returnTo`                               | manter                      |
| `/comun/recuperar-acesso` e `/redefinir-acesso` | Recuperar acesso         | público         | recuperação Auth                      | login / solicitar ou redefinir          | login                              | tokens nunca aparecem em navegação                     | manter                      |
| `/comun/seguranca`                              | Segurança e privacidade  | público         | explicar fronteiras e direitos        | rodapé/ajuda / entender proteção        | Início                             | auditoria admin é separada                             | manter                      |
| `/comun/ajuda`                                  | Ajuda                    | público         | orientar tarefa, conexão e direitos   | rodapé / escolher um caminho            | Início                             | conteúdo governado será aprofundado no 47.10           | manter                      |
| `/comun/offline`                                | Ajuda de conexão         | público         | estado e recuperação de rede          | banner runtime / tentar novamente       | origem/Início                      | deep link PWA                                          | manter                      |
| `/comun/minha-participacao`                     | Minha área               | pessoal         | acompanhar contribuições e tarefas    | navegação / retomar próxima ação        | origem contextual                  | login preserva retorno                                 | manter                      |
| `/comun/caixa-de-entrada`                       | Caixa de entrada         | pessoal         | avisos acionáveis                     | shell pessoal / abrir item              | origem/Minha área                  | Inbox não é feed                                       | manter                      |
| `/comun/conta*`                                 | Conta e privacidade      | pessoal         | preferências e direitos               | shell / salvar ou solicitar             | Minha área                         | privacidade própria                                    | manter                      |
| `/comun/onboarding`                             | Primeiros passos         | pessoal         | contexto mínimo e progressivo         | cadastro / continuar origem             | `returnTo` allowlisted             | variante mínima Calçadas                               | manter                      |
| `/comun/admin`                                  | Administração            | administrativo  | hub autorizado                        | login / abrir superfície                | Central ou logout                  | nunca na navegação pública                             | manter                      |
| `/comun/admin/operacao*`                        | Central Operacional      | administrativo  | projeção sanitizada de cuidado        | admin / abrir item prioritário          | recorte/filtros preservados        | detalhes e superfícies                                 | manter + piloto N0          |
| `/comun/admin/pautas*`                          | Operação de pautas       | administrativo  | esteira editorial                     | admin/Central / revisar                 | Central                            | contribuições e app                                    | manter                      |
| `/comun/admin/comunidades`                      | Operação de comunidades  | administrativo  | vínculos e moderação                  | admin/Central / revisar pedido          | Central                            | fonte própria                                          | manter                      |
| `/comun/admin/calcadas*`                        | Operação de Calçadas     | administrativo  | moderação, prioridade e piloto        | Central / abrir fila                    | Central                            | operação/piloto/prioridade                             | manter                      |
| `/comun/admin/acervo*`                          | Operação do Acervo       | administrativo  | curadoria, storage e direitos         | Central / abrir pendência               | Central                            | subfilas especializadas                                | manter                      |
| `/comun/admin/radio*`                           | Operação da Rádio        | administrativo  | programação, consentimento e direitos | Central / abrir pendência               | Central                            | programas/episódios/grade                              | manter                      |
| `/comun/admin/acervo/arte*`                     | Operação da Arte         | administrativo  | contribuição, crédito e direitos      | Central / abrir pendência               | Central                            | dentro do Acervo                                       | manter                      |
| `/comun/admin/auditoria`                        | Auditoria                | administrativo  | segurança sanitizada                  | admin/Central / abrir próxima ação      | Central                            | não expõe segredos                                     | manter                      |
| `/comun/admin/observabilidade`                  | Observabilidade          | administrativo  | saúde e evidência                     | admin/Central / investigar              | Central                            | não é auditoria                                        | manter                      |
| `/comun/admin/lancamento`                       | Prontidão de lançamento  | administrativo  | leitura do programa                   | admin / resolver blockers               | Central                            | não aciona gate automaticamente                        | manter                      |
| `/comun/admin/login`                            | Entrada administrativa   | administrativo  | autenticação separada                 | rota protegida / entrar                 | `redirectTo` allowlisted           | não aparece publicamente                               | manter                      |

## Grafo canônico

```text
Início
├─ Território ─ Comunidade ─ Pauta ─ Ferramenta/Ação
│                                  ├─ Contribuição ─ Confirmação
│                                  ├─ Acompanhamento ─ Resultado
│                                  └─ Memória
├─ Participar ─ forma ─ contexto ─ retorno à origem
├─ Buscar ─ tipo ─ entidade ─ contexto
├─ Cultura ─ Acervo/Rádio/Arte ─ pauta/território
└─ Minha área (autenticação) ─ próxima ação/Inbox/tarefa

Admin (fora da navegação pública)
└─ Central ─ recorte ─ item ─ retorno ao mesmo recorte
```

### Diagnóstico

- Alias duplicado confirmado: `/comun/busca` → `/comun/buscar` com query.
- Sobreposições a validar com pessoas: Home/Explorar; Arte/Acervo Arte; Mapa
  Popular/Calçadas; Resultados/Resultados das Calçadas.
- Nenhuma rota pública foi removida.
- Rotas administrativas não aparecem na navegação pública.
- Rotas técnicas ou de contribuição sem entrada global são intencionais e têm
  entrada contextual.
- Becos sem saída críticos encontrados no recorte V1: zero após os retornos da
  pauta, Calçadas e Central. O catálogo automático registra rotas sem link
  estático como “revisar”, não como remoção automática.

## Jornadas comprovadas pelo grafo

1. Descobrir pauta: Início/Território/Buscar → Pautas.
2. Entender pauta: Pauta → estado, problema, evidência e próxima ação.
3. Contribuir: Pauta → ferramenta → formulário → confirmação.
4. Acompanhar: confirmação/Minha área → item e estado.
5. Participar de ação: Pauta/Participar → Ação → tarefa ou presença.
6. Encontrar resultado: Pauta/Home → Resultados → processo de origem.
7. Encontrar memória: resultado/pauta → memória ou Acervo.
8. Registrar Calçada: pauta/Home → Calçadas → registro → confirmação.
9. Conteúdo cultural: pauta/Acervo/Rádio/Arte → contribuir → moderação.
10. Voltar à origem: `returnTo` allowlisted, trilha contextual ou retorno ao
    recorte da Central.
