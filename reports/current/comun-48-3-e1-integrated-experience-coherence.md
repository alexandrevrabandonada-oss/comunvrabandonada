# COMUN 48.3-E1 — Coerência integrada da experiência

Data: 14/08/2026

Baseline: `1ae567276074685c6319057b95ec90e4b105ab7a`

Estado do candidato: validação local verde; promoção GitHub e smoke Production pendentes.

## Decisão

O App V2 já era a experiência canônica por padrão. E1 o convergiu sem criar App V3, shell paralelo, API, flag, schema ou objeto cívico novo. `?experiencia=legacy` continua como rollback explícito; o alias histórico `coerencia` permanece somente em compatibilidade legada.

A entrada pública agora expressa quatro intenções:

1. **Vi um problema** → `/comun/relatar`;
2. **Entender a cidade** → `/comun/observatorios/panorama`;
3. **Participar** → `/comun/pautas`;
4. **Minha participação** → `/comun/minha-participacao`.

Comunidades, ferramentas especializadas, Caixa, Acervo e Rádio continuam acessíveis, mas deixaram de competir como portas primárias. Roda, Rodada, Síntese, Grupo de Trabalho e Memória aparecem somente dentro do contexto que lhes dá sentido.

## Matriz de experiência

| route | userIntent | primaryQuestion | primaryAction | secondaryActions | backDestination | contextVisible | duplicateDestination | requiresDomainKnowledge | loginGate | emptyState | mobileFriction | terminologyDebt | recommendation |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `/comun` | começar | O que posso fazer aqui? | Vi um problema | três caminhos rebaixados | `/comun` | sim | — | não | não | explica e orienta | ação + caminhos acima da dobra | — | manter como início |
| `/comun/relatar` | registrar | O que aconteceu? | Guardar registro | detalhes opcionais | `/comun` | sim | — | não | não | orienta captura | um gesto desde Home | — | preservar capture first |
| `/comun/calcadas` | ferramenta especializada | Como registrar/consultar? | Registrar problema | leitura especializada | `/comun` | sim | Relata | não | não | explica ausência | secundária | miniapp | manter contextual |
| `/comun/onibus` | ferramenta especializada | Como consultar/relatar? | Registrar problema | leitura especializada | `/comun` | sim | Relata | não | não | explica ausência | secundária | miniapp | manter contextual |
| `/comun/observatorios` | entender | Que leituras existem? | Ver Panorama | observatórios específicos | Panorama | sim | Panorama | não | não | orienta Panorama | catálogo secundário | hub intermediário | manter como aprofundamento |
| `/comun/observatorios/panorama` | entender | O que os dados mostram? | Explorar o que sabemos | camadas especializadas | `/comun` | sim | — | não | não | camada degradada não derruba página | sem overflow | — | entrada canônica de entendimento |
| `/comun/pautas` | participar | Que questões estão abertas? | Acompanhar pauta | catálogo de pautas | `/comun` | sim | — | não | não | ausência não significa ausência de questões | um gesto desde Home | — | entrada canônica de organização |
| `/comun/pautas/[slug]` | acompanhar | O que queremos entender ou mudar? | próxima etapa real | evidência, atividade e memória | `/comun/pautas` | sim | — | não | não | explica cada ausência | uma CTA por estado | — | manter narrativa de ciclo |
| `/comun/pautas/[slug]/rodas/[circleId]` | conversar | Qual é a pergunta atual? | Contribuir nesta rodada | síntese e histórico | Pauta | sim | — | não | conforme modo | explica rodada indisponível | uma CTA | — | Roda somente na Pauta |
| `/comun/acoes` | encontrar ação | O que vamos fazer? | Ver ação | filtros | `/comun/pautas` | sim | Pautas | não | não | explica etapa vazia | secundária | catálogo | manter como aprofundamento |
| `/comun/acoes/[slug]` | agir | Como posso ajudar? | Participar desta ação | acompanhar/sair | Pauta quando ligada | sim | — | não | mutação | explica participação fechada | uma CTA | — | continuação da Pauta |
| `/comun/comunidades` | encontrar vínculo | Que comunidades existem? | Ver comunidade | exploração | `/comun/explorar` | sim | — | não | não | explica ausência | secundária | conceito social | manter contextual |
| `/comun/c/[slug]` | ver comunidade | Quem permanece junto aqui? | Ver contexto público | grupos públicos | Comunidades | sim | — | não | não | explica ausência | secundária | — | não inferir Pauta/Roda |
| `/comun/minha-participacao` | retomar | Onde parei? | Continuar de onde parei | registros, pautas, conversas, ações, compromissos | `/comun` | sim | Caixa/Conta | não | sim | normaliza ausência e oferece caminho | um gesto desde Home | “Minha área” removido | manter agrupamento humano |
| `/comun/participar` | explorar formas | Como quero participar? | Ver pautas | compatibilidade | `/comun` | sim | Pautas | não | não | orienta escolha | não necessária para tarefa comum | tela intermediária | manter compatibilidade |
| `/comun/explorar` | catálogo | Que outras superfícies existem? | Abrir destino | catálogo completo | `/comun` | sim | Panorama | não | não | orienta exploração | não necessária para tarefa comum | catálogo secundário | preservar, sem promover |

