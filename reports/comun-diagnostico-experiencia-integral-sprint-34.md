# Diagnóstico de experiência integral — Sprint 34

Data: 19/07/2026. Escopo local no worktree `codex/comun-experiencia-integral-local`, criado a partir de `46b940d`. Nenhum serviço remoto, secret, cron, fila ou dado real foi alterado.

## Leitura do estado inicial

As entregas das Sprints 31–33.2.1 já tinham cobertura funcional relevante: home editorial, participação, área pessoal, caixa de entrada, busca pública, território, pautas, mapa, observatórios, rádio, arte e acervo. O problema não era ausência de capacidade: era uma entrada que apresentava módulos em paralelo e tornava menos legível o percurso de uma pessoa visitante até uma ação concreta.

| Superfície | Estado encontrado | Decisão Sprint 34 |
| --- | --- | --- |
| Home `/comun` | dez blocos editoriais e navegação extensa | reconstruir como entrada finita e orientada a contexto/próximo passo |
| Shell e navegação | muitos módulos no mesmo nível | simplificar para cinco destinos principais |
| Territórios | dados e rotas disponíveis | manter e tornar uma das portas principais |
| Comunidades | rota disponível, pouco destacada | promover à navegação principal |
| Pautas e rodas | fluxo já estruturado | manter como aprofundamento e ligar à ação |
| Participar | catálogo explícito de contribuições | manter e expor via folha contextual no shell |
| Minha Participação e inbox | área autenticada com próximos passos | renomear na navegação para Minha área; preservar proteção |
| Busca | pública, por origem e sem popularidade | manter e disponibilizar em folha de busca |
| Mapa, observatórios, rádio, arte, acervo | ferramentas especializadas existentes | combinar na arquitetura complementar, sem duplicar |
| Admin e filas | operação autenticada e sensível | manter fora do redesenho público |
| PWA/offline | base não declarada como concluída neste marco | não prometer funcionamento; deixar estados e prompt apenas informativos |

## Riscos e resposta

- **Duplicação de módulos:** evitada; a mudança aponta para as rotas existentes.
- **Autorização:** rotas pessoais continuam sob `requireCommunitySession`; não foi criado atalho público.
- **Dados falsos:** a home usa apenas dados públicos retornados pelas consultas atuais e tem estados vazios.
- **Sobrecarga visual:** amarelo é acento, papel e preto sustentam legibilidade; não há feed, métrica social ou ranking.

## Escopo implementado nesta primeira passagem

- shell com navegação principal reduzida e ferramentas complementares;
- home pública remodelada, com CTA de exploração, participação e entrada;
- folha de participação e folha de busca acessíveis por teclado;
- primitivas reutilizáveis para contexto, próxima ação, estados e timeline;
- documentação das jornadas e da arquitetura.
