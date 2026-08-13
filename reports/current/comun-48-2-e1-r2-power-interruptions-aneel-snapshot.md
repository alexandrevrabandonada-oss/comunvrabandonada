# 48.2-E1-R2 — Interrupções oficiais de energia da ANEEL

Data da auditoria: 2026-08-13
Baseline: `85b74c80fe4b512f423a626fe33e0457dabf3173`

## Decisão

`READY_E2_POWER_INTERRUPTION_OBSERVATORY`

Foi promovido o snapshot de fundação
`comun-power-interruptions-aneel-v1-2026-06`, sem interface, API, feature
flag, deploy ou escrita em Production.

O recorte usa diretamente `CodMunicipioIBGE=3306305` em cada registro oficial
da ANEEL. Não utiliza a relação IndQual Município e não aplica conjuntos
elétricos retrospectivamente.

## Fonte e cobertura comprovada

- dataset oficial: **Interrupções de Energia Elétrica nas Redes de
  Distribuição**, ANEEL;
- o catálogo foi auditado para os recursos anuais 2017–2026; o recurso
  materializado nesta primeira fotografia é o Parquet de 2026;
- SHA-256 do Parquet materializado:
  `ea970ac345858b8af4aed7427c5a1cee0779faae2ba8bc42a532a7bcde77db6e`;
- SHA-256 do dicionário oficial:
  `9a9c2bf614e8eec62f170bde54717854ed8e6875ec1d55fef1fdf210b9a91c55`;
- o recurso de 2026 informa geração em `2026-07-31` e possui competências
  publicadas `2026-01`, `2026-03`, `2026-04`, `2026-05` e `2026-06`.

O snapshot não chama 2026 de ano completo, não inventa a competência ausente
e não produz tendência histórica. Os recursos 2017–2025 permanecem no
inventário de proveniência, ainda não materializados nesta versão.

## Recorte promovido

- 5.676 registros de interrupções para Volta Redonda;
- todos com `CodMunicipioIBGE=3306305`;
- todos validados no próprio registro para CNPJ `60444437000146`, nome
  `LIGHT SERVICOS DE ELETRICIDADE S A` e sigla `LIGHT SESA`;
- chave determinística: ano do recurso + CNPJ + `CodInterrupcao` + alimentador
  + subestação + início + fim;
- nenhuma chave duplicada, nenhuma data inválida e nenhuma duração negativa;
- duração derivada somente quando início e fim oficiais são válidos, mantendo
  as datas originais;
- `CodEvento`, `CodOcorrencia`, expurgos, conjunto, alimentador, subestação,
  causa e detalhe são preservados como valores oficiais, incluindo `null`.

## Privacidade e limites

O dicionário e o recorte real foram auditados. Não foram encontrados nome de
consumidor, CPF, conta, endereço residencial ou unidade consumidora individual
identificável. `DscLocalizacaoInterrupcao` no recorte é apenas o contexto
oficial `Área Urbana`/`Área Rural`; não é geocodificado nem transformado em
mapa.

`QtdConsumidoresAfetados` permanece uma contagem publicada por interrupção.
Ela não representa pessoas, residências ou consumidores únicos e não deve ser
somada como tal. Conjuntos, alimentadores e subestações são contexto técnico:
não são bairro, setor censitário ou geometria pública.

DEC/FEC seguem completamente separados como indicadores coletivos
regulatórios candidatos da E1-R1. O snapshot não cria agregado municipal,
lista de apagões do COMUN, atribuição de responsabilidade, classificação de
causa, juízo de conformidade ou direito a compensação.

## Garantias técnicas

- fonte e hash versionados em `source-manifest-v1.json`;
- mudança de schema futura falha fechada até revisão;
- capturador controlado exige o Parquet oficial local e nunca integra o
  runtime da aplicação;
- runtime público não faz fetch à ANEEL;
- zero Relata, Carteira, conta, localização privada, anexo, forwarding,
  migration, UI, API, flag, deploy ou business write.

Resultado: `COMUN_48_2_E1_R2_POWER_INTERRUPTION_ANEEL_SNAPSHOT_GREEN_OFFICIAL_ONLY`.

Estados preservados: `PARTIAL_E1_POWER` para DEC/FEC histórico,
`PARTIAL_E_WATER_OFFICIAL_NOTICES_ONLY`,
`PARTIAL_E_LIGHTING_SERVICE_AND_PROJECTS_ONLY`,
`COMUN_48_1C_MOTOROLA_PILOT_PAUSED_BY_PRODUCT_DECISION` e
`launch_publicly=false`.
