# Revisão visual mobile app-like — Sprint 40.1

Superfícies: Início, Explorar, action sheet Participar, Território, Comunidade, Pauta, miniapp, registro, Caixa e Minha área.

Comparação com a Sprint 40:

- cabeçalho global expandido foi substituído por app bar curta no mobile;
- Territórios e Comunidades foram concentrados em Explorar;
- Participar virou ação central da bottom nav;
- contexto completo permanece no desktop e é progressivo no mobile;
- miniapp mantém apenas tabs locais e um CTA;
- instalação PWA não aparece sobre mapa/captura;
- Minha área usa quatro seções internas em vez de uma página integralmente aberta.

## Resultado

- 360×800, 390×844 e 768×1024 aprovados pelo E2E;
- Início em 390 px: app bar curta e bottom nav fixa sem sobreposição;
- Explorar em 390 e 768 px: busca e seis diretórios legíveis, sem overflow;
- action sheet: abre pelo botão central e expõe cinco formas de participação, com finalidade, login e consequência;
- miniapp em 390 px: app bar, tabs locais, contexto e um CTA; mapa real carregado após inicialização;
- console: nenhum warning/error na inspeção final;
- Axe: zero violações serious/critical nas rotas cobertas.

A primeira inspeção revelou a app bar empilhada por uma grade não materializada no CSS. O layout foi trocado por flex, medido novamente e aprovado com os três blocos na mesma linha.

Decisão visual local: **READY**.
