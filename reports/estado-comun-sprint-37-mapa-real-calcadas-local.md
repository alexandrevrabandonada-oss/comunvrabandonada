# Estado COMUN — Sprint 37: Mapa Real das Calçadas

**Data:** 20/07/2026  
**Estado técnico:** núcleo local implementado e validado; gate integral ainda aberto  
**Piloto público:** NÃO ABERTO

## Entregue

- rota canônica `/comun/calcadas` com Mapa, Prioridades, Mobilização e Resultados;
- pauta canônica preservada e ligada à ferramenta sem duplicar conteúdo;
- adaptador local Web Mercator, GeoJSON, zoom, marcadores e alternativa em lista;
- filtros compartilhados por condição, problema, bairro e encaminhamento;
- formulário em quatro etapas, geolocalização opcional e seleção manual;
- remoção da coordenada fixa de novos registros;
- geometrias privada e pública separadas no schema e na consulta;
- condição, encaminhamento, última observação e configuração municipal de Volta Redonda;
- ficha canônica com linha do tempo sanitizada;
- correção de `visibility = public` nas consultas do diretório de Territórios;
- teste comprovando 404 e ausência na lista para território interno;
- RLS das tabelas novas classificada como `service_role_only`.

## Gates executados

- lint: aprovado;
- typecheck: aprovado;
- build Next.js: aprovado, 91 páginas;
- unitários: 240/240 em 41 arquivos;
- E2E específico: 30/30, cinco viewports;
- Axe: zero violações serious/critical nas cinco viewports;
- `supabase db lint --local`: aprovado;
- `RLS_MATRIX_OK`;
- reset com migration e seed: aprovado; houve duas tentativas anteriores com 502 local no reinício do gateway, depois resolvido;
- visual: mapa e lista capturados nas cinco larguras;
- performance do motor local: medida até 500 pontos sintéticos.

## Gates ainda não encerrados

- jornada autenticada completa com foto, moderação, publicação, proximidade e observação;
- criação operacional de prioridade e mobilização pela interface administrativa;
- pacote de pressão popular Markdown/JSON/PDF;
- regressões completas de todas as suites históricas;
- production-like final via `next start` após todas as mudanças;
- teste humano 0/participantes.

Por esses motivos, o marcador `COMUN_SIDEWALK_REAL_MAP_LOCAL_OK` **não é emitido** neste relatório.

## Declarações obrigatórias

- Piloto público: NÃO ABERTO
- Integração principal: NÃO EXECUTADA
- Push: NÃO EXECUTADO
- Deploy: NÃO EXECUTADO
- Supabase remoto: NÃO ALTERADO
- R2 real: NÃO UTILIZADO
- Tiles externos: NÃO UTILIZADOS NOS TESTES
- Dados reais: NÃO UTILIZADOS
- Custo externo: R$ 0
