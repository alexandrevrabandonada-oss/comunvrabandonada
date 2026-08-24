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

- Checkpoint funcional: `b49f3dc322b257ae0db2132df069ecf89134ea00`; head final validado: `fb06142cd3858277199b1690b9f4bf6e2ff5048a`.
- PR [#378](https://github.com/alexandrevrabandonada-oss/comunvrabandonada/pull/378), integrada por squash em `472d988c2744852c156a5229d94a305496ea3911`. O tree do merge (`3e92c7c9edcd70df5a07c6bd6b5e3b44ed084d04`) é idêntico ao tree validado.
- Preview exato do head: deployment GitHub `6056709241`, READY em `https://comunvrabandonada-a6rgtwymw-alexandrevrabandonada-oss-projects.vercel.app`; COST-02 run `32690988740`, job `97324502514`, GREEN e fresh.
- A Preview sem sessão redirecionou de forma fail-closed para o login admin, sem erro de console. A matriz autenticada de superfícies/admin e acessibilidade, o build, os contratos, a coerência, a segurança, o no-leak e a matriz Civic Graph fecharam GREEN.
- `3. Rotas públicas` teve uma falha inicial isolada por `ENOENT` do `build-manifest.json` no servidor Next do runner; nove casos subsequentes passaram. Uma única reexecução focal terminou GREEN, sem alteração de código.
- Production: deployment GitHub `6056854565`, READY em `https://comunvrabandonada-5kh96op6s-alexandrevrabandonada-oss-projects.vercel.app`, servindo o main `472d988c2744852c156a5229d94a305496ea3911`.
- Smoke canônico `GET /comun/admin/curadoria`: HTTP `307` para `/comun/admin/login?redirectTo=%2Fcomun%2Fadmin%2Fcuradoria`, confirmando proteção administrativa no runtime. Nenhum POST, fixture ou write remoto foi realizado.
- Estado final: `A3=ON/preserved`, `A4=ON/preserved`, `A5-A1=active/preserved`, `publicationEligible=false`, `autoPublication=false`, `ProductionBusinessWrites=0`, `ProductionSchemaWrites=0`, `ProductionEnvWrites=0`, `publications=0`, `SearchWrites=0`, `publicAssetPromotions=0`, `collectionWrites=0`.
- Terminal: `COMUN_48_5_A5_A3_CULTURAL_CURATION_DESK_GREEN_PRODUCTION_ACTIVE_NO_SCHEMA_DELTA`.
