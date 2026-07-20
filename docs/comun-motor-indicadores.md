# Motor de indicadores

`generateObservatoryMetricSnapshots` lê somente observações `accepted`, aplica configurações permitidas, registra período, amostra, cobertura, limitações e versão metodológica e faz upsert idempotente. Não executa SQL cadastrado. Ausência de dado é diferente de zero e amostra abaixo do mínimo não produz snapshot.

Publicação é humana: `internal → review → approved_public`. Exportações CSV/JSON incluem somente agregados aprovados e sanitizados.
