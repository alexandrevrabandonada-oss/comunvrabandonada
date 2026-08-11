# COMUN — 48.2-A: Fundação dos Observatórios

Data: 10/08/2026
Status: implementação local validada; não promovida.

## Escopo entregue localmente

- Hub público condicional em `/comun/observatorios` e entrada condicional em
  `/comun/explorar`.
- Registry versionado com quatro domínios: Calçadas, Transporte, Ambiente e
  Água e serviços essenciais. Somente Calçadas pode sair de “Em preparação”,
  e somente quando o adapter e a capacidade pública P4 estiverem habilitados.
- Contratos `ObservatorySourceDescriptor`, `PublicObservation`, proveniência,
  freshness e qualidade; a interface revela esses dados em “Sobre estes
  dados”.
- Firewall central `canExposeInObservatory(source)` que aceita somente
  `official_public_data`, `reviewed_community_projection` e
  `editorial_public_data`, com proveniência explícita e sem publicação
  automática.
- Adapter de Calçadas limitado à projeção pública P4: records publicados,
  verificados, visíveis, editoriais e de geometria aproximada. Ele seleciona
  somente campos públicos estruturados e rejeita geometria inválida.
- APIs somente leitura: `GET`/`HEAD` em `/api/comun/observatorios` e
  `/api/comun/observatorios/calcadas`; escritas retornam `405` quando a base
  está ativa. Flags desligadas retornam `404` e não consultam fonte alguma.
- Falha fechada da fonte: indisponibilidade do P4 produz `503` na API e deixa
  Calçadas “Em preparação” no hub; nunca é apresentada como “0 pontos”.

## Firewall de privacidade

- Não há leitura de `private.comun_relata_reports`, locations privadas,
  anexos privados, Carteira, packages de forwarding, receipt ou identidade.
- Não há tabela genérica, agregação de Relata, feed de relatos, mapa geral,
  ranking, coletivo ou publicação automática.
- `public_health`, `public_education`, `child_protection` e
  `private_report_aggregate` não constam do registry, API, contagem ou cards.
- O DTO público não contém report/case/wallet IDs, texto original, foto,
  localização privada, receipt ou account ID.

## Flags

- `COMUN_OBSERVATORIES_FOUNDATION_ENABLED`
- `COMUN_OBSERVATORY_SIDEWALK_ADAPTER_ENABLED`

O adapter depende também da capability P4 existente
`COMUN_SIDEWALK_PUBLIC_PROJECTION_ENABLED`; esta não foi modificada.

## Evidência local

- testes focais do Observatório: 8/8 verdes;
- testes unitários completos: 154 arquivos, 721 testes verdes;
- `npm run typecheck`, `npm run lint` e `npm run build` verdes;
- smoke localhost flags OFF: hub e duas APIs retornaram `404`;
- smoke localhost wave 1: hub/registry `GET` e `HEAD` retornaram `200`,
  `POST` retornou `405`, e o adapter permaneceu `404` sem a capability P4.

Não houve migration local, escrita remota, fixture, envio externo, publicação
ou mudança de flag em Production.

## Gate pendente

A nova tentativa de `supabase migration list --linked`, estritamente
read-only, não concluiu por `LegacyDbConfigLoginRoleNetworkError` durante a
inicialização da login role. Não houve escrita nem correção de migration. A
promoção só pode continuar após a reconciliação remota voltar a responder e o
E2E descartável confirmar a projeção P4 real, reviewed-only.

O terminal `COMUN_48_2_A_OBSERVATORY_FOUNDATION_PUBLIC_FIREWALL_GREEN` ainda
não foi emitido.

O piloto permanece:
`COMUN_48_1C_MOTOROLA_PILOT_PAUSED_BY_PRODUCT_DECISION`.
