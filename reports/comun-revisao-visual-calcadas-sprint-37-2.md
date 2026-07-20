# Revisão visual das calçadas — Sprint 37.2

Data: 20 de julho de 2026

## Estado

**EM EXECUÇÃO.** A evidência abaixo é válida, mas ainda não representa o gate
visual integral solicitado.

## Viewports reproduzidos

| Viewport | Jornada | Axe nas paradas instrumentadas | Overflow nas paradas instrumentadas |
|---|---|---|---|
| 360×800 | aprovada | zero serious/critical | zero |
| 390×844 | aprovada | zero serious/critical | zero |
| 768×1024 | aprovada | zero serious/critical | zero |
| 1024×768 | aprovada | zero serious/critical | zero |
| 1366×768 | aprovada | zero serious/critical | zero |

As capturas `sprint-37-integral-revisao-*` e
`sprint-37-integral-pacote-*`, em `reports/screenshots`, foram produzidas pela
própria jornada Playwright. Elas cobrem revisão da contribuição e pacote público
sanitizado nos cinco tamanhos.

## Verificações já comprovadas

- continuidade do mesmo ciclo até memória;
- stepper do encaminhamento;
- responsáveis especializados por etapa;
- estados e próximos passos;
- protocolo e conteúdo identificados como fixture;
- pacote sem documento privado, geometria privada, chave de objeto ou original;
- navegação móvel sem overflow nas paradas Axe;
- conta suspensa bloqueada antes de retomar a contribuição.

## Cobertura ainda necessária

Ainda faltam capturas e inspeção explícita de todas as superfícies enumeradas no
roteiro — mapa/clusters, Minha área, Inbox, moderação, roda, mobilização,
protocolo, resposta, resultado, memória, vazios, erros e acesso negado — em cada
viewport. Por isso, este relatório não declara o gate visual integral fechado.

## Restrições

Somente fixtures locais foram usadas. Não houve tiles remotos, R2 real, dados ou
protocolos reais, push ou deploy. Custo externo: **R$ 0**.

