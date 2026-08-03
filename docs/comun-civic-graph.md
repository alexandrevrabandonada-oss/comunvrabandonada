# Grafo cívico navegável — contrato do Tijolo 47.9A4

O COMUN apresenta território, comunidade, pauta, ação, ferramenta, protocolo,
resultado e memória como entidades relacionadas de um processo coletivo. Este
contrato cobre o App V2 canônico sem query; `?experiencia=app-v2` continua
compatível e o fallback anterior permanece em `?experiencia=legacy`.

## Regra de fonte

Uma relação navegável nasce de chave estrangeira, tabela de junção, rota
canônica institucional ou projeção editorial pública confirmada. Texto livre,
semelhança de título, proximidade geográfica e fixture local não criam relação.
A projeção textual `comun_pauta_spaces.community` só gera link depois que
`comun_communities.slug` ativo é confirmado sem fallback de seed.

O inventário completo está em
`reports/current/comun-civic-graph-audit.md`. A verificação remota registra
somente contagens agregadas em
`reports/current/comun-civic-graph-consistency.md`.

## Escopo das contagens

- relatos da pauta: contribuições aprovadas cuja pauta está pública e não arquivada;
- registros de Calçadas: registros com `status=published` e `visibility=public`;
- resultados: linhas públicas, separadas por estado de verificação;
- memória: itens editoriais publicados e públicos;
- Rádio: programas ou episódios publicados, com relações opcionais explícitas.

Relatos e registros de Calçadas não são sinônimos. Um número não substitui o
outro, mesmo quando ambos participam da mesma pauta.

## Composição visual

`ComunEntityHeader` apresenta tipo, título, estado, contexto e próxima ação.
`ComunContextTrail` narra o encadeamento confirmado. `ComunRelationRail` oferece
uma lista horizontal finita e acessível. `ComunRelatedSection` separa atividade,
evidência, resultado e memória. `ComunEmptyStateV2` explica a ausência e sempre
oferece uma continuação possível.

As superfícies continuam usando a gramática “Brutalismo Cívico Expressivo” do
App Shell V2: contraste e contundência nas ações e estados, papel aquecido e
formas semânticas nas entidades, sem borda amarela universal.

## Privacidade e carga

O contexto é construído em Server Components por relações allowlisted e texto
sanitizado. Consultas públicas filtram visibilidade e estado, limitam coleções,
evitam N+1 e não enviam o grafo completo ao cliente. Campos internos, contato,
notas privadas, sessões e IDs sensíveis não entram nos artefatos.

## Limites

Conteúdo cultural pode não ter pauta, comunidade ou território. Essa ausência é
permitida e nunca preenchida por inferência política. Superfícies administrativas
e os demais resíduos legados estão classificados para o 47.9A5. Este contrato
não declara migração integral nem ensaio humano concluídos.
