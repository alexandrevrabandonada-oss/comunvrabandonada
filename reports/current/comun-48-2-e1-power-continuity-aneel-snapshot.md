# 48.2-E1 — Continuidade da Energia: auditoria de snapshot ANEEL

Data da auditoria: 2026-08-12
Baseline: `bc8de783483366bace7c6e9bd43042f7d7c6324f`

## Decisão

`PARTIAL_E1_POWER`

Não foi promovido `active-snapshot.json` e não há superfície pública E1.
O E1 revisou a prontidão preliminar `READY_E1_POWER` do E0 para
`PARTIAL_E1_POWER` após a materialização da fonte revelar ausência de uma
relação município–conjunto válida por período. Isso é correção metodológica,
não regressão.
Os dados oficiais de indicadores existem, mas não há relação oficial
município–conjunto histórica por período que permita afirmar que um conjunto
da série de 2020-01 a 2026-06 pertencia a Volta Redonda naquele mesmo período.

Aplicar a fotografia disponível de 2026-08-05 retrospectivamente seria uma
inferência territorial indevida. O contrato falha fechado até que a ANEEL
publique ou indique uma relação temporalmente válida e reproduzível.

## Fontes controladas

| Fonte | Resultado |
| --- | --- |
| Relação município–conjunto ANEEL (`IndQual Município`) | 9 relações para o código IBGE `3306305`, todas com `DatGeracaoConjuntoDados=2026-08-05`; não é série temporal. SHA-256 `ca21e65595eff64077967a4e53aebe4c980ba319e4a314eec837b8807d8596ba`. |
| Indicadores coletivos ANEEL 2020–2029 | 780 observações: 390 DEC e 390 FEC, de `2020-01` a `2026-06`, em cinco conjuntos com indicador observado. SHA-256 `597bf06384edd12bcf4044c1c4555ff1a8b975a39be25041ca019d6b95d4c8f4`. |
| Atributos de conjuntos | Confirma `LIGHT SESA` / CNPJ `60444437000146` para os sete conjuntos que também aparecem nesse recurso. SHA-256 `dc6ffb1168d29c3fb72aa67c5a3cf58a2f854baf9bff96b5c4749bb657f146d1`. |
| Limites DEC/FEC | Fonte oficial capturada; o esquema disponível é anual e não possui campo de período mensal para união automática. SHA-256 `7044dd8b448954473b44d950d8af11f2e75ef4049b6071f4fdeaa7ec2737d5d2`. |
| Compensação | Fonte oficial identificada, mas não materializada: o CSV publicado supera 1 GB. Não foi feita inferência de identidade municipal nem de direito a compensação. |

## Achados relevantes

- A relação municipal atual contém `554`, `1856`, `8570`, `8571`, `14995`,
  `15003`, `15007`, `15084` e `15086`.
- A série DEC/FEC capturada contém somente `14995`, `15003`, `15007`, `15084`
  e `15086`; `554`, `1856`, `8570` e `8571` não têm indicador DEC/FEC
  observado nesse recorte.
- A diferença para a lista de sanidade E0 foi registrada em
  `electrical-set-drift-v1.json` apenas como diferença de fotografia. Ela não
  prova adição, remoção ou vigência histórica de conjunto.
- DEC e FEC continuam indicadores coletivos por conjunto. Não foram derivados
  apagões, restabelecimentos, agregado municipal, métrica de bairro/setor,
  conformidade normativa ou elegibilidade de compensação.

## Artefatos e limites

- `data/comun/essential-services/power/power-continuity-candidate-v1-20260812.json`
  é candidato diagnóstico, não snapshot ativo.
- Não há fetch ANEEL em runtime, UI, API, flag, migration, deploy ou escrita
  de negócio.
- PDFs/arquivos temporários de auditoria ficaram fora do repositório.

## Retomada segura

Uma revisão E1-R1 pode promover snapshot somente após capturar fonte oficial
que relacione explicitamente município e conjunto para cada período de
indicador, ou após uma orientação oficial que valide um método alternativo.
Até lá, o próximo bloco de observatório de energia não deve ser iniciado.

Estados preservados: `COMUN_48_2_E0_ESSENTIAL_SERVICES_PUBLIC_DATA_CONTRACT_GREEN`,
`COMUN_48_2_D4B_SURFACE_WATER_OBSERVATORY_GREEN_OFFICIAL_2025`,
`COMUN_48_1C_MOTOROLA_PILOT_PAUSED_BY_PRODUCT_DECISION` e
`launch_publicly=false`.
