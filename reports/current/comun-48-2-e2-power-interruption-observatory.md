# COMUN 48.2-E2 — Interrupções de energia elétrica (ANEEL)

Baseline funcional: `81c26095bec9563ad363abb92976916d3915e758`.

## Implementação candidata

- rota pública separada para Serviços Essenciais e Energia, protegida por
  `COMUN_OBSERVATORY_ESSENTIAL_POWER_INTERRUPTION_ENABLED` em fail-closed;
- páginas de energia, registros e fontes derivadas exclusivamente do snapshot
  ANEEL ativo `comun-power-interruptions-aneel-v1-2026-06`;
- resumo público limitado e API de registros paginada (25 por padrão, máximo
  100), sem transferir os 5.676 registros ao navegador;
- período exposto como competências publicadas de janeiro e março a junho de
  2026, com última competência `2026-06`, sem afirmar ano completo;
- DTO com allowlist explícita: não contém protocolo COMUN, recibo, conta,
  Carteira, Relata, localização privada, anexo, encaminhamento, ID individual
  de unidade consumidora ou códigos brutos de interrupção/evento/ocorrência;
- campos de causa preservam os rótulos da fonte, sem atribuição causal pelo
  COMUN; DEC/FEC permanecem explicitamente fora desta superfície por não haver
  agregado municipal comparável;
- não há mapa, geocoding, bairro, setor censitário, tempo real, previsão de
  restabelecimento, escrita de negócio ou fetch runtime à ANEEL.

## Snapshot e proveniência

- recurso ANEEL 2026 materializado: SHA-256
  `ea970ac345858b8af4aed7427c5a1cee0779faae2ba8bc42a532a7bcde77db6e`;
- 5.676 registros publicados para Volta Redonda (`3306305`), distribuidora
  `LIGHT SESA`;
- data de verificação do snapshot e de captura do manifesto:
  `2026-08-13T00:33:00Z`;
- atualização externa permanece controlada e versionada: qualquer drift exige
  novo snapshot e revisão, nunca atualização automática em runtime.

## Promoção e rollout concluídos

- PR funcional [#298](https://github.com/alexandrevrabandonada-oss/comunvrabandonada/pull/298):
  head `6ce6534d40c9533bf733a9ef39fa48b98f2f4e6c`, merge
  `4a5c5d4d776cada38e532027f531ee553dc26554`;
- a primeira tentativa operacional não alcançou nenhuma flag ou deploy: o
  GitHub não reconheceu `workflow_dispatch` por expressões em mapas YAML
  inline. A PR estritamente operacional [#299](https://github.com/alexandrevrabandonada-oss/comunvrabandonada/pull/299)
  expandiu esses blocos sem alterar produto, dado ou schema; merge
  `2e391fc6d3f4ef262dad84c8b8e736ec09bfd9b9`;
- flags-off, run `31660990853`: binding Vercel, main exato, zero migration e
  cloak das novas páginas/APIs foram verdes; as rotas canônicas permaneceram
  `200` e métodos mutáveis responderam `405`;
- wave 1, run `31661122386`: somente
  `COMUN_OBSERVATORY_ESSENTIAL_POWER_INTERRUPTION_ENABLED=enabled`; hub,
  energia, fontes e APIs responderam `200`, `HEAD` respondeu `200` e
  `POST` respondeu `405`;
- os dois runs foram read-only sobre dados de negócio: `businessWrites=0`,
  sem fixtures, Relata, Carteira, snapshots novos, packages, attempts,
  coletivos, hard delete ou request externo em runtime.

Resultado terminal:
`COMUN_48_2_E2_ESSENTIAL_POWER_INTERRUPTIONS_OBSERVATORY_GREEN_OFFICIAL_ONLY`.
