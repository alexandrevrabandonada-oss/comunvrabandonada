# Diagnóstico — Mapa Real das Calçadas, Sprint 37

## Diagnóstico inicial confirmado

O mapa anterior era ilustrativo: marcadores por índice e coordenada fixa no envio. O diretório territorial também omitia o filtro explícito de visibilidade ao usar o cliente privilegiado.

## Decisão implementada

Foi criada a rota `/comun/calcadas` sobre a pauta e as tabelas existentes. A cartografia usa projeção geográfica real em um adaptador SVG local, sem tiles. A migration adiciona apenas lacunas em `comun_sidewalk_records`, histórico de observação próxima e configuração municipal.

## Privacidade

`private_geometry_geojson` é gravada somente no envio interno. A projeção pública seleciona somente `public_geometry_geojson`. Não são selecionados vínculo de membro, original, chave de storage ou notas privadas. Publicação permanece decisão editorial.

## Lacunas restantes

Clustering visual, consulta server-side de proximidade, agrupamento multi-registro de prioridades, pacote de pressão e fila administrativa unificada ainda precisam ser concluídos. A base atual permite esses passos sem nova vertical.
