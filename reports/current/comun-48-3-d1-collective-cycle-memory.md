# COMUN 48.3-D1 — Memória coletiva do ciclo

Data: 14/08/2026

Baseline funcional: `cc8899d4e28324e607891a01866c19fb7b8802bc`

Exact main ativado: `769f7bc1b0da029daa1cbbfa404237d1fc373a6c`

Estado final: `COMUN_48_3_D1_COLLECTIVE_CYCLE_MEMORY_GREEN_CANONICAL_PUBLIC_NARRATIVE`.

## Resultado

A Pauta Viva ganhou uma memória pública, read-only e por capítulos das estruturas canônicas já existentes. Não foi criada tabela, migration, rota, API, índice, feed ou objeto social novo. A narrativa organiza o ciclo como: A questão → O que aprendemos → Como a conversa avançou → O que decidimos → O que fizemos → O que aconteceu → O que aprendemos depois → E agora.

Pautas ativas preservam questão, próximo passo e Roda/Ação atuais no topo; a memória aparece abaixo como “O caminho até aqui”. Pautas resolvidas ou arquivadas priorizam “O que aconteceu com esta pauta?”. Estados incompletos têm copy própria e nunca são apresentados como se nada tivesse acontecido.

## Fontes canônicas e causalidade

- Pauta pública e evidências `public_safe` aprovadas, incluindo `PublicEvidenceCitationV1` versionada;
- Rodas B1 e exatamente uma síntese `published` válida por rodada;
- decisão `published` ligada pelo action cycle público;
- Ações C1 públicas, updates públicos, forwarding público e assets revisados;
- resultados públicos com estado de verificação preservado;
- memória de Ação somente quando `memory_published_at` existe;
- Dossiê somente como síntese editorial derivada.

Roda e Ação que apenas compartilham a mesma Pauta recebem `same_pauta_context`; causalidade só é afirmada quando o action cycle contém vínculo explícito. Resultados `pending`, `disputed`, `verified` e `superseded` são, respectivamente, apresentados como em verificação, contestados, confirmados ou omitidos da narrativa vigente.

`comun_search_documents` permanece exclusivamente como camada de descoberta. O teste descartável introduziu um índice divergente e provou que ele não entra na memória nem substitui a fonte canônica.

## Privacidade, limites e performance

- zero Relata bruto, contribuição pending, contato privado, ID de Auth, nota de moderação, responsável interno, storage path ou URL privada;
- loader server-side em lote: até 8 ações, 6 updates públicos por ação e 6 assets públicos por memória;
- nenhum algoritmo de relevância, ranking, IA, correlação ou deduplicação textual;
- flag fail-closed `COMUN_PAUTA_CYCLE_MEMORY_ENABLED`;
- OFF preserva A1+B1+C1; ON habilita somente a narrativa dentro da Pauta;
- página SSR do cenário local: 39.962 bytes, 7.443 bytes em gzip;
- smoke de navegador: 18 requests, todos no host local, sem acesso runtime a fonte externa;
- inspeção desktop 1440×1000 e mobile 390×844 sem corte ou overflow;
- contraste do estado tocado elevado para pelo menos 4,5:1.

## Preflight, descartável e validação

- preflight remoto metadata-only em `begin read only`: run `31772092012`, verde;
- remote plan: `migrationCount=0`, com external ledger histórico de Calçadas preservado;
- prova descartável Pauta → Roda → síntese → decisão → Ação → update → resultado → memória, índice de busca divergente e rollback integral: run `31772092045`, verde;
- 183 arquivos de teste e 936 testes unitários verdes no fechamento operacional;
- 24 testes focais de memória/ações e 3 contratos de rollout verdes no candidato funcional;
- `typecheck`, `lint` e build Next.js com 129 páginas verdes;
- migration diff vazio;
- nenhuma string privada proibida no HTML inspecionado.

## Promoção exact-head

| Escopo | PR | Head | Merge |
| --- | --- | --- | --- |
| implementação D1 | `#314` | `64af882c804bc2391e2b06691294cd5e0a2325bc` | `0fbfb17b5b8a481e045e08c16426561fd1501318` |
| fechamento de contraste | `#315` | `167851b100d207ecd062e57a84cb1b3e5e6ffcac` | `4b7dd3275973e8fef51671de17e2a12a192f3f70` |
| compatibilidade do marcador Pautas | `#316` | `f293da738b84e6f12f820ae49121d0ff79cb9ae9` | `02bd6613d55824e137a63a902406def0ad284bc1` |
| compatibilidade do marcador Ações | `#317` | `11d89918a9a3069029866d9f4b43c01f4029caa5` | `611528e32ea5c16909a38fb36ee96bd2038d6419` |
| resiliência focal a SIGSEGV do Chromium | `#318` | `ff034a5bf53f26aef66e3ad26ae6d95b9f0bf1d5` | `769f7bc1b0da029daa1cbbfa404237d1fc373a6c` |

As correções `#316` e `#317` preservaram os marcadores relacionais legados nas experiências canônicas já ativas, sem reabrir arquitetura. O workflow Core Journeys apresentou duas quedas não determinísticas do Chromium headless shell: a primeira após 34/35 jornadas, a segunda em outra suíte depois de 35/35 jornadas e das provas remotas. A `#318` adicionou uma única repetição estritamente condicionada a signal 11/SIGSEGV; falha funcional não repete e uma segunda queda permanece vermelha. O post-merge do exact main concluiu verde nos runs `31784989058` (Core Journeys), `31784989065` (Quality), `31784989077` (Civic Graph) e nos runs CI `31784989091`/`31785054101`.

## Rollout Production read-only

- flags-off: run `31785572587`, verde, `COMUN_48_3_D1_FLAGS_OFF_PRODUCTION_GREEN`;
- wave 1: run `31785805806`, verde, `COMUN_48_3_D1_WAVE1_CANONICAL_MEMORY_PRODUCTION_GREEN`;
- versão pública comprovada: `769f7bc1b0da029daa1cbbfa404237d1fc373a6c`;
- smoke final GET-only: `/comun/pautas/calcadas-em-circulacao=200`;
- “O caminho até aqui”, “A questão” e “E agora?” presentes;
- `DIVERGENT_SEARCH_INDEX_SENTINEL` ausente;
- marcadores privados proibidos ausentes;
- `productionRequests=GET_ONLY`;
- `businessWrites=0`;
- nenhuma fixture, publicação automática ou escrita de negócio.

Preservados: Pautas Vivas A1, Rodas B1, Ações C1, Panorama 48.2-F, piloto Motorola pausado, auto-publicação OFF e `launch_publicly=false`.

O próximo tijolo 48.3-E1 não foi iniciado.
