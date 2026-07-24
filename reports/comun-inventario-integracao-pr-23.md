# Inventário final de integração da PR #23

> Documento histórico. Estado superado pelo fechamento verde da PR #23 em
> 23 de julho de 2026. Consulte
> `reports/current/estado-atual-comun.md`.

Data: 2026-07-21

PR canônica: https://github.com/alexandrevrabandonada-oss/comunvrabandonada/pull/23

Base: `origin/main` em `a599d124a84c5542ec3a56052276024b9bd4854a`

Linha candidata: `codex/sprint-40-1-mobile-preview`

## Linha canônica

A PR #23 permanece a única linha ativa. Nenhuma branch foi criada, rebaseada, mesclada ou removida neste lote. As linhas das Sprints 37, 38 e 39 já estão contidas na candidata por ancestralidade; as linhas locais intermediárias permanecem apenas como histórico recuperável.

## Commits históricos divergentes

Os commits `7be997a` e `2477c90` foram reconciliados formalmente em `reports/comun-reconciliacao-commits-historicos-pr-23.md`. A revisão concluiu que seus trechos funcionais relevantes têm implementações posteriores na candidata; o delta exclusivo restante é documentação, teste ou evidência semanticamente superada. Portanto:

- nenhum cherry-pick adicional é necessário;
- nenhuma funcionalidade conhecida fica fora da candidata;
- branches históricas não devem ser apagadas automaticamente por este lote;
- a reconciliação não equivale a merge na `main`.

## Inventário material da candidata

- Aplicação Next.js e contratos de navegação mobile.
- MapLibre, provider PMTiles local, manifesto e proveniência OSM + IBGE.
- Captura rápida, câmera/GPS simuláveis, upload privado em duas fases e limpeza de EXIF.
- Fluxo de registro, moderação, prioridade, mobilização, encaminhamento, protocolo fixture, resultado e memória.
- Quatro migrations geoespaciais/operacionais com RLS.
- Suítes E2E canônicas, unitários, scripts locais e relatórios consolidados.
- PMTiles de 10.147.678 bytes versionado excepcionalmente para o primeiro piloto.
- 21 imagens no delta total; somente seis evidências novas das Sprints 37/39 foram mantidas pelo lote de estabilização.

## Exclusões confirmadas

Não integram o commit: `.env`, tokens, chaves, service-role, sessões, storageState, dumps, fontes cartográficas brutas, cache cartográfico, fotos reais, dados pessoais, `.next`, `node_modules`, `test-results` ou `playwright-report`.

## Declaração

O inventário está reconciliado para revisão de código da PR #23. Supabase remoto, Vercel, R2, dispositivos físicos, gate humano e operação manual não foram revisados ou alterados por esta ação.
