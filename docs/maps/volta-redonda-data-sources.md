# Fontes cartográficas — Volta Redonda

Download local realizado em 2026-07-21T16:35:34.197Z por `npm run maps:sources:download:volta-redonda`. Projeção de saída: EPSG:4326.

| Fonte | Origem e data-base | Licença / atribuição | Resultado local |
|---|---|---|---|
| OpenStreetMap | Overpass Kumi, recorte `-22.60,-44.22,-22.43,-43.98`; consulta registrada no manifesto; snapshot de 21/07/2026 | ODbL 1.0; © OpenStreetMap contributors | 64.979 feições; 49.414.563 bytes; GeoJSON SHA-256 `031a9f2a5cad258c6d0d8d62a8ebf908ad5039ab35727cd19f2b075d0a4bb342` |
| Limite municipal IBGE | `RJ_Municipios_2024.zip`, malha municipal 2024, município 3306305 | Dados públicos IBGE; atribuição IBGE | 1 feição; ZIP 5.127.653 bytes; GeoJSON SHA-256 `559c4b48ff519636b71426ff3d552afaadfe2b5a1c1aac6e5f68f277aaa887e4` |

URLs integrais, consulta Overpass, hashes da resposta e caminhos locais ficam em `.map-build/volta-redonda/sources/download-manifest.json`. Dados de Prefeitura/IPPU não foram incluídos. A composição não é mapa oficial da Prefeitura.

O artefato é reproduzido com Tippecanoe 2.79.0, commit upstream `68ab8dcc229f95b8b25877697d5e8d66783af503`, dentro da imagem local `comun/tippecanoe:2.79.0`.

## Política do artefato PMTiles

Para o primeiro piloto, `public/maps/volta-redonda/volta-redonda.pmtiles` permanece versionado. O arquivo é substituível e deve conservar SHA-256 e atribuições OSM/IBGE no manifesto. O limite de revisão no Git é 25 MiB (26.214.400 bytes); acima dele, a publicação deve migrar para armazenamento por objeto. Fontes brutas, caches e diretórios de construção continuam ignorados.
