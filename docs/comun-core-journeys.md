# Fluxos centrais do COMUN — contrato do Tijolo 47.9A3

Este contrato cobre o App V2 canônico sem query. `?experiencia=app-v2` continua
compatível e `?experiencia=legacy` preserva temporariamente a árvore
anterior. O trabalho não altera schema, regras de
autorização nem a semântica das mutations existentes.

## Ciclo público

Descobrir → entender → participar → confirmar → acompanhar → receber retorno →
ver resultado → preservar memória.

O ciclo orienta linguagem e ligações, mas não é exibido como progresso linear.
Uma contribuição pode pedir complemento, ser encerrada ou seguir por caminhos
diferentes depois da revisão.

## Responsabilidade das roots

| Root       | Responsabilidade                                                          | Não faz                                           |
| ---------- | ------------------------------------------------------------------------- | ------------------------------------------------- |
| Início     | continuidade pessoal, prioridade explícita e próxima ação                 | feed, ranking ou urgência inventada               |
| Explorar   | descoberta pública e territorial                                          | conteúdo privado ou personalização comportamental |
| Participar | lançar uma intenção allowlisted em um passo                               | mutation ou landing obrigatória                   |
| Caixa      | comunicações significativas que pedem compreensão ou ação                 | log técnico ou histórico pessoal completo         |
| Minha participação | histórico, vínculos, tarefas, acompanhamentos, resultados e configurações | segunda Caixa                                     |

## Continuidade

`ComunJourneyContext` transporta somente intenção allowlisted, rotas internas,
slugs semânticos, etapa pública, tracking e expiração. A prioridade de retorno é:

1. origem explícita validada;
2. recorte salvo da root;
3. entidade canônica;
4. root apropriada.

URLs externas, áreas administrativas, caracteres de controle, slugs inválidos e
contextos vencidos são descartados. Payload de formulário, contato, sessão, ID
de contribuição e ID de outra pessoa não entram no contrato.

## Autenticação

Login, cadastro e onboarding recebem `returnTo` interno já sanitizado. A tela
explica por que a conta é necessária e retorna à intenção escolhida. Sessão
expirada reapresenta o acesso sem revelar dados e mantém o destino seguro. Na
ausência ou expiração do contexto, a rota canônica é usada.

## Confirmação e acompanhamento

A confirmação V2 informa o que foi registrado, privacidade, revisão, próximo
passo, acompanhamento, correção e retorno. Ela não apresenta uma sequência como
obrigatória. Estados públicos são traduzidos para linguagem da pessoa; estados
internos permanecem internos.

A Caixa só marca como lida após ação explícita. A pessoa pode desfazer, arquivar
e consultar o histórico. Abrir a fonte carrega a Caixa como origem segura.

## Compatibilidade

Nenhuma rota é apagada. `/comun/participar` permanece fallback, deep link, ajuda
detalhada e alternativa sem JavaScript. Índices de pautas e ações permanecem
destinos reais quando a entidade ainda não é conhecida. Aliases e entradas
operacionais permanecem por compatibilidade e saem apenas da navegação principal
quando já existe root canônica.

## Limites da evidência

Os relatórios e testes medem telas, mudanças de rota, repetição, retornos,
continuidade de autenticação, confirmação, origem de mensagens, CTAs e becos sem
saída. Eles não medem produtividade, preferência, compreensão ou comportamento
individual. O resultado humano continua reservado ao 47.9D.
