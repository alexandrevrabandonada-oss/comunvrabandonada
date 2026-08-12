# COMUN 48.2-D3B1 — Equipamentos públicos de Saúde

Data da captura: 11/08/2026 (America/Sao_Paulo)

Baseline: `origin/main=715bd1da106702cd80d8164f5ae739f8c7c7f357`

Natureza: snapshot oficial CNES, public-safe, sem UI, API, flag, migration ou
deploy.

## Decisão

`READY_D3C_HEALTH`

O snapshot ativo contém somente estabelecimentos reportados como ativos para o
município CNES `330630`, cuja natureza jurídica está na allowlist pública
D3B0. A identidade é o código CNES; nenhuma unidade foi incluída por nome,
esfera administrativa ou mera relação de atendimento ao SUS.

O vínculo territorial foi recalculado contra os 739 setores oficiais D3A. A
coordenada CNES é preservada literalmente: divergências não são geocodificadas,
corrigidas ou atribuídas por endereço.

## Fontes e proveniência

| Fonte | Uso | retrievedAt | rawSha256 | semanticSha256 |
| --- | --- | --- | --- | --- |
| CNES Estabelecimentos | recorte ativo de Volta Redonda | `2026-08-12T02:43:28.638Z` | `fb5f1f1d7b6e58c34d0e2ce700190d14791dcc91a54849afddafea5ea961e382` | `c0bcbcee2a23aa904ee8543e18b9f7b502f4f72a6baf63d35179880854051e1a` |
| CNES Tipos de Unidade | dicionário oficial com 39 definições | `2026-08-12T02:43:28.638Z` | `7bc378ed7d877f7fb6d1e860c1ff79dfa76eb0b6b7aebcb783df5f2af0a4b381` | `6955439a3d7a0d95bda658cb4d19a1ec763b0b52f93c80c7e06044f4d4bebf2b` |
| IBGE/CONCLA Natureza Jurídica 2021 | definição da allowlist pública | `2026-08-12T02:43:28.638Z` | `8c40363ccf2bd0e1073322a35f73f1fd189a7f8e58f8fdbdbae32b5910024f97` | `dc52f03c25f9aadcb98d0c1d380048bde48a9b0edfee80291e43d1bc02aa9cdc` |

A captura controlada foi repetida antes da promoção. O recorte CNES reproduziu
os mesmos hashes bruto e semântico e as mesmas contagens. O HTML CONCLA variou
em bytes entre as leituras, mas a normalização das três definições permaneceu
idêntica; o manifesto ativo registra o hash bruto da captura promovida e o hash
semântico das definições.

O runtime não consulta essas fontes. Acesso externo existe somente no script de
captura controlada.

## Filtros aplicados

- UF CNES: `33`;
- município CNES: `330630`, reconciliado com IBGE `3306305`;
- status solicitado: `1`, com verificação adicional de ausência de motivo de
  desabilitação em todos os registros capturados;
- natureza jurídica allowlisted:
  - `1023` — Órgão Público do Poder Executivo Estadual ou do Distrito Federal;
  - `1031` — Órgão Público do Poder Executivo Municipal;
  - `1120` — Autarquia Municipal.

Prestadores privados, filantrópicos ou conveniados não entram apenas por
atenderem ao SUS. A fotografia resultante contém 1 registro `1023`, 100
registros `1031` e 1 registro `1120`.

## Diagnósticos da captura

| Etapa | Registros |
| --- | ---: |
| recebidos no recorte municipal ativo | 1.103 |
| município confirmado | 1.103 |
| status ativo confirmado | 1.103 |
| natureza jurídica pública allowlisted | 102 |
| rejeitados por natureza fora da allowlist | 1.001 |
| com ponto oficial CNES | 102 |
| somente endereço | 0 |

Os 102 registros têm código CNES único e identidade
`health:cnes:<codigo_cnes>`. O snapshot minimiza os campos à identidade, nome,
tipo, natureza jurídica, esfera/relação SUS quando presentes, endereço,
coordenada, status e proveniência. Telefone, e-mail, CNPJ, responsáveis,
profissionais, equipes e qualquer dado de pessoa não são armazenados.

