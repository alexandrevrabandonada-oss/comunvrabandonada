# Consolidação da Arte dos Territórios no Acervo

**Data:** 20 de julho de 2026  
**Estado:** implementação concluída e validada localmente

## Resultado

A área pública de Arte dos Territórios foi consolidada sob `/comun/acervo/arte`. O acervo passou a ser a entrada única para fotografia, arte, música, história oral e coleções, enquanto o painel editorial permanece em `/comun/admin/acervo/arte`.

Não houve migração, cópia ou criação de tabelas. As obras continuam armazenadas uma única vez em `comun_archive_items`, especializadas por `comun_archive_artworks` e identificadas por `item_type = territorial_artwork`.

## Arquitetura consolidada

- `/comun/acervo` apresenta uma seção editorial de Arte dos Territórios com até três obras publicadas e estado vazio compacto.
- O catálogo unificado aceita o tipo `territorial_artwork`, rotulado como “Arte territorial”.
- Um helper central determina a URL pública por tipo; obras territoriais sempre abrem a ficha especializada.
- A galeria de arte aceita `q`, `tipo`, `territorio` e `pagina`, preservando os filtros na paginação.
- A consulta pública retorna somente a identificação de territórios públicos e a ficha oferece ligação de volta ao território.
- Busca global, pautas, páginas territoriais, participação e publicação administrativa usam as URLs canônicas.
- “Arte” deixou de ser uma área paralela no rodapé.

## Mapa de rotas

| Rota anterior | Destino canônico |
| --- | --- |
| `/comun/arte` | `/comun/acervo/arte` |
| `/comun/arte/[slug]` | `/comun/acervo/arte/[slug]` |
| `/comun/arte/contribuir` | `/comun/acervo/arte/contribuir` |
| `/comun/arte/criadores/[slug]` | `/comun/acervo/arte/criadores/[slug]` |
| `/comun/arte/direitos-e-retirada` | `/comun/acervo/arte/direitos-e-retirada` |
| `/comun/arte/colecoes/[slug]` | `/comun/acervo/colecoes/[slug]` |

Todos os endereços anteriores respondem com redirecionamento permanente e preservam parâmetros de consulta. A rota genérica de um item territorial também redireciona para a ficha especializada, evitando duas páginas públicas para a mesma obra.

## Segurança e regras editoriais

- Originais privados, contatos, notas internas e revisão de segurança não foram incorporados às projeções públicas.
- Territórios somente são expostos quando possuem visibilidade pública.
- Permanecem vigentes os fluxos de autoria, créditos, direitos, retirada, menores, local sensível e derivadas públicas.
- Obras não publicadas continuam invisíveis.
- Nenhuma fixture foi criada e nenhum dado de produção foi alterado.

## Validação executada

| Verificação | Resultado |
| --- | --- |
| ESLint | aprovado |
| TypeScript | aprovado |
| Build Next.js | aprovado, 91 páginas geradas |
| Testes unitários | 237 aprovados em 40 arquivos |
| Playwright da vertical de arte | 28 aprovados em 4 larguras |
| Busca por links internos legados | nenhum link ativo para `/comun/arte` |
| Integridade do diff | aprovado por `git diff --check` |

Os testes Playwright cobriram as rotas canônicas públicas, contribuição, direitos e retirada, exigência de autenticação para o painel e participação, não exposição do storage administrativo e preservação dos parâmetros nos redirecionamentos antigos.

## Estado de conteúdo

O estado vazio da galeria continua correto enquanto não houver obras com publicação editorial concluída. A consolidação não promove obras automaticamente e não cria conteúdo sintético em produção.
