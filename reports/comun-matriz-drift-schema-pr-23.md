# Matriz de drift de schema — PR #23

> Documento histórico. Estado superado pelo fechamento verde da PR #23 em
> 23 de julho de 2026. Consulte
> `reports/current/estado-atual-comun.md`.

## Estado canônico atual

As 52 ausências e 15 divergências catalogadas foram cobertas pelo pacote forward-only em dois ensaios. O drift residual legado é preservado deliberadamente.

## Evidência atual

Postflight aprovado, hash final idêntico `227c39c855a626ebbe96428701848aded067acd687d2876403fcab4f80e0bbd1` e nenhuma operação `DROP TABLE` executável.

## Gates fechados

- inventário e fingerprints;
- superset de FKs de perfis/inbox;
- grants públicos de `handle_new_user()` revogados;
- reconciliação reproduzível.

## Gates pendentes

- backup completo restaurado;
- regressão integral production-like;
- duas revisões nominais;
- aplicação remota autorizada.

## Decisão

**NO_GO_REMOTE_INTEGRATION**

> Atualização de fechamento: as 52 tabelas ausentes e as 15 divergências foram reconciliadas nos dois ensaios. O drift residual é deliberado: tabelas sociais legadas, `handle_updated_at()` e `handle_new_user()` foram preservadas. `handle_new_user()` ficou sem execução por `PUBLIC`, `anon` ou `authenticated`. Nenhuma operação `DROP TABLE` do diff bruto entrou no pacote.

## HISTÓRICO — SUPERADO PELO PACOTE FORWARD-ONLY

Data: 21 de julho de 2026
Método: comparação de existência e fingerprints de colunas, constraints, índices, triggers, RLS, policies e grants dos três baselines.

## Classificações

- `ABSENT`: não existe no remoto;
- `EQUIVALENT`: remoto e final equivalentes;
- `REMOTE_AHEAD`: remoto possui evolução final antes do histórico esperado;
- `REMOTE_BEHIND`: remoto equivale ao baseline anterior e ainda requer a migration;
- `STRUCTURALLY_DIFFERENT`: existe, mas estrutura/constraints divergem;
- `POLICY_DIFFERENT`: estrutura equivalente, policies divergentes;
- `GRANT_DIFFERENT`: estrutura/policies equivalentes, grants divergentes;
- `UNKNOWN_ORIGIN`: existe fora do histórico/Git identificado.

## Inventário das 19 migrations

