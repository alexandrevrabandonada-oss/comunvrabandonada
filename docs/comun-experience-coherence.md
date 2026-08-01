# Constituição de Experiência do COMUN — Tijolo 47.9A

Atualizado em 31 de julho de 2026. Este documento é o contrato canônico para a
migração progressiva da experiência. Ele não autoriza redesign amplo, remoção
de rota nem abertura pública.

Resultado técnico-alvo deste tijolo:
`COMUN_EXPERIENCE_COHERENCE_READY_FOR_USABILITY_REHEARSAL`. O estado `GREEN`
depende de ensaio com pessoas reais e correção dos achados críticos.

## Constituição obrigatória

1. A pessoa sabe onde está.
2. Há uma ação principal por tela.
3. Toda contribuição tem retorno.
4. Nenhum estado é silencioso.
5. Nenhum erro é beco sem saída.
6. Público e privado são explicados.
7. Comunidade, território e pauta mantêm contexto.
8. Rotas preservam retorno.
9. Componente equivalente mantém comportamento.
10. Celular popular é referência.
11. Conexão ruim é condição normal.
12. Movimento é opcional.
13. IA nunca substitui estrutura.
14. Tendências servem ao projeto.
15. Decisões políticas continuam humanas.

O auditor `npm run experience:coherence:audit` transforma em contrato
executável a existência das rotas críticas, seus retornos, aliases, pilotos,
tokens, redução de movimento e separação da navegação administrativa.

## Vocabulário canônico

| Ação                | Significado                                                      | Não usar como sinônimo de           |
| ------------------- | ---------------------------------------------------------------- | ----------------------------------- |
| Participar          | Entrar em um processo coletivo e escolher uma forma de presença. | enviar, publicar                    |
| Contribuir          | Enviar informação, evidência, relato ou conteúdo para revisão.   | participar genericamente            |
| Registrar           | Criar registro estruturado ligado a território ou pauta.         | publicar                            |
| Acompanhar          | Ver estado, próxima ação e consequência de algo já iniciado.     | seguir                              |
| Seguir              | Receber atualizações de uma pauta sem assumir responsabilidade.  | acompanhar uma contribuição própria |
| Assumir tarefa      | Aceitar responsabilidade explícita por uma entrega.              | participar                          |
| Solicitar entrada   | Pedir vínculo moderado com uma comunidade.                       | entrar imediatamente                |
| Registrar resultado | Documentar consequência com fonte e estado.                      | concluir atividade                  |
| Verificar resultado | Confirmar evidência sem converter atividade em conquista.        | aprovar politicamente               |
| Publicar            | Tornar projeção revisada visível em superfície pública.          | enviar                              |
| Retirar             | Despublicar ou remover conforme direitos, retenção e auditoria.  | apagar sem trilha                   |

`Enviar` permanece verbo físico de formulário quando o objeto já está claro.
`Entrar` permanece autenticação. `Concluir` encerra uma etapa, não comprova
resultado. `Resolver` só aparece quando a condição de resolução foi verificada.

## Pesquisa UI/UX aplicada

Fontes primárias consultadas em 31 de julho de 2026. Nenhum código, asset ou
identidade proprietária foi copiado.

