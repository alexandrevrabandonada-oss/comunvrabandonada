# Auditoria do grafo cívico — Tijolo 47.9A4

Auditoria técnica; não é ensaio humano. Não contém conteúdo, IDs ou sessões privadas.

## Fontes canônicas

| Origem | Destino | Chave | Fonte canônica | Pública | Disponível | Lacuna |
|---|---|---|---|---|---|---|
| territory | pauta | comun_pauta_spaces.territory_id | comun_hub_territories.id | true | true | — |
| community | pauta | comun_pauta_spaces.community | comun_communities.slug (is_active lookup without seed fallback) | true | projection | Texto legado sem chave estrangeira; só navegar após confirmação pública do slug. |
| pauta | contribution | comun_pauta_contributions.pauta_id | comun_pauta_spaces.id | moderated | true | Somente approved_public pode ser projetada publicamente. |
| pauta | decision | comun_pauta_decisions.pauta_id | comun_pauta_spaces.id | status-dependent | true | Decisões internas não podem entrar no contexto público. |
| pauta | action | comun_mobilization_actions.pauta_id | comun_pauta_spaces.id | visibility=public | true | — |
| pauta | task | comun_pauta_tasks.pauta_id | comun_pauta_spaces.id | visibility-dependent | true | Tarefas internas permanecem fora do grafo público. |
| action | task | comun_pauta_tasks.action_id | comun_mobilization_actions.id | visibility-dependent | true | — |
| report | protocol | comun_official_protocols.report_id | comun_reports.id | public projection | true | Não há FK direta pauta→protocolo em todos os fluxos. |
| pauta | result | comun_hub_results.pauta_id | comun_pauta_spaces.id | visibility=public | true | — |
| action | result | comun_hub_results.action_id | comun_mobilization_actions.id | visibility=public | true | — |
| territory | result | comun_hub_results.territory_id | comun_hub_territories.id | visibility=public | true | — |
| pauta/action/result/territory | memory | comun_hub_archive_links (exactly one FK) | comun_archive_items.id | published item only | true | Polimorfismo é explícito na junção; não inferir por título. |
| pauta | miniapp | comun_pauta_modules.pauta_id | comun_pauta_spaces.id | visibility=public | true | Calçadas possui projeção própria; suas contagens não equivalem a relatos da pauta. |
| radio_program | territory/pauta | territory_id / pauta_id | comun_radio_programs | publication_status=published | true | Vínculos são opcionais por desenho editorial. |
| radio_episode | territory/pauta/action | territory_id / pauta_id / action_id | comun_radio_episodes | publication_status=published | true | Vínculos são opcionais; ausência não é inconsistência. |
| artwork | territory | comun_archive_artworks.territory_id | comun_hub_territories.id | published archive item | true | Obra cultural não exige pauta. |

## Findings

