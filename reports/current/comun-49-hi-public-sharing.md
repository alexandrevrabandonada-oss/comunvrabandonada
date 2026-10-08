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
- Candidato funcional: `14e1db5e0ddd89430d3def9d2a7a7d0e18339034`.
  Tree: `133cfe2dd38c62446ffee5e0215b8420be7f46c0`.
- #522 reconsultado: OPEN, não merged, head
  `bf9eb8ab912ce9442e18e3ec50d2e01dba09a2de`. Seu reparo read-only não está em
  main; o caminho automático pós-merge de Quality não está certificado como
  corrigido em main.
- Árvore original com mudanças preexistentes preservada. Trabalho isolado em
  `D:/COMUN-49H-PUBLIC-SHARING`; a tentativa inicial em C: ficou preservada após
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
Escape e devolve foco; o comando preserva URL/contexto e reinicia seu estado na
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
44 contratos COST-01/COST-02/inventário e 32 casos de navegador passaram.
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

## Próximo passo de produto

Concluir a revisão conjunta #523 + distribuição e adotar a projeção nos
observatórios especializados e demais detalhes públicos, mantendo seus gates.
Depois, ensaiar o link recebido e o retorno em aparelhos reais com pessoas,
antes de declarar distribuição universal ou sucesso de participação. Schema
da Escola, operação editorial, Quality automático e lançamento são decisões e
provas separadas. Mais rotas não encerram a V1 nem comprovam utilidade humana.