## Tipos de unidade presentes

O snapshot preserva códigos e labels do dicionário CNES, sem substituí-los por
uma taxonomia COMUN e sem filtrar por substring. Os 20 tipos presentes são:

| Código | Tipo CNES | Quantidade |
| --- | --- | ---: |
| `2` | Centro de Saúde/Unidade Básica | 48 |
| `36` | Clínica/Centro de Especialidade | 13 |
| `4` | Policlínica | 9 |
| `70` | Centro de Atenção Psicossocial | 5 |
| `5` | Hospital Geral | 4 |
| `42` | Unidade Móvel pré-hospitalar de urgência | 4 |
| `43` | Farmácia | 3 |
| `39` | Unidade de Apoio Diagnose e Terapia | 2 |
| `50` | Unidade de Vigilância em Saúde | 2 |
| `74` | Polo Academia da Saúde | 2 |
| demais 10 tipos | tipos oficiais com uma ocorrência cada | 10 |

Centrais administrativas, de regulação, abastecimento e unidades móveis
permanecem porque o contrato D3B1 seleciona por município, atividade e natureza
jurídica — não por nome ou interpretação local de utilidade. Esta camada mede
presença de registros públicos oficiais, não capacidade assistencial.

## Vínculo aos setores D3A

| Estado | Registros |
| --- | ---: |
| `matched` | 97 |
| `boundary_ambiguous` | 1 |
| `outside_or_geometry_gap` | 4 |
| `not_applicable_address_only` | 0 |

Todos os 97 `sectorCode` vinculados existem no snapshot D3A. A geometria dos
setores não foi duplicada no snapshot de Saúde.

O registro CNES `6577075` toca a borda segundo o cálculo determinístico e não
recebe setor arbitrário. Os códigos `24589`, `3252930`, `6478697` e `7401884`
têm coordenadas oficiais fora da malha municipal ou em lacuna incompatível com
o recorte; as coordenadas foram preservadas e classificadas
`outside_or_geometry_gap`, sem correção manual. Endereço, CEP, bairro textual e
nome da unidade não foram usados para atribuir setor.

## Artefatos

- `data/comun/environment/public-equipment/health/active-snapshot.json`;
- `data/comun/environment/public-equipment/health/health-equipment-v1-20260811.json`;
- `data/comun/environment/public-equipment/health/source-manifest-v1.json`;
- `scripts/environment/capture-comun-public-health-equipment.mjs`;
- `lib/comun-environment-public-health-equipment.ts`.

O validador recalcula cada vínculo, verifica o dicionário de tipos, a allowlist
jurídica, hashes, IDs, contagens e invariantes. O diff versionado detecta
adição, remoção, nome, tipo, natureza jurídica, endereço, coordenada e status;
nenhuma mudança futura será autopromovida.

## Firewall e limitações

- zero Relata de Saúde, Wallet, conta, localização privada, anexos,
  encaminhamento sensível ou dado de paciente;
- zero geocoding derivado ou externo;
- zero cálculo de cobertura, suficiência, capacidade, distância, déficit ou
  equipamento por habitante;
- zero cruzamento com poluição, chuva, rios ou incidentes ambientais;
- zero migration, UI, API, flag, deploy e escrita Production;
- Educação e Assistência Social continuam `PARTIAL_D3B` e não foram alteradas.

Permanece:
`COMUN_48_2_D3A_ENVIRONMENTAL_EXPOSURE_DEFERRED_NO_CURRENT_ENVIRONMENTAL_LAYER`.

D1 continua bloqueado, D2A continua parcial sem estação operacional em Volta
Redonda e o piloto humano permanece pausado por decisão de produto.

## Resultado

`COMUN_48_2_D3B1_PUBLIC_HEALTH_EQUIPMENT_SNAPSHOT_GREEN_OFFICIAL_ONLY`
