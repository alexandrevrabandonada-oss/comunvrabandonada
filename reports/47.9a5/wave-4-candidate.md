# TIJOLO 47.9A5 — Onda 4 candidate

Data técnica: 2026-08-02

Base: `b5ade0c7b04b0c790b25e87bb6beca295f2b0da0` (merge da Onda 3, PR #144)

Branch: `codex/tijolo-47-9a5-admin-platform`

Estado deste documento: candidate. O resultado parcial da Onda 4 depende de PR,
Preview, merge e Production no SHA funcional; o resultado terminal do A5 depende
da regressão integral pós-merge.

## Administração sistêmica consolidada

- contrato canônico para as 12 rotas da Onda 4;
- Central, item e superfície operacional sob o mesmo shell nível visual 0;
- rail operacional sem bottom navigation de membro ou footer institucional;
- deep links, filtros, paginação, retorno e `?experiencia=app-v2` preservados;
- ações demonstrativas substituídas por links nomeados às fontes especializadas;
- observabilidade sanitizada, agregada e sem consulta, pessoa, segredo, conteúdo
  privado ou localização;
- auditoria exibe somente eventos sanitizados e mantém o blocker de recuperação
  durável;
- Busca Viva conserva fallback lexical e o blocker de capability do provider;
- lançamento permanece informativo, sem mutation e com `launch_publicly` fechado
  atrás do gate humano terminal;
- fallback legado preservado; App V2 continua opt-in.

## Auditoria integral recalculada

- páginas App Router COMUN: **189**;
- shells: **7/7**;
- páginas administrativas: **88**;
- Onda 4: **12/12**;
- rotas desconhecidas: **0**;
- `legacy_rendered`: **0**;
- incompatibilidades estruturais: **0**;
- app bars administrativos genéricos: **0**;
- P0/P1: **0**;
- compatibilidades P2/P3 não estruturais: **93**;
- tabelas administrativas detectadas: **3**;
- formulários administrativos detectados: **53**.

## Segurança e gates preservados

- acesso administrativo e perfil ativo continuam obrigatórios;
- superfícies de observabilidade, auditoria e equipe exigem admin;
- nenhuma autorização foi ampliada;
- nenhuma mutation, migration, plano, provider ou cobrança foi alterada;
- `COMUN_CIVIC_INTELLIGENCE_BLOCKED_PROVIDER_CAPABILITY` permanece;
- `COMUN_SECURITY_RESILIENCE_BLOCKED_PROVIDER_CAPABILITY` permanece;
- `launch_publicly` não foi acionado e não existe ação executável nesta tela;
- nenhuma query bruta, usuário, conteúdo privado ou segredo foi adicionado à UI.

## Verificação candidate

- `npm run surfaces:test`: verde, 4 contratos Node e 24 testes Vitest;
- `npm run surfaces:audit`: verde;
- `npm run test:unit`: verde, 80 arquivos e 418 testes;
- `npm run experience:coherence:test`: verde;
- `npm run journeys:test`: verde;
- `npm run civic-graph:test`: verde;
- `npm run quality:test`: verde;
- `npm run security:test`: verde;
- `npm run surfaces:quality`: verde;
- `npm run surfaces:collect`: verde;
- `npm run typecheck`: verde;
- `npm run lint`: verde;
- `npm run build`: verde, 95 páginas estáticas geradas;
- `npm run smoke:no-leak-http`: verde contra Production com o domínio explícito;
- browser autenticado em cinco viewports, regressões completas, Preview e
  Production permanecem gates da PR e do fechamento pós-merge.

O primeiro run autenticado da PR passou 34/35 cenários e encontrou overflow em
390 px na Observabilidade: o identificador técnico do blocker era renderizado
sem ponto de quebra. O contrato continua contendo o estado canônico; a UI passou
a apresentar a mesma condição em linguagem humana e sem ampliar o viewport.

## Roadmap

Próximo tijolo, sem iniciá-lo: **47.9D — Ensaio humano, aparelhos reais e
consolidação**. Permanecem em paralelo 47.8A, fechamento do provider 47.9B,
Calçadas e conteúdo cultural real.