## Mudanças de composição

- Home: uma única CTA dominante e três caminhos secundários explícitos; blocos personalizados só aparecem quando há centro pessoal.
- Navegação desktop/mobile: Início, Entender, Participar e Minha participação; “Vi um problema” permanece a ação central.
- Panorama: ganhou a única CTA dominante “Explorar o que sabemos”; links de camada foram rebaixados visualmente.
- Pauta: a CTA aponta diretamente para a única Roda ou Ação ativa quando isso é determinístico; múltiplas opções levam à seção correspondente; a segunda CTA concorrente foi removida.
- Roda e Ação: mantêm uma CTA dominante e retorno explícito à Pauta.
- Minha participação: “Meus registros”, “Estou acompanhando”, “Minhas conversas”, “Ações em que estou” e “Meus compromissos”; contadores dominantes e tela de transição foram removidos.
- App bar: Roda → Pauta, Ação → Pautas quando não há contexto de jornada, Observatório específico → Panorama.
- autenticação: o `returnTo` interno existente foi preservado e comprovado.

## Gates automatizados

- auditoria E1 schema v2: 209 páginas, 39 rotas obrigatórias, matriz de 16 superfícies, `primaryActionCount=1` para Home/Pauta/Roda/Ação, `contextLost=0`, `unexpectedTopLevelChoices=0`;
- 184 arquivos e 941 testes unitários verdes;
- 35 testes Playwright verdes em `360×800`, `390×844`, `768×1024`, `1024×768` e `1366×768`;
- axe sem violações serious/critical na Home;
- browser real em `390×844`: título, propósito e ação principal acima da dobra, caminhos começando acima da dobra, zero overflow;
- Home → Relata, Home → Panorama e Home → Pautas em um gesto;
- login de Minha participação preserva o `returnTo` exato;
- typecheck, lint integral e build Next.js com 129 páginas verdes;
- migration diff vazio; API nova = 0; feature flag nova = 0; business write = 0.

## Limites preservados

Nenhuma semântica de RLS, Relata, evidência, moderação de Roda, capacidade de Ação, causalidade da Memória ou proveniência dos Observatórios foi alterada. O piloto humano Motorola permanece `COMUN_48_1C_MOTOROLA_PILOT_PAUSED_BY_PRODUCT_DECISION`; E1 usa automação/QA e não reabre o piloto. `launch_publicly=false`.

## Promoção

Preencher após CI/merge/smoke read-only:

- PR/head/merge: pendente;
- Preview: pendente;
- Production exact main: pendente;
- smoke GET-only: pendente;
- `businessWrites=0`: pendente de prova final.

O terminal `COMUN_48_3_E1_INTEGRATED_EXPERIENCE_COHERENCE_GREEN_STREAMLINED_NAVIGATION` só será emitido após essa promoção.
