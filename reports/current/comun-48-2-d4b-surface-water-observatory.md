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

## Promoção e rollout concluídos

PR #293 foi mesclada com o head funcional exato
`460fed0aa555c4dcc232c394372826a838990edb` no commit de merge
`631fd84564eb217980dde008cc6a41311545e53f`.

1. flags-off, run `31639691495`: a flag ficou `disabled`; rotas e API novas
   foram comprovadamente cloaked (`404`) e as rotas canônicas continuaram
   disponíveis;
2. wave 1, run `31639948201`: somente
   `COMUN_OBSERVATORY_ENVIRONMENT_SURFACE_WATER_ENABLED=enabled`; páginas,
   fontes e API responderam `200`, `HEAD` respondeu `200` e `POST` respondeu
   `405`;
3. o smoke validou o DTO público ativo: referência de 2025, `PS0419` e
   `PS0421`, 24 coletas, 240 medições, 24 índices IQA oficiais separados e
   coordenadas não publicadas.

Os dois workflows comprovaram o main exato, o binding canônico da Vercel e
zero migration. Não houve fixture, escrita de negócio, leitura privada,
requisição runtime ao INEA, publicação automática, mapa geral Relata,
coletivo, envio externo ou hard delete.

Resultado terminal: `COMUN_48_2_D4B_SURFACE_WATER_OBSERVATORY_GREEN_OFFICIAL_2025`.
