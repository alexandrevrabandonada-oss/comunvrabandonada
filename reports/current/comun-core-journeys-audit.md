# Auditoria técnica de jornadas — Tijolo 47.9A3

Não contém resultados humanos nem dados pessoais.

| Fluxo / intenção inicial | Rota de entrada | Telas percorridas | Ação principal | Autenticação | Confirmação | Acompanhamento | Retorno | Telas intermediárias | Duplicações | Beco sem saída | Estado privado/público | Decisão | Passos antes → depois |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1. Encontrar uma pauta | /comun/explorar | Explorar → Pauta | Abrir pauta | Livre | Não se aplica | Pauta ou Minha participação | Explorar com recorte | Índice /comun/pautas permanece compatível | Home e Explorar repetiam descoberta | Não | Público | Explorar é a root canônica | 3 → 2 |
| 2. Contribuir com pauta | /comun/pautas/[slug] | Pauta → Formulário | Enviar contribuição | Informada conforme ação | Canônica no V2 | Minha participação | Pauta de origem | Participar vira lançador, não landing obrigatória | CTAs concorrentes reduzidos a uma ação principal | Não | Envio privado até revisão | Contexto leva pauta sem payload | 4 → 2 |
| 3. Criar conta | /comun/criar-conta | Cadastro → Onboarding | Criar conta | Próprio fluxo | Retorno seguro | Intenção original | Ação original | Onboarding de segurança mantido | Nenhuma | Não | E-mail privado | Manter etapa necessária de segurança | 3 → 3 |
| 4. Retornar à intenção | /comun/entrar | Login → Ação original | Entrar | Obrigatória | Explica destino | Contexto allowlisted | Origem explícita | Nenhuma | Seleção repetida removida | Fallback seguro | Sem payload em query | Contrato canônico com expiração | 4 → 2 |
| 5. Enviar contribuição | /comun/pautas/[slug] | Formulário → Confirmação | Enviar | Conforme pauta | Canônica | Minha participação | Pauta | Confirmação redundante removida | Nenhuma no V2 | Erro retorna ao formulário | Privado até revisão | Mutation preservada | 3 → 2 |
| 6. Entender confirmação | /comun/participar/confirmacao?experiencia=app-v2 | Confirmação | Acompanhar participação | Já resolvida quando necessária | O quê, privacidade e próximo passo | Um passo | Origem | Nenhuma | CTAs reduzidos | Não | Estado público claro | Sem progresso falsamente linear | 2 → 1 |
| 7. Ver contribuição | /comun/minha-participacao | Participações | Abrir acompanhamento | Obrigatória | Estado público | Na própria área | Origem da contribuição | Nenhuma | Caixa removida desta área | Empty state acionável | Privado | Resumo e ativos primeiro | 3 → 1 |
| 8. Ler pedido de complemento | /comun/caixa-de-entrada | Caixa | Abrir origem | Obrigatória | Leitura explícita | Origem direta | Caixa com recorte | Nenhuma | Eventos técnicos ocultos | Histórico disponível | Privado | Grupo precisa da sua ação | 3 → 1 |
| 9. Responder complemento | /comun/caixa-de-entrada | Caixa → Origem | Responder | Obrigatória | Canônica da mutation existente | Minha participação | Caixa preservada | Nenhuma | Origem não precisa ser reencontrada | Não | Privado | Origem explícita precede parent canônico | 4 → 2 |
| 10. Ver publicação ou encerramento | /comun/minha-participacao | Participações → Resultado | Abrir consequência | Obrigatória | Estado público | Histórico | Entidade | Nenhuma | Mensagem acionável só na Caixa | Não | Privado e público diferenciados | Estados internos não expostos | 3 → 2 |
| 11. Encontrar resultado | /comun/explorar?categoria=resultados | Explorar → Resultado | Ver consequência e fonte | Livre | Não se aplica | Pauta de origem | Explorar com filtro | Índice mantido | Home não duplica catálogo | Empty state | Público | Resultado tem gramática própria | 3 → 2 |
| 12. Preservar resultado na memória | /comun/resultados | Resultado → Memória | Ver memória relacionada | Livre | Não se aplica | Acervo | Resultado | Nenhuma | Resultado não parece post | Relacionamento pode estar ausente | Público | Evidência e limites progressivos | 3 → 2 |
| 13. Registrar Calçada | /comun/participar | Painel → Ferramenta → Confirmação | Registrar calçada | Obrigatória no envio | Canônica no V2 | Minha participação | Pauta Calçadas | Landings repetidas ignoradas | Contexto territorial preservado | Estado operacional explica pausa | Privado até moderação | Ferramenta abre diretamente | 5 → 3 |
| 14. Entrar em comunidade | /comun/participar | Painel → Comunidades → Comunidade | Solicitar entrada | Obrigatória | Estado do vínculo | Minha participação / Comunidades | Comunidade | Índice é seleção real | Nenhuma | Permissão negada explicada | Vínculo privado | Comunidade é casa organizativa | 4 → 3 |
| 15. Assumir tarefa | /comun/participar | Painel → Ação | Assumir tarefa | Obrigatória | Mutation existente | Minha participação / Tarefas | Ação | Índice /comun/acoes é escolha real | Caixa não duplicada | Tarefa indisponível é bloqueada | Privado | Responsabilidade e prazo antes da ação | 4 → 2 |
| 16. Enviar material cultural | /comun/participar | Painel → Formulário cultural → Confirmação | Enviar item, áudio ou obra | Opcional conforme canal | Canônica quando integrada | Minha participação / Cultura ou protocolo | Acervo, Rádio ou Arte | Landing detalhada preservada por compatibilidade | Três intenções distintas | Canal informa indisponibilidade | Consentimento e direitos | Sem tratar cultura como comunidade | 4 → 3 |
| 17. Pedir correção | /comun/participar | Painel → Direitos | Pedir correção | Canal protegido | Protocolo existente | Canal de direitos | Origem | Nenhuma | Separado de retirada | Ajuda disponível | Privado | Intenção mínima e explícita | 3 → 2 |
| 18. Pedir retirada | /comun/participar | Painel → Direitos | Pedir retirada | Canal protegido | Protocolo existente | Canal de direitos | Origem | Nenhuma | Separado de correção | Ajuda disponível | Privado | Ação sensível continua confirmada | 3 → 2 |

