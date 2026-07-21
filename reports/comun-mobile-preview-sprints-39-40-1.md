# Preview mobile — Sprints 39 a 40.1

## Identificação

- Branch: `codex/sprint-40-1-mobile-preview`
- Commit-base: `9e1f258d5dd0311e87e7a36b5e57fd6444b8d9a7`
- Escopo: mapa real e captura rápida das Sprints 39/39.1, coerência integral do portal da Sprint 40 e navegação mobile app-like da Sprint 40.1.

## Cartografia do preview

- O arquivo `public/maps/volta-redonda/volta-redonda.pmtiles` é um artefato gerado, incluído excepcionalmente nesta branch para permitir o teste em celular pela Vercel.
- SHA-256: `d0512669d6c01cbffbc513837e30ac926ef124727feeaa12b91d9be04cd635b9`.
- Tamanho: 10.147.678 bytes.
- Fontes: OpenStreetMap, sob ODbL 1.0, e limite territorial público do IBGE.
- Proveniência, hashes dos insumos, transformação e atribuições permanecem documentados no manifesto e nos relatórios cartográficos.
- A composição OSM + IBGE não é mapa oficial da Prefeitura de Volta Redonda.
- Os GeoJSON, ZIP, shapefiles e caches de construção não integram o Git.
- O PMTiles não deve ser incorporado automaticamente à `main`; antes do piloto poderá ser substituído por Blob ou objeto remoto equivalente.

## Limites operacionais

- Câmera em dispositivo físico: ainda não validada.
- GPS em dispositivo físico: ainda não validado.
- Supabase remoto: não alterado.
- Migrations remotas: não aplicadas.
- Anonymous Sign-In remoto: não confirmado.
- Storage remoto e bucket privado: não confirmados nesta etapa.
- R2: não alterado.
- Gate humano: 0/3.
- Piloto público: não aberto.

O preview permite avaliar navegação, layout, mapa, zoom, pan, permissões de câmera/GPS e PWA. O envio efetivo permanece condicionado à validação do ambiente remoto, sem uso de service role no navegador.
