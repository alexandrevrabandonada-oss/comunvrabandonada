# Diagnóstico do encaminhamento das calçadas — Sprint 37.2

**Data:** 20/07/2026
**Escopo:** auditoria local, sem dados ou serviços remotos

## Conclusão

O projeto já possui as fontes de verdade necessárias para relato, protocolo, ação, resultado e memória, mas não possui uma entidade de processo que preserve a relação entre elas e a prioridade das calçadas. A lacuna é de vínculo e workflow, não de conteúdo. A solução mínima é uma relação operacional única, server-side, que reutilize `comun_reports`, `comun_official_protocols`, `comun_hub_results` e `comun_sidewalk_cycle_memories`.

## Mapa do domínio existente

| Etapa | Tabela / relação | Foreign keys atuais | Server Action / rota | Capacidade | RLS | Público | Privado | Lacuna |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Prioridade | `comun_sidewalk_priorities` | pauta, síntese, registro | `createSidewalkPriority`; `/comun/admin/calcadas/prioridade` | admin/editor | service-role only | decisão, critérios, resumo e limitações aprovados | responsável e estados em revisão | não aponta para ação, relato ou protocolo |
| Ação | `comun_mobilization_actions` | pauta, projeto, território e registro opcional | criada junto da prioridade; `/comun/acoes/[slug]` | admin/editor | service-role only | objetivo, participação, orientação e resultado esperado | responsável, equipe, riscos e local interno | prioridade e ação só se encontram indiretamente pela síntese |
| Registros | `comun_sidewalk_record_links` | registro + `target_type`/`target_id` genéricos | sem operação específica no fluxo atual | admin/editor | service-role only | projeção server-side limitada | IDs e notas de vínculo | adequada para rastrear registros, mas não representa o workflow completo |
| Relato | `comun_reports` | comunidade e pauta temática legada (`issue_slug`) | `submitReport`, revisão em `/comun/admin/relatos/[id]` | curadoria administrativa | RLS ativa; mutação server-side | protocolo COMUN e texto sanitizado quando autorizado | bruto, contato, localização, risco e notas | não possui FK para pauta do Hub, prioridade ou ação |
| Protocolo | `comun_official_protocols` | `report_id` obrigatório; registro de calçada opcional | draft e atualização em `/comun/admin/relatos/[id]` | `protocol_operator` previsto na matriz | RLS ativa; mutação server-side | número/resumo somente quando permitido | texto gerado, resposta original e notas | depende de relato e não conhece prioridade/ação |
| Resposta | colunas de `comun_official_protocols` | mesmo protocolo | atualização administrativa existente | `protocol_operator` | mesma RLS do protocolo | `public_summary` | `response_text`, documento e notas | estados atuais são genéricos e não atualizam a linha das calçadas |
| Resultado | `comun_hub_results` | pauta, ação, território e registro opcional | `createHubResult`; `/comun/admin/organizacao` | `result_editor` previsto | service-role only | resumo, evidência e verificação publicados | notas privadas e autoria operacional | não referencia protocolo nem prioridade; UI não permite escolher ação |
| Memória | `comun_sidewalk_cycle_memories` | pauta, registro, snapshot, roda, síntese, ação, protocolo, resultado e itens do Acervo | somente leitura pública; rota de memória | curadoria ainda sem superfície dedicada | service-role only | somente `published/public` | drafts e metodologia antes da revisão | não existe Server Action nem tela para criar/revisar/publicar |
| Acervo | `comun_archive_items` + `comun_hub_archive_links` | pauta/ação/resultado/projeto/território | operação editorial do Acervo | `archive_curator` | service-role e projeções públicas | item publicado e vínculo público | original, direitos e notas | memória das calçadas já tem modelo próprio; não deve nascer outro Acervo |
| Auditoria | `comun_admin_audit_log` e operação editorial | alvo tipado + metadados sanitizados | `logComunAdminAction` | conforme ação | server-side | nenhum log bruto público | identidade administrativa e decisão | novas transições precisam emitir eventos sanitizados |

## Estruturas genéricas avaliadas

- `comun_sidewalk_record_links` deve continuar sendo usado para relacionar cada registro a encaminhamento, protocolo, resultado e memória.
- `comun_pauta_timeline_events` já aceita `action_id`, `protocol_id` e `result_id`, mas não guarda estado operacional nem revisão humana.
- `comun_hub_archive_links` preserva resultados no Acervo, porém não substitui a memória específica do ciclo.
- `comun_editorial_operation_*` oferece fila e auditoria transversal, mas não contém o payload público nem as relações da prioridade.

Nenhuma dessas estruturas, isoladamente, representa o processo completo. Não é seguro sobrecarregar `target_type/target_id` com o estado do encaminhamento.

## Relação mínima necessária

Criar uma única entidade `comun_sidewalk_forwardings` com:

- FKs para pauta, prioridade, síntese, ação, relato, protocolo, resultado e memória;
- estado controlado de `draft` a `closed`;
- projeção pública revisável: título, objetivo, território, resumo, metodologia, limitações, proposta e pedido;
- snapshot público dos registros e fotografias já aprovados, sem copiar originais ou geometria privada;
- criador, revisor, datas de aprovação e histórico sanitizado;
- RLS habilitada, `anon` e `authenticated` sem acesso direto e escrita somente server-side.

A entidade não substitui nenhuma fonte de verdade. Ela apenas coordena e torna rastreável o caminho entre as fontes existentes.

## Regras de implementação

1. Preparação reaproveita somente projeções públicas.
2. Aprovação é uma transição explícita e auditada.
3. Protocolo continua sendo uma linha de `comun_official_protocols` ligada ao `comun_report` do encaminhamento.
4. Resposta privada permanece no protocolo; somente resumo aprovado entra na projeção pública.
5. Resultado continua em `comun_hub_results` e exige evidência/justificativa.
6. Memória continua em `comun_sidewalk_cycle_memories`, nasce como draft e só se torna pública após revisão humana.
7. Nenhuma transição marca automaticamente um registro como resolvido.

## Declarações

- Piloto público: **NÃO ABERTO**
- Push/deploy: **NÃO EXECUTADOS**
- Supabase/R2/tiles remotos: **NÃO UTILIZADOS**
- Dados e protocolos reais: **NÃO UTILIZADOS / NÃO ENVIADOS**
- Custo externo: **R$ 0**
