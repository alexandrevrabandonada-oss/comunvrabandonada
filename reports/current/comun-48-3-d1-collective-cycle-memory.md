# COMUN 48.3-D1 — Memória coletiva do ciclo

Data: 14/08/2026
Baseline: `cc8899d4e28324e607891a01866c19fb7b8802bc`

## Decisão arquitetural

A memória é uma projeção pública, read-only e por capítulos das estruturas canônicas já existentes. Não foi criada tabela, rota, API, índice, feed ou objeto social novo. `comun_search_documents` continua exclusivamente como camada de descoberta e nunca participa de `PublicPautaCycleMemoryV1`.

Fontes canônicas compostas:

- Pauta pública e evidências `public_safe` aprovadas, incluindo `PublicEvidenceCitationV1` versionada;
- Rodas B1 e exatamente uma síntese `published` válida por rodada;
- decisão `published` ligada pelo action cycle público;
- Ações C1 públicas, updates públicos, forwarding público e assets revisados;
- resultados públicos com estado de verificação preservado;
- memória de Ação somente quando `memory_published_at` existe;
- Dossiê somente como síntese editorial derivada.

## Contrato e narrativa

`PublicPautaCycleMemoryV1` organiza: A questão → O que aprendemos → Como a conversa avançou → O que decidimos → O que fizemos → O que aconteceu → O que aprendemos depois → E agora.

Roda e Ação que apenas compartilham a mesma Pauta recebem `same_pauta_context`; causalidade só é afirmada quando o action cycle contém o vínculo explícito. Resultados `pending`, `disputed`, `verified` e `superseded` são, respectivamente, apresentados como em verificação, contestados, confirmados ou omitidos da narrativa vigente.

Pautas ativas preservam questão, próximo passo e Roda/Ação atuais no topo; a memória aparece abaixo como “O caminho até aqui”. Pautas resolvidas/arquivadas priorizam “O que aconteceu com esta pauta?”. Estados incompletos têm copy própria e nunca são resumidos como “nada aconteceu”.

## Privacidade e performance

- zero Relata bruto, contribuição pending, contato privado, ID de Auth, nota de moderação, responsável interno, storage path ou URL privada;
- loader server-side em lote: até 8 ações, 6 updates públicos por ação e 6 assets públicos por memória;
- nenhum algoritmo de relevância, ranking, IA, correlação ou deduplicação textual;
- flag fail-closed: `COMUN_PAUTA_CYCLE_MEMORY_ENABLED`;
- OFF preserva A1+B1+C1; ON habilita apenas a narrativa dentro da Pauta.

## Gates do candidato

- preflight remoto: metadata-only em `begin read only`;
- remote plan esperado: `migrationCount=0`, preservando o external ledger histórico de Calçadas;
- Supabase descartável: Pauta → Roda → síntese → decisão → Ação → update → resultado → memória, search divergente e rollback integral;
- rollout: exact-main, flags-off, wave 1, rollback fail-closed e smoke Production somente GET;
- migration diff: vazio;
- business writes Production: `0`.

## Evidências de fechamento

Este bloco será preenchido após PR, CI, merge exact-head, flags-off e wave 1 em Production. O terminal D1 não deve ser emitido antes disso.

Validação local do candidato:

- 182 arquivos e 932 testes unitários verdes;
- 24 testes focais de memória/ações e 3 contratos operacionais verdes;
- `typecheck`, `lint` e build Next.js com 129 páginas verdes;
- inspeção visual desktop 1440×1000 e mobile 390×844 sem corte ou overflow;
- página SSR com 39.962 bytes (7.443 bytes em gzip) no cenário local;
- 18 requests no smoke de navegador, todos restritos ao host local; zero request runtime a fonte externa;
- nenhuma string privada proibida no HTML inspecionado;
- migration diff vazio.

O próximo tijolo 48.3-E1 não foi iniciado.
