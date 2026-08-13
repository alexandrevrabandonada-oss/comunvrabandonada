# COMUN 48.2-F — Panorama de Volta Redonda

Baseline funcional: `dd84a78fc3e9c8fda69fb2019a9ef8c69995991a`.

## Síntese pública cross-observatory

- a rota pública `/comun/observatorios/panorama` e sua API somente
  `GET`/`HEAD` organizam, sem duplicar snapshots, as superfícies públicas de
  Território e Serviços Públicos, Calçadas, Transporte, Qualidade dos Rios e
  Energia elétrica;
- o DTO é resumido, mede menos de 100 KB serializado e contém somente fatos
  descritivos, declarações de cobertura, lacunas e referências de evidência;
- cada camada mantém período, escala, proveniência e limitações próprias. O
  Panorama não produz score da cidade, ranking, correlação, inferência causal,
  mapa unificado ou join geográfico por rótulo;
- Calçadas permanece estritamente na projeção comunitária P4 revisada e
  publicada; vazio não significa ausência de problemas na cidade;
- Território continua distinguindo setor censitário de bairro e presença de
  equipamento de capacidade ou cobertura; Assistência Social segue
  `address_only`, sem marcador ou vínculo setorial;
- Transporte permanece rede programada e estudo oficial, não tempo real;
  rios são referência de 2025 e não água para consumo humano; Energia mostra
  5.676 registros oficiais em `2026-01`, `2026-03` a `2026-06`, sem converter
  a ausência de `2026-02` em zero;
- a área não lê Relata, Carteira, conta, localização privada, anexos,
  encaminhamentos ou qualquer agregado privado. Não há fetch runtime a ANEEL,
  INEA, IBGE, PMVR, SAAE ou outras fontes externas.

## Promoção e rollout

- PR funcional [#301](https://github.com/alexandrevrabandonada-oss/comunvrabandonada/pull/301):
  head `3b588dbfbc324664407947fb7e5d7945e2a0b2ae`, merge exact-head
  `760a176b2f20d626e93ff086790d524e763daaef`;
- CI completa, preflight remoto e Preview ficaram verdes; a promoção confirmou
  diff vazio em `supabase/migrations`;
- flags-off, run `31664529501`: binding Vercel, main exato e zero migration
  verdes; `/comun/observatorios/panorama` e sua API permaneceram `404`,
  `POST` continuou `405`, e as rotas canônicas existentes responderam `200`;
- wave 1, run `31664650933`: somente
  `COMUN_OBSERVATORY_CITY_PANORAMA_ENABLED=enabled`; página, API e `HEAD`
  responderam `200`, `POST` respondeu `405`, e os cinco links de observatórios
  especializados permaneceram funcionais;
- ambos os runs foram somente leitura sobre dados de negócio:
  `businessWrites=0` e `externalRuntimeRequests=0`.

Resultado terminal:
`COMUN_48_2_F_CROSS_OBSERVATORY_CITY_PANORAMA_GREEN_PUBLIC_SAFE`.

Preservados: auto-publicação OFF, mapa geral Relata OFF, coletivos OFF,
`launch_publicly=false` e
`COMUN_48_1C_MOTOROLA_PILOT_PAUSED_BY_PRODUCT_DECISION`.
