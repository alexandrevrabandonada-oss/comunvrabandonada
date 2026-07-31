# Busca Viva e Inteligência Cívica transversal

Data da decisão: 31/07/2026. Este é o contrato canônico do Tijolo 47.9B. A inteligência é infraestrutura de compreensão, descoberta e navegação; não é personagem, moderador, autoridade política, feed nem executor de ações.

## Diagnóstico das fontes

| Fonte               | Projeção pública                              | Busca anterior       | FTS                | Semântica               | Relações                    | Permissão                    | Lacuna preservada                                                   |
| ------------------- | --------------------------------------------- | -------------------- | ------------------ | ----------------------- | --------------------------- | ---------------------------- | ------------------------------------------------------------------- |
| comunidades         | nome, descrição pública                       | `ILIKE`              | título/corpo       | seções públicas         | território/pauta futura     | ativa                        | vínculos e membros não entram                                       |
| pautas              | título, síntese e campos `*_public`           | `ILIKE`              | português          | título/resumo/seção     | território, ação, resultado | `visibility=public`          | contribuições não aprovadas não entram                              |
| territórios         | nome, resumo e localização aproximada         | `ILIKE`              | português + bairro | título/resumo/seção     | pauta                       | público e não arquivado      | coordenadas, geometria e notas não entram                           |
| ações               | objetivo e orientação públicos                | `ILIKE`              | português          | título/resumo/seção     | pauta/território/resultado  | `visibility=public`          | equipe, risco e local privados não entram                           |
| protocolos públicos | nenhum na V1                                  | fora da busca        | não                | não                     | schema preparado            | publicação explícita ausente | número/resposta integral podem identificar; não indexar             |
| respostas públicas  | resumo em resultado publicado                 | indireta             | via resultado      | via resultado           | ação/pauta                  | `visibility=public`          | resposta institucional integral não entra                           |
| resultados          | campos públicos e evidência resumida          | `ILIKE`              | português          | título/resumo/resultado | ação/pauta/território       | `visibility=public`          | notas e autoria interna não entram                                  |
| Calçadas            | nome, resumo, bairro e localização aproximada | resultado-ferramenta | português          | título/resumo           | pauta/território/resultado  | `visibility=public`          | geometria precisa, pessoa e complementos não entram                 |
| Acervo              | item e coleção publicados                     | `ILIKE`              | português          | título/resumo/seção     | memória/território          | publicado + público          | original, autorização, notas e object key não entram                |
| Rádio               | programa e episódio publicados                | `ILIKE`              | português          | título/resumo/seção     | pauta/território            | publicado                    | áudio privado, consentimento e transcrição não publicada não entram |
| Arte                | obra publicada ligada a item público          | `ILIKE`              | português          | título/resumo/seção     | território/Acervo           | dupla condição publicada     | local privado, processo, autorização e original não entram          |

Classificação de saída: somente `public_projection` pode ser sincronizada. Conteúdo restrito, privado, rejeitado ou sem regra explícita de publicação é `non_indexable`. Somente a projeção pública sanitizada pode chegar ao modelo. Contatos, Inbox, notas, originais, localização precisa, consentimentos, referências de autorização, sessões, tokens e respostas integrais nunca deixam o banco por este domínio.

## Capability observada

| Capacidade                | Local                                                                     | Projeto remoto allowlisted                       | Decisão                                     |
| ------------------------- | ------------------------------------------------------------------------- | ------------------------------------------------ | ------------------------------------------- |
| PostgreSQL                | 17.6                                                                      | 17.6                                             | compatível                                  |
| FTS `portuguese`/`simple` | presente                                                                  | presente                                         | adotar                                      |
| `vector`                  | 0.8.0 disponível, não estava ativa                                        | 0.8.0 disponível, não estava ativa               | migration aditiva                           |
| `unaccent`                | 1.1 disponível                                                            | 1.1 disponível                                   | migration aditiva                           |
| `pg_trgm`                 | 1.6 disponível                                                            | 1.6 disponível                                   | tolerância lexical conservadora             |
| `pgmq`                    | 1.5.1 disponível                                                          | 1.5.1 disponível                                 | adiar; fila focal já usa lock transacional  |
| `pg_cron`/`pg_net`        | disponíveis                                                               | disponíveis                                      | não ativar sem scheduler necessário         |
| Edge Functions            | runtime local/hosted                                                      | disponível; nenhuma função anterior              | função focal autenticada                    |
| inferência nativa         | `Supabase.ai.Session`                                                     | incluída no runtime                              | testar com conteúdo sintético público       |
| modelo                    | `gte-small`                                                               | único modelo documentado                         | versão fixa; geração não usa este contrato  |
| dimensão                  | deve ser medida                                                           | 384 exigida e validada em runtime                | divergência falha fechada                   |
| idioma declarado          | inglês                                                                    | inglês                                           | risco explícito para português; eval decide |
| limites Free              | runtime: 150 s wall, 2 s CPU e 256 MB; 500 mil invocações/mês sem overage | plano observado `free`; saldo de uso não exposto | lotes de 16, timeout e ensaio limitado      |

