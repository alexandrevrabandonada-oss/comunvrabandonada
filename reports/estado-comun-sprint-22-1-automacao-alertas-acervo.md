# Sprint 22.1 — Automação e alertas do Acervo

Data: 2026-07-14

Scheduler escolhido: GitHub Actions, a cada 15 minutos e manual por workflow_dispatch. A chamada é POST Bearer, com secrets no GitHub/Vercel, concurrency e timeout. O endpoint valida source e máximo de três jobs.

Heartbeats persistem estado, duração e contadores. Saúde real classifica healthy/attention/critical. Alertas internos deduplicados cobrem heartbeat, fila, stale, dead-letter e cleanup; admin pode reconhecer, resolver ou arquivar sem alterar jobs. Endpoint health é protegido e sanitizado. Retenção de heartbeats passed é 90 dias via dry-run confirmado.

Custos observados: minutos do GitHub Actions, funções Vercel e consultas Supabase de baixa frequência; estimativa operacional, não fatura. Notificação externa não foi ativada; painel interno é obrigatório e suficiente neste sprint.

Deploy de produção concluído. O workflow manual no branch padrão `main` passou em 7 segundos; a chamada criou heartbeat `passed` com origem `scheduler`, duração server-side de 2.240 ms e fila vazia. Endpoints run/health rejeitam acesso sem Bearer e GET no run continua bloqueado. Lint, TypeScript, build, migration remota, RLS e 18 testes unitários passaram.

Primeira execução estritamente agendada: workflow confirmado `active` no branch padrão, mas o GitHub ainda não materializou o evento `schedule` da primeira janela observada. Execução manual equivalente passou e criou heartbeat real; a confirmação do primeiro heartbeat estritamente agendado permanece pendente por atraso externo do GitHub Actions.
