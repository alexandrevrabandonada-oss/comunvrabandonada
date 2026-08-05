# COMUN — 48.1A · rollback

- flag/allowlist: desligamento imediato e reversível;
- aplicação: rollback para o SHA funcional anterior;
- dados: manter append-only, sem delete automático;
- migrations: forward-only; qualquer corretiva deve ser nova migration;
- canais externos: nenhum envio automático; não há ação a desfazer;
- verificação: smoke das rotas públicas, no-leak, RLS e ausência de requests
  experimentais após o rollback.
