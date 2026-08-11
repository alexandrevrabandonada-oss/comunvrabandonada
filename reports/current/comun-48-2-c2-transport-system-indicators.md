# COMUN — 48.2-C2 — Sistema em números do Transporte

Fechamento: 11/08/2026. Baseline: `origin/main=4e74037e93f62bfec2c7c31795fd6f13db5e2962`.

## Resultado

`COMUN_48_2_C2_TRANSPORT_SYSTEM_INDICATORS_GREEN_OFFICIAL_ONLY`

O Observatório de Transporte passou a expor uma seção pública, versionada e
somente de leitura com parâmetros periódicos do estudo tarifário oficial da
STMU. Ela complementa a rede programada C1, sem a confundir com monitoramento
em tempo real, operação realizada hoje ou experiência comunitária.

## Fonte e snapshot

- snapshot ativo: `comun-transport-system-metrics-v1-20260811`;
- metodologia: `comun-transport-system-metrics-v1`;
- estudo tarifário oficial da STMU, SHA-256
  `8be3933d24bb5007df659594cbe589d0af909973aaf74fefb7b08f50b277683a`;
- Decreto Municipal nº 19.858/2026, SHA-256
  `4b1abfd038b55767b1ccc2ce12f217d6f7842e1f231c7e9b96c6c9e1f2f30726`;
- fontes verificadas no runner em 11/08/2026, sem atualização automática;
  o runtime importa somente o snapshot versionado no repositório.

Cada métrica informa fonte, página/seção, período literal, definição e estado
de qualidade. Onde o estudo não publica datas exatas, os limites do período
permanecem nulos, sem inferência.

## Conteúdo e limites

- demanda, quilometragem, frota, IPK, custos e tarifa técnica são parâmetros
  oficiais do estudo, com proveniência por métrica;
- passageiro equivalente permanece distinto de passageiro transportado;
- a tarifa técnica canônica é R$ 5,9354; a tarifa pública de R$ 5,90, vigente
  desde 01/02/2026, vem do Decreto nº 19.858/2026 e não é usada para calcular
  subsídio;
- `COMUN_48_2_C2_PMM_DEFERRED_SOURCE_FORMAT_AMBIGUITY`: PMM não é exposto
  enquanto sua unidade/formato permanecer ambígua;
- `COMUN_48_2_C2_TREND_ANALYTICS_DEFERRED_SINGLE_COMPARABLE_SNAPSHOT`: não
  há série ou tendência com um único snapshot;
- não há GPS, Cittamobi, VRBus, scraping runtime, Relata, P5/STMU privado,
  Carteira, sessões, localização, anexos ou dado comunitário.

## Entrega e promoção

- PR funcional [#279](https://github.com/alexandrevrabandonada-oss/comunvrabandonada/pull/279),
  head `977a5eaf09ac940715c40f152f6fb0c695bb5de1`, mesclada em
  `b0485702c1c1ff241d3e25aa4955312e9a0caa57`;
- CI completa e Preview verdes: 39 checks aprovados;
- zero migration; `git diff origin/main...HEAD -- supabase/migrations` vazio;
- flags-off `31532627378` preservou C1 e manteve C2 cloaked;
- onda 1 `31532943667` ativou somente
  `COMUN_OBSERVATORY_TRANSPORT_SYSTEM_METRICS_ENABLED=enabled`.

Os dois runs confirmaram o projeto Vercel canônico, a auditoria do snapshot e
os hashes das fontes antes do deploy. A onda 1 confirmou página/API, snapshot
esperado, invariantes públicos e `POST` com resposta `405`.

## Prova Production read-only

Não houve relato, Carteira, package, attempt, publicação, snapshot de negócio,
coletivo, hard delete, envio externo ou requisição runtime à PMVR/STMU. O
workflow tem rollback para desativar C2 se uma promoção falhar.

`COMUN_48_1C_MOTOROLA_PILOT_PAUSED_BY_PRODUCT_DECISION` permanece. Auto-
publicação OFF, mapa geral de Relata OFF, coletivos OFF e
`launch_publicly=false`.

Fontes públicas: [estudo tarifário STMU](https://mobilidadeurbana.voltaredonda.rj.gov.br/storage/posts/68/files/rApvDXuPmUrNRm8BwxDjFwDWZeMoB9fGDIiiTwzH.pdf)
e [Decreto Municipal nº 19.858/2026](https://www.voltaredonda.rj.gov.br/images/Documentos/VRDestaques/2024/2026-01-30_2285-extra.pdf).
