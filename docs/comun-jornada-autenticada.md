# Jornada autenticada do COMUN — Sprint 34.1

## Contrato transversal

O contexto seguro é uma rota interna pública ou pessoal sob `/comun`, nunca uma URL absoluta e nunca uma rota administrativa. Cadastro e onboarding carregam esse destino até a primeira ação. O login não é requisito de exploração.

| Etapa | Objetivo | Informação mostrada | Ação principal | Secundária | Permissão | Erro e confirmação | Retorno e contexto |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1. Home | entender valor | proposta e cadeia do processo | explorar território | participar | pública | estado vazio orienta exploração | início |
| 2. Território | situar questão | síntese, pautas e memória | abrir comunidade/pauta | voltar | pública | ausência oferece outros territórios | território preservado |
| 3. Comunidade | conhecer casa organizativa | propósito e próxima ação | abrir pauta principal | ver memória | pública | comunidade vazia explica como começar | comunidade preservada |
| 4. Pauta | entender processo | etapa, ferramenta, resultado buscado | participar | acompanhar | pública | indisponibilidade é explicada | pauta + comunidade |
| 5. Participar | escolher contribuição | tempo, conta e revisão | iniciar ação | comparar formas | pública até envio | ação indisponível tem motivo | pauta + ação |
| 6. Login | proteger participação | motivo do acesso e destino | entrar | criar conta | visitante | erro no formulário mantém destino | `returnTo` seguro |
| 7. Cadastro | criar identidade mínima | pseudônimo, e-mail privado e termos | criar conta | voltar ao login | visitante | erro não revela existência de conta | onboarding + `returnTo` |
| 8. Onboarding | personalizar sem bloquear | progresso, território, temas e forma | continuar/ir para ação | pular/fechar | autenticada | estado salvo localmente e retomável | contexto de origem |
| 9. Primeira ação | concluir intenção | formulário e consequência | enviar | voltar à pauta | conforme ação | validação mantém rascunho seguro | ação original |
| 10. Confirmação | explicar o depois | recebido, revisão, próximos estados | ver Minha área | voltar à pauta | conforme ação | status anunciado | pauta e participação |
| 11. Minha área | acompanhar por prioridade | atenção, resposta, ação, andamento, concluído | abrir item prioritário | explorar | autenticada | vazio orienta começo | item → contexto |
| 12. Retorno | recuperar sentido | pauta/comunidade de origem | continuar processo | ver resultado | pública/autenticada | sessão expirada volta ao login com rota segura | contexto preservado |

## Etapas do onboarding

1. Boas-vindas e explicação do contexto.
2. Território em nível amplo, opcional para a ação quando não for necessário.
3. Temas acompanhados, pulável.
4. Formas de participação, pulável.
5. Próxima ação recomendada e retorno ao destino original.

O navegador guarda apenas identificadores e escolhas não sensíveis. Texto de contribuição, contato, coordenada precisa, foto e credenciais não entram no estado local de retomada.
