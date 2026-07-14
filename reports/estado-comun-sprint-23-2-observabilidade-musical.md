# Estado do COMUN — Sprint 23.2

Data: 14/07/2026

## Resultado

- Scheduler: regressão somente leitura; execução `schedule` em `main`, heartbeat `passed`, saúde `healthy`, fila vazia e sem retry/dead-letter crítico. Cron, secrets, endpoint, workflow e autenticação não foram alterados.
- RLS: Supabase local reiniciado, migrations íntegras e matriz `RLS_MATRIX_OK`; tabelas musicais, checks, histórico, direitos e reivindicações permanecem sem grants `anon/authenticated`.
- Observabilidade: dashboard administrativo agregado criado, com plataforma, status, janelas de 24h/7d/30d, checks vencidos, redirects, timeouts, sucesso/falha e latência média/p50/p95. Nenhuma URL completa ou dado privado é agregado.
- Fallback: `HEAD` padrão e `GET_HEADERS_ONLY` controlado por allowlist server-side, timeout, redirect manual, DNS renovado, bloqueio SSRF e cancelamento do body.
- SLO: metas internas e estados `on_track`, `approaching`, `overdue`, `critical`; alertas deduplicados e resolvíveis sem alteração automática das entidades.
- Performance: índices concretos para links por plataforma/status e filas de claims, rights e submissions. Agregação direta adotada; tabela diária dispensada no volume atual.
- Retenção: política existente para checks; alertas abertos preservados; screenshots apenas como evidência de release.
- Custos: sem serviço pago novo, sem armazenamento de mídia ou conteúdo externo; custo incremental restrito a queries administrativas, checks e CI.

## Verificação e produção

- `npm run verify`: passou (ESLint, TypeScript e build Next.js 16.2.10).
- Vitest: 43 testes passaram.
- Playwright/axe: 20 testes públicos passaram em 360/390/768/1366 px; painel protegido passou em 390/768/1366 px, sem violações sérias ou críticas no escopo.
- Smokes `local-music-archive`, `music-curation`, `music-observability`, `no-leak-http`, `admin-auth` e `public-ui`: passaram; fixtures foram limpas.
- Supabase local e remoto: migration aplicada, matriz `RLS_MATRIX_OK` e `db lint --linked` sem erros.
- Dependências: `npm audit --audit-level=high` sem vulnerabilidades altas; permanecem 2 moderadas transitivas do PostCSS/Next. Não foi usado `--force`.
- Scheduler: execução agendada `29372993597`, branch `main`, concluída com sucesso em 14/07/2026 22:26 UTC; regressão saudável e sem reconfiguração.
- Deploy Vercel: produção concluída e alias `https://comunvrabandonada.vercel.app` atualizado; smokes externos passaram.

## Riscos e próximo tijolo

O principal risco é a heterogeneidade das respostas HEAD por plataforma; a mitigação é a allowlist explícita e auditável. Próximo tijolo recomendado: observar 30 dias de dados reais antes de calibrar SLOs ou adotar snapshots diários.
