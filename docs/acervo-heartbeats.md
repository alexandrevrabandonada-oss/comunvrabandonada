# Heartbeats do worker

Cada chamada cria heartbeat running e termina passed, partial ou failed com contadores sanitizados. Saúde usa janelas de 30 e 60 minutos. Retenção padrão: 90 dias, com script dry-run e confirmação explícita.
