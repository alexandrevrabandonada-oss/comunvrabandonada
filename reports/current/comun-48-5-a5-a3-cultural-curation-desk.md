# 48.5-A5-A3 — Mesa de curadoria cultural

Data: 24/08/2026.

## Baseline e arquitetura

- Parent canônico: `eb0d9f2288b5fccca84c249bd0b6bc2168c08f6f`.
- Branch: `codex/48-5-a5-a3-cultural-curation-desk`.
- A mesa é uma projeção TypeScript somente em memória; não há tabela, view, fila, cron, estado persistido, migration ou flag nova.
- O núcleo `lib/archive/cultural-curation-readiness.ts` continua sendo a única autoridade de readiness. A mesa apenas interpreta seus quatro adapters existentes.
- Fontes agregadas em consultas server-side paralelas e limitadas a 75 itens por fonte: Foto/documento, Arte, História Oral e Rádio. Música não foi artificialmente incorporada; `own_music` aponta para o fluxo existente.

## Contrato de trabalho

- Rota admin/editor: `/comun/admin/curadoria`.
- Categorias humanas derivadas: Recebido, Precisa de informação, Pode virar rascunho privado, Em preparação, Pronto para revisão editorial e Precisa de encaminhamento.
- Filtros: tipo, situação e busca simples por título/protocolo.
- Ordenação: atenção editorial, readiness e antiguidade dentro da categoria, sem scoring ou IA.
- Cards mostram tipo, idade, título, protocolo/território, existência de rascunho, situação e próxima ação. CTAs apenas navegam às superfícies especializadas.
- `lib/archive/cultural-curation-copy.ts` centraliza a tradução de blockers/actions; códigos internos não são apresentados ao operador.
- A fila fotográfica tocada pelo escopo passou a usar a mesma copy humana.

## Segurança e publicação

- Mesa read-only, sem server action, RPC ou mutation.
- `publicationEligible=false` permanece invariável; não existe botão Publicar.
- A3, A4 e A5-A1 permanecem semanticamente preservados.
- `migrations=0`, `ProductionSchemaWrites=0`, `ProductionBusinessWrites=0`, `ProductionEnvWrites=0`.
- `publications=0`, `SearchWrites=0`, `publicAssetPromotions=0`, `collectionWrites=0`.

## Verificação local

- Testes focais: 37 GREEN.
- Unit: 213 arquivos / 1.189 testes GREEN.
- Typecheck: GREEN.
- Lint: GREEN.
- Build: GREEN; rota dinâmica `/comun/admin/curadoria` presente.
- Surfaces audit: 226 rotas, zero desconhecidas, zero incompatibilidades estruturais.
- Surfaces test: 4 contratos Node + 28 testes Vitest GREEN.
- Diff check: GREEN.

## Integração e fechamento

- Commit/PR/Preview/visual review/CI/merge/deployment: a preencher no fechamento remoto.
- Terminal candidato: `COMUN_48_5_A5_A3_CULTURAL_CURATION_DESK_GREEN_PRODUCTION_ACTIVE_NO_SCHEMA_DELTA`.
