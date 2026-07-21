# Diagnóstico de experiência dos miniapps — Sprint 38

Data: 21/07/2026
Escopo: auditoria local, sem serviços remotos.

## Síntese

O domínio das calçadas está tecnicamente completo, mas sua apresentação inicial ainda reúne quatro etapas diferentes numa página longa. O miniapp perde hierarquia porque cria cabeçalho próprio sob o shell global, usa navegação por âncoras e coloca filtros extensos antes do mapa. A Sprint 38 deve reorganizar superfícies existentes, sem duplicar registros, prioridades, ações ou resultados.

## Inventário

| Superfície | Estado anterior | Problema de experiência | Direção da Sprint 38 |
| --- | --- | --- | --- |
| Home | caminhos e pautas genéricas | miniapp ativo pouco descobrível | continuidade e ferramenta em atividade |
| Navegação global | presente e responsiva | contexto territorial não explícito no miniapp | shell global preservado + retorno contextual |
| Território | pautas, ações, observatórios e cultura | ação de calçadas diluída | bloco “O que você pode fazer aqui” |
| Comunidade | abas e ferramentas gerais | ferramenta da pauta não é nomeada | bloco compacto de ferramentas em uso |
| Pauta | `PautaAppShell` concentra módulos | ferramenta compete com conteúdo da pauta | chamada “Ferramenta desta pauta” |
| Minha área | dados por fonte | títulos não expressam os quatro destinos mentais | contribuições, acompanhando, tarefas e resultados |
| Caixa de entrada | lista sanitizada | origem do evento pouco legível | origem explícita e link contextual |
| `/comun/calcadas` | quatro seções com âncoras | página longa, hero e filtros empurram o mapa | mapa-first e rotas próprias |
| Registro | linha do tempo pública | retorno ao contexto pouco forte | ficha completa e navegação local |
| Prioridades | cards mínimos dentro do mapa | objetivo, etapa e próxima ação ausentes | rota própria, sem ranking |
| Mobilização | ações misturadas à página | estrutura operacional compete com tarefa pública | rota própria orientada à próxima ação |
| Resultados | resultados e memórias misturados | resposta e mudança comprovada podem parecer equivalentes | rota própria com separação semântica |
| Memória | deep link sob pauta | descoberta depende do fim da página | ligação direta a partir de resultados |

## Duplicações e rotas concorrentes

- `/comun/calcadas` duplicava a função de quatro superfícies por âncoras (`#mapa`, `#prioridades`, `#mobilizacao`, `#resultados`).
- Há uma visualização antiga em `SidewalkMapView` e a cartografia geográfica atual em `SidewalkRealMap`; a primeira continua necessária em módulos legados, mas não deve reger a experiência canônica.
- Registros possuem rota canônica em `/comun/calcadas/registros/[slug]` e rota histórica sob pauta. Links novos devem usar a primeira.
- Minha área é única; não deve surgir uma área pessoal específica das calçadas.

## Hierarquia e ações

- Ação principal: registrar uma calçada.
- Secundárias no mapa: buscar, filtrar, alternar mapa/lista e abrir ficha.
- Secundárias na ficha: confirmar, atualizar, enviar foto e ver histórico.
- Prioridade, mobilização e resultado são consequências do processo, não métricas de popularidade.

## Contexto perdido e textos excessivos

- O cabeçalho anterior dizia “Miniapp comunitário · piloto local”, repetia a marca e trazia resumo longo.
- A comunidade e a pauta não permaneciam visíveis ao navegar pelas seções.
- Métricas, aviso de cobertura e quatro selects criavam três blocos antes da ação principal do mapa.
- Rótulos técnicos de status apareciam sem tradução consistente.

## Fixtures

- A cartografia é sintética e está corretamente identificada, mas nomes de bairros e equipamentos podem ser confundidos com cobertura real se a atribuição não permanecer junto ao mapa.
- Dados de demonstração devem conservar o marcador explícito “DEMONSTRAÇÃO LOCAL”.
- O gate humano continua 0/3; nenhuma observação foi inferida ou preenchida nesta auditoria.
