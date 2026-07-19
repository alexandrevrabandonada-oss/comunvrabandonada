# Estado — Sprint 34: experiência integral local

Data: 19/07/2026. Estado: **implementação local verificada, não promovida**.

## Entregas

- novo worktree isolado `codex/comun-experiencia-integral-local`, baseado no último marco documentado `46b940d`;
- home pública com o título “Organize seu território. Construa soluções coletivamente.”;
- arquitetura de cinco entradas: Início, Comunidades, Participar, Territórios e Minha área;
- relação explícita território → comunidade → pauta → ferramenta → ação → resultado → memória;
- CTAs para explorar, participar e entrar, sem impedir exploração pública;
- folha acessível de participação e busca no shell;
- primitivas de contexto, próximo passo, status, timeline e estados;
- jornadas, arquitetura, diagnóstico, fricção e capturas visuais registrados.

## Evidências locais

- `npm run lint`: passou;
- `npm run typecheck`: passou;
- `npm run test:e2e:comun-integral-experience`: 15/15 passou em 360, 390, 768, 1024 e 1366 px;
- Axe da home: zero violações serious/critical;
- overflow horizontal: ausente na matriz;
- fluxo visitante: home → território → participar → busca → retorno: passou.

## Limites e preservações

- Não houve deploy, push, merge, integração com a branch principal, acesso ao Supabase remoto, R2, Vercel ou alteração de dados reais.
- Não houve mudança de scheduler, endpoint, fila ou secrets.
- O estado de abertura pública permanece sujeito aos gates humanos já documentados nas Sprints 33.1–33.2.1.
- As duas vulnerabilidades moderadas herdadas do PostCSS não foram tratadas: a sugestão disponível exige `npm audit fix --force`, fora do escopo e potencialmente quebrável.
