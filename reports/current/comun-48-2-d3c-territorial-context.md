# COMUN 48.2-D3C — Território e Serviços Públicos

Data de fechamento: 12/08/2026 (America/Sao_Paulo)

Baseline funcional: `origin/main=26a7f32d7c948124d919291db335f92e7cd2aee0`.

PR funcional: #288, head `e867c9038ddfc3978c61dd90fa08646c718f5705`,
merge `55b5e12fb698d9f165d59b809b601737e798200e`.

PR operacional: #289, head `7b1ce943b26664c55aa21136cfa54d89059277fe`,
merge `cfbf73c1226d8658398a672e73553c5e5d2c7a25`.

## Superfície entregue

- Hub: `/comun/observatorios`;
- Território e Serviços Públicos: `/comun/observatorios/territorio`;
- Fontes e metodologia: `/comun/observatorios/territorio/fontes`;
- API pública somente leitura: `GET` e `HEAD`
  `/api/comun/observatorios/territorio`; operações mutáveis retornam `405`.

O DTO é uma allowlist derivada exclusivamente dos snapshots ativos D3A, D3B1
e D3B2. Ele declara `sourceKind=official_public_data` e
`privateReportAggregate=false`; não serializa Relata, Carteira, conta,
localização privada, anexos, encaminhamentos, protocolos ou queixas
sensíveis.

## Dados e limites metodológicos

| Fonte/snapshot ativo | Resultado exposto |
| --- | --- |
| Censo 2022 / IBGE (D3A) | 739 setores censitários, 261.563 pessoas e 115.652 domicílios |
| CNES público / Ministério da Saúde (D3B1) | 102 equipamentos públicos ativos; 97 com vínculo único a setor, 1 ambíguo de borda e 4 sem vínculo seguro |
| CadSUAS + fontes municipais corroboradas (D3B2) | 16 unidades públicas de Assistência Social, todas `address_only` |

Saúde usa somente pontos de coordenada oficialmente publicada. A Assistência
Social aparece apenas em diretório textual: não há marcador, geocoding ou
vínculo de setor. Educação permanece excluída enquanto suas fontes são
`PARTIAL_D3B`.

A geometria dos 739 setores não é enviada ao navegador nesta versão: a fonte
bruta mede 2.277.823 bytes e a camada foi adiada com
`COMUN_48_2_D3C_SECTOR_MAP_DEFERRED_PAYLOAD_BUDGET`. Não houve simplificação
ad hoc. Setor censitário não é bairro; presença de equipamento não mede
disponibilidade, capacidade, distância ou suficiência de serviços.

Nenhum índice de exposição, risco, vulnerabilidade, cobertura ou equidade foi
calculado. Preserva-se
`COMUN_48_2_D3A_ENVIRONMENTAL_EXPOSURE_DEFERRED_NO_CURRENT_ENVIRONMENTAL_LAYER`.

## Validação e promoção

- zero migration: diff de `supabase/migrations` vazio;
- CI, preflight remoto, no-leak, acessibilidade, jornadas, build e Preview
  verdes; a suíte local final contou 165 arquivos e 821 testes unitários;
- rollout flags-off: run `31608934047` verde, com as novas rotas e API em
  `404` e rotas existentes preservadas;
- wave 1: run `31609144980` verde, usando apenas
  `COMUN_OBSERVATORY_TERRITORIAL_CONTEXT_ENABLED=enabled`;
- smoke Production read-only: hub, página, fontes, API `GET` e `HEAD` em
  `200`; `POST=405`; os totais públicos e a ausência de campos privados foram
  conferidos;
- navegação real desktop e mobile passou. O cliente HTTP interno do Playwright
  local não confiou na cadeia de certificado da máquina para `HEAD`, mas o
  navegador navegou as páginas e a mesma prova HTTP foi concluída por `curl`
  com a cadeia do sistema;
- `businessWrites=0`, sem fixtures, publicação, Relata, Carteira, packages,
  attempts, coletivo, request externo de negócio ou hard delete.

O runtime utiliza snapshots versionados e não consulta IBGE, CNES, CadSUAS ou
fontes municipais durante visitas públicas. Publicação automática e mapa geral
do Relata permanecem desligados; `launch_publicly=false`.

## Estados preservados

- `COMUN_48_2_D1A_BLOCKED_CURRENT_OFFICIAL_SOURCE_UNAVAILABLE`;
- `PARTIAL_D1` e `PARTIAL_D2A`;
- `COMUN_48_2_D2A_NO_OPERATIONAL_STATION_IN_VOLTA_REDONDA`;
- `COMUN_48_1C_MOTOROLA_PILOT_PAUSED_BY_PRODUCT_DECISION`.

Resultado terminal:
`COMUN_48_2_D3C_TERRITORIAL_CONTEXT_GREEN_OFFICIAL_PUBLIC_ONLY`.
