# COMUN — Tijolo 48.0A-N1 — gate Chromium de rede degradada

Atualizado em 3 de agosto de 2026.

## Resultado terminal

`COMUN_QUALITY_NETWORK_CHROMIUM_STABILIZED`

A faixa foi integrada pela PR #150 sem mudança de produto, rota, flag, banco ou
integração. O contrato remoto focal e o workflow pós-merge completo passaram
sem `SIGSEGV`.

## Baseline e integração

- `repository_main_sha` de partida: `28dd410dffe96b1065a2846545dbde2a20799bc9`;
- `functional_product_sha` anterior: `c70d1ceab802a7df591c9e6ac2aee07d364c3b1b`;
- branch: `codex/tijolo-48-0a-n1-quality-network-chromium`;
- candidata final: `10496df3a61463a69034928c83001a18cfd04165`;
- PR: #150;
- merge/main: `97c102d2a2464e511cd443ee29cac119d7e7c360`;
- merge em: `2026-08-03T16:04:46Z`;
- branch remota apagada após o merge.

## Diagnóstico

O comando anterior coletava dois testes `@network` em nove projetos. O skip
ocorria depois da criação da fixture `page`, causando 18 casos e nove processos
Chromium quando o cenário só precisava do low-Android. Os dois crashes
históricos ocorreram como `SIGSEGV`; memória insuficiente não foi declarada
causa porque os runs antigos não continham telemetria de recursos.

| Contrato | Casos | Chromium | Resultado local |
| --- | ---: | ---: | --- |
| configuração geral anterior | 18 | 9 | 10 pass, 8 skip |
| anterior restrita ao low-Android | 2 | 1 | 2 pass |
| configuração focal, execução 1 | 2 | 1 | 2 pass |
| configuração focal, execução 2 | 2 | 1 | 2 pass |

## Patch e cobertura

- `playwright.quality-network.config.ts`: um projeto Chromium
  `320x568-low-android`, um worker, sem paralelismo ou retry;
- latência, throughput, Service Worker, offline e recuperação online
  preservados;
- runner mantém exit code real e separa `browser_process_crash` de falha
  funcional;
- artifact sanitizado contém apenas execução, attempt, SHA, runner, runtime,
  Chromium, projeto, etapa, exit code, signal e classificação;
- limpeza determinística de `.next/dev` antes do typecheck elimina artefato
  parcial de servidores de desenvolvimento sem mascarar falhas de produto.

## Evidência remota e Production

- 23 checks da PR verdes; 63 skips esperados;
- workflow focal remoto verde no SHA candidato;
- Quality pós-merge: run `30830493916`, verde;
- Civic Graph pós-merge: run `30830494048`, verde;
- Experience Coherence pós-merge: run `30830491320`, verde;
- Core Journeys pós-merge: run `30830491276`, verde;
- deployment: `dpl_GJkAy2Xo7NZkTimiw2sjvtCDnNVV`, `READY`;
- domínio: `https://comunsocial.online`;
- Production observada no SHA `97c102d2a2464e511cd443ee29cac119d7e7c360`;
- `/comun` = `200`; `/comun/relata` = `404`;
- PWA: `comun-pwa-v3`;
- 47.9D não iniciado; `launch_publicly` não acionado.
