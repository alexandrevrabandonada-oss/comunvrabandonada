# Diagnóstico da experiência central do COMUN

Data: 2026-07-15. Escopo: navegação, home, pautas, participação, territórios e memória em ambiente local.

## Achados

- A navegação pública possui nove destinos no desktop e mistura unidades centrais com ferramentas especializadas. Mapa e Observatórios competem permanentemente com Pautas, Participar e Territórios.
- No mobile há dois menus simultâneos: uma faixa de cinco links no topo e um CTA fixo de relato no rodapé. O conteúdo recebe `padding-bottom`, mas o modelo ainda fragmenta a navegação.
- “Busca” existe em `/comun/busca`, escondida no rodapé, enquanto o briefing adota `/comun/buscar`.
- Minha Participação lista quatro caixas por origem de dado, não por pauta ou atenção necessária. Não reúne tarefas, ações, resultados ou atualizações.
- A home tem blocos finitos e consultas paralelas, mas Arte e Rádio não aparecem; Acervo surge como setor final separado, sem relação explícita com processos atuais.
- Participar oferece seis atalhos genéricos e um formulário de disponibilidade; faltam objetivo, duração aproximada, requisito de conta, moderação e resultado esperado por modalidade.
- O `PautaAppShell` expõe nomes técnicos de módulos na navegação e não resume etapa, pergunta central, prazo, síntese e resultado antes dos módulos.
- Estados vazios usam frases curtas como “Nenhuma pauta pública”, sem orientar a próxima ação.
- Páginas profundas não possuem breadcrumbs consistentes. O retorno depende do navegador ou de links ocasionais.
- Territórios listam resumos, mas precisam reunir pauta, ações, observatórios, arte, rádio, memória e resultados na página territorial.

## Profundidade e continuidade

- Participar de uma pauta: normalmente 2 cliques (`Início → Pautas → pauta`) para chegar à superfície; a ação concreta pode exigir mais um clique/rolagem até a roda.
- Encontrar uma tarefa: ao menos 3 passos e conhecimento prévio (`Início → pauta → módulo Tarefas`); não existe entrada pessoal direta para tarefas assumidas.
- O contexto se perde ao alternar entre pauta, Arte, Rádio e Acervo porque o shell não carrega breadcrumbs nem relações de retorno.
- Arte e Rádio parecem desconectadas na home e em territórios; aparecem melhor somente dentro de módulos de pauta.
- O Acervo aparece como destino autônomo no menu e bloco terminal da home, sem explicar qual processo presente cada memória documenta.
- Home, listagens, Minha Participação, territórios e módulos vazios frequentemente não apresentam etapa atual, consequência e próxima ação.

## Direção

Manter pauta como unidade principal; reduzir a navegação pública a seis destinos; criar shell sem duplicação, síntese editorial finita, central pessoal agrupada, caixa de entrada operacional, busca determinística e relações explícitas entre presente e memória. Admin permanece separado.
