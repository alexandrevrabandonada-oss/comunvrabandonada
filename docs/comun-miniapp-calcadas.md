# Miniapp Mapa das Calçadas

## Limites de domínio

- **Território** fornece contexto geográfico.
- **Comunidade** reúne as pessoas organizadas.
- **Pauta** mantém o processo coletivo, rodas, tarefas, ações, protocolos, resultados e memória.
- **Miniapp** é a ferramenta cartográfica específica, canônica em `/comun/calcadas`.

O miniapp não duplica a pauta `calcadas-em-circulacao`. Ele consulta a mesma fonte e oferece quatro superfícies: Mapa, Prioridades, Mobilização e Resultados.

## Cartografia local

O adaptador cartográfico usa projeção Web Mercator, GeoJSON e base SVG local simplificada. Não há tiles, geocodificação ou chamadas externas. O estilo e os limites municipais ficam em `lib/sidewalk-map-config.ts` e podem ser substituídos por MapLibre sem alterar o contrato público.

O mapa implementa zoom, marcadores geográficos e alternativa textual. A lista e o mapa recebem a mesma coleção filtrada. O piloto usa somente Volta Redonda.

## Privacidade

O envio pode produzir `private_geometry_geojson`. A consulta pública seleciona exclusivamente `public_geometry_geojson`, produzida após moderação. Geometria privada, vínculo do membro, foto original e notas internas não fazem parte da projeção pública.

Precisões aceitas: `exact`, `approximate`, `neighborhood` e `hidden`. Geolocalização é opcional e pontual; não existe rastreamento contínuo.

## Jornada

1. Foto opcional, mantida apenas na sessão da página e enviada ao storage privado.
2. Local por uso pontual do dispositivo, marcação manual ou bairro.
3. Avaliação em boa, regular, ruim ou péssima, com problema principal opcional.
4. Revisão e envio autenticado para estado interno `under_review`.

A autenticação acontece antes da seleção da foto porque o navegador não permite preservar arquivos com segurança através de uma navegação de login.

## Estados independentes

- Condição: boa, regular, ruim, péssima.
- Verificação: em revisão, verificada, publicada, rejeitada.
- Encaminhamento: sem ação, prioridade, encaminhada, aguardando resposta, em obra, resolvida, reaberta.

Nenhum registro, prioridade, protocolo ou resultado é publicado ou enviado automaticamente.

## Operação local

A migration é aditiva e reutiliza `comun_sidewalk_records`. Ela acrescenta geometrias privada e pública, condição, origem e precisão da localização, encaminhamento, última observação, histórico de proximidade e configuração municipal. Não existe segunda tabela de registros públicos.

O custo externo obrigatório é R$ 0. Testes usam somente banco, storage, fixtures e base cartográfica locais.
