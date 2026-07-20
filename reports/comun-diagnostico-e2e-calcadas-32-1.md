# Diagnóstico E2E — calçadas 32.1

## Falhas herdadas

As cinco falhas eram o mesmo contrato, uma vez em cada viewport (360×800, 390×844, 768×1024, 1024×768 e 1366×768): `contribuição comum é recebida e sanitizada`, persona visitante, etapa de confirmação.

| Campo | Diagnóstico |
| --- | --- |
| Seletor | texto `Contribuicao recebida` após URL `contribuicao=pendente` |
| Request | Server Action do formulário `#participar` |
| HTTP/redirect | ação persistia e redirecionava; não houve evidência de erro HTTP |
| Erro | timeout aguardando confirmação visual ausente |
| Causa | a página modular não interpretava `searchParams.contribuicao` e, portanto, não renderizava o acknowledgement após o redirect |
| Correção | aceitar `pendente`/`recebida` e renderizar mensagem explícita de moderação; manter espera por URL e texto observável |
| Fixture | roda, rodada, território, registro e memória agora são criados e removidos pela própria suíte |
| Resultado | 75/75 em execução inicial, reset 1, reset 2 e production-like |

Não houve aumento de timeout, sleep fixo, skip ou remoção de assertion. Traces não foram necessários na reprodução final porque o código intermediário já continha a correção e passou na primeira execução vigente.
