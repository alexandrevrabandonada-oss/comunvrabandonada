# Continuidade da busca pública — 15/10/2026

Base: `8b0ba0d2c90295a6579e8e8808a9e765583e86c9`.
Branch: `codex/comun-search-context-20261015`, worktree independente no E:.
Original preservada; #552 inalterado em `bbd70be8a43dfeb5391ae2f78830e2ca9c40fb74`.
SHA funcional: `ca4e73255cd6a47d86cfe9174723d38d8f33586f`.
Tree funcional: `9ab1bff8039f0ca90bb6eacbd591f209aeb38e9e`.
PR draft #553: https://github.com/alexandrevrabandonada-oss/comunvrabandonada/pull/553
Pin Playwright 1.64.1 portado isoladamente; nenhum código D09 é dependência.

## Decisão e comportamento

Mesma busca, API e leitores: q/tipo/pauta/territorio/semantic preservados. Filtros
contextuais são slugs públicos resolvidos no servidor; UUID público legado é
canonizado. Retorno explícito só com contexto local válido, inclusive no detalhe
indisponível. Sem contexto não se inventa busca. Âncora pública restaura foco.
Resultado fresco substitui snapshot, sem conservar retirados como elegíveis.
Fallback não amplia consulta contextual se não consegue aplicar seus filtros.
Vazio, carregamento, indisponibilidade e parcial são estados distintos.
Paginação e ordenação: NOT_APPLICABLE, inexistentes na superfície atual.

Formulários existentes usam action POST de navegação antes da URL pública GET;
sem Auth, DB ou escrita de negócio nessa action. Consulta tem aviso e validação
contra padrões evidentes de PII/segredo; não detecta todo dado pessoal. Entrada
externa já recebida pelo navegador/provedor não pode ser apagada retroativamente.
Conteúdo anteriormente recebido pode persistir no snapshot histórico do navegador;
a UI ativa revalida. Não há storage de consulta, schema ou telemetria nova.
API mantém métricas agregadas preexistentes, sem texto da consulta.

## Provas e reprodução

Node 22.19.0, Next 16.3.8, Vitest 4.1.11, Playwright 1.64.1,
Chromium 156/rev1248. Comandos na raiz:

```sh
npm ci --ignore-scripts
node node_modules/vitest/vitest.mjs run lib/public-search-context.test.ts lib/unified-search.test.ts lib/civic-intelligence/public-search-read.test.ts lib/public-search-actions.test.ts
node --test scripts/search-context/lab-guard.node-test.mjs
node tests/search-context/run-fixture.mjs build
node node_modules/@playwright/test/cli.js test -c playwright.search-context.config.ts
npm run lint
npm run typecheck
npm run build
git diff --check
```

PASS no diff funcional local: 46 focais/adjacentes, 3 guards e 16 browser (8 desktop/8 celular).
Browser cobre filtros/detalhe/retorno/histórico/foco, nova aba/direct link, retorno
inseguro, retirada, estados distintos, limpeza de filtros, teclado/axe, overflow,
console/rede e recusa de consulta sensível. Primeiras execuções encontraram fixture
sem neq, homepage prefetch ausente e locator conflitante com RouteAnnouncer. Fixture
passou a importar homepage real; status/alert ganharam nomes acessíveis. Não foram
removidas assertivas para esconder erro. Traces/vídeos desativados; somente fixtures.

Páginas, navigation action e API reais; transporte controlado, usuário anônimo
simulado. Não é prova Auth/RLS/Postgres. Nenhuma conta/envio/escrita de negócio;
métrica agregada da API é no-op explícito apenas na fixture.

## Auth/Postgres real separado

Workflow `.github/workflows/comun-search-context.yml`, job real-auth-postgres:

```sh
COMUN_SEARCH_CONTEXT_LAB=OWNED_EPHEMERAL_RUNNER node scripts/search-context/run-owned-lab.mjs
```

Exige runner Linux efêmero identificado, Docker local vazio antes da primeira
escrita, stack recém-criada e loopback confirmado por imagem/container/portas.
CLI 2.117.0, migrations canônicas somente na stack descartável. A/B sintéticos,
sessões emitidas pelo Auth com senha/getUser, bridge privada recusada anon/A/B,
leitor público, retirada e cleanup por IDs exclusivos com contagens zero.
Sem JWT fabricado ou credencial Production. Ausência do guard é recusa, não PASS.
NOT_RUN local; PASS remoto no SHA funcional, run 38792046636, job 116618803945
(1 teste integrado, incluindo cleanup), sem skipped. Browser remoto na mesma run,
job 116618804415: 16/16 PASS, 42 focais + 3 guards PASS. Matriz PostgREST do workflow existente
public-search disclosure permanece independente.

Busca de metadados do Acervo preserva filtros atuais de publicação/visibilidade;
metadado restrito não é concessão de mídia/licença. Não certifica direitos ou RLS
universal. Fontes não foram repovoadas em Production.

## Estado remoto e limites

#552 falha adicional investigada: Civic Intelligence Deliverability run 38785556272,
job 116597774650, TS1434/TS1128 em `.next/dev/types/validator.ts`. Separada dos sete
preflights; histórico preservado, não transportado ao candidato novo.

No SHA funcional, PASS local: tipos, build completo, formatação 3.9.6/3.9.10,
contrato Civic e 3 testes de intenção, secrets boundary. Lint global: 0 erros,
2 avisos em bundles gerados da fixture; lint de fontes: 0 erros/avisos.

PASS remoto: disclosure run 38792046468, contract e disposable-integration,
25 casos PostgREST e controle negativo confirmado (implementação antiga falha
13 casos, 12 passam; não contar esses 13 como falha do candidato).

Preview do SHA funcional: Vercel `dpl_5S9deeHtQUiQFcs2CpK8DD1qstr8` READY,
source git, target Preview; GitHub deployment 7101941933, environment Preview,
status success, URL https://comunvrabandonada-hx12qyvtg-alexandrevrabandonada-oss-projects.vercel.app.
COST-02 e demais checks: inventário vivo no PR. Nenhum SKIPPED é PASS.

FAIL separado: 48.2-A run 38792046599/job 116618804070, antes de SQL:
root certificate file `/home/runner/.postgresql/root.crt` inexistente. Não é prova
de schema vazio nem regressão da busca. Não desabilitar TLS para contornar.
Pendência da Escola continua preservada, independentemente dessa falha de CI.

Atualização final deste relatório/roadmap é documental: não transfere a conclusão
dos checks ao próximo SHA. Conferir seu novo Preview e inventário por SHA no PR.
Production: NOT_INSPECTED, nenhuma operação. Escola/Auth/Source/backup intactos.
Aparelhos reais, Safari/Firefox e validação humana: NOT_RUN.
Próximo bloqueio: certificar SHA publicado nos gates e laboratório remoto;
bloqueio Escola permanece separado. Draft, sem merge/ready.
