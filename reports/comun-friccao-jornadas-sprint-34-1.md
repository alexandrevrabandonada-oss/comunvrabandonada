# Fricção das jornadas — Sprint 34.1

Data: 19/07/2026. Medição local, com fixtures sintéticas.

## Resultado

| Jornada | Ações principais | Campos obrigatórios | Perda de contexto | Resultado |
| --- | ---: | ---: | --- | --- |
| explorar → entrar → onboarding → voltar | 8, incluindo 5 passos progressivos | 2 no login; território pode ser adiado | nenhuma nos testes | aprovado |
| pauta de calçadas → autenticação → retorno | 7 | 2 no login | nenhuma | aprovado |
| home autenticada → próximo passo | 1 | 0 | não aplicável | aprovado |
| abrir participação contextual | 1 | 0 | rota e intenção preservadas | aprovado |

O onboarding é retomável no mesmo navegador, pode ser adiado e guarda apenas preferências amplas — nunca conteúdo de contribuição. O retorno aceita somente rotas internas seguras de `/comun` e rejeita URLs externas, rotas de administração e loops de autenticação.

## Comparação com a Sprint 34

- antes, entrar interrompia a exploração e voltava à home genérica; agora a rota segura é preservada;
- antes, a home autenticada repetia a vitrine pública; agora começa pelo item que requer atenção;
- antes, “Participar” era genérico; agora explica a ação compatível com a superfície atual;
- antes, não havia retomada do onboarding; agora o passo e preferências não sensíveis ficam no armazenamento local;
- nenhuma etapa exige login para apenas explorar conteúdo público.

## Limites

A contagem mede interações de interface, não tempo humano. Cadastro completo e contribuição real não foram executados nesta passagem; a vertical existente de calçadas foi validada separadamente em 75 casos locais.
