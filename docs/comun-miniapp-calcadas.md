# Miniapp Mapa das Calçadas

## Limites de domínio

- **Território** fornece contexto geográfico.
- **Comunidade** reúne as pessoas organizadas.
- **Pauta** mantém o processo coletivo, rodas, tarefas, ações, protocolos, resultados e memória.
- **Miniapp** é a ferramenta cartográfica específica, canônica em `/comun/calcadas`.

O miniapp não duplica a pauta `calcadas-em-circulacao`. Ele consulta a mesma fonte e oferece quatro superfícies: Mapa, Prioridades, Mobilização e Resultados.

## Cartografia real e fallback

O adaptador cartográfico usa MapLibre, GeoJSON e o PMTiles canônico
`/maps/volta-redonda/volta-redonda.pmtiles`. O arquivo versionado funciona sem
configuração manual no painel da Vercel. Quando o artefato real falha, a
experiência preserva a lista de registros, a grade neutra e uma mensagem
compreensível; produção não volta silenciosamente a nomes demonstrativos.

O mapa implementa zoom, marcadores geográficos e alternativa textual. A lista e o mapa recebem a mesma coleção filtrada. O piloto usa somente Volta Redonda.

## Privacidade

O envio pode produzir `private_geometry_geojson`. A consulta pública seleciona exclusivamente `public_geometry_geojson`, produzida após moderação. Geometria privada, vínculo do membro, foto original e notas internas não fazem parte da projeção pública.

Precisões aceitas: `exact`, `approximate`, `neighborhood` e `hidden`. Geolocalização é opcional e pontual; não existe rastreamento contínuo.

## Jornada

1. Foto validada e enviada ao Storage privado somente após autorização da
   sessão anônima limitada.
2. Local por uso pontual do dispositivo, marcação manual ou bairro.
3. Avaliação em boa, regular, ruim ou péssima, com problema principal opcional.
4. Revisão e envio para estado interno `under_review`, sem exigir cadastro
   nominal.

A sessão anônima limitada não coleta nome, e-mail ou telefone. O original
permanece privado; somente derivada sanitizada aprovada pode ser publicada.

## Estados independentes

- Condição: boa, regular, ruim, péssima.
- Verificação: em revisão, verificada, publicada, rejeitada.
- Encaminhamento: sem ação, prioridade, encaminhada, aguardando resposta, em obra, resolvida, reaberta.

Nenhum registro, prioridade, protocolo ou resultado é publicado ou enviado automaticamente.

Um registro de problema não está resolvido porque foi moderado, publicado,
encaminhado ou respondido. Resolução exige verificação adequada e pode ser
reaberta.

## Operação local

A migration é aditiva e reutiliza `comun_sidewalk_records`. Ela acrescenta geometrias privada e pública, condição, origem e precisão da localização, encaminhamento, última observação, histórico de proximidade e configuração municipal. Não existe segunda tabela de registros públicos.

O custo externo obrigatório adicional é R$ 0. A operação cotidiana possui
superfícies protegidas para upload, moderação, prioridade, encaminhamento,
protocolo, resposta, verificação, resultado, memória, incidentes e limpeza; não
depende de SQL manual.
