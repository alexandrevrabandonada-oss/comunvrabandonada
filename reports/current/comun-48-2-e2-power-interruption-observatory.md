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

## Promoção pendente

O rollout será feito somente após merge exact-head: primeiro `flags-off`,
depois uma única wave que habilita a flag E2. Ambos os workflows são
read-only sobre dados de negócio e têm rollback de flag para `disabled`.
