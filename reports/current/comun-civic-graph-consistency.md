# Consistência agregada do grafo cívico

Execução remota somente leitura no SHA
`224617bd5b90ef549045a007e5cd5199a14f51a8`. Estado: **consistent**.
Nenhum ID ou conteúdo privado foi coletado.

| Número | Escopo | Fonte | Filtros | Visibilidade | Estado | Referência | Contagem |
|---|---|---|---|---|---|---|---:|
| 1 | territórios formais públicos | `comun_hub_territories` | `visibility='public'` | public | active or archived | 2026-08-02T00:48:43.578Z | 0 |
| 2 | pautas públicas | `comun_pauta_spaces` | `visibility='public'` | public | all public states | 2026-08-02T00:48:43.578Z | 1 |
| 3 | pautas públicas sem território formal | `comun_pauta_spaces` | `visibility='public' and territory_id is null` | public | all public states | 2026-08-02T00:48:43.578Z | 1 |
| 4 | pautas com projeção comunitária sem comunidade pública correspondente | `comun_pauta_spaces + comun_communities` | comunidade preenchida; slug não confirmado | public | active projection | 2026-08-02T00:48:43.578Z | 0 |
| 5 | contribuições aprovadas na pauta | `comun_pauta_contributions + comun_pauta_spaces` | contribuição aprovada; pauta pública/não arquivada | public | approved | 2026-08-02T00:48:43.578Z | 0 |
| 6 | ações públicas | `comun_mobilization_actions` | `visibility='public'` | public | all action states | 2026-08-02T00:48:43.578Z | 0 |
| 7 | resultados publicados | `comun_hub_results` | `visibility='public'` | public | all verification states | 2026-08-02T00:48:43.578Z | 0 |
| 8 | resultados públicos sem pauta nem ação | `comun_hub_results` | público; `pauta_id/action_id` null | public | all verification states | 2026-08-02T00:48:43.578Z | 0 |
| 9 | resultados verificados | `comun_hub_results` | público e verificado | public | verified | 2026-08-02T00:48:43.578Z | 0 |
| 10 | registros publicados de Calçadas | `comun_sidewalk_records` | publicado e público | public | published | 2026-08-02T00:48:43.578Z | 1 |
| 11 | itens editoriais públicos | `comun_archive_items` | publicado e público | public | published | 2026-08-02T00:48:43.578Z | 3 |
| 12 | relações públicas entre memória e processo | `comun_hub_archive_links + comun_archive_items` | item publicado/público | public | published | 2026-08-02T00:48:43.578Z | 0 |
| 13 | episódios públicos | `comun_radio_episodes` | `publication_status='published'` | public | published | 2026-08-02T00:48:43.578Z | 0 |
| 14 | episódios sem território, pauta ou ação | `comun_radio_episodes` | publicado; três FKs null | public | published | 2026-08-02T00:48:43.578Z | 0 |
| 15 | slugs públicos fora do contrato | territórios+pautas+ações+resultados+acervo | regex canônica | public | published/public | 2026-08-02T00:48:43.578Z | 0 |

## Findings

| Tipo | Severidade | Contagem | Decisão |
|---|---|---:|---|
| `public_entity_without_territory` | warning | 1 | exibir somente contexto comprovado e tratar aditivamente |

> Registros públicos de Calçadas e contribuições aprovadas da pauta são escopos distintos; os números permanecem separados e rotulados. Esta auditoria não é ensaio humano.
