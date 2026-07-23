# Revisão visual dos miniapps — Sprint 38

Data: 21/07/2026
Ambiente: local, conteúdo sintético, sem tiles ou serviços remotos.

## Resultado

`COMUN_MINIAPP_EXPERIENCE_LOCAL_OK`

A experiência local está coerente para nova rodada de validação humana. Isto não abre piloto público e não substitui o gate humano, que permanece 0/3.

## Superfícies capturadas

- Home: `reports/screenshots/sprint-38-home-1366x768.png`;
- pauta com ferramenta: `sprint-38-pauta-1366x768.png`;
- comunidade com ferramenta: `sprint-38-comunidade-1366x768.png`;
- Territórios: `sprint-38-territorios-1366x768.png` (estado vazio local; não foi criado território real);
- mapa e lista: `sprint-38-calcadas-mapa-*` e `sprint-38-calcadas-lista-*` nos cinco viewports;
- registro: `sprint-38-registro-1366x768.png`;
- prioridade: `sprint-38-prioridade-1366x768.png`;
- mobilização: `sprint-38-mobilizacao-1366x768.png`;
- resultado: `sprint-38-resultado-1366x768.png`;
- memória: `sprint-38-memoria-1366x768.png`;
- Minha área: `sprint-38-minha-area-1366x768.png`;
- Caixa de entrada: `sprint-38-inbox-1366x768.png`.

## Comparação com a Sprint 37.2

| Ponto | Sprint 37.2 | Sprint 38 |
| --- | --- | --- |
| Primeiro viewport | hero amarelo ocupa a abertura | contexto compacto e mapa na primeira dobra |
| Shell | miniapp substitui o contexto global | shell global do COMUN permanece visível |
| Navegação local | âncoras numa página longa | quatro rotas e `aria-current` |
| Filtros | quatro selects grandes | busca, chips, Mais filtros e Limpar |
| Mobile | controles empilhados | mapa/lista, CTA flutuante, chips e bottom sheet |
| Marcadores | número/cor | alerta, resolvido e cluster numérico |
| Conteúdo posterior | prioridades, mobilização e resultados no fim do mapa | telas independentes, com uma finalidade por rota |
| Contexto | pauta, comunidade e território somem ao rolar | contexto persistente no cabeçalho do miniapp |
| Retorno | marca própria e links dispersos | pauta, Minha área, Inbox e comunidade conectadas |

Referência histórica inspecionada: `reports/screenshots/sprint-37-calcadas-mapa-1366x768.png`. Render atual inspecionado: `reports/screenshots/sprint-38-calcadas-mapa-1366x768.png`.

## Fidelity ledger

1. **Hierarquia:** removido o hero gigante; título e CTA cabem no cabeçalho compacto.
2. **Mapa-first:** mapa visível no primeiro viewport de 1366×768; no celular os controles essenciais precedem imediatamente o mapa.
3. **Tipografia:** caixa alta restrita a rótulos curtos; títulos e corpo usam peso mais moderado.
4. **Paleta:** amarelo/preto preservados para ação e seleção; superfícies de leitura usam fundo claro.
5. **Contêineres:** removidas métricas e seções concorrentes da tela do mapa; bordas fortes ficaram em controles, mapa e entidades.
6. **Responsividade:** 360×800, 390×844, 768×1024, 1024×768 e 1366×768 sem overflow do documento.
7. **Ícones:** `MapPinned`, mapa/lista, alerta e resolvido seguem a mesma família Lucide.
8. **Acessibilidade:** mapa/lista possuem estado pressionado; chips possuem `aria-pressed`; bottom sheets têm botão de fechar; lista é semanticamente equivalente.

## Gate de coerência

- território visível: sim, Volta Redonda;
- comunidade organizadora visível: sim, comunidade vinculada à pauta;
- pauta enfrentada visível: sim, Calçadas em circulação;
- ação atual visível: sim, Registrar calçada;
- acompanhamento visível: sim, Minha área;
- passagem à ação coletiva: sim, Prioridades → Mobilização → Resultados;
- retorno ao COMUN: sim, navegação global, pauta e comunidade.

## Evidência técnica

- Browser integrado: identidade da página, DOM não vazio, ausência de overlay e console sem erros;
- interação manual automatizada no navegador: mapa → lista, com `aria-pressed=true` e URL `?vista=lista`;
- Playwright geográfico: 35/35 em cinco viewports, incluindo Axe e deep links;
- jornada integrada autenticada: 1/1, Home → pauta → comunidade → miniapp → mapa/lista → registro → Minha área → prioridade → mobilização → resultado → memória → Inbox → comunidade;
- unitários: 247/247;
- typecheck e lint: aprovados.

## Limites preservados

- mapa-base permanece sintético;
- o ambiente local não possui território público “Volta Redonda” para uma ficha territorial real, portanto a captura territorial registra o estado vazio e a integração está condicionada à entidade pública canônica;
- nenhum resultado humano foi inferido;
- resposta institucional continua separada de resultado comprovado;
- nenhuma fixture representa pessoa, endereço, protocolo ou ocorrência real.

## Declarações

- Piloto público: NÃO ABERTO
- Gate humano: 0/3
- Push: NÃO EXECUTADO nesta Sprint local
- Deploy: NÃO EXECUTADO
- Supabase remoto: NÃO ALTERADO
- Tiles remotos: NÃO UTILIZADOS
- Dados reais: NÃO UTILIZADOS
- Protocolos reais: NÃO ENVIADOS
- Custo externo: R$ 0
