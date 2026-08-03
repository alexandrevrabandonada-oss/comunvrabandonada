# Consistência agregada do grafo cívico

Execução somente leitura. Estado: **consistent**. Nenhum ID ou conteúdo privado é coletado.

| Número | Escopo | Fonte | Filtros | Visibilidade | Estado | Referência | Contagem |
|---|---|---|---|---|---|---|---|
| territories_public | territórios formais públicos | comun_hub_territories | visibility='public' | public | active or archived | 2026-08-02T20:28:56.146Z | 0 |
| pautas_public | pautas públicas | comun_pauta_spaces | visibility='public' | public | all public states | 2026-08-02T20:28:56.146Z | 1 |
| pautas_public_without_territory | pautas públicas sem território formal | comun_pauta_spaces | visibility='public' and territory_id is null | public | all public states | 2026-08-02T20:28:56.146Z | 1 |
| pautas_with_unmatched_community | pautas com projeção comunitária sem comunidade pública correspondente | comun_pauta_spaces + comun_communities | community is not null; slug não confirmado | public | active projection | 2026-08-02T20:28:56.146Z | 0 |
| contributions_approved_public | contribuições aprovadas na pauta | comun_pauta_contributions + comun_pauta_spaces | contribution.status='approved'; pauta public/non-archived | public | approved | 2026-08-02T20:28:56.146Z | 0 |
| actions_public | ações públicas | comun_mobilization_actions | visibility='public' | public | all action states | 2026-08-02T20:28:56.146Z | 0 |
| results_public | resultados publicados | comun_hub_results | visibility='public' | public | all verification states | 2026-08-02T20:28:56.146Z | 0 |
| results_public_without_origin | resultados públicos sem pauta nem ação | comun_hub_results | visibility='public'; pauta_id/action_id null | public | all verification states | 2026-08-02T20:28:56.146Z | 0 |
| results_verified | resultados verificados | comun_hub_results | visibility='public' and verification_status='verified' | public | verified | 2026-08-02T20:28:56.146Z | 0 |
| sidewalk_records_published | registros publicados de Calçadas | comun_sidewalk_records | status='published' and visibility='public' | public | published | 2026-08-02T20:28:56.146Z | 0 |
| archive_items_public | itens editoriais públicos | comun_archive_items | status='published' and visibility='public' | public | published | 2026-08-02T20:28:56.146Z | 0 |
| archive_links_public | relações públicas entre memória e processo | comun_hub_archive_links + comun_archive_items | item published/public | public | published | 2026-08-02T20:28:56.146Z | 0 |
| radio_episodes_public | episódios públicos | comun_radio_episodes | publication_status='published' | public | published | 2026-08-02T20:28:56.146Z | 0 |
| radio_episodes_without_civic_relation | episódios sem território, pauta ou ação | comun_radio_episodes | published; três FKs null | public | published | 2026-08-02T20:28:56.146Z | 0 |
| invalid_public_slugs | slugs públicos fora do contrato | territories+pautas+actions+results+archive | slug !~ canonical regex | public | published/public | 2026-08-02T20:28:56.146Z | 0 |

## Findings

| Tipo | Severidade | Contagem | Decisão |
|---|---|---:|---|
| public_entity_without_territory | warning | 1 | exibir somente contexto comprovado e tratar aditivamente |

> Registros públicos de Calçadas e relatos aprovados da pauta são escopos distintos; os números permanecem separados e rotulados.
