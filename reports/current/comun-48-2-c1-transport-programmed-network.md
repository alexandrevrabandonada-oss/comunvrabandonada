# COMUN — 48.2-C1 — Rede programada oficial de transporte

Data de fechamento: 11/08/2026. Baseline: `origin/main=959b3ab8b5dddcfd20a5ff54a044794e6857084e`.

## Resultado

`COMUN_48_2_C1_TRANSPORT_PROGRAMMED_NETWORK_GREEN_OFFICIAL_ONLY`

O Observatório do Transporte está ativo como uma leitura pública, estática e
versionada da rede programada publicada pela PMVR/STMU. Ele não representa
tempo real, espera, pontualidade, GPS, pontos georreferenciados, tarifa em
tempo real, experiência comunitária ou qualquer dado do Relata/P5/STMU.

## Entrega e promoção

- PR funcional [#275](https://github.com/alexandrevrabandonada-oss/comunvrabandonada/pull/275), head exato `fea513c90b54bfe21ed0e23111261945eccc3d5b`, mesclada como `2a4332f3c715768bc78b7e61fb103a3017c9f47c`;
- a CI completa fechou com 33 checks verdes; uma falha inicial de reset do
  Supabase descartável foi um `502` upstream sanitizado e passou em repetição,
  sem mudança de schema ou produto;
- o preflight remoto metadata-only reconciliou `pendingNormalMigrations=[]`,
  `unknownRemoteMigrations=[]` e `observatoryMigrations=[]`; a exceção externa
  de Calçadas permaneceu fora do histórico normal, sem `repair` ou reaplicação;
- `git diff origin/main...HEAD -- supabase/migrations` permaneceu vazio;
- flags-off: workflow `31514616408` verde; a rota e API C1 permaneceram
  cloaked antes da ativação;
- wave 1: workflow `31514842414` verde, com
  `COMUN_OBSERVATORY_TRANSPORT_PROGRAMMED_ENABLED=enabled` e somente o
  snapshot público programado habilitado.

## Prova Production read-only

As rotas públicas responderam `200`:

- `/comun/observatorios`;
- `/comun/observatorios/transporte`;
- `/api/comun/observatorios`;
- `/api/comun/observatorios/transporte`;
- `/api/comun/observatorios/transporte/linhas/210`;
- `/comun/observatorios/transporte/fontes`.

`POST /api/comun/observatorios/transporte` respondeu `405`. A leitura da linha
`210` confirmou `timetableStatus=partial` e a partida `00:20` com
`serviceDayOffset=1`; não houve conversão silenciosa para o dia anterior nem
falsa promessa de grade completa. A resposta pública não continha campos ou
sentinelas de Relata, Carteira, localização exata ou anexos privados.

Não houve relato, Carteira, intake, publicação, snapshot, package, attempt,
coletivo, hard delete, envio externo ou chamada a um serviço de transporte.

## Fontes e proveniência

O snapshot `comun-transport-programmed-network-v1-20260811` contém 48 linhas
de catálogo e cinco fontes oficiais versionadas. O runtime só lê esse snapshot
do repositório; não faz scraping ou atualização automática.

- [Catálogo de horários e itinerários PMVR/STMU](https://www.voltaredonda.rj.gov.br/horario-de-onibus/);
- [linha 205A — horários](https://www.voltaredonda.rj.gov.br/horario-onibus/Via%C3%A7%C3%A3o%20Elite/Linha%20205A%20-%20Morada%20da%20Colina%20x%20Padre%20Josimo/Linha%20205A%20-%20hor%C3%A1rios.pdf);
- [linha 125 — horários](https://www.voltaredonda.rj.gov.br/horario-onibus/Via%C3%A7%C3%A3o%20Cidade%20do%20A%C3%A7o/Linha%20125%20-%20Ponte%20Alta%20x%20Roma%20I/Linha%20125%20-%20hor%C3%A1rios.pdf);
- [linha 210 — horários](https://www.voltaredonda.rj.gov.br/horario-onibus/Via%C3%A7%C3%A3o%20Pinheiral/Linha%20210%20-%20Tr%C3%AAs%20Po%C3%A7os%20x%20Conforto/Linha%20210%20-%20hor%C3%A1rios.pdf);
- [linha 230 — itinerário](https://www.voltaredonda.rj.gov.br/images/Documentos/HorarioOnibus/Via%C3%A7%C3%A3o%20Elite/Linha%20230%20-%20Santo%20Agostinho%20x%20Conforto/Linha%20230%20itin.pdf).

O verificador posterior identificou alteração no catálogo
`pmvr-bus-catalog-20260811` e emitiu
`COMUN_48_2_C1_OFFICIAL_SOURCE_DRIFT_DETECTED`. Nenhum artefato foi alterado
automaticamente: a revisão e eventual nova fotografia são um ciclo de
manutenção separado, com nova proveniência e revisão humana.

## Limites preservados

- fonte oficial programada, não tempo real;
- rotas e horários oficiais, não paradas/geometria/GPS;
- dados P5/STMU, Relata, Carteira, anexos, localização e forwarding continuam
  privados e fora de API, cache e UI do Observatório;
- `COMUN_48_1C_MOTOROLA_PILOT_PAUSED_BY_PRODUCT_DECISION` permanece;
- auto-publicação OFF, mapa geral do Relata OFF, coletivos OFF e
  `launch_publicly=false`.

Próximo tijolo elegível: `48.2-C2 — indicadores oficiais do sistema`, somente
depois de confirmar fontes públicas com período, unidade, denominador e
metodologia.
