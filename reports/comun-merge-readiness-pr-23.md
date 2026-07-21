# Merge readiness da PR #23

Data: 2026-07-21

Branch: `codex/sprint-40-1-mobile-preview`

Decisão técnica: **READY_TO_MERGE_CODE_ONLY**

## Interpretação da decisão

O código está tecnicamente pronto para revisão e merge da PR após o push deste lote: build, contratos automatizados, RLS, DB lint, production-like e cleanup estão verdes. A decisão não abre piloto público e não declara prontidão humana, operacional remota ou de dispositivo físico.

## Estado por domínio

- CÓDIGO: READY — regressões consolidadas fechadas.
- MIGRATIONS: READY LOCAL — reset histórico já comprovado, RLS e DB lint verdes; remoto não aplicado.
- BUILD: READY — Next.js 16.2.10, 92 páginas estáticas e rotas dinâmicas compiladas.
- CARTOGRAFIA: READY LOCAL — PMTiles real, hash e Range 206 validados; versionamento excepcional documentado.
- PRIVACIDADE: READY LOCAL — no-leak e matriz de acesso verdes; nenhum original ou campo privado exposto nos testes.
- SUPABASE REMOTO: NÃO REVISADO E INALTERADO.
- VERCEL/DEPLOY: NÃO EXECUTADO.
- R2: NÃO ALTERADO.
- DISPOSITIVOS FÍSICOS: NÃO EXECUTADOS; câmera e GPS simulados.
- GATE HUMANO: 0/3.
- OPERAÇÃO MANUAL: NÃO EXECUTADA; automação editorial 45/45.

## Evidência mínima de aceite

- Typecheck e lint aprovados.
- 253/253 unitários.
- `RLS_MATRIX_OK` e DB lint sem erros.
- Mapa/captura: 46 pass, 4 skips intencionais.
- Miniapps: 10/10.
- Shell móvel: 9/9.
- Jornada integral: 10/10 nos cinco viewports.
- PWA: 20/20.
- Comunidades: 35/35.
- Primeiro piloto: 15/15.
- Operação editorial autenticada: 45/45.
- Build, rotas production-like, PMTiles Range e no-leak aprovados.
- Cleanup final: `COMUN_TEST_FIXTURES_CLEAN`.

## Condições externas ainda fechadas

Antes de qualquer piloto público continuam obrigatórios: três participantes reais no gate humano, ensaio operacional manual, teste em dispositivos físicos, revisão do ambiente remoto e decisão explícita de deploy. Esses gates não bloqueiam a qualidade do código da PR, mas bloqueiam a abertura pública.

## Declarações

- Nenhum merge foi executado.
- Nenhum deploy foi executado.
- Supabase remoto e R2 permaneceram inalterados.
- Nenhum provider remoto foi ativado.
- Nenhum protocolo real foi criado.
- Gate humano permanece 0/3.
- Piloto público permanece fechado.
