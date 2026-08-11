# COMUN — 48.2-A: Fundação dos Observatórios

Data de fechamento: 11/08/2026
Status: promovido em Production, leitura pública somente.

## Resultado

`COMUN_48_2_A_OBSERVATORY_FOUNDATION_PUBLIC_FIREWALL_GREEN`

O hub `/comun/observatorios` está ativo. A fundação expõe somente dados de
origem pública e o adapter de Calçadas lê exclusivamente a projeção P4 já
revisada, verificada, publicada, editorial e aproximada.

## Escopo em Production

- Hub público, registry versionado, proveniência, freshness, qualidade e
  metodologia acessível.
- Calçadas é o único adapter ativo; Transporte, Ambiente e Água e serviços
  essenciais continuam identificados como “Em preparação”.
- As APIs são `GET`/`HEAD`; métodos de escrita retornam `405`.
- Saúde, Educação, Proteção de crianças, Relata privado, Carteira, fotos,
  localização privada, identidade, receipts e forwarding não participam de
  registry, API, card, contagem, mapa ou cache público.
- Não há publicação automática, mapa geral de Relata, coletivo ou escrita de
  negócio neste tijolo.

## Reconciliação remota e migrations

- PR funcional #266, head `3d98af9`, mesclada exact-head em
  `17047c8464e89c5f09ba8f96902d1e30428ecac6`.
- Preflight remoto read-only do runner descartável `31454677904` confirmou
  `COMUN_48_2_A_REMOTE_PLAN_EMPTY_GREEN`.
- A prova combinou transação SQL read-only em metadata de migrations,
  inventário local e o ledger externo da exceção histórica de Calçadas
  `20260724233256_comun_sidewalk_operational_hardening.sql` (SHA-256
  `6a2e69dcc66f760fa1828bb43249079e8db474ad8b175d3af6aa7c97ec05b1be`).
- Resultado reconciliado: `pendingNormalMigrations=[]`,
  `unknownRemoteMigrations=[]`, `observatoryMigrations=[]`.
- Nenhuma migration foi criada, promovida, reparada, resetada ou aplicada.

## Incidente operacional e correção R1

- A primeira automação de ativação, PR #267 mesclada em
  `5e526e66cd010ec36ee55cd6b47ee1b7be60ae19`, falhou no primeiro `env add`
  antes de deploy ou onda de ativação.
- Não houve evidência de ativação parcial nem escrita de negócio.
- A causa provável era a ausência do binding explícito do projeto Vercel no
  runner. O histórico dos workflows de Production confirmou o mesmo projeto
  canônico já utilizado anteriormente.
- PR corretiva #268, head `403fe84ab686b9733f3f08a3e41e3bce902b6cf3`,
  mesclada exact-head em `8346947eafc5abf70ee342604acef2ec4fda51ee`.
- A correção adicionou binding explícito, preflight `project inspect`
  read-only, diagnóstico sanitizado e rollback das duas flags para `disabled`
  com redeploy do main caso uma etapa pós-escrita falhe. Nenhum token, valor
  de ambiente ou credencial foi exposto.

## Ativação em ondas

- Flags-off: run `31457723317` verde. As cinco rotas canônicas retornaram
  `200`; hub e APIs novas permaneceram `404`; `POST` da API retornou `405`.
- Wave 1 foundation: run `31457865057` verde. Hub e registry retornaram
  `200`; adapter de Calçadas permaneceu `404`; o registry expôs apenas os
  quatro domínios públicos previstos, sem adapter ativo.
- Wave 2 sidewalk: run `31457990389` verde. Hub, registry e adapter de
  Calçadas retornaram `200`; a resposta comprovou proveniência, freshness e
  metodologia da projeção P4 reviewed-public, sem referências a fontes
  privadas, Carteira ou domínios sensíveis.

As flags atuais são:

- `COMUN_OBSERVATORIES_FOUNDATION_ENABLED=enabled`
- `COMUN_OBSERVATORY_SIDEWALK_ADAPTER_ENABLED=enabled`

## Garantias preservadas

- Production writes de negócio: `0`.
- Reports, Carteiras, itens de Calçadas, snapshots, packages, attempts e
  coletivos criados: `0`.
- Requests externos e hard deletes: `0`.
- Auto-publicação OFF; mapa geral Relata OFF; coletivos OFF;
  `launch_publicly=false`.
- O piloto permanece pausado:
  `COMUN_48_1C_MOTOROLA_PILOT_PAUSED_BY_PRODUCT_DECISION`.

## Próximo passo

`48.2-B — Observatório de Calçadas`, somente após este fechamento documental.
