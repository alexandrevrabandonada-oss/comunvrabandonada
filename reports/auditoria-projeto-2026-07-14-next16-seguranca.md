# Auditoria do projeto COMUN — Next 16, dependências e segurança

Data: 2026-07-14  
Escopo: aplicação Next.js, dependências, Supabase/RLS, autenticação administrativa, headers HTTP, build e smokes críticos.

## Resumo executivo

O projeto tinha boa separação entre conteúdo interno e público, autenticação administrativa validada também no servidor, RLS nas tabelas expostas e uma suíte ampla de smokes. Os principais débitos eram a permanência em Next 14/React 18, 28 vulnerabilidades reportadas pelo npm, uso das APIs síncronas removidas no Next 16, lint preso ao comando removido `next lint` e ausência de headers defensivos globais.

A aplicação foi atualizada para Next 16.2.10 e React 19.2.7. O build com Turbopack, TypeScript, lint e os fluxos críticos passaram. O total do `npm audit` caiu de 28 vulnerabilidades (1 crítica, 5 altas e 22 moderadas) para 2 moderadas, ambas transitivas no PostCSS empacotado pelo Next e sem correção estável disponível na data da auditoria.

## Inventário auditado

- Next.js App Router com 44 rotas de aplicação/API após a migração;
- 121 arquivos TypeScript/TSX/MJS no repositório;
- Supabase Auth, Postgres, RLS e cliente `service_role` restrito ao servidor;
- Cloudflare R2 por AWS SDK v3;
- administração de relatos, pautas, dossiês, protocolos e Acervo;
- scripts de smoke, backup e auditoria RLS;
- Vercel como runtime de aplicação.

## Achados por prioridade

### Alta — framework e runtime defasados

Antes: Next 14.2.35, React/React DOM 18.3.1 e APIs síncronas de `cookies`, `headers`, `params` e `searchParams`.

Risco: linha antiga, maior custo de manutenção e incompatibilidade com as APIs atuais. Embora 14.2.35 já contivesse correções importantes da linha 14, o projeto estava duas versões principais atrás.

Tratamento: atualização para Next 16.2.10, React/React DOM 19.2.7, Node mínimo 20.9 e migração das APIs assíncronas com o codemod oficial e correções manuais.

### Alta — dependências vulneráveis

Antes: 28 vulnerabilidades no `npm audit`, concentradas principalmente na versão antiga do AWS SDK adicionada ao R2.

Tratamento: AWS SDK atualizado para 3.1086.0; Next/React, Supabase JS e Supabase SSR atualizados; versões críticas fixadas exatamente no `package.json` e lockfile regenerado.

Resultado: 2 vulnerabilidades moderadas transitivas. O audit sugere uma regressão inválida para Next 9 ao usar `--force`; essa ação não deve ser executada. Monitorar a próxima versão estável do Next que incorpore PostCSS corrigido.

### Média — comando de lint removido

Antes: `next lint`, removido no Next 16.

Tratamento: ESLint 9, configuração flat `eslint.config.mjs`, `eslint-config-next` 16.2.10 e script `eslint .`.

### Média — headers HTTP incompletos

Tratamento em `next.config.mjs`:

- remoção de `X-Powered-By`;
- `X-Content-Type-Options: nosniff`;
- `X-Frame-Options: DENY`;
- `Referrer-Policy: strict-origin-when-cross-origin`;
- `Permissions-Policy` restritiva;
- `Cross-Origin-Opener-Policy: same-origin`;
- HSTS por um ano com subdomínios.

Os headers foram confirmados por HTTP no servidor local de produção.

### Média — convenção de middleware obsoleta

Tratamento: `middleware.ts` foi migrado para `proxy.ts`, mantendo a atualização de sessão Supabase. A autorização sensível continua sendo revalidada em Server Components, Server Actions e Route Handlers, não dependendo apenas do proxy.

### Média — smoke público desatualizado

O smoke procurava “Dossies do COMUN” e “Ver dossie”, textos já substituídos pela interface atual. Foi atualizado para “Dossies publicados” e “Filtrar dossies”; a suíte pública passou integralmente.

### Baixa — imagens remotas do R2

As páginas do Acervo usam `<img>` porque o domínio público R2 é configurável por ambiente. A regra do Next foi documentadamente suprimida nesses dois arquivos. Depois de estabilizar o domínio R2, recomenda-se configurar `images.remotePatterns` e migrar para `next/image`.

