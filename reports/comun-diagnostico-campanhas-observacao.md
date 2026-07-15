# Diagnóstico pré-migração — Campanhas de observação

Data: 15/07/2026. Este diagnóstico antecede a migration da Sprint 27.1.

## Reuso confirmado

- O motor da Sprint 27 já possui observatórios, metodologia e formulário versionados, observações `pending`, revisão, deduplicação, métricas e snapshots. A campanha deve coordenar esse fluxo, não reimplementá-lo.
- Pautas, ações, tarefas, evidências e a Sala de Organização já formam o caminho editorial. Uma campanha aprovada pode produzir uma evidência agregada e sugerir ação, jamais publicar payload bruto.
- Transporte já calcula espera, atraso e serviço não realizado no servidor. O modo de campo reutilizará as mesmas regras e criará observações privadas pendentes.
- Mapa Popular fornece território e entidades monitoradas; o plano de amostragem pode referenciá-los sem rastrear pessoa ou localização contínua.
- Scheduler do Acervo permanece saudável e fora de escopo: cron, secrets, endpoint e fila não serão alterados.

## Lacuna e decisão

Faltam uma unidade explícita de campanha, plano e turnos de amostragem, designação de equipe, diário privado, revisão de qualidade distinta de cobertura e relatório editorial de campanha. Serão criadas tabelas service-role only, com RLS e grants explícitos, todas ligadas ao motor existente por chaves estrangeiras.

## Segurança e piloto

Dados pessoais de equipe, instruções, notas de campo, payloads, hashes e diários permanecem exclusivamente administrativos. Rotas públicas só terão relatórios publicados e agregados. O modo de campo exigirá sessão de admin/editor; não haverá link aberto com dados privados. O banco não receberá campanha ou observação real nesta sprint: os smokes usam fixtures descartáveis e verificam o cleanup.

## Critérios de regressão

Hub, Mapa, portal de observatórios, RLS, scheduler e superfícies públicas serão rechecados. Só será aberta correção do scheduler diante de falha comprovada; até este ponto não há alerta crítico, fila ou retry pendente reportado.
