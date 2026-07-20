# Performance PWA — Sprint 35

Data: 19/07/2026. Ambiente: localhost, modo desenvolvimento, Windows.

| Medida | Resultado |
| --- | ---: |
| service worker | 3.030 bytes |
| fonte do manifest | 1.114 bytes |
| três ícones SVG | 913 bytes |
| entradas explícitas de precache | 6 |
| caches versionados | 2 |
| cinco requests locais da home | 328,3 / 391,6 / 750,8 / 210,8 / 208,3 ms |
| média local | 378,0 ms |

Não há imagem grande, áudio ou conteúdo privado no precache. A medição não é Lighthouse e não representa produção. O navegador integrado não expôs Navigation Timing nessa sessão; TTI, armazenamento efetivamente ocupado e carga repetida offline permanecem sem medição confiável.