### Baixa — organização e manutenibilidade

- `app/actions.ts` concentra muitas responsabilidades e deve ser dividido por domínio;
- algumas páginas novas do Acervo têm JSX excessivamente condensado;
- faltam testes unitários para validação de direitos, MIME/tamanho e sanitização de metadados;
- o projeto depende fortemente de smokes integrados e do banco remoto;
- faltam error boundaries e loading states específicos nos módulos principais.

## Melhorias implementadas

1. Next 14.2.35 → 16.2.10.
2. React/React DOM 18.3.1 → 19.2.7.
3. APIs `params`, `searchParams`, `cookies()` e `headers()` migradas para async.
4. `middleware.ts` → `proxy.ts`.
5. ESLint 8/`next lint` → ESLint 9 flat config.
6. AWS SDK do R2 atualizado para 3.1086.0.
7. Supabase JS atualizado para 2.110.5 e SSR para 0.12.2.
8. Node mínimo `>=20.9.0` registrado.
9. Headers HTTP defensivos globais adicionados.
10. Formulário do Acervo refatorado para não criar componentes durante render.
11. Smoke público alinhado à interface atual.
12. Dependências críticas fixadas em versões exatas e lockfile atualizado.

## Verificação

- `npm run lint`: passou, zero erros e zero avisos;
- `npm run typecheck`: passou;
- `npm run build`: passou com Next 16.2.10/Turbopack;
- `npm run verify`: passou;
- `npm run smoke:archive-foundation`: passou;
- `npm run smoke:pauta-dossier-publication`: passou;
- `npm run smoke:no-leak-http`: passou;
- `npm run smoke:admin-auth`: passou;
- `npm run smoke:public-ui`: passou;
- `npx supabase db lint --linked`: passou, sem erros de schema;
- headers defensivos: confirmados via HTTP.

O script `npm run audit:rls-matrix` não concluiu porque tenta acessar o banco Supabase local e o Docker/Postgres local não está ativo. O lint do schema remoto passou, mas a matriz RLS local deve ser repetida quando o Docker Desktop estiver disponível.

## Riscos restantes

1. Duas vulnerabilidades moderadas transitivas em PostCSS/Next sem correção estável; monitorar releases do Next.
2. R2 ainda precisa de credenciais, buckets e CORS reais para validar upload ponta a ponta.
3. Falta Content Security Policy. Deve ser introduzida primeiro em modo `Report-Only`, pois Server Components, scripts do Next e domínios Supabase/R2 exigem uma política calibrada.
4. O worktree contém um volume grande de alterações anteriores não commitadas. Antes de publicar, separar commits por domínio e revisar o diff contra a base correta.
5. Executar matriz RLS local com Docker e repetir os smokes de release em produção.
6. Configurar `next/image` após fixar o domínio público R2.

## Próximas melhorias recomendadas

1. Criar uma etapa de CI com `npm ci`, lint, typecheck, build, `npm audit --audit-level=high` e smokes sem escrita em produção.
2. Dividir `app/actions.ts` em actions de relatos, admin, pautas, dossiês e Acervo.
3. Introduzir Vitest para regras puras e Playwright para fluxos públicos/admin.
4. Adicionar CSP em `Report-Only`, coletar violações e depois aplicar enforcement.
5. Configurar observabilidade de erros e Web Vitals sem incluir dados privados.
6. Ativar Dependabot/Renovate com agrupamento por ecossistema e janela de atualização controlada.
7. Fazer auditoria de acessibilidade com foco em navegação por teclado, labels, contraste e leitores de tela.

## Referências oficiais consultadas

- Guia oficial de atualização para Next.js 16;
- codemods oficiais do Next.js;
- requisitos de runtime Node/TypeScript do Next 16;
- changelog e recomendações de RLS/Data API do Supabase.

## Fechamento e versionamento

O conjunto auditado foi preparado para um commit único de integração porque Acervo, workflow editorial, hardening RLS e migração para Next 16 alteram arquivos compartilhados e foram verificados em conjunto. O escopo versionado inclui todas as migrations e relatórios acumulados presentes no workspace.

Arquivos deliberadamente excluídos pelo `.gitignore`: `.env*` com exceção de `.env.example`, `.next/`, `node_modules/`, `.vercel/`, logs, artefatos TypeScript e `backups/`. Nenhum valor de credencial R2 ou Supabase foi incluído no conjunto versionado.
