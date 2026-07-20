# Revisão visual — experiência integral Sprint 34

Data: 19/07/2026. Revisão local sobre as capturas Playwright em `reports/screenshots/sprint-34-home-*.png`.

## Resultado

- **1366×768:** hierarquia inicial compreensível; a proposta, o modelo de processo e os CTAs aparecem sem competir. O amarelo marca decisão e estado, não preenche a página inteira.
- **360×800:** título, CTAs, cadeia territorial e cartões ficam em coluna sem corte lateral; a navegação principal permanece fixa na base.
- **390×844, 768×1024 e 1024×768:** a transição é contínua; em tablet a navegação superior foi ativada para não criar intervalo sem navegação.
- **Acessibilidade visual:** foco de alto contraste preservado, superfícies com contraste suficiente e botões com altura mínima.

## Correção encontrada na própria revisão

A primeira matriz mostrou que 768 px ficava entre o breakpoint da barra inferior e o da barra superior. A navegação superior passou a iniciar em `md`, e a rodada final 15/15 confirmou a correção.

## Limites

As capturas usam fixtures vazias ou dados públicos locais disponíveis. Elas verificam estrutura e estados vazios, não conteúdo editorial real nem um piloto público.
