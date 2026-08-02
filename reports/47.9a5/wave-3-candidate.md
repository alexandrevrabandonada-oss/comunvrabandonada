# TIJOLO 47.9A5 — Onda 3 candidate

Data técnica: 2026-08-02

Base: `906f4fe1595b0f3899be96ee0ce7273cc0bf929a`

Branch: `codex/tijolo-47-9a5-admin-civic-editorial`

Estado deste documento: candidate; não emite o resultado parcial nem o resultado terminal do A5 antes dos gates de PR, Preview, merge e Production.

## Contrato entregue

- shell administrativo V2 sob `?experiencia=app-v2`, com fallback legado preservado;
- rail administrativo de nível visual 0, menu compacto e app bar contextual;
- zero bottom navigation de membro e zero footer institucional no shell admin;
- retorno seguro para fila/recorte, com filtros administrativos allowlisted;
- propagação da flag App V2 e deep links preservados;
- um único destino ativo e badges de notificação sanitizados;
- tabelas recebem nome acessível e `scope` quando a página ainda não os declara;
- inputs, tabelas, foco, forced colors e superfícies administrativas recebem gramática comum sem alterar mutations;
- suíte autenticada em 320×568, 390×844, 844×390, 1024×768 e 1366×768;
- sessão expirada, formulários, tabelas, filtro/retorno, Axe e ausência de navegação incompatível cobertos.

## Auditoria integral recalculada

- páginas App Router COMUN: **189**;
- shells: **7/7**;
- admin: **88** páginas;
- Onda 3: **76** páginas;
- Onda 4: **12** páginas;
- rotas desconhecidas: **0**;
- `legacy_rendered`: **0**;
- P0/P1: **0**;
- compatibilidades P2/P3: **93**;
- tabelas administrativas detectadas: **3**;
- formulários administrativos detectados: **53**.

A dívida P2/P3 permanece classificada na matriz canônica. Ela não representa rota desconhecida, shell legado renderizado ou incompatibilidade estrutural.

## Verificação local

- `npm run surfaces:collect`: verde;
- `npm run test:unit`: 79 arquivos e 413 testes verdes;
- `npm run journeys:test`: verde;
- `npm run civic-graph:test`: verde;
- `npm run quality:test`: verde;
- `npm run security:test`: verde;
- `npm run surfaces:a11y`: 5/5 viewports verdes;
- `npm run smoke:no-leak-http`: verde contra Production;
- proteção HTTP admin: 307 para login em três rotas, preservando destino e flag;
- `npm run typecheck`: verde;
- `npm run lint`: verde;
- `npm run build`: verde, 189 páginas auditadas e 95 páginas estáticas geradas;
- `git diff --check`: verde.

O primeiro `surfaces:e2e` local teve 34/35 casos verdes e uma corrida de restauração de 11 px em 320×568. A inspeção focal mostrou filesystem lento do Next dev; o mesmo caso passou isoladamente sem mudança de código. A suíte completa será o gate canônico da PR.

## Infraestrutura local

O Docker Desktop global não respondeu ao ping em dez segundos (`DOCKER_DAEMON_TIMEOUT`) e não havia portas Supabase locais abertas. Nenhum finding do produto foi derivado disso. O workflow da PR executa a suíte admin em Supabase descartável e realiza somente um retry focal quando o reset retorna o 502 já conhecido.

A primeira execução isolada da PR expôs drift na fixture histórica da Central: `source_key` e `idempotency_key` tornaram-se obrigatórios na projeção unificada, mas três geradores sintéticos ainda não os declaravam. As fixtures foram alinhadas com chaves determinísticas por execução/item; nenhuma tabela, migration ou mutation do produto foi alterada.

A segunda execução isolada confirmou o reset Supabase e o seed completo, e separou quatro findings focais do produto/teste: contraste de ações amarelas no tema administrativo, regiões horizontais roláveis sem foco, continuidade da flag no redirecionamento de sessão expirada e excesso de recompilações no cenário repetido de filtros. As correções mantêm o fallback intacto, aplicam semântica de foco e contraste ao shell V2, preservam a flag também no parâmetro externo do login e validam o retorno nos viewports móveis/desktop extremos. Não houve retry cego.

## Invariantes preservados

- nenhuma mutation canônica alterada;
- nenhuma decisão humana automatizada;
- nenhuma publicação automática;
- nenhum secret, contato, original privado, localização sensível ou signed URL adicionado à UI pública;
- App V2 continua opt-in;
- fallback legado continua disponível;
- `launch_publicly` não foi acionado;
- 47.9A, 47.9C e 47.9D não foram promovidos.
