# COMUN 48.2-D4B — Observatório Ambiental: Qualidade dos Rios

Baseline: `062b22f7b74238bbe60627bc04c9d70360ba00f0`.

## Superfície pública, oficial e limitada

O Observatório Ambiental passou a oferecer a subseção **Qualidade dos Rios**
somente quando `COMUN_OBSERVATORY_ENVIRONMENT_SURFACE_WATER_ENABLED=enabled`.
Ela deriva exclusivamente do snapshot ativo INEA RH III de 2025: `PS0419` e
`PS0421`, no Rio Paraíba do Sul em Volta Redonda; 24 coletas, 240 medições e
24 valores de IQA publicados separadamente.

Não há mapa nem coordenada: a fonte não publicou latitude/longitude. Não há
consulta ao INEA durante a visita, geocoding, dado de Relata, Carteira,
identidade, anexo, encaminhamento ou água para consumo humano.

## Linguagem e limites

- referência de 2025, não tempo real;
- qualificadores `<`, `>`, `ND` e `NQ` permanecem visíveis;
- ausência é “Não informado”, nunca zero;
- IQA não é recalculado nem classificado pelo COMUN;
- não há avaliação de potabilidade, conformidade legal ou atribuição de
  poluidor;
- `drinking_water_quality` permanece `PARTIAL_D4`.

## Rollout planejado

1. flags-off: as três rotas e a API permanecem 404;
2. wave 1: habilitar somente a flag ambiental e provar GET/HEAD 200, métodos
   mutáveis 405 e `businessWrites=0`.

Resultado esperado: `COMUN_48_2_D4B_SURFACE_WATER_OBSERVATORY_GREEN_OFFICIAL_2025`.