Fontes primárias consultadas em 31/07/2026: [modelos de IA em Edge Functions](https://supabase.com/docs/guides/functions/ai-models), [geração de embeddings](https://supabase.com/docs/guides/ai/quickstarts/generate-text-embeddings), [embeddings automáticos](https://supabase.com/docs/guides/ai/automatic-embeddings), [extensões](https://supabase.com/docs/guides/database/extensions), [filas](https://supabase.com/docs/guides/queues), [limites de Edge Functions](https://supabase.com/docs/guides/functions/limits) e [preços/quota de Functions](https://supabase.com/docs/guides/functions/pricing). A documentação declara `gte-small` exclusivamente para inglês; nenhuma relevância em português é presumida.

Resultado de capability só pode ser `COMUN_CIVIC_AI_PROVIDER_CAPABILITY_VERIFIED` depois de uma invocação remota real com dimensão validada. Disponibilidade no catálogo, sozinha, não basta.

## Arquitetura e contratos

`unifiedPublicSearch` continua sendo o primeiro resultado e o fallback. A migration cria `comun_search_documents`, `comun_search_sections`, `comun_search_embedding_jobs`, métricas agregadas, FTS, HNSW e RPC híbrida. As fontes continuam canônicas e a projeção é apagável/reconstruível.

Cada documento guarda domínio, tipo, chave da fonte, versão, rota canônica, título, resumo, texto público allowlisted, pauta, território, estado, data, idioma, visibilidade, escopo, checksum, modelo/versão, estado e sincronização. Chaves de objetos, URL assinada, ID de pessoa e campo privado são ausentes por construção.

Segmentação V1: título, resumo e seção, no máximo 4.000 caracteres por seção. Título e rota são preservados como contexto. Markup, navegação e repetição não são copiados. Uma troca de modelo ou dimensão deixa embeddings obsoletos e exige reindexação explícita.

O fluxo é idempotente: releitura pública → checksum → upsert → remoção quando deixa de ser público → fila deduplicada → claim com `FOR UPDATE SKIP LOCKED` → lote de até 16 → dimensão → persistência condicional ao checksum → conclusão. Falha aplica espera limitada; cinco tentativas encerram como falha. Não há retry cego nem bloqueio global por um documento.

Embeddings e geração são contratos separados. `SupabaseNativeEmbeddingProvider` usa somente a função focal. O provider de geração nasce desativado; `COMUN_CIVIC_GROUNDED_ANSWERS_V1=disabled` é o estado obrigatório. Não há chat, conversa salva, tool calling ou mutação.

## Ranking explicável

1. igualdade exata normalizada;
2. prefixo de título;
3. FTS em português com `unaccent`;
4. grafia aproximada conservadora;
5. vetor opcional;
6. pauta, território, estado e data como filtros/contexto;
7. fusão RRF com constante 60.

Um resultado exato sempre precede a semântica. O retorno expõe somente “correspondência exata”, “título correspondente”, “termos relacionados”, “grafia aproximada”, “mesma pauta”, “mesmo território” ou “relacionado pelo significado”; score vetorial, embedding, SQL e ID interno não saem da função.

Cliques, popularidade, curtidas, permanência, engajamento, conta e histórico individual não participam do ranking.

## Intenções e Memória Viva

O catálogo possui 13 intenções: registrar Calçada; acompanhar participação; contribuir com pauta; encontrar tarefa; solicitar entrada; enviar fotografia; propor Rádio; enviar obra; registrar resposta institucional; encontrar resultado; pedir correção; pedir retirada; encontrar ajuda. Regras exatas vêm primeiro. Somente `navigate`, `prefill_filters` e `open_help` são aceitas; todas as rotas começam em `/comun`, são existentes e allowlisted. Ambiguidade oferece opções, login é explicado e nenhuma mutação ocorre.

Memória Viva usa templates e dados estruturados para “O que mudou?”, “O que aconteceu depois?”, “O que ainda falta?”, “O que já tentamos?” e “Quais processos tiveram resultado?”. Cada item carrega data, estado, tipo e rota da fonte. Ausência de evidência produz ausência de narrativa.

Relacionados são no máximo quatro, explicados e não comportamentais. Duplicidades são somente sugestão administrativa futura; não fundem, excluem, rejeitam nem publicam.

## Privacidade, segurança e RLS

Consultas brutas não são persistidas, associadas à conta, incluídas em logs/artifacts ou usadas para personalização. Rate limit usa somente hash efêmero de rede já existente, com janela de um minuto. Métricas permitidas são contagem, faixa de tamanho/latência, tipo, zero resultado, fallback, erro, confiança e versão.

| Recurso             | anon                               | auth sem vínculo         | membro/outra comunidade/coordenador/operador/admin/revogado | service role                |
| ------------------- | ---------------------------------- | ------------------------ | ----------------------------------------------------------- | --------------------------- |
| documentos/seções   | sem leitura direta                 | sem leitura direta       | sem leitura direta                                          | leitura/escrita server-side |
| embeddings          | invisíveis                         | invisíveis               | invisíveis                                                  | worker focal                |
| jobs                | invisíveis                         | invisíveis               | invisíveis                                                  | claim/complete/fail         |
| métricas            | invisíveis e sem escrita           | invisíveis e sem escrita | observabilidade sanitizada só via servidor admin            | agregação                   |
| RPC pública híbrida | execução, somente projeção pública | idem                     | idem; revogação não muda o escopo público                   | execução                    |
| RPCs privilegiadas  | negadas                            | negadas                  | negadas                                                     | execução                    |

Todas as tabelas têm RLS, nenhum policy de leitura direta e grants explícitos mínimos. Funções privilegiadas são `security definer`, `search_path` fixo e executáveis só por `service_role`. A RPC pública filtra no banco por `public_projection/public`; nunca recupera tudo para filtrar na aplicação. Fixtures provam rejeição de outro escopo. Resultado esperado: `COMUN_CIVIC_SEARCH_PERMISSION_BOUNDARY_GREEN`.

Ameaças cobertas: prompt injection é tratado como dado; HTML não é gerado; payload, dimensão e rota são validados; jobs são deduplicados; checksum impede persistir embedding obsoleto; timeout mantém lexical; rate limit contém flood; RLS impede exfiltração/enumeração; URLs externas são rejeitadas; logs e artifacts não contêm consulta, conteúdo, prompt, vetor, chave ou usuário.

## Interface e pilotos

`/comun/buscar` mantém Busca como ação principal, filtros e URL. Lexical aparece no HTML inicial. Enriquecimento tem estado anunciado, timeout de 1,8 s (aborto do cliente em 3 s), fallback honesto e botão “Usar somente termos”. Nenhum resultado lexical desaparece; a união é deduplicada. Origem, motivo, data e rota ficam visíveis. Não existe chat, avatar, feed infinito ou animação contínua.

Os pilotos só aparecem com `?inteligencia=busca-viva`: Home oferece campo e exemplos sem feed; pauta oferece memória/relacionados; Central abre busca pública separada e somente leitura. A versão padrão do 47.9A não muda.

## Transparência provisória para revisão no 47.10

A busca primeiro procura termos, títulos, bairros e números. Quando disponível, uma segunda camada compara significado apenas com conteúdo já público. Cada resultado abre sua fonte e explica a relação. A camada pode errar ou ficar indisponível; nesse caso a busca tradicional continua. Ela não decide, publica, modera, cria perfil comportamental nem guarda o texto pesquisado. A pessoa pode escolher “Usar somente termos” e relatar resultado incorreto pelo caminho de participação. Este texto não é termo jurídico final.

## Evidência, orçamento e promoção

O corpus versionado possui 20 buscas exatas, 20 semânticas, 20 intenções, 15 erros, 15 ambiguidades, 10 ausências e 10 ataques. Metas: exata Top 3 ≥95%; semântica Recall@5 ≥80%; intenção ≥90%; redirect incorreto, permissão indevida, rota inválida e resposta sem fonte iguais a zero. Ground truth não pode ser ajustado para passar.

A escala local mede 25/50/100/500/1.000 documentos em uma única query com filtros, sem N+1 e cleanup transacional. O orçamento lexical remoto é o baseline anterior +20%; semântica nunca bloqueia o primeiro resultado. O ensaio remoto deve medir modelo real, quota real, indexação, RLS, rate limit, 16 cenários e cleanup antes de qualquer promoção.

Sem pessoas reais, o máximo é `COMUN_CIVIC_INTELLIGENCE_READY_FOR_CONTROLLED_REHEARSAL`. Relevância abaixo da meta resulta em `COMUN_CIVIC_INTELLIGENCE_BLOCKED_RELEVANCE`; indisponibilidade/quota ou limite resulta no blocker correspondente. `GREEN` exige ensaio humano e findings críticos corrigidos.

Pistas preservadas: 47.8A segue bloqueada por recovery point durável e cópia secundária de Storage; 47.9A segue `COMUN_EXPERIENCE_COHERENCE_READY_FOR_USABILITY_REHEARSAL`; `miniapps=in_progress`; `archive_radio_art=evidence_required`; `security_resilience=blocked`; `launch_publicly` não é acionado.
