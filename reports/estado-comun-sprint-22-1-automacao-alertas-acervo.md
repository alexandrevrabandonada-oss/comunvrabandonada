# Sprint 22.1 — Automação e alertas do Acervo

Data: 2026-07-14

Scheduler escolhido: GitHub Actions, a cada 15 minutos e manual por workflow_dispatch. A chamada é POST Bearer, com secrets no GitHub/Vercel, concurrency e timeout. O endpoint valida source e máximo de três jobs.

Heartbeats persistem estado, duração e contadores. Saúde real classifica healthy/attention/critical. Alertas internos deduplicados cobrem heartbeat, fila, stale, dead-letter e cleanup; admin pode reconhecer, resolver ou arquivar sem alterar jobs. Endpoint health é protegido e sanitizado. Retenção de heartbeats passed é 90 dias via dry-run confirmado.

Custos observados: minutos do GitHub Actions, funções Vercel e consultas Supabase de baixa frequência; estimativa operacional, não fatura. Notificação externa não foi ativada; painel interno é obrigatório e suficiente neste sprint.

Resultados de deploy e gate agendado serão registrados após execução manual e observação do schedule.
