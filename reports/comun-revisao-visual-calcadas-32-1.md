# Revisão visual — calçadas 32.1

Foram revisadas 40 capturas: home, pauta, mapa, roda, participação, observatório, detalhe e território em 360×800, 390×844, 768×1024, 1024×768 e 1366×768.

## Resultado

- sem overflow estrutural, imagens deformadas, textos sobrepostos ou botões inacessíveis;
- mapa tem lista textual equivalente e aviso de cobertura;
- detalhe mantém hierarquia, créditos/aviso e estados legíveis;
- navegação móvel fixa permanece visível; pode sobrepor momentaneamente a área capturada enquanto se rola, mas existe espaço de continuidade e nenhum controle fica permanentemente inacessível;
- estados vazios de dados, participação, arte, rádio e memória são explícitos;
- foco e nomes acessíveis foram confirmados também pelo Axe.

## Correção dos artefatos

Gravidade média: capturas por fragmento com `fullPage` produziam grandes áreas pretas no Chromium, embora a página real estivesse íntegra. O teste visual passou a capturar diretamente `#map`, `#construction_circle`, `#participation` e `#observatory`. As 20 imagens afetadas foram regeneradas e revisadas; as capturas posteriores estão em `reports/screenshots/sprint-32-1-*`.
