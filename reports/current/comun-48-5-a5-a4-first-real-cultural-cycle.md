# 48.5-A5-A4 — Primeiro ciclo cultural real Foto/Documento

Data: 24/08/2026.

## Baseline

- Parent canônico: `4ca13a896c5e3f91b6b0f47eb01a4f6b28e74433`.
- Branch: `codex/48-5-a5-a4-real-photo-cycle`.
- A3 e A4 permanecem ON/preservados; A5-A1, A5-A2/R1 e A5-A3 permanecem preservados.
- Migration, schema e flag novos: nenhum. `ProductionSchemaWrites=0` e `ProductionEnvWrites=0`.

## Fronteira de publicação

- O publisher genérico foi limitado explicitamente a `photograph` e `document`.
- Raízes de Arte, História Oral, programa de Rádio e episódio/clip de Rádio são reconhecidas pelo `item_type` e pelas child tables canônicas.
- A action refaz as consultas no servidor antes de publicar. Child especializado, tipo sem publisher ou falha de classificação resultam em bloqueio fail-closed.
- A UI especializada remove o workflow genérico e encaminha ao editor canônico com copy humana. Os publishers especializados existentes não foram modificados.
- Nenhum publisher universal, tabela, RPC, migration ou workflow engine foi criado.

## Readiness Foto/Documento

- O detalhe da contribuição reutiliza `lib/archive/cultural-curation-copy.ts`.
- Blockers e próximas ações são apresentados em linguagem humana; códigos internos não são renderizados.
- `publicationEligible=false` continua separando readiness de curadoria da decisão final do publisher.

## Verificação e integração

- Testes focais: 19 GREEN.
- Unit: 215 arquivos / 1.208 testes GREEN; typecheck, lint e build GREEN.
- Surfaces: 226 rotas, zero desconhecidas/incompatibilidades; 4 contratos Node + 28 testes Vitest GREEN.
- Quality e Experience coherence: GREEN.
- Browser local: a rota admin permaneceu fail-closed, redirecionando para login com `redirectTo` correto, sem erro/warning de console. A revisão autenticada do conteúdo será fechada no Preview/CI sem fabricar credenciais.
- CI/Preview: a preencher no fechamento.
- PR, merge, deployment Production e inventário real sanitizado: a preencher no fechamento.

## Piloto real

- O inventário Production somente leitura será executado apenas depois do patch seguro estar integrado e READY.
- Nenhum candidato, decisão editorial, write ou publicação foi presumido neste estágio.
