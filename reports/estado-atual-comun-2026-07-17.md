# Relatório de Estado Atual — COMUN VR Abandonada

**Data:** 2026-07-17  
**Branch ativa:** `codex/comun-admin-auth-remote`  
**Último commit:** `3a01e91 test: torna suites autenticadas independentes`  
**Autor do relatório:** Kimi Code CLI

---

## 1. Resumo Executivo

O projeto **COMUN VR Abandonada** é uma plataforma comunitária de relatos, debates e memória coletiva construída em Next.js 16 + React 19 + Supabase. Na data deste relatório, o código-fonte **compila, passa em lint, typecheck e build**, mas a release segue **NO-GO** devido a instabilidade na recriação sucessiva das personas de Auth local, falha no Axe após reset e ausência de readiness humano aprovado.

Não houve deploy, push remoto, alteração em Supabase remoto ou uso de serviços/R2 reais desde o fechamento da Sprint 33.2.1.

---

## 2. Stack e Dependências Principais

| Camada | Tecnologia | Versão |
|--------|------------|--------|
| Framework | Next.js (App Router) | 16.2.10 |
| Runtime UI | React / React DOM | 19.2.7 |
| Linguagem | TypeScript | ^5.6.3 |
| Estilo | Tailwind CSS | ^3.4.15 |
| Auth/Banco | Supabase SSR / Supabase JS | 0.12.2 / 2.110.5 |
| Storage | R2 (AWS SDK S3) | 3.1086.0 |
| Imagem | sharp | 0.35.3 |
| Validação | zod | ^3.24.1 |
| E2E | Playwright + @axe-core/playwright | 1.61.1 / 4.12.1 |
| Unit | vitest | 4.1.10 |
| Lint | eslint + eslint-config-next | 9.39.1 / 16.2.10 |

**Requisito de Node:** `>=20.9.0`.

---

## 3. Estrutura do Código

| Diretório | Arquivos | Observação |
|-----------|----------|------------|
| `app/` | 224 | Rotas públicas, admin, API e páginas do produto |
| `components/` | 22 | Shells, navegação, módulos de arte, rádio, mapa, observatório, formulários de auth |
| `lib/` | 110 | Cliente Supabase, auth, pautas, editorial, acervo, rádio, observatórios, storage, utilitários |
| `scripts/` | 95 | Smoke tests, backups, auditorias, fixtures, setup |
| `tests/` | 20 | Suites E2E/Playwright (radio, mapa, observatórios, editorial, arte, etc.) |
| `docs/` | 136 | Documentação operacional e de domínio |
| `supabase/migrations/` | 54 | Migrações desde o schema inicial até persona roles |
| `reports/` | 130+ | Relatórios de sprint, checkpoints, screenshots, JSONs |

### Rotas principais

- Públicas: `/comun`, `/comun/pautas`, `/comun/mapa`, `/comun/acervo`, `/comun/arte`, `/comun/radio`, `/comun/observatorios`, `/comun/relatar`, `/comun/protocolo-popular`.
- Admin: `/comun/admin`, `/comun/admin/operacao`, `/comun/admin/pautas`, `/comun/admin/acervo`, `/comun/admin/radio`, `/comun/admin/observatorios`, `/comun/admin/equipe`, `/comun/admin/auditoria`.
- API: `/api/comun/admin/archive/**`, `/api/comun/archive/**`, `/api/comun/observatories/**`, `/api/internal/archive-processing/**`.

---

## 4. Estado do Build, Lint e Typecheck

Verificação executada localmente na branch ativa:

| Comando | Status | Erros | Tempo aproximado |
|---------|--------|-------|------------------|
| `npm run lint` | ✅ PASS | 0 | curto |
| `npm run typecheck` | ✅ PASS | 0 | curto |
| `npm run build` | ✅ PASS | 0 | ~39s |

Detalhes do build:
- 21 rotas estáticas (`○`) e 91 dinâmicas (`ƒ`).
- 90/90 páginas estáticas geradas com sucesso.
- Middleware de proxy ativo.
- Next.js 16.2.10 com Turbopack.

**Conclusão:** o código está sintaticamente saudável e produz um build funcional.

---

## 5. Estado dos Testes

### 5.1 Testes unitários (Vitest)

