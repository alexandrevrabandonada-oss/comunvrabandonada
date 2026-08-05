# COMUN — Tijolo 48.0M · diagnóstico

Data da execução: 2026-08-05

## Baseline

- `origin/main`: `a4910c50680cdde09808364c3cb83669baebaba0`;
- produto funcional anterior: `1177323071a826c912b63c2aa9678ad1577589f1` (48.0L);
- Production observado: deployment `dpl_9WgR8YbQCzmNqEx2GD8Cnd1BjUX6`, domínio `comunsocial.online`;
- história forward-only confirmada; branch: `codex/tijolo-48-0m-integrated-human-rehearsal`.

## Estado público observado

`/comun`, `/comun/relatar` e `/comun/calcadas` responderam 200. `/comun/relata`, `/comun/onibus`, forwarding e STMU multicanal permaneceram 404. Nenhuma flag pública foi ativada e não houve consulta/escrita no Supabase remoto.

## Ambiente local

Docker Desktop `4.61.0`, Engine `29.2.1`, Supabase CLI `2.111.0`, Node `22.19.0`. O wrapper local confirmou loopback e secrets redacted. A faixa versionada `5543x` está reservada pelo host; a stack descartável foi executada na faixa temporária `5643x`, restaurada antes do commit.

Primeiro reset encontrou `LegacyStorageGatewayStatusError` 502 no restart do Storage. Um retry focal deixou DB/Storage saudáveis e permitiu os rehearsals. Classificação: `LOCAL_SUPABASE_PORT_CONFLICT` + falha transitória de gateway; não é finding de produto.

## Preflight técnico

- unitários: 492/492;
- typecheck, lint, build: verdes;
- surfaces: 192 páginas, 7 shells, 0 desconhecidas, 0 legacy, 0 P0/P1;
- Relata DB: `COMUN_RELATA_48_0D_DB_GREEN`;
- Carteira: `COMUN_WALLET_48_0G_DB_GREEN`;
- forwarding: `COMUN_FORWARDING_48_0H_DB_GREEN`;
- Calçadas DB: `COMUN_SIDEWALK_48_0J_DB_GREEN`;
- Ônibus: `COMUN_BUS_48_0E_DB_GREEN`;
- STMU WhatsApp: `COMUN_STMU_48_0K_DB_GREEN`;
- STMU multicanal: `COMUN_STMU_48_0L_DB_GREEN`;
- privilégios: `COMUN_EXPLICIT_PRIVILEGE_CONTRACT_OK`;
- RLS: `COMUN_RLS_COMPLETE_GREEN`;
- captura E2E: 10/10 em cinco viewports;
- carteira E2E/Axe: 5/5 em cinco viewports;
- forwarding E2E/Axe: 5/5 em cinco viewports;
- Ônibus E2E/Axe: 5/5 em cinco viewports;
- regressões unitárias/quality/journeys/Civic Graph/coerência: verdes; `smoke:core-public-routes` foi tentado sem `ALLOW_LOCAL_TESTS=true` e falhou fechado por ambiente incompleto, não por resposta da aplicação.

## Finding de fixture

O E2E de Calçadas passou 4/8 e falhou 4/8 porque `getSidewalkMiniapp()` retorna o fallback “pauta ainda não publicada” no banco descartável. `test:fixtures:prepare` cria pautas genéricas `fixture-s28-2-*`, não a pauta canônica `calcadas-em-circulacao`; portanto o teste histórico que exige filtros e upload não encontra esses controles. A11y passou 2/2, o smoke público e o DB rehearsal passaram.

Classificação: `FIXTURE_SETUP_MISSING` (com expectativa histórica a revisar). Não foi adicionado `404` permissivo, não se alterou a página de Calçadas e a fixture foi removida/confirmada limpa.

## Resultado desta etapa

`COMUN_REHEARSAL_48_0M_ENVIRONMENT_READY_HUMAN_SESSION_PENDING`

Smoke LAN humano confirmado pelo responsável do produto: o ambiente abriu corretamente em computador e celular pela rede local, as rotas necessárias ficaram acessíveis e nenhuma submissão externa foi realizada. Resultado: `COMUN_REHEARSAL_48_0M_LAN_SMOKE_GREEN`.

Isso não é ensaio humano integrado: não foram medidos tempos, não foram executadas todas as tarefas, não houve três participantes e não há resultado de usabilidade. O resultado humano correto permanece `COMUN_INTEGRATED_HUMAN_REHEARSAL_INCOMPLETE`; o micro-gate STMU também não foi executado.
