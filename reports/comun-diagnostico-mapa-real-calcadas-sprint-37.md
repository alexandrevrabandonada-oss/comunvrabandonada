# Diagnóstico — Mapa Real das Calçadas, Sprint 37

> Atualização 20/07/2026: pan, zoom, clustering, fixture urbana sintética, filtros em URL, fila editorial e observações moderadas foram implementados. Permanecem abertos prioridade, mobilização, pacote de pressão, E2E integral e gate humano.

## Estado canônico por categoria

### Implementado

Clustering, proximidade por raio, filtros em URL, fila editorial, moderação de observações, derivada pública, prioridade humana, roda, síntese, ação, tarefa e pacote sanitizado em três formatos.

### Validado

Unitários, lint, typecheck, build, dois resets de banco, `db lint`, `RLS_MATRIX_OK`, E2E público 30/30 em cinco viewports, Axe público e smoke `next start`.

### Pendente

E2E autenticado integral, protocolo/resposta/resultado/memória fixture pela interface, performance integral e regressões históricas completas.

### Gate humano

0/3 participantes; não aprovado e não preenchido automaticamente.

## Diagnóstico inicial confirmado

O mapa anterior era ilustrativo: marcadores por índice e coordenada fixa no envio. O diretório territorial também omitia o filtro explícito de visibilidade ao usar o cliente privilegiado.

## Decisão implementada

Foi criada a rota `/comun/calcadas` sobre a pauta e as tabelas existentes. A cartografia usa projeção geográfica real em um adaptador SVG local, sem tiles. A migration adiciona apenas lacunas em `comun_sidewalk_records`, histórico de observação próxima e configuração municipal.

## Privacidade

`private_geometry_geojson` é gravada somente no envio interno. A projeção pública seleciona somente `public_geometry_geojson`. Não são selecionados vínculo de membro, original, chave de storage ou notas privadas. Publicação permanece decisão editorial.

## Lacunas restantes

Clustering visual, consulta server-side de proximidade, agrupamento multi-registro de prioridades, pacote de pressão e fila administrativa unificada ainda precisam ser concluídos. A base atual permite esses passos sem nova vertical.