| Rota | Família | Finding | Severidade | Decisão de migração |
|---|---|---|---|---|
| /comun/territorios | territories | legacy_token_in_fallback_source | info | preserve_legacy_fallback; auditor validates the V2 branch separately |
| /comun/territorios/[slug] | territories | legacy_token_in_fallback_source | info | preserve_legacy_fallback; auditor validates the V2 branch separately |
| /comun/comunidades | communities | legacy_token_in_fallback_source | info | preserve_legacy_fallback; auditor validates the V2 branch separately |
| /comun/pautas | pautas | legacy_token_in_fallback_source | info | preserve_legacy_fallback; auditor validates the V2 branch separately |
| /comun/pautas/[slug] | pautas | legacy_token_in_fallback_source | info | preserve_legacy_fallback; auditor validates the V2 branch separately |
| /comun/resultados | results | legacy_token_in_fallback_source | info | preserve_legacy_fallback; auditor validates the V2 branch separately |
| /comun/acervo | archive | legacy_token_in_fallback_source | info | preserve_legacy_fallback; auditor validates the V2 branch separately |
| /comun/acervo/colecoes | archive | legacy_token_in_fallback_source | info | preserve_legacy_fallback; auditor validates the V2 branch separately |
| /comun/acervo/colecoes/[slug] | archive | legacy_token_in_fallback_source | info | preserve_legacy_fallback; auditor validates the V2 branch separately |
| /comun/acervo/musica | music | legacy_token_in_fallback_source | info | preserve_legacy_fallback; auditor validates the V2 branch separately |
| /comun/acervo/musica/[slug] | music | legacy_token_in_fallback_source | info | preserve_legacy_fallback; auditor validates the V2 branch separately |
| /comun/acervo/historias-orais | oral_history | legacy_token_in_fallback_source | info | preserve_legacy_fallback; auditor validates the V2 branch separately |
| /comun/radio | radio | legacy_token_in_fallback_source | info | preserve_legacy_fallback; auditor validates the V2 branch separately |
| /comun/radio/programas/[slug] | radio | legacy_token_in_fallback_source | info | preserve_legacy_fallback; auditor validates the V2 branch separately |
| /comun/admin/acervo/[id] | admin | legacy_visual_language_scheduled_for_47.9A5 | info | record_only_do_not_fail_47.9A4 |
| /comun/admin/acervo/arte/[id] | admin | legacy_visual_language_scheduled_for_47.9A5 | info | record_only_do_not_fail_47.9A4 |
| /comun/admin/acervo/arte/contribuicoes | admin | legacy_visual_language_scheduled_for_47.9A5 | info | record_only_do_not_fail_47.9A4 |
| /comun/admin/acervo/arte/creditos | admin | legacy_visual_language_scheduled_for_47.9A5 | info | record_only_do_not_fail_47.9A4 |
| /comun/admin/acervo/arte/direitos | admin | legacy_visual_language_scheduled_for_47.9A5 | info | record_only_do_not_fail_47.9A4 |
| /comun/admin/acervo/arte/novo | admin | legacy_visual_language_scheduled_for_47.9A5 | info | record_only_do_not_fail_47.9A4 |
| /comun/admin/acervo/arte | admin | legacy_visual_language_scheduled_for_47.9A5 | info | record_only_do_not_fail_47.9A4 |
| /comun/admin/acervo/artistas/[id] | admin | legacy_visual_language_scheduled_for_47.9A5 | info | record_only_do_not_fail_47.9A4 |
| /comun/admin/acervo/artistas/contribuicoes | admin | legacy_visual_language_scheduled_for_47.9A5 | info | record_only_do_not_fail_47.9A4 |
| /comun/admin/acervo/artistas | admin | legacy_visual_language_scheduled_for_47.9A5 | info | record_only_do_not_fail_47.9A4 |
| /comun/admin/acervo/artistas/pendencias | admin | legacy_visual_language_scheduled_for_47.9A5 | info | record_only_do_not_fail_47.9A4 |
| /comun/admin/acervo/artistas/reivindicacoes | admin | legacy_visual_language_scheduled_for_47.9A5 | info | record_only_do_not_fail_47.9A4 |
| /comun/admin/acervo/colecoes | admin | legacy_visual_language_scheduled_for_47.9A5 | info | record_only_do_not_fail_47.9A4 |
| /comun/admin/acervo/contribuicoes/[id] | admin | legacy_visual_language_scheduled_for_47.9A5 | info | record_only_do_not_fail_47.9A4 |
| /comun/admin/acervo/contribuicoes | admin | legacy_visual_language_scheduled_for_47.9A5 | info | record_only_do_not_fail_47.9A4 |
| /comun/admin/acervo/historias-orais/[id] | admin | legacy_visual_language_scheduled_for_47.9A5 | info | record_only_do_not_fail_47.9A4 |
| /comun/admin/acervo/historias-orais/consentimentos | admin | legacy_visual_language_scheduled_for_47.9A5 | info | record_only_do_not_fail_47.9A4 |
| /comun/admin/acervo/historias-orais/novo | admin | legacy_visual_language_scheduled_for_47.9A5 | info | record_only_do_not_fail_47.9A4 |
| /comun/admin/acervo/historias-orais | admin | legacy_visual_language_scheduled_for_47.9A5 | info | record_only_do_not_fail_47.9A4 |
| /comun/admin/acervo/historias-orais/piloto | admin | legacy_visual_language_scheduled_for_47.9A5 | info | record_only_do_not_fail_47.9A4 |
| /comun/admin/acervo/historias-orais/transcricoes | admin | legacy_visual_language_scheduled_for_47.9A5 | info | record_only_do_not_fail_47.9A4 |
| /comun/admin/acervo/historias-orais/transcricoes/trabalho | admin | legacy_visual_language_scheduled_for_47.9A5 | info | record_only_do_not_fail_47.9A4 |
| /comun/admin/acervo/identificacao/[id] | admin | legacy_visual_language_scheduled_for_47.9A5 | info | record_only_do_not_fail_47.9A4 |
| /comun/admin/acervo/identificacao | admin | legacy_visual_language_scheduled_for_47.9A5 | info | record_only_do_not_fail_47.9A4 |
| /comun/admin/acervo/musica/[id] | admin | legacy_visual_language_scheduled_for_47.9A5 | info | record_only_do_not_fail_47.9A4 |
| /comun/admin/acervo/musica/observabilidade | admin | legacy_visual_language_scheduled_for_47.9A5 | info | record_only_do_not_fail_47.9A4 |
| /comun/admin/acervo/novo | admin | legacy_visual_language_scheduled_for_47.9A5 | info | record_only_do_not_fail_47.9A4 |
| /comun/admin/acervo | admin | legacy_visual_language_scheduled_for_47.9A5 | info | record_only_do_not_fail_47.9A4 |
| /comun/admin/acervo/processamento/[id] | admin | legacy_visual_language_scheduled_for_47.9A5 | info | record_only_do_not_fail_47.9A4 |
| /comun/admin/acervo/processamento | admin | legacy_visual_language_scheduled_for_47.9A5 | info | record_only_do_not_fail_47.9A4 |
| /comun/admin/acervo/storage | admin | legacy_visual_language_scheduled_for_47.9A5 | info | record_only_do_not_fail_47.9A4 |
| /comun/admin/acervo/sugestoes | admin | legacy_visual_language_scheduled_for_47.9A5 | info | record_only_do_not_fail_47.9A4 |
| /comun/admin/acervo/verificacao | admin | legacy_visual_language_scheduled_for_47.9A5 | info | record_only_do_not_fail_47.9A4 |
| /comun/admin/acoes | admin | legacy_visual_language_scheduled_for_47.9A5 | info | record_only_do_not_fail_47.9A4 |
| /comun/admin/alertas | admin | legacy_visual_language_scheduled_for_47.9A5 | info | record_only_do_not_fail_47.9A4 |
| /comun/admin/anexos | admin | legacy_visual_language_scheduled_for_47.9A5 | info | record_only_do_not_fail_47.9A4 |
| /comun/admin/auditoria | admin | legacy_visual_language_scheduled_for_47.9A5 | info | record_only_do_not_fail_47.9A4 |
| /comun/admin/calcadas/encaminhamentos/[id] | admin | legacy_visual_language_scheduled_for_47.9A5 | info | record_only_do_not_fail_47.9A4 |
| /comun/admin/calcadas/operacao | admin | legacy_visual_language_scheduled_for_47.9A5 | info | record_only_do_not_fail_47.9A4 |
| /comun/admin/calcadas | admin | legacy_visual_language_scheduled_for_47.9A5 | info | record_only_do_not_fail_47.9A4 |
| /comun/admin/calcadas/piloto | admin | legacy_visual_language_scheduled_for_47.9A5 | info | record_only_do_not_fail_47.9A4 |
| /comun/admin/calcadas/prioridade | admin | legacy_visual_language_scheduled_for_47.9A5 | info | record_only_do_not_fail_47.9A4 |
| /comun/admin/comunidades | admin | legacy_visual_language_scheduled_for_47.9A5 | info | record_only_do_not_fail_47.9A4 |
| /comun/admin/dossies/[id] | admin | legacy_visual_language_scheduled_for_47.9A5 | info | record_only_do_not_fail_47.9A4 |
| /comun/admin/dossies/[id]/preview | admin | legacy_visual_language_scheduled_for_47.9A5 | info | record_only_do_not_fail_47.9A4 |
| /comun/admin/dossies | admin | legacy_visual_language_scheduled_for_47.9A5 | info | record_only_do_not_fail_47.9A4 |
| /comun/admin/dossies/revisoes | admin | legacy_visual_language_scheduled_for_47.9A5 | info | record_only_do_not_fail_47.9A4 |
| /comun/admin/equipe | admin | legacy_visual_language_scheduled_for_47.9A5 | info | record_only_do_not_fail_47.9A4 |
| /comun/admin/lancamento | admin | legacy_visual_language_scheduled_for_47.9A5 | info | record_only_do_not_fail_47.9A4 |
| /comun/admin/notificacoes | admin | legacy_visual_language_scheduled_for_47.9A5 | info | record_only_do_not_fail_47.9A4 |
| /comun/admin/observabilidade | admin | legacy_visual_language_scheduled_for_47.9A5 | info | record_only_do_not_fail_47.9A4 |
| /comun/admin/observatorios/[id]/campanhas/[campaignId]/acessos | admin | legacy_visual_language_scheduled_for_47.9A5 | info | record_only_do_not_fail_47.9A4 |
| /comun/admin/observatorios/[id]/campanhas/[campaignId] | admin | legacy_visual_language_scheduled_for_47.9A5 | info | record_only_do_not_fail_47.9A4 |
| /comun/admin/observatorios/[id]/campanhas/[campaignId]/prontidao | admin | legacy_visual_language_scheduled_for_47.9A5 | info | record_only_do_not_fail_47.9A4 |
| /comun/admin/observatorios/[id] | admin | legacy_visual_language_scheduled_for_47.9A5 | info | record_only_do_not_fail_47.9A4 |
| /comun/admin/observatorios | admin | legacy_visual_language_scheduled_for_47.9A5 | info | record_only_do_not_fail_47.9A4 |
| /comun/admin/operacao/[id] | admin | legacy_visual_language_scheduled_for_47.9A5 | info | record_only_do_not_fail_47.9A4 |
| /comun/admin/operacao | admin | legacy_visual_language_scheduled_for_47.9A5 | info | record_only_do_not_fail_47.9A4 |
| /comun/admin/operacao/superficies/[surface] | admin | legacy_visual_language_scheduled_for_47.9A5 | info | record_only_do_not_fail_47.9A4 |
| /comun/admin/organizacao/calendario | admin | legacy_visual_language_scheduled_for_47.9A5 | info | record_only_do_not_fail_47.9A4 |
| /comun/admin/organizacao/entrada | admin | legacy_visual_language_scheduled_for_47.9A5 | info | record_only_do_not_fail_47.9A4 |
| /comun/admin/organizacao/entrada/vincular | admin | legacy_visual_language_scheduled_for_47.9A5 | info | record_only_do_not_fail_47.9A4 |
| /comun/admin/organizacao | admin | legacy_visual_language_scheduled_for_47.9A5 | info | record_only_do_not_fail_47.9A4 |
| /comun/admin/pautas/[id]/aplicativo | admin | legacy_visual_language_scheduled_for_47.9A5 | info | record_only_do_not_fail_47.9A4 |
| /comun/admin/pautas/[id] | admin | legacy_visual_language_scheduled_for_47.9A5 | info | record_only_do_not_fail_47.9A4 |
| /comun/admin/pautas/contribuicoes | admin | legacy_visual_language_scheduled_for_47.9A5 | info | record_only_do_not_fail_47.9A4 |
| /comun/admin/pautas | admin | legacy_visual_language_scheduled_for_47.9A5 | info | record_only_do_not_fail_47.9A4 |
| /comun/admin/protocolos-oficiais | admin | legacy_visual_language_scheduled_for_47.9A5 | info | record_only_do_not_fail_47.9A4 |
| /comun/admin/radio/consentimentos | admin | legacy_visual_language_scheduled_for_47.9A5 | info | record_only_do_not_fail_47.9A4 |
| /comun/admin/radio/contribuicoes | admin | legacy_visual_language_scheduled_for_47.9A5 | info | record_only_do_not_fail_47.9A4 |
| /comun/admin/radio/direitos | admin | legacy_visual_language_scheduled_for_47.9A5 | info | record_only_do_not_fail_47.9A4 |
| /comun/admin/radio/episodios/[id] | admin | legacy_visual_language_scheduled_for_47.9A5 | info | record_only_do_not_fail_47.9A4 |
| /comun/admin/radio/episodios/novo | admin | legacy_visual_language_scheduled_for_47.9A5 | info | record_only_do_not_fail_47.9A4 |
| /comun/admin/radio/episodios | admin | legacy_visual_language_scheduled_for_47.9A5 | info | record_only_do_not_fail_47.9A4 |
| /comun/admin/radio/grade | admin | legacy_visual_language_scheduled_for_47.9A5 | info | record_only_do_not_fail_47.9A4 |
| /comun/admin/radio | admin | legacy_visual_language_scheduled_for_47.9A5 | info | record_only_do_not_fail_47.9A4 |
| /comun/admin/radio/programas/novo | admin | legacy_visual_language_scheduled_for_47.9A5 | info | record_only_do_not_fail_47.9A4 |
| /comun/admin/radio/programas | admin | legacy_visual_language_scheduled_for_47.9A5 | info | record_only_do_not_fail_47.9A4 |
| /comun/admin/relatos/[id] | admin | legacy_visual_language_scheduled_for_47.9A5 | info | record_only_do_not_fail_47.9A4 |
| /comun/admin/rodas/[id] | admin | legacy_visual_language_scheduled_for_47.9A5 | info | record_only_do_not_fail_47.9A4 |
| /comun/admin/rodas | admin | legacy_visual_language_scheduled_for_47.9A5 | info | record_only_do_not_fail_47.9A4 |
| /comun/admin/territorio | admin | legacy_visual_language_scheduled_for_47.9A5 | info | record_only_do_not_fail_47.9A4 |

## Totais agregados

```json
{
  "appRouterPages": 189,
  "firstWaveRoutes": 27,
  "sourceRelations": 16,
  "relationalScenarios": 18,
  "findings": 96,
  "blocking": 0,
  "adminDeferred": 82
}
```
