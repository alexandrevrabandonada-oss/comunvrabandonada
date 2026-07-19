# Revisão visual PWA — Sprint 35

Data: 19/07/2026.

Matriz automatizada: 360×800, 390×844, 768×1024, 1024×768 e 1366×768. O fallback offline permaneceu legível e acionável, com navegação inferior, safe area, botão de tentativa e retorno seguro. O Axe ficou em zero serious/critical nas superfícies exercitadas.

No navegador integrado, `/comun` exibiu identidade, navegação e conteúdo real; `/comun/offline` exibiu “Sem conexão agora”, limites de envio e ação de retorno. O clique em “Início” retornou a `/comun`; console sem erros ou avisos. A captura de tela embutida não foi produzida porque esta versão do navegador não suporta `playwright_element_screenshot`.

`prefers-reduced-motion` desativa animações/transições prolongadas. O refinamento de 360 px do onboarding foi tratado pelo aumento do espaço inferior do conteúdo para 6rem, além da safe area.