| Padrão                                                             | Problema resolvido                        | Benefício                                      | Risco                                                 | Custo | Decisão COMUN                                                  | Fonte                                                                                                                |
| ------------------------------------------------------------------ | ----------------------------------------- | ---------------------------------------------- | ----------------------------------------------------- | ----- | -------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| Material 3 Expressive: escala, contraste de forma e cor contextual | hierarquia fraca e estados parecidos      | próxima ação e mudança de estado mais legíveis | excesso de formas e tom infantil em áreas sensíveis   | médio | adaptar nos níveis 1 e 2                                       | [Material 3](https://m3.material.io/)                                                                                |
| Movimento para confirmar mudança de estado                         | mudança silenciosa                        | feedback rápido sem texto repetido             | distração, enjoo e custo de renderização              | baixo | adaptar com duração curta e `prefers-reduced-motion`           | [Material 3](https://m3.material.io/) e [WCAG 2.2](https://www.w3.org/TR/WCAG22/)                                    |
| Liquid Glass como camada de controle                               | controles temporários sobre mapas e mídia | separa controle de conteúdo                    | contraste instável, custo gráfico e identidade alheia | médio | experimentar apenas em protótipo, com fallback sólido          | [Apple HIG — Materials](https://developer.apple.com/design/human-interface-guidelines/materials)                     |
| Transparência em texto, direitos, formulários e operação           | nenhum problema essencial                 | nenhum ganho funcional comprovado              | perda de legibilidade e previsibilidade               | alto  | rejeitar                                                       | [Apple — Adopting Liquid Glass](https://developer.apple.com/documentation/TechnologyOverviews/adopting-liquid-glass) |
| Step indicator para processo linear de 3+ etapas                   | incerteza em formulário longo             | posição e extensão explícitas                  | vira decoração ou navegação falsa em fluxo não linear | médio | adotar somente em onboarding/formulário linear                 | [USWDS Step indicator](https://designsystem.digital.gov/components/step-indicator/)                                  |
| Step-by-step como navegação global                                 | descoberta de processos complexos         | visão de ponta a ponta                         | ciclos, manutenção editorial e duplicação de rotas    | alto  | adiar; usar trilha contextual local                            | [GOV.UK Step by step](https://design-system.service.gov.uk/patterns/step-by-step-navigation/)                        |
| Uma pergunta/decisão por etapa                                     | formulário complexo                       | reduz carga cognitiva e erro                   | mais telas e abandono em conexão ruim                 | médio | adaptar: agrupar apenas decisões dependentes                   | [GOV.UK Question pages](https://design-system.service.gov.uk/patterns/question-pages/)                               |
| Progressive disclosure                                             | excesso de opções simultâneas             | foco sem esconder consequência                 | conteúdo crítico pode ficar invisível                 | baixo | adotar para filtros e detalhes auxiliares; nunca para direitos | [W3C COGA](https://www.w3.org/TR/coga-usable/)                                                                       |
| Navegação e linguagem consistentes                                 | perda de orientação                       | reconhecimento e menor esforço de memória      | rigidez semântica                                     | baixo | adotar com vocabulário canônico                                | [W3C COGA](https://www.w3.org/WAI/WCAG2/supplemental/objectives/o3-clear-content/)                                   |
| Alvos de toque mínimos                                             | erro motor em celular                     | acionamento mais confiável                     | aumento de densidade em operação                      | baixo | adotar 44 px no COMUN, acima do mínimo WCAG de 24 px           | [WCAG 2.2 — Target Size](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum)                            |
| Offline e reconexão explícitos                                     | rede móvel instável                       | continuidade e expectativa correta             | estado antigo sem data                                | médio | adotar com aviso e estado de sincronização                     | [web.dev — Network reliability](https://web.dev/articles/network-connections-unreliable)                             |
| Tokens semânticos                                                  | divergência entre módulos                 | migração gradual e contraste verificável       | abstração excessiva                                   | baixo | adotar                                                         | [USWDS](https://designsystem.digital.gov/)                                                                           |
| Home como feed, ranking ou personalização comportamental           | abundância de conteúdo                    | familiaridade de mercado                       | competição, carga cognitiva e perda de processo       | alto  | rejeitar                                                       | princípio próprio do COMUN                                                                                           |

O changelog do Supabase também foi revisto. O projeto usa Node 22 e TypeScript
5.6, portanto não é afetado pela futura exigência de TypeScript 5.0 do cliente.
As mudanças de Postgres 17, gateway e Studio citadas em julho de 2026 são de
self-hosting; este tijolo não altera schema nem capacidade do provedor.

## Níveis de expressividade

### Nível 0 — Calmo e preciso

Operação, segurança, privacidade, direitos, protocolos e formulários densos.
Fundo sólido, alto contraste, hierarquia previsível e baixa animação. Não há
transparência atrás de conteúdo crítico. Piloto: Central Operacional.

### Nível 1 — Expressivo contextual

Pautas, comunidades, ações, Minha Participação, Calçadas, territórios e
resultados. Cor indica contexto e estado; formas agrupam funções; a ação
principal é inequívoca. Piloto: pauta Calçadas em circulação.

### Nível 2 — Expressivo cultural

Home, Acervo, Rádio, Arte, memória e celebração de resultados. Tipografia pode
ter mais escala e composição, sem perder ordem, performance ou redução de
movimento. Piloto: Home.

Os três níveis mantêm WCAG, foco, 44 px de alvo, contraste, fallback sólido e
o mesmo comportamento dos componentes equivalentes.

## Tokens fundamentais

| Grupo      | Tokens                                                            | Contrato                                                    |
| ---------- | ----------------------------------------------------------------- | ----------------------------------------------------------- |
| cor        | `ink`, `asphalt`, `paper`, `action`, `muted`, `danger`, `success` | amarelo é ação/foco/atenção; estado nunca depende só de cor |
| espaço     | 4, 8, 12, 16, 24, 32, 48 e 64 px                                  | sem novos valores locais sem justificativa                  |
| raio       | control 8 px; sheet 16 px; sharp 0                                | raio não comunica estado sozinho                            |
| movimento  | 120, 160 e 200 ms                                                 | nenhuma animação constante; redução global disponível       |
| tipografia | display, page, section, entity, body, small, control              | caixa-alta reservada a hierarquia curta                     |
| elevação   | none, floating, modal                                             | não substitui borda/foco                                    |

Os tokens CSS estão em `app/globals.css`; os nomes de produto permanecem em
`tailwind.config.ts` durante a migração progressiva.

## Superfícies-piloto e comparação

| Superfície          | Nível | Fundamentos aplicados                                                         | Comparação                                                   |
| ------------------- | ----: | ----------------------------------------------------------------------------- | ------------------------------------------------------------ |
| Home                |     2 | propósito explícito, arquitetura finita, ação principal, resultados e memória | `/comun?experiencia=coerencia`                               |
| pauta completa      |     1 | contexto, estado, próxima ação, retorno e continuidade                        | `/comun/pautas/calcadas-em-circulacao?experiencia=coerencia` |
| Central Operacional |     0 | retorno administrativo, estado, filtros preservados e conteúdo sanitizado     | `/comun/admin/operacao?experiencia=coerencia`                |

O parâmetro apenas acrescenta o contrato visual comparável. Dados, autorização,
fonte canônica, mutations e URL base não mudam. A versão anterior segue como
padrão e o banner oferece retorno direto. Não há blur funcional.

## Mapa de migração

| Horizonte    | Mudanças                                                                                               |
| ------------ | ------------------------------------------------------------------------------------------------------ |
| imediatas    | vocabulário, retorno, estados, tokens fundamentais, aliases compatíveis, lint e correções de navegação |
| progressivas | componentes equivalentes, layouts, níveis de expressividade, cards de processo e arquitetura da Home   |
| pós-ensaio   | consolidação estrutural de rotas, retirada de componentes e efeitos experimentais                      |

Nenhuma rota é removida antes de redirect, evidência de uso, atualização de
links, regressão e documentação. `/comun/busca` continua como alias permanente
de `/comun/buscar`, preservando query string.

## Roteiro de ensaio humano

Participantes reais: visitante, pessoa nova, membro, coordenador, pessoa com
baixa visão, pessoa em celular popular, pessoa com pouca familiaridade digital
e operador. Usar ambiente privado e dados sintéticos; nunca orientar a pessoa
durante uma tarefa salvo risco ou bloqueio.

Tarefas: encontrar uma pauta; explicar seu significado; contribuir; dizer o
que ficará público; acompanhar; encontrar resultado; voltar à origem; localizar
ajuda. Para operador, abrir um item e voltar ao mesmo recorte da Central.

Registrar por tarefa: conclusão, erro, retorno desnecessário, dúvida literal,
tempo, telas, compreensão do estado e compreensão da próxima ação. Achado P0
ou P1 interrompe promoção e gera contenção. Automação, Axe ou opinião da equipe
não contam como compreensão humana.

## Roadmap preservado

47.8A permanece em pista paralela: ponto durável do banco, recuperação de Auth,
cópia secundária de Storage com idade inferior a 24 horas e restore a partir
dessa cópia. Sem provedor escolhido, contratação ou dados reais neste tijolo.

1. **47.9A3 — Fluxos Centrais Streamlined**.
2. **Regressão focal de qualidade dentro do próprio 47.9A3**.
3. **47.9D — Ensaio humano, aparelhos reais e consolidação visual**.
4. **47.10 — Conteúdo, ajuda e governança**.
5. **47.11 — Ensaio geral e go/no-go**.

O 47.9C já foi implementado e permanece
`COMUN_QUALITY_PERFORMANCE_READY_FOR_REAL_DEVICE_REHEARSAL`; não há um segundo
Tijolo 47.9C neste roadmap.

Em paralelo permanecem 47.8A, o fechamento do provider 47.9B, Calçadas e conteúdo cultural real. O App Shell V2 é reversível por `?experiencia=app-v2`; ele não promove o ensaio humano 47.9A, não substitui a versão atual e não aciona `launch_publicly`.

`security_resilience` permanece `blocked` por recovery point durável independente
e cópia secundária de Storage; seus controles internos seguem verdes. Isso não
impede o piloto 47.9A2, mas impede lançamento final. `launch_publicly` permanece
fechado.
