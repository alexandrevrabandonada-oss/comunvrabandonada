# Sprint 22.1 — Automação e alertas do Acervo

Data: 2026-07-14

Scheduler escolhido: GitHub Actions, a cada 15 minutos e manual por workflow_dispatch. A chamada é POST Bearer, com secrets no GitHub/Vercel, concurrency e timeout. O endpoint valida source e máximo de três jobs.

Heartbeats persistem estado, duração e contadores. Saúde real classifica healthy/attention/critical. Alertas internos deduplicados cobrem heartbeat, fila, stale, dead-letter e cleanup; admin pode reconhecer, resolver ou arquivar sem alterar jobs. Endpoint health é protegido e sanitizado. Retenção de heartbeats passed é 90 dias via dry-run confirmado.

Custos observados: minutos do GitHub Actions, funções Vercel e consultas Supabase de baixa frequência; estimativa operacional, não fatura. Notificação externa não foi ativada; painel interno é obrigatório e suficiente neste sprint.

Deploy de produção concluído. O workflow manual no branch padrão `main` passou em 7 segundos; a chamada criou heartbeat `passed` com origem `scheduler`, duração server-side de 2.240 ms e fila vazia. Endpoints run/health rejeitam acesso sem Bearer e GET no run continua bloqueado. Lint, TypeScript, build, migration remota, RLS e 18 testes unitários passaram.

Primeira execução estritamente agendada confirmada em 14/07/2026: o GitHub Actions concluiu com sucesso a execução `schedule` [29363581308](https://github.com/alexandrevrabandonada-oss/comunvrabandonada/actions/runs/29363581308), iniciada às 19:53:54 UTC no branch `main`. O Supabase registrou um novo heartbeat `passed`, origem `scheduler`, iniciado às 19:53:58 UTC e finalizado às 19:53:59 UTC, com duração de 1.557 ms, fila vazia e nenhum retry ou dead-letter. O Gate 0 da automação está encerrado sem exposição de credenciais.
