# Release readiness — Sprint 37

## Evidência executada

- instalação determinística: concluída (`npm ci`; 2 vulnerabilidades moderadas registradas, sem `audit fix` automático);
- reset local 1 e migrações: aprovado;
- E2E integrado em desenvolvimento: 15/15, cinco viewports;
- reset local 2, lint do banco, matriz RLS e persistência: aprovados;
- testes unitários: 223/223 em 37 arquivos;
- E2E após segundo reset: 15/15;
- build: aprovado; `/comun/admin/operacao` confirmado dinâmico;
- production-like público: aprovado;
- production-like autenticado: **reprovado** — após cadastro e acompanhamento, o Server Action de contribuição retornou página genérica de erro; o erro de senha também não apresentou a mensagem esperada.

Suites históricas de comunidades, PWA, calçadas e participação não foram reexecutadas isoladamente nesta sprint; sua cobertura residual está representada pelo teste integrado e pelas evidências anteriores, sem alegar nova execução.

Atualização Sprint 37.1: a causa foi corrigida e o percurso production-like foi repetido. Os 10 cenários autenticados/auth passaram nos cinco viewports e os 5 cenários visitantes passaram após alinhar uma expectativa textual do teste. Status técnico local: **READY**. Status de promoção: **NO-GO** pelo gate humano pendente (0/3).

Declarações: piloto **não aberto**; integração na `main`, push e deploy **não executados**; Supabase remoto **inalterado**; R2 real/dados reais **não utilizados**; custo externo **R$ 0**.

## Atualização — Miniapp Mapa Real das Calçadas

O núcleo local da nova rota `/comun/calcadas` passou por lint, typecheck, build, 240 testes unitários, 30 testes E2E em cinco viewports, Axe, `db lint` e `RLS_MATRIX_OK`. A migration foi aplicada em reset local e não usa dados reais ou tiles externos.

**Readiness da vertical:** NO-GO. Permanecem abertos o E2E autenticado editorial completo, proximidade operacional, criação administrativa de prioridades, pacote de pressão, production-like final, regressões históricas e gate humano. Nenhum push ou deploy foi executado.

## Atualização — continuação integral local (20/07/2026)

Separação canônica de readiness:

- **Candidata integrada anterior:** READY técnico local; promoção ainda condicionada ao gate humano histórico.
- **Vertical Mapa Real das Calçadas:** **NÚCLEO GEOESPACIAL LOCAL APROVADO; VERTICAL INTEGRAL AINDA NO-GO**.

Evidência nova: cartografia fixture local com limite, vias, bairros e equipamentos sintéticos; pan, zoom, clustering e filtros em URL; fila editorial de registros e observações; publicação com geometria aproximada ou sem imagem; derivada pública revisada; observações posteriores pré-moderadas. Lint, typecheck, build de 91 páginas e 242/242 unitários passaram.

Continuam abertos: E2E autenticado integral sem skip, criação operacional completa de prioridade/mobilização, pacote sanitizado Markdown/JSON/página, dois resets independentes após o fechamento total, production-like integral, regressões históricas e gate humano 0/3. O marcador final não foi emitido.

Atualização seguinte: prioridade/mobilização mínima e os três formatos do pacote foram implementados; dois resets, RLS, E2E público 30/30, build e smoke `next start` passaram. A lista anterior deve agora ser lida assim: **implementados**, mas ainda sem E2E integral, estão prioridade/mobilização e pacote; **executados parcialmente**, mas sem marcador integral, estão reset duplo e production-like. O gate humano continua 0/3.

Atualização da prova: a regressão do teste autenticado causada por seletores obsoletos foi corrigida. A jornada participante passou 10/10 nas cinco larguras e confirmou cleanup. O readiness integral continua NO-GO porque a execução ainda termina em Minha área/pauta e não percorre a mesma fixture até memória.

Atualização de 20/07/2026: a jornada foi ampliada e passou novamente 10/10 nas cinco larguras, agora cobrindo pela interface a criação autenticada, moderação editorial, publicação com localização aproximada, observação pré-moderada, aprovação, prioridade e pacote público sanitizado em HTML, JSON e Markdown. Lint e typecheck passaram; 244/244 testes unitários passaram. Foi corrigida a revalidação da ficha pública após moderar observações. O estado integral continua **NO-GO**: a mesma execução ainda não alcança protocolo, resposta, resultado e memória, a medição integral em `next start` permanece aberta e o gate humano está em 0/3.

Continuação local: o cenário passou 10/10 novamente após acrescentar o registro de resultado parcial verificado pela Sala de Organização, associado à pauta canônica e exibido no miniapp sem declarar resolução. Protocolo/resposta permanecem dependentes de um relato oficial sem vínculo de interface com a prioridade, e não há ação administrativa de criação da memória específica do ciclo. Como a Sprint 37 proíbe funcionalidade nova, essas lacunas foram mantidas explícitas e o marcador integral continua bloqueado.
