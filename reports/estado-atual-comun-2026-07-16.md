# Estado atual do projeto — COMUN VR ABANDONADA — 2026-07-16

Relatório intermediário solicitado durante a Sprint 32.1 (vertical completa do
Mapa Popular das Calçadas, modo local-first). Não substitui o relatório final
da sprint (Fase 36).

## 1. Infraestrutura local (verificado nesta sessão)

| Item | Estado | Evidência |
|---|---|---|
| Docker Desktop | Ativo | containers `supabase_*` rodando |
| Supabase local | Ativo | REST `http://127.0.0.1:55431` → 200 |
| Banco local | Íntegro e limpo | 50/50 migrations aplicadas (inclui `20260716000000_comun_sidewalk_vertical` e `20260716120000_comun_sidewalk_fk_fix`); 150 tabelas `comun_*`; zero fixtures após reset |
| Storage local | Pronto | `npm run storage:readiness` → `COMUN_LOCAL_STORAGE_READY` |
| Dev server Next.js | Ativo | `http://127.0.0.1:3000/comun` → 200 |
| Hosts remotos | Nenhum | `.env.local` em `127.0.0.1`; nenhum projeto linked |

### Incidente de infraestrutura (resolvido nesta sessão)

Docker Desktop estava parado; ao subir, o banco foi recriado via
`npx supabase db reset --local`. O PostgREST ficou com cache de schema obsoleto
e o Kong apresentou o 502 conhecido — resolvido com restart limitado dos
containers `supabase_rest` e `supabase_kong`, procedimento previsto na Fase 32.
Stack verificado saudável ao final.

## 2. Estado da Sprint 32.1 por fase

| Fases | Estado | Notas |
|---|---|---|
| 0 — Guarda local | Concluída | localhost, Supabase local, Storage local |
| 1 — Matriz de comprovação | Concluída | `reports/comun-matriz-vertical-calcadas-32-1.md`; 28 componentes classificados |
| 2 — Modelo territorial | Concluída | Reuso de `comun_territorial_contributions` + `comun_sidewalk_records` (migrations aditivas locais) |
| 3–24 — Fluxos verticais | Em andamento | Código implementado (ver §3); smoke vertical de 32 etapas passou na última execução conhecida |
| 25 — Smoke vertical | Re-execução pendente | Necessário rodar novamente após o reset do banco desta sessão |
| 26 — E2E | 5 falhas na última execução | `test-results/.last-run.json` → `failed` (5 testes); última contagem conhecida 70/75; inclui teste de contribuição (timeout aguardando confirmação) |
| 27 — Axe | Re-execução pendente | Gate: zero serious/critical |
| 28 — Visual | Capturas feitas | 40 screenshots `sprint-32-1-*` (8 superfícies × 5 viewports); revisão visual pendente |
| 29 — Unitários | Parcial | Expansão da Fase 29 pendente |
| 30 — RLS | Re-execução pendente | `audit:rls-matrix` + `db lint --local` → `RLS_MATRIX_OK` |
| 31 — Regressões | Pendente | 9 smokes da lista obrigatória |
| 32 — Reset duplo | Pendente | 2 rodadas independentes completas |
| 33 — Production-like | Pendente | `build` + `start` + bateria contra localhost |
| 34 — Performance | Pendente | Medições não iniciadas |
| 35 — Commits locais | Pendente | Nenhum commit da 32.1 ainda |
| 36 — Relatórios finais | Pendente | Este relatório é intermediário |

## 3. Código da sprint (local, não commitado)

Modificados:
- `app/comun/pautas/[slug]/page.tsx`, `components/pauta-app-shell.tsx`
- `scripts/smoke-comun-sidewalk-pilot.mjs` (smoke vertical, 32 etapas)
- `scripts/audit-comun-rls-matrix.mjs`, `docs/comun-rls-matrix.md`
- `tests/sidewalk-pilot/{sidewalk.spec.ts,global-setup.mjs,global-teardown.mjs}`

Novos (untracked):
- `lib/sidewalk-{pauta,photos,records,snapshots,memory,inbox}.ts`
- `components/sidewalk-map-module.tsx`, `components/sidewalk-memory-section.tsx`
- `app/comun/pautas/[slug]/registros/`, `app/comun/pautas/[slug]/memoria/`
- `reports/comun-matriz-vertical-calcadas-32-1.md`
- 40 screenshots `sprint-32-1-*`

## 4. Bloqueios e riscos

1. E2E com 5 falhas na última execução — re-rodar e corrigir.
2. Smoke, RLS, axe e regressões precisam de re-execução após o reset do banco;
   resultados anteriores não valem como prova vigente.
3. Nada da sprint commitado — Fase 35 prevê 7 commits locais temáticos.
4. Revisão visual dos 40 screenshots pendente.

## 5. Declarações

- Vercel deploy: NÃO EXECUTADO
- Git push: NÃO EXECUTADO
- Supabase remoto: NÃO ALTERADO
- R2 real: NÃO UTILIZADO
- APIs externas: NÃO UTILIZADAS
- Dados reais: NÃO INSERIDOS
- Custo externo: R$ 0
