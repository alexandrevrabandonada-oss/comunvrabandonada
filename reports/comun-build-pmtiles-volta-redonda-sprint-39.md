# Sprint 39/39.1 — build PMTiles

Resultado: **COMUN_VOLTA_REDONDA_REAL_BASEMAP_LOCAL_OK**.

`npm run maps:build:volta-redonda` consumiu o extrato OSM e o limite IBGE registrados, validou GeoJSON, recortou o bbox `[-44.22,-22.60,-43.98,-22.43]` e gerou PMTiles v3 em z10–z16.

- Toolchain: imagem Docker local `comun/tippecanoe:2.79.0`, commit `68ab8dcc229f95b8b25877697d5e8d66783af503`.
- Artefato: 10.147.678 bytes.
- SHA-256: `d0512669d6c01cbffbc513837e30ac926ef124727feeaa12b91d9be04cd635b9`.
- Cabeçalho: `PMTiles`, versão 3.
- Git: arquivo pesado ignorado; manifesto, estilo e receita permanecem reproduzíveis.
- Render: MapLibre + protocolo PMTiles; HTTP Range, atribuição e cinco viewports comprovados.
- Fallback: fundo neutro e lista preservada.

Custo externo R$ 0; nada foi publicado.
