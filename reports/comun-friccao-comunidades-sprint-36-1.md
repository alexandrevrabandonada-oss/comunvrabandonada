# Fricção da jornada — Comunidades Sprint 36.1

## Caminhos observados

| Objetivo | Caminho mínimo observado |
|---|---|
| Acompanhar | CTA da comunidade, autenticação quando necessária, preferências opcionais, confirmar acompanhamento |
| Alterar preferências | Participação, alternar preferência, salvar |
| Encontrar na Home | Home autenticada, seção Comunidades, abrir comunidade |
| Encontrar na Minha área | Minha área, seção Comunidades, abrir comunidade |
| Consultar Inbox | Caixa de entrada, localizar evento comunitário |
| Sair | Participação, sair, confirmar estado persistente |

O retorno após login preserva o destino. Nenhuma preferência é obrigatória e nenhuma delas concede poder. A saída é explícita e mantém trilha de auditoria.

## Pontos para gate humano

- verificar se “acompanhar” e “participar” são distinguidos sem explicação;
- verificar se a pessoa encontra a edição de preferências;
- verificar se Home, Minha área e Inbox parecem uma jornada única;
- verificar se a consequência de sair está clara antes da ação.

## Declarações obrigatórias

Piloto **não aberto**; integração principal, push e deploy **não executados**; Supabase remoto **inalterado**; R2 real, serviços externos e dados reais **não utilizados**; custo externo **R$ 0**.