## Rotas intermediárias

| Rota | Classificação | Decisão |
|---|---|---|
| /comun/participar | fallback | Manter deep link, ajuda detalhada e alternativa sem JavaScript; no app V2 a aba abre o painel. |
| /comun/acompanhar | real_destination | Manter consulta segura por protocolo. |
| /comun/projetos | compatibility | Ocultar da navegação principal e preservar deep links. |
| /comun/campo | compatibility | Manter entrada operacional; turnos continuam imersivos. |
| /comun/pautas | real_destination | Manter como índice público e seleção quando a pauta não é conhecida. |
| /comun/acoes | real_destination | Manter como seleção de compromisso e tarefa. |

## Métricas técnicas

```json
{
  "screensBefore": 61,
  "screensAfter": 37,
  "repeatedActionsBefore": 7,
  "repeatedActionsAfter": 0,
  "brokenReturnsBefore": 4,
  "brokenReturnsAfter": 0,
  "lostContextsBefore": 3,
  "lostContextsAfter": 0,
  "authWithoutReturnBefore": 3,
  "authWithoutReturnAfter": 0,
  "confirmationsWithoutTrackingBefore": 4,
  "confirmationsWithoutTrackingAfter": 0,
  "messagesWithoutOriginBefore": 2,
  "messagesWithoutOriginAfter": 0,
  "competingCtasBefore": 5,
  "competingCtasAfter": 0,
  "deadEndsBefore": 2,
  "deadEndsAfter": 0
}
```