- Última contagem registrada: **192/192 passando** (Sprint 33.2.1).
- Coletor opt-in de performance implementado: 4/4 unitários passando.

### 5.2 Testes E2E (Playwright)

- **Cobertura autenticada:** 42/42 passando em `next dev` e em `next start`.
- **Autorização negativa:** 8/8 passando (acesso negado para papéis incorretos, sessão expirada, visitante).
- **Axe acessibilidade:** 15/15 passando após correção, zero violações serious/critical.
- **Visual/mobile:** 49 capturas geradas, sem overflow detectado.
- **Rotas cobertas:** editorial, calçada, mapa, rádio, arte territorial, observatórios, experiência central, acervo.

### 5.3 Bloqueios nos testes

- **Reset 1 FAIL:** testes passam, mas o Axe após recriação das personas no Auth local falha no login.
- **Reset 2 BLOCKED:** depende do reset 1.
- **`next start` FAIL:** build e E2E passam, mas Axe falha na repetição pós-reset.
- **Performance completa:** não executada por causa das falhas precedentes.
- **Readiness humano:** `INCOMPLETE`.

---

## 6. Estado do Git

### Arquivos modificados (não commitados)

| Arquivo | Tipo de alteração |
|---------|-------------------|
| `next-env.d.ts` | Referência de tipos |
| `reports/screenshots/sprint-33-2-1-expired-1366x768.png` | Screenshot atualizado |
| `reports/screenshots/sprint-33-2-1-expired-360x800.png` | Screenshot atualizado |
| `tests/editorial-operation-authenticated-visual/operation.spec.ts` | Refatoração para usar `storageState` por persona |
| `tests/editorial-operation-authenticated/personas.spec.ts` | Inline de credenciais e lista de personas |
| `tests/fixtures/comun/operational-global-setup.mjs` | Setup global gera `storageState` para cada persona + item fixture |
| `tests/fixtures/comun/operational-global-teardown.mjs` | Teardown remove item fixture e personas |

### Histórico recente

Os últimos 20 commits concentram-se em:
- Tornar suites autenticadas independentes (`storageState` por persona).
- Estabilizar criação das personas Auth locais.
- Comprovar gate autenticado em `next start`.
- Adicionar instrumentação local de performance.
- Cobertura Axe e visual autenticada.
- Ensaio completo do primeiro piloto e go/no-go sem promoção automática.
- Validador local de prontidão humana.

---

## 7. Supabase e Infraestrutura

### Variáveis de ambiente principais

- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_PROJECT_ID`
- `NEXT_PUBLIC_SITE_URL`, `COMUN_BOOTSTRAP_ADMIN_EMAIL`, `COMUN_LOOKUP_HASH_SALT`
- `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_ENDPOINT`, `R2_BUCKET_ORIGINALS`, `R2_BUCKET_PUBLIC`, `R2_PUBLIC_BASE_URL`
- `MEDIA_STORAGE_PROVIDER` (não documentada em `.env.example`, usada em código: `r2` / `supabase-local` / `fixture`)

### Migrações

- **54 arquivos `.sql`** em `supabase/migrations/`.
- Domínios cobertos: COMUN base, admin/auth, pauta/editorial, protocolos, hub central, mapa popular, calçada, observatórios, acervo, história oral, música, arte territorial, rádio comunitária, inbox central e papéis operacionais.
- RLS hardening presente em várias migrações recentes; acesso de `anon`/`authenticated` revogado em favor de `service_role`.

### Riscos de infra

- `supabase/seed.sql` está **ausente** embora `config.toml` referencie-o. `npm run seed` pode falhar se depender do arquivo.
- Buckets R2 devem existir manualmente em produção; configuração local via `config.toml` e migration `storage.buckets`.
- `R2_PUBLIC_BASE_URL` é obrigatória para derivados públicos; sem ela, `publicMediaUrl()` lança erro.

---

## 8. Relatórios de Sprint Recentes (Resumo)

Classificação corrigida neste fechamento: gate local, piloto público e promoção remota são decisões distintas. Uma sprint com gate local aprovado **não** é NO-GO apenas por não ter sido promovida.

| Sprint | Gate local | Piloto público | Promoção remota |
|--------|-----------|----------------|-----------------|
| 31 | **APROVADA** — candidata local integral (reset reproduzível, RLS, lint/tipos/unit/build, Axe, responsividade, fluxo central) | Não aberto | Não autorizada / não executada |
| 32 | **APROVADA** — candidata local integral do piloto Mapa Popular das Calçadas (reset duplo, RLS_MATRIX_OK, E2E, Axe, screenshots) | Não aberto | Não autorizada / não executada |
| 32.1 | **APROVADA** — RC local da vertical de calçadas (2 resets, build/`next start`, 75/75 E2E, 25/25 Axe, 151 unitários, RLS, 9 regressões) | Não aberto | Não autorizada / não executada |
| 33 | **APROVADA** — ensaio editorial local (migration do zero, RLS/DB lint, 6/6 papéis, 26/26 ensaio operacional, 157/157 unitários) | Não aberto | Não autorizada — exige autorização própria, verificação production-like e confirmação humana |
| 33.1 | Pacote técnico local aprovado, mas **NO-GO** por escala/plantão reais, revisão remota e E2E autenticado integral pendentes | **NO-GO humano** | **NO-GO** |
| 33.2 | Fechamento técnico incompleto — cobertura autenticada passou; reset duplo, performance e `next start` integral pendentes | **NO-GO humano** | **NO-GO** |
| 33.2.1 | **Em andamento** — fechamento técnico autenticado desta sprint (reset duplo, Axe pós-reset, production-like, performance) | **NO-GO humano** — readiness incompleto | **NO-GO** — não autorizada |

Fontes: `release-readiness-sprint-31.md`, `release-readiness-sprint-32.md` (inclui atualização 32.1), `release-readiness-sprint-33.md` (inclui atualização 33.1), `release-readiness-sprint-33-2.md`, `release-readiness-sprint-33-2-1.md`.

**Conclusão consolidada:** os gates locais das sprints 31, 32, 32.1 e 33 foram aprovados; as sprints 33.1 em diante acumulam pendências técnicas e humanas. Ainda **não há condições de piloto público nem de promoção remota**.

---

## 9. Riscos e Bloqueios Atuais

1. **Instabilidade do Auth local** — recriação sucessiva de personas falha no Axe/login, impedindo reset duplo e production-like.
2. **Performance não medida** — coletor existe, mas nenhuma medição production-like foi executada.
3. **Readiness humano incompleto** — validador local retorna `COMUN_PILOT_HUMAN_READINESS_INCOMPLETE`.
4. **Seed SQL ausente** — risco para `npm run seed` / `supabase db reset`.
5. **MEDIA_STORAGE_PROVIDER não documentada** — variável chave para alternar storage não consta em `.env.example`.
6. **Nenhuma promoção remota** — sem deploy, push, alteração em Supabase remoto ou uso de R2 real.

---

## 10. Próximos Passos Recomendados

1. **Estabilizar o Auth local:** investigar e corrigir a falha de login após recriação de personas no Supabase Auth local (pode ser timing, cache de sessão ou confirmação de e-mail).
2. **Fechar o gate `next start`:** garantir que Axe passe após reset completo e em build production-like.
3. **Executar medições de performance:** rodar `perf:editorial-operation-authenticated` com build production-like.
4. **Completar readiness humano:** usar `pilot:human-readiness:check` e documentar critérios de aprovação.
5. **Corrigir `.env.example`:** adicionar `MEDIA_STORAGE_PROVIDER` e `R2_PUBLIC_BASE_URL` com descrições.
6. **Resolver `supabase/seed.sql`:** criar o arquivo ou ajustar `config.toml` para não referenciá-lo.
7. **Revisar RLS hardening:** garantir que as rotas de API realmente operem com `service_role` ou funções seguras sem quebrar fluxos comunitários.
8. **Apenas após os itens 1–4:** executar `verify:release` e avaliar promoção remota.

---

## 11. Declarações de Segurança e Custos

- Piloto público real: **NÃO ABERTO**
- Deploy Vercel: **NÃO EXECUTADO**
- Push Git: **NÃO EXECUTADO**
- Supabase remoto: **NÃO ALTERADO**
- R2 real: **NÃO UTILIZADO**
- Serviços externos: **NÃO UTILIZADOS**
- Dados reais: **NÃO UTILIZADOS**
- Custo externo: **R$ 0**

---

*Fim do relatório.*
