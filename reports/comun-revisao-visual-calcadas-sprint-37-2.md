# Revisão visual das calçadas — Sprint 37.2

Data: 20 de julho de 2026

## Estado

**APROVADO LOCALMENTE.** A jornada produziu 105 capturas (21 superfícies em
cinco viewports). As folhas de contato foram inspecionadas após a execução; a
aprovação não decorre apenas da existência dos arquivos.

## Viewports reproduzidos

| Viewport | Jornada | Axe nas paradas instrumentadas | Overflow nas paradas instrumentadas |
|---|---|---|---|
| 360×800 | aprovada | zero serious/critical | zero |
| 390×844 | aprovada | zero serious/critical | zero |
| 768×1024 | aprovada | zero serious/critical | zero |
| 1024×768 | aprovada | zero serious/critical | zero |
| 1366×768 | aprovada | zero serious/critical | zero |

As capturas `sprint-37-2-*`, em `reports/screenshots`, foram produzidas pela
própria jornada Playwright. As cinco folhas `sprint-37-2-contact-sheet-*`
consolidam a inspeção humana dos artefatos.

## Verificações já comprovadas

- continuidade do mesmo ciclo até memória;
- stepper do encaminhamento;
- responsáveis especializados por etapa;
- estados e próximos passos;
- protocolo e conteúdo identificados como fixture;
- pacote sem documento privado, geometria privada, chave de objeto ou original;
- navegação móvel sem overflow nas paradas Axe;
- conta suspensa bloqueada antes de retomar a contribuição.

## Resultado da inspeção

- nenhuma sobreposição ou corte horizontal observado;
- ação principal preservada nos formulários;
- contexto, responsável, estado e próxima etapa visíveis;
- stepper consistente de encaminhamento a memória;
- navegação inferior móvel preservada;
- fixtures e ausência de envio externo explicitadas;
- nenhum documento privado ou original visível;
- estados vazio/erro e acesso negado legíveis;
- pacote público mantém evidência, limitações e continuidade.

`COMUN_SIDEWALK_AXE_INTEGRAL_LOCAL_OK`

O Axe foi executado após a confirmação da superfície e da persona em cada
checkpoint. Resultado: zero violações `serious` e zero `critical`, nos cinco
viewports, sem contar login como rota protegida.

## Restrições

Somente fixtures locais foram usadas. Não houve tiles remotos, R2 real, dados ou
protocolos reais, push ou deploy. Custo externo: **R$ 0**.
