# Diagnóstico territorial — Mapa Popular

Diagnóstico concluído em 14/07/2026 antes de qualquer migration da Sprint 26.

## Fundação existente

- Território real: `comun_hub_territories`, criado na Sprint 25. Possui slug, nome, tipo, município, resumo público, notas internas e estado; não possui bairro nem geometria.
- Projetos: `comun_hub_projects`; pauta central: `comun_pauta_spaces`; ação: `comun_mobilization_actions`; tarefas, resultados, timeline e vínculos com o Acervo já aceitam o território do Hub ou podem recebê-lo por relação.
- Localização anterior: relatos têm `latitude`, `longitude`, `location_accuracy`, `approximate_location`, `neighborhood` e nível público. Esses dados pertencem ao relato e não devem ser copiados automaticamente para o mapa.
- `comun_communities` continua sendo taxonomia temática, não território.

## Geografia e mapa

- PostGIS 3.3.7 está disponível no Supabase remoto, porém não instalado. O banco usa PostgreSQL 17.
- Não existe biblioteca Leaflet, MapLibre, Mapbox ou Google Maps no projeto.
- Decisão: não instalar PostGIS nem contratar tiles nesta sprint. Usar latitude/longitude e GeoJSON limitado, validado e moderado. A interface terá mapa SVG leve, lista equivalente e URLs filtráveis; a fundação permite migração futura para PostGIS sem mudar as entidades editoriais.
- Geometria pública nunca é aceita diretamente. Precisão `approximate` e `hidden` protege áreas sensíveis.

## Reuso e especialização

`comun_hub_territories` será ampliada como entidade territorial comum. Tabelas especializadas guardarão camadas, reciclagem, materiais, organizações, serviços, rotas, necessidades, propriedades, atribuições/fontes, propostas e contribuições. Pauta, projeto, ação, tarefa, resultado, evidência e Acervo permanecem entidades únicas.

## Riscos identificados

1. Duplicar território por portal temático — mitigado por uma chave territorial comum.
2. Publicar coordenada precisa ou localização privada — mitigado por visibilidade, precisão e helpers com campos explícitos.
3. Afirmar titularidade sem prova — mitigado por registro de atribuição obrigatório, fonte, data, confiança e linguagem pública controlada.
4. Prometer coleta/material aceito — mitigado por estado de verificação e data de revisão.
5. Transformar cooperativas em ranking/marketplace — fora do modelo e da interface.
6. GeoJSON pesado ou arbitrário — schema estrito, propriedades proibidas e limite de tamanho.
7. Mapa sem próxima ação — cada ficha prioriza necessidade, ação, pauta ou contribuição.

## Componentes reutilizáveis

`ComunShell`, `Section`, `HubCard`, badges e formulários administrativos; helpers service-role com seleção explícita; autenticação `requireComunAdmin`; auditoria administrativa; RLS matrix; honeypot e padrões de contribuição privada.
