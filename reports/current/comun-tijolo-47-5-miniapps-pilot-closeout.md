# Tijolo 47.5 — motor de miniapps e prontidão do fechamento

## Resultado

`COMUN_MINIAPPS_READY_FOR_PILOT_CLOSEOUT`

A janela oficial está ativa. Este relatório não declara o piloto concluído e
mantém `miniapps=in_progress`.

## Base e evidência remota

- base: `b3091b69b7675c13911f05d3288b3ad2b66b392e`;
- candidato funcional:
  `ec75f3566abbdffd861de8ac2c307a560f660d5a`;
- run diário read-only: `30567936950`;
- artifact: `comun-sidewalk-pilot-30567936950`;
- gerado em: `2026-07-30T17:53:27.085Z`;
- resultado observado antes do patch:
  `COMUN_SIDEWALK_PILOT_OBSERVATION_GREEN`;
- janela: `2026-07-30T03:00:00.000Z` a
  `2026-08-06T03:00:00.000Z`.

## Métricas atuais

| Métrica                 | Valor |
| ----------------------- | ----: |
| participantes           |  0/15 |
| uploads autorizados     |     0 |
| uploads confirmados     |     0 |
| registros               |  0/10 |
| publicados              |     0 |
| conclusão               |    0% |
| falhas técnicas         |     0 |
| taxa de falhas          |    0% |
| decisões de moderação   |     0 |
| moderação dentro do SLA |     0 |
| fila residual           |     0 |
| fotos pendentes         |     0 |
| retorno                 |    0% |
| territórios alcançados  |   0/3 |

Não há evidência real de prioridade, ação, protocolo, resposta, verificação,
resolução ou reabertura na janela até o instante observado. Isso não é
preenchido com fixture.

## Matriz canônica

| Capacidade          | Implementação atual            | Fonte                  | Lacuna                      | Ação                     |
| ------------------- | ------------------------------ | ---------------------- | --------------------------- | ------------------------ |
| definição           | contrato executável            | pauta module registry  | contrato implícito          | extraído e validado      |
| contexto            | pauta, comunidade e território | `comun_pauta_spaces`   | strings dispersas           | definição única          |
| contribuição        | sessão anônima limitada        | uploads/records        | nenhuma estrutural          | preservada               |
| upload privado      | original + derivada            | Storage/asset canônico | nenhuma                     | preservado               |
| moderação           | cockpit protegido              | records/photos         | nenhuma                     | medida por SLA           |
| projeção pública    | sanitizer e allowlist          | records/assets         | contrato implícito          | declarada                |
| alternativa textual | lista equivalente              | mesma coleção pública  | deep link implícito         | declarado                |
| acompanhamento      | Minha área/Participação        | fonte canônica         | nenhuma                     | deep link declarado      |
| Inbox               | Inbox comunitária              | fonte canônica         | nenhuma                     | eventos declarados       |
| ciclo político      | prioridade até memória         | entidades canônicas    | métricas finais incompletas | fechamento mede vínculos |
| operação            | cockpits protegidos            | fonte canônica         | fechamento manual           | rotina automática        |
| recuperação         | incidentes e limpeza segura    | operação               | P0/P1 não agregados         | classificados            |

## Motor

- contrato genérico: `lib/miniapp-contract.ts`;
- definição real: `lib/sidewalk-miniapp-definition.ts`;
- registry canônica preservada;
- fixture de segundo miniapp somente em teste;
- nenhuma tabela, migration, rota pública ou custo externo adicional;
- nenhum termo específico de calçadas no núcleo genérico.

## Fechamento

O relatório diário passa a medir órfãos, vínculos com prioridade, ação,
encaminhamento, protocolo, resposta, resultado e memória, verificações de
campo, resoluções, reaberturas e incidentes P0/P1/P2. Durante a janela retorna
`eligible_for_closeout`. Depois da janela falha fechado sem amostra real
representativa.

O ensaio de fechamento é privado, local e em memória. Nenhum participante,
registro ou resultado sintético entra no piloto real.

## Segurança

- consultas remotas do run: somente leitura;
- escritas em banco: nenhuma;
- escritas em Storage: nenhuma;
- IDs, identidades, coordenadas, object keys e textos privados: ausentes;
- migration: nenhuma criada ou aplicada;
- `launch_publicly`: não acionado.

## Verificação local

- contrato e classificador: 13 testes verdes;
- regressão focal de miniapp, calçadas, ciclo político, comunidades e Inbox:
  95 testes verdes;
- typecheck, lint, Prettier e `git diff --check`: verdes;
- build de produção: verde;
- PMTiles canônico: íntegro e v3;
- matriz Axe: verde em mobile 360/390, tablet, desktop e wide;
- jornada integrada completa: verde em 390 × 844;
- primeira execução E2E preservada: revelou duas expectativas históricas
  obsoletas, corrigidas sem alterar a aplicação.
