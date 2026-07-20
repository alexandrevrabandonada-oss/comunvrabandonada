# Estado da Sprint 37.2 — encaminhamento, resposta e memória

Data da checagem: 20 de julho de 2026
Escopo: ambiente local isolado, sem integrações remotas.

## Resultado atual

A lacuna funcional principal foi implementada localmente. A prioridade aprovada agora conduz, pela interface administrativa, a um encaminhamento baseado em `comun_reports`, revisão humana, protocolo fixture, resposta fixture privada com projeção pública, resultado verificado e memória editorial revisada.

O fluxo mantém uma única linha operacional:

`ORGANIZAR → ENCAMINHAR → COBRAR → REGISTRAR RESULTADO → PRESERVAR MEMÓRIA`

O cenário autenticado percorreu fotografia, contribuição, moderação, publicação, observação, prioridade, mobilização, pacote, encaminhamento, revisão, protocolo, resposta, resultado, memória, Minha área e Inbox nos cinco viewports previstos. Resultado final: **10/10 testes aprovados**, sem skip, incluindo a rejeição de retorno hostil.

`COMUN_SIDEWALK_REAL_MAP_E2E_LOCAL_OK`

## Implementado nesta etapa

- relação rastreável `comun_sidewalk_forwardings`, sem substituir `comun_reports`, protocolos, resultados ou o Acervo;
- eventos operacionais privados e auditáveis;
- RLS fechada para as novas tabelas e acesso exclusivamente server-side;
- preparação automática somente com projeções públicas permitidas;
- gate humano de revisão, correção, aprovação e arquivamento de rascunho;
- protocolo e resposta estritamente fixtures, sem envio institucional;
- resultado com evidência, limitações e continuidade, sem resolver registros automaticamente;
- memória em rascunho, revisão humana e publicação;
- pacote HTML/JSON/Markdown ampliado com projeções públicas do processo;
- atualização da Minha área e da Inbox para os eventos relevantes;
- cleanup restrito aos encaminhamentos criados pelo usuário fixture da suíte.

## Evidências executadas

| Verificação | Resultado |
|---|---|
| `npx supabase db reset --local` | aprovado em duas execuções durante a implementação |
| `npm run typecheck` | aprovado |
| `npm run lint` | aprovado |
| `npm run test:unit` | 244/244 aprovados |
| Playwright integral — cinco viewports | 10/10 aprovados |
| `npm run audit:rls-matrix` | `RLS_MATRIX_OK` |
| `npx supabase db lint --local` | zero erros de schema |
| Cleanup | `COMUN_TEST_FIXTURES_CLEAN` |

## Gates ainda pendentes

O fechamento técnico integral da Sprint 37.2 ainda não deve ser declarado. Faltam executar e registrar:

- testes comportamentais das oito personas da matriz RLS;
- Axe e revisão visual completa;
- performance contra `next start`;
- duas rodadas formais de reset integral com novos `runId`;
- jornada production-like;
- conjunto completo de regressões listado no roteiro.

O gate humano permanece separado em **0/3** e não foi preenchido automaticamente.

## Declarações obrigatórias

- Piloto público: **NÃO ABERTO**
- Integração principal: **NÃO EXECUTADA**
- Push: **NÃO EXECUTADO**
- Deploy: **NÃO EXECUTADO**
- Supabase remoto: **NÃO ALTERADO**
- R2 real: **NÃO UTILIZADO**
- Tiles remotos: **NÃO UTILIZADOS NOS TESTES**
- Dados reais: **NÃO UTILIZADOS**
- Protocolos reais: **NÃO ENVIADOS**
- Custo externo: **R$ 0**

## Decisão provisória

- Técnico local: **EM VALIDAÇÃO**
- Experiência: **NO-GO — gate humano 0/3**
- Operação: **NO-GO — execução manual pendente**
- Cartografia: **NO-GO — provider real e licença pendentes**
- Remoto: **NO-GO — ambiente remoto não revisado**