| Migration | Objeto(s) | Operação esperada | Existe remoto? | Classificação | Divergência principal |
|---|---|---|---|---|---|
| `20260715025948` | `comun_observation_campaign_access_grants`, `comun_observation_campaign_field_sessions`, `comun_observation_field_corrections` | criar tabelas, índices, RLS e grants internos | não | ABSENT | cadeia de campo ausente |
| `20260715025948` | `comun_observations` | adicionar vínculo/correção e constraints | sim | STRUCTURALLY_DIFFERENT | remoto permanece no formato anterior |
| `20260715032613` | `comun_pauta_modules`, `comun_construction_circles`, `comun_construction_circle_rounds`, `comun_circle_contributions`, `comun_circle_syntheses`, `comun_circle_synthesis_links`, `comun_pauta_updates`, `comun_pauta_memberships` | criar tabelas, FKs, índices, RLS e grants | não | ABSENT | objetos não existem |
| `20260715032613` | `comun_member_profiles` | criar tabela/perfil base | sim | STRUCTURALLY_DIFFERENT | já criada por `20260720005353`; FKs e ordem estrutural divergem |
| `20260715151922` | constraints/triggers `comun_guard_circle_contribution_round`, `comun_guard_circle_synthesis_round` | validar relação círculo/rodada | não | ABSENT | tabelas-base ausentes |
| `20260715155802` | `comun_member_profiles` | onboarding, termos, privacidade, status | sim | REMOTE_AHEAD + STRUCTURALLY_DIFFERENT | colunas antecipadas; FK territorial ausente e FK Auth extra |
| `20260715170058` | `comun_archive_agents`, `comun_archive_artworks`, `comun_archive_artwork_credits`, `comun_archive_artwork_rights`, `comun_archive_artwork_relations`, `comun_archive_artwork_safety_reviews`, `comun_archive_artwork_submissions`, `comun_archive_artwork_editorial_versions` | criar domínio de arte, índices, RLS/grants | não | ABSENT | domínio de arte ausente |
| `20260715170058` | `comun_archive_items`, `comun_archive_assets`, `comun_archive_processing_jobs` | ampliar checks/tipos/filas | sim | STRUCTURALLY_DIFFERENT | checks finais ainda ausentes |
| `20260715170058` | `comun_pauta_modules` | incluir módulo de arte | não | ABSENT | tabela-base ausente |
| `20260715174723` | `comun_archive_storage_uploads` | criar tickets operacionais de storage | não | ABSENT | tabela ausente |
| `20260715185344` | `comun_radio_programs`, `comun_radio_episodes`, `comun_radio_episode_chapters`, `comun_radio_schedule_entries`, `comun_radio_voice_consents`, `comun_radio_music_uses`, `comun_radio_credits`, `comun_radio_transcript_versions`, `comun_radio_contributions`, `comun_radio_safety_reviews`, `comun_radio_editorial_versions` | criar rádio, índices, triggers, RLS/grants | não | ABSENT | domínio de rádio ausente |
| `20260715185344` | `comun_archive_items`, `comun_archive_assets`, `comun_archive_processing_jobs`, `comun_pauta_modules` | ampliar tipos e módulos | parcial | STRUCTURALLY_DIFFERENT / ABSENT | tabelas de acervo atrás; módulos ausentes |
| `20260715192935` | `comun_member_inbox` | criar inbox canônica | sim | STRUCTURALLY_DIFFERENT | criada antes; FK de pauta ausente, FK Auth extra |
| `20260715192935` | `comun_hub_territories`, `comun_pauta_spaces`, `comun_pauta_timeline_events` | ligações e eventos centrais | sim | STRUCTURALLY_DIFFERENT | baseline anterior ao final |
| `20260716000000` | `comun_sidewalk_records`, `comun_sidewalk_record_links`, `comun_sidewalk_record_photos`, `comun_sidewalk_record_corrections`, `comun_sidewalk_record_withdrawals`, `comun_sidewalk_priorities`, `comun_sidewalk_cycle_memories` | criar vertical de calçadas, RLS/grants/índices | não | ABSENT | vertical inteira ausente |
| `20260716000000` | `comun_observations`, `comun_monitored_entities`, `comun_territorial_contributions`, `comun_territorial_layers`, `comun_circle_syntheses`, `comun_circle_synthesis_links`, `comun_mobilization_actions`, `comun_official_protocols`, `comun_hub_results`, `comun_member_inbox` | integrar domínios existentes | parcial | STRUCTURALLY_DIFFERENT / GRANT_DIFFERENT | objetos-base atrás; inbox conflitante |
| `20260716120000` | FKs em `comun_hub_results`, `comun_mobilization_actions`, `comun_observations`, `comun_official_protocols`, `comun_radio_episodes`, `comun_radio_programs` | corrigir integridade referencial | parcial | REMOTE_BEHIND / ABSENT | rádio ausente e FKs não aplicadas |
| `20260717013709` | `comun_editorial_operation_items`, `comun_editorial_operation_assignments`, `comun_editorial_operation_events` | criar operação editorial | não | ABSENT | domínio operacional ausente |
| `20260717022301` | `comun_admin_profiles` | ampliar papéis/personas | sim | STRUCTURALLY_DIFFERENT | checks/roles finais ausentes |
| `20260718031145` | função `list_comun_operational_items` | fila paginada operacional | não | ABSENT | função ausente |
| `20260719180751` | `comun_sidewalk_records` e policy de dono | vínculo com membro e primeira participação | não | ABSENT | tabela-base ausente |
| `20260719202300` | `comun_community_memberships`, `comun_community_role_assignments`, `comun_community_work_groups`, `comun_community_work_group_members`, `comun_community_work_group_tasks`, `comun_community_audit_log` | criar comunidades persistentes | não | ABSENT | domínio ausente |
| `20260719202300` | `comun_member_inbox` | ampliar tipos comunitários | sim | REMOTE_AHEAD parcial | tipos comunitários antecipados por `20260720005353`; FKs divergem |
| `20260720161117` | `comun_sidewalk_observations`, `comun_sidewalk_municipal_configs`, `comun_sidewalk_records` | mapa real, geometrias e configuração | não | ABSENT | vertical ausente |
| `20260720185530` | `comun_sidewalk_forwardings`, `comun_sidewalk_forwarding_events` | encaminhamento e memória | não | ABSENT | tabelas ausentes |
| `20260720185530` | `comun_sidewalk_cycle_memories`, `comun_member_inbox` | integrar forwarding e notificações | parcial | ABSENT / STRUCTURALLY_DIFFERENT | memória ausente; tipos de forwarding ausentes no inbox remoto |
| `20260721155914` | `comun_sidewalk_records`, policy `member_reads_own_sidewalk_records`, índice anônimo | captura rápida e isolamento por dono | não | ABSENT | tabela/policy ausentes |
| `20260721164415` | `comun_sidewalk_uploads`, índices e policy `member_reads_own_sidewalk_uploads` | tickets privados de upload | não | ABSENT | objeto ausente; final local ainda tem grants anon indevidos |

## Objetos fora do histórico

| Objeto | Situação |
|---|---|
| `comun_member_profiles` | origem identificada em `20260720005353`, mas anterior às migrations ausentes que o definem; não equivalente ao final |
| `comun_member_inbox` | mesma origem antecipada; não equivalente ao final |
| tabelas da identificação fotográfica | criadas legitimamente pela migration remota registrada `20260720005353`; explicam as sete tabelas adicionais do remoto |
| `handle_new_user()` | UNKNOWN_ORIGIN; não aparece em migrations nem commits pesquisados |

## Segurança encontrada no estado final local

`comun_sidewalk_uploads` recebe `REFERENCES`, `TRIGGER` e `TRUNCATE` para `anon` por default privileges porque a migration concede ao service role e ao authenticated, mas não executa `REVOKE ALL ... FROM anon`. O postflight falha corretamente. A correção deve ser uma migration nova, não alteração silenciosa da histórica.

## Resultado histórico

Este inventário originalmente concluiu que não havia equivalência integral. Essa conclusão foi superada pelos dois ensaios do pacote forward-only; os gates operacionais pendentes, e não o drift de schema, sustentam o NO-GO atual.
