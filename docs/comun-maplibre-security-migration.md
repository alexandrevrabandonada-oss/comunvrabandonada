# MapLibre: correção de segurança e migração 5 → 6

Data: 02/10/2026. Candidato R7, dependente do pacote R6 / PR #485.

## Problema e alcance

MapLibre 5.14.0 aparece como crítico no [GHSA-jrc7-96c5-q579](https://github.com/advisories/GHSA-jrc7-96c5-q579). A correção upstream está na linha 6, a partir de 6.4.1. O candidato fixa 6.11.2 no manifest e lockfile, sem ignorar o aviso.

A busca completa de imports encontrou quatro consumidores: mapa público de Calçadas, Observatório de Calçadas, mapa de equipamentos de Saúde/Território e seletor de ponto de relato. A análise R6 descrevia somente os três mapas de leitura; o seletor também deve receber a migração.

## Adaptação

- Os imports dinâmicos continuam no cliente e em paralelo com PMTiles; as chamadas passam a usar exports nomeados do módulo, pois o export padrão foi removido.
- Cada consumidor configura o worker de mesma origem antes de criar o mapa.
- `predev` e `prebuild` copiam **worker e módulo compartilhado** do pacote instalado para `public/maplibre`. Os arquivos gerados são ignorados no Git. O build falha se algum arquivo estiver ausente. Não depende de `postinstall`, que é pulado no `npm ci --ignore-scripts` usado pela CI.
- `zoomLevelsToOverscale: undefined` conserva o comportamento anterior de overscaling em vez de adotar o novo padrão da linha 6.
- As listas textuais e os estados de indisponibilidade existentes são preservados. WebGL2 passou a ser obrigatório; ausência de GPU compatível deve manter a alternativa textual. Aparelhos físicos ainda precisam de prova.

Referências primárias: [guia de migração](https://maplibre.org/maplibre-gl-js/docs/guides/v5-to-v6-migration-guide/) e [instalação oficial com Next/Turbopack](https://maplibre.org/maplibre-gl-js/docs/). A URL de asset gerada automaticamente pelo bundler não é suficiente: sem o módulo compartilhado ao lado do worker, o mapa pode montar sem carregar tiles.

## Evidência e critérios de saída

O audit local do lockfile candidato retornou zero achados. Os 1.326 testes existentes em 237 arquivos passaram. O teste Node de distribuição verifica que o worker importa seu módulo relativo e que ambos os arquivos copiados são idênticos aos da versão instalada. Build de produção passou após a troca de exports e configuração de worker; lint e typecheck também são exigidos.

Isso é evidência local e não certifica renderização, aparelho físico ou produção. A revisão deve confirmar, antes de integrar:

| Fluxo                          | Evidência necessária                                                                           |
| ------------------------------ | ---------------------------------------------------------------------------------------------- |
| Calçadas: lista → mapa → lista | Canvas com tiles reais, Range PMTiles 206, zoom e alternativa textual                          |
| Observatório de Calçadas       | Pontos revisados, seleção, atribuições e lista textual sem dados privados                      |
| Território/Saúde               | Equipamentos públicos, seleção e alternativa textual                                           |
| Seletor de ponto               | Carregamento do PMTiles, ajuste por teclado, projeção do ponto e comportamento sem GPU         |
| Distribuição                   | Worker e shared module HTTP 200 com MIME JavaScript, mesma versão, sem erro de import relativo |
| Regressão                      | CI e Preview do head exato verdes; desktop e viewport móvel; logs sem erro de aplicação        |

Não usar produção para inventar relatos, publicar pontos de teste ou obter consentimentos. Não promover o domínio de segurança/resiliência somente porque o audit de dependências zerou: backup durável, recuperação, ensaio humano e demais critérios permanecem pendentes.

## Verificação de 02/10/2026: bloqueio de renderização

No navegador remoto, o Preview `9b7ea3fcd2a0f81e221e073859f4cf4424ecb06d` e a produção `2cb86380259ebb0cd5484bcc903d92df8bf498cb` mostraram “Mapa-base indisponível” em Calçadas. A lista equivalente carregou um registro público. Isso não estabelece regressão da migração nem comprova incompatibilidade de GPU; a causa continua indeterminada porque os handlers atuais descartam o erro. A validação do estilo pelo `validateStyleMin` instalado retornou zero erros.

O worker e o módulo compartilhado responderam HTTP 200 com MIME JavaScript no Preview. O PMTiles público de produção respondeu HTTP 206, `Content-Range: bytes 0-127/10147678`, com 128 bytes. O pedido direto ao Preview encontrou proteção de autenticação, portanto não há prova HTTP Range autenticada nesse ambiente. A Feirinha teve título correto no Preview legado; isso não substitui a jornada A7 com o núcleo público habilitado.

A suíte antiga de mapa real estava condicionada à branch histórica `codex/tijolo-45-1-mapa-real-volta-redonda`. A nova lane `COMUN MapLibre production rendering` usa `next start` após build, sem credenciais ou conteúdo editorial inventado. Exige o evento real de carregamento do mapa, canvas visível, pedido PMTiles, resposta parcial 206, ida e volta entre mapa e lista, ausência de erro de aplicação e alternativa textual quando o arquivo é bloqueado. Roda em desktop e viewport móvel; não representa aparelho físico. O resultado dessa lane ainda precisa passar. Os demais três consumidores continuam exigindo revisão específica.

A limpeza de `.next/dev` antes do build da lane de coerência elimina tipos temporários deixados pelo servidor de testes. A jornada A7 passa a exigir o título Feirinha antes da auditoria de acessibilidade; falha persistente de título continua bloqueando o teste. Não houve remoção de critérios de acessibilidade. A migração permanece em draft até renderização comprovada.

## Continuação: Saúde/Território

O pacote R6 foi integrado no PR #485 após todos os workflows aplicáveis passarem, no merge `958a6c81d16645168835bcff3e26e2eb0ede8382`. A lane de renderização do candidato `7c7de28ad9769c9a183581cdbf27f430e7fec49f` passou quatro testes de Calçadas em 18,1 segundos (run `37050370455`). Não elimina a divergência observada no navegador remoto.

A lane passa a habilitar somente no ambiente descartável de CI as flags de Observatórios e contexto territorial. Não altera configuração de Preview/produção. Os testes usam o snapshot oficial já versionado de Saúde, exigem carregamento, seleção de equipamento pelo marcador, remoção de marcadores após filtro sem correspondência e permanência da lista oficial quando o PMTiles falha. Os novos casos precisam passar no novo head.

A revisão do seletor de ponto identificou que o callback de movimento captura o ponto inicial da montagem. Após mudança de ponto, o efeito reposiciona o marcador, mas um evento posterior de movimento pode voltar a usar o ponto antigo ou nulo. É uma hipótese fundamentada no código, ainda pendente de reprodução renderizada e correção validada. Não foi declarada como lacuna fechada. Observatório de Calçadas e aparelho físico também permanecem pendentes.

A run `37054258440` passou seis casos e falhou nos dois de seleção de Saúde: o marcador de UBSF Vila Brasília interceptou o clique na Academia de Saúde Vila Brasília, cujas coordenadas oficiais são próximas. A lista passa a oferecer “Ver detalhes”, inclusive com mapa indisponível, e transfere o foco para a região de detalhes. O teste de mapa filtra pelo nome antes de clicar, enquanto o teste de falha exige seleção pela lista com Enter. A sobreposição cartográfica permanece como limite da vista geral; não se alteraram coordenadas nem se declarou clustering implementado. A nova execução precisa confirmar ambos os caminhos.

A run `37055111037` passou os quatro casos de Saúde e três de Calçadas. O último caso falhou na exigência de console limpo: o trace registrou três POST 403 de `/api/comun/quality-metrics` na origem local, sem falha de mapa. A configuração passa a usar `localhost` consistentemente na URL do browser, hostname do Next e readiness, para evitar discrepância entre aliases de loopback sob o guard de mesma origem em produção. O guard não foi alterado e erros de console continuam bloqueando o teste. A nova execução precisa confirmar essa hipótese.

## Continuação: marcador do seletor e checkpoint

A run `37055727269`, head `aa5c6ee015cd023b985a88528a9cadd394c5c6fe`, passou os oito casos de Calçadas e Saúde em 25,6 segundos após alinhar o hostname. O CI geral desse head falhou em `COST-02: checkpoint-stale`; não foi falha da renderização. O checkpoint deve ser renovado no próximo head de código consolidado.

Os callbacks de movimento/redimensionamento do seletor agora leem uma referência sincronizada com o ponto atual, inclusive durante o import assíncrono inicial. O marcador só é renderizado quando existe ponto selecionado. Um fixture de componente, copiado para `app/` exclusivamente no build descartável da lane, verifica seleção inicial, segundo ajuste por teclado, redimensionamento, clique e limpeza em desktop e viewport móvel. Esse novo teste ainda precisa passar; não comprova a jornada completa de Relatar nem fallback sem GPU. Não adiciona rota de teste ao deploy, credenciais, dados remotos ou conteúdo editorial. Observatório de Calçadas, dispositivos físicos e evidências humanas permanecem pendentes.
