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

## Verificação

TypeScript, ESLint, Vitest, build, smokes, Playwright/axe, auditoria RLS, lint do banco, audit de dependências e deploy são registrados no fechamento do gate. A suíte unitária passou com 43 testes durante a implementação.

## Riscos e próximo tijolo

O principal risco é a heterogeneidade das respostas HEAD por plataforma; a mitigação é a allowlist explícita e auditável. Próximo tijolo recomendado: observar 30 dias de dados reais antes de calibrar SLOs ou adotar snapshots diários.
