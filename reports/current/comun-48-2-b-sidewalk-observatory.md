# COMUN — 48.2-B: Observatório de Calçadas

Data: 11/08/2026
Status: promovido em Production, somente leitura reviewed-only.

## Baseline

- `origin/main = d399ee0611773ed8e87cedb6a6a640413419b085`.
- Estado anterior preservado: `COMUN_48_2_A_OBSERVATORY_FOUNDATION_PUBLIC_FIREWALL_GREEN`.
- Piloto preservado: `COMUN_48_1C_MOTOROLA_PILOT_PAUSED_BY_PRODUCT_DECISION`.
- Production permanece com `COMUN_OBSERVATORIES_FOUNDATION_ENABLED=enabled` e `COMUN_OBSERVATORY_SIDEWALK_ADAPTER_ENABLED=enabled` até a onda específica deste tijolo.

## Escopo funcional implementado

- rota dedicada `/comun/observatorios/calcadas`, cloaked por `COMUN_OBSERVATORY_SIDEWALK_ANALYTICS_ENABLED`;
- hub mantém `/comun/calcadas` quando o novo flag está OFF e aponta para a rota dedicada somente quando o analytics está ON;
- paginação server-side sequencial de 250 registros, com limite defensivo de 5.000;
- cobertura explícita `complete_for_public_projection` ou `partial_due_to_safety_cap`;
- totais parciais nunca são apresentados como total completo;
- indicadores derivados em runtime: pontos revisados, condição, problemas estruturados e recência por `last_observed_at`;
- filtros allowlisted de condição, problema e recência, com estado público em query params;
- mapa read-only usando apenas geometria pública aproximada e lista textual equivalente;
- percentuais sempre têm denominador explícito sobre pontos revisados da seleção;
- categorias desconhecidas não são expostas e geram somente diagnóstico sanitizado por contagem;
- estado de fonte indisponível separado de fonte disponível vazia;
- CTA retorna ao intake único `/comun/relatar`; `/comun/calcadas` permanece como miniapp operacional.

## Firewall P4 preservado

A única consulta de negócio continua em `public.comun_sidewalk_records`, com o gate:

- `visibility = public`;
- `status = published`;
- `verification_status = verified`;
- `public_location_level = approximate`;
- `location_precision = approximate`;
- `location_source = editorial`;
- `public_geometry_geojson IS NOT NULL`.

A consulta seleciona somente `slug`, `public_geometry_geojson`, `categories`, `condition`, `last_observed_at` e `updated_at`.

Não há leitura nova de Relata privado, localização privada/exata, anexos, Carteira, Saúde, Educação, Proteção de crianças, forwarding, report/case IDs ou identidade.

## Zero migration / zero persistência analítica

Nenhuma migration, tabela, materialized view, snapshot ou histórico artificial foi criado. Todos os indicadores deste tijolo são derivados em runtime da projeção pública existente.

`COMUN_48_2_B_METRIC_DEFERRED_REQUIRES_DATA_MODEL`

Nenhuma métrica dependente de nova persistência foi implementada neste tijolo.

## Débitos metodológicos explícitos

`COMUN_48_2_B_TIME_SERIES_DEFERRED_NO_PUBLIC_HISTORY`

Não existe event log público histórico semanticamente válido para construir série temporal. `updated_at` não é usado como substituto de data histórica da observação.

`COMUN_48_2_B_NEIGHBORHOOD_ANALYTICS_DEFERRED_NO_PUBLIC_BOUNDARY_MODEL`

O DTO público não contém bairro público confiável. Não há reverse-geocode, API externa, inferência por coordenada ou ranking de bairros.

## Testes adicionados

- derivação dos indicadores;
- distribuição por condição, incluindo `unknown` explícito;
- frequência de problemas não exclusiva;
- recência 30/90 dias por `last_observed_at`;
- datas inválidas e futuras;
- enum desconhecido sanitizado;
- paginação completa e safety cap;
- source unavailable versus empty;
- query params allowlisted;
- feature flag fail-closed e preservação do 48.2-A quando B está OFF;
- read-only API;
- gate P4 por fixtures;
- sentinels de texto, localização exata, attachment e Wallet;
- contrato estático de acessibilidade, mobile e equivalência mapa/lista.

## Invariantes de produto

- auto-publicação OFF;
- mapa geral Relata OFF;
- coletivos OFF;
- `launch_publicly=false`;
- Observatório é somente leitura;
- nenhuma edição ou drag de ponto;
- nenhuma fixture Production;
- business writes planejados neste tijolo: `0`.

## Promoção e prova Production

- PR funcional #270: head `c87de27e84d056278d4022db1d69798437fbb4dd`,
  merge `76712a1cafaa275b1a0442119cba074d0b7ca659`;
- CI completa e Preview verdes, preflight remoto com plano `[]`, sem review
  thread bloqueante e sem migration;
- flags-off: run `31498463736`, mantendo Foundation e adapter P4 ativos,
  analytics cloaked e rota dedicada `404`;
- a primeira wave encontrou projeção pública vazia, estado válido do contrato,
  sem criar fixture; a correção focal #271 (merge
  `159cb38360eba186fd154f47cbfd8ca377d26258`) tornou a prova compatível com
  esse empty state;
- wave 1 read-only: run `31505161183` verde no main exato, com página e APIs
  `200`, metodologia/empty state visíveis e zero business writes;
- nenhum relato, Carteira, ponto P4, snapshot, package, attempt, coletivo,
  request externo ou hard delete foi criado.

Flags atuais:

- `COMUN_OBSERVATORIES_FOUNDATION_ENABLED=enabled`;
- `COMUN_OBSERVATORY_SIDEWALK_ADAPTER_ENABLED=enabled`;
- `COMUN_OBSERVATORY_SIDEWALK_ANALYTICS_ENABLED=enabled`.

Resultado terminal:

`COMUN_48_2_B_SIDEWALK_OBSERVATORY_GREEN_REVIEWED_ONLY`.
