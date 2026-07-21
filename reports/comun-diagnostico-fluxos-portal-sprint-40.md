# Diagnóstico de fluxos — Sprint 40

## Estado de partida

O portal já possuía as entidades políticas e editoriais necessárias, porém algumas superfícies não preservavam o contexto em deep links. Havia uma ficha histórica duplicada para registro de calçada, resultados sem foco individual, busca plana e eventos da Inbox apresentados pelo nome técnico.

## Correções locais

- `ComunContextTrail` compartilhado explicita território, comunidade, pauta, ferramenta e entidade.
- Uma única tabela/serviço continua sendo fonte de verdade para cada domínio.
- A rota histórica de registro redireciona permanentemente à ficha canônica.
- Resultados e prioridades aceitam deep link focal sem criar nova entidade.
- Busca agrupa tipos e inclui a ferramenta Mapa das Calçadas.
- Inbox projeta origem, tipo de entidade, destino, importância e data a partir do evento existente.
- O mapa distingue base cartográfica real de registros demonstrativos.
- O convite PWA foi colocado no fluxo da página e suprimido nas superfícies críticas de mapa/captura.

## Decisão

Nenhum novo domínio, miniapp ou fonte de verdade foi criado. O gate humano permanece separado e não preenchido.
