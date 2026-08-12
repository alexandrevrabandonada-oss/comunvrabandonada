# COMUN 48.2-D3B0 — Contrato de equipamentos e serviços públicos

Data da auditoria: 11/08/2026

Escopo: Saúde, Educação e Assistência Social em Volta Redonda

Natureza: auditoria de fontes e contrato de dados, sem UI, API ou snapshot ativo

## Decisão

O contrato público está definido e falha fechado:

- `health = READY_D3B1`;
- `education = PARTIAL_D3B`;
- `social_assistance = PARTIAL_D3B`;
- geocoding externo ou derivado foi proibido no D3B0;
- vínculo com setor censitário só é permitido para ponto oficial e por
  point-in-polygon determinístico;
- endereço, CEP, bairro textual ou nome da rua não autorizam atribuir setor;
- nenhum catálogo de equipamentos foi ativado, publicado ou enviado para
  Production.

## Resultado por fonte

| Domínio     | Fonte                    | Publisher                     | Machine readable                    | Stable ID                                  | Endereço                              | Coordenadas oficiais                         | Status                    | Atualização               | Risco de privacidade                                    | Risco de conflito                                                                | Uso recomendado                                | Decisão       |
| ----------- | ------------------------ | ----------------------------- | ----------------------------------- | ------------------------------------------ | ------------------------------------- | -------------------------------------------- | ------------------------- | ------------------------- | ------------------------------------------------------- | -------------------------------------------------------------------------------- | ---------------------------------------------- | ------------- |
| Saúde       | CNES Estabelecimentos    | Ministério da Saúde / DATASUS | Sim, API JSON                       | Código CNES                                | Estruturado                           | Sim, nos 102 candidatos públicos verificados | Sim                       | Diária, conforme catálogo | Base inclui público e privado                           | Natureza jurídica e tipo exigem allowlists                                       | Identidade, localização e status canônicos     | `READY_D3B1`  |
| Saúde       | CNES Tipos de Unidade    | Ministério da Saúde / DATASUS | Sim, API JSON                       | Código do tipo                             | N/A                                   | N/A                                          | N/A                       | Não informada             | Baixo                                                   | Mapping COMUN ainda deve ser revisado                                            | Dicionário oficial de tipos                    | `READY_D3B1`  |
| Educação    | Censo Escolar 2025 V2    | INEP                          | Sim, CSV no ZIP oficial             | `CO_ENTIDADE`                              | Removido do microdado 2025            | Removidas do recurso                         | Sim                       | Anual                     | Publisher removeu campos pessoais/endereço do microdado | Exige correspondência revisada com catálogo de unidades                          | Identidade, dependência e situação escolar     | `PARTIAL_D3B` |
| Educação    | Catálogo de unidades SME | SME/PMVR                      | HTML estável, não dataset máquina   | URL de detalhe, sem ID nacional comprovado | Público na página individual          | Não                                          | Não comprovado            | Não informada             | Página inclui contatos desnecessários ao território     | 105 páginas versus 101 unidades informadas pela PMVR em 2026; inclui conveniadas | Corroborar endereço e categoria administrativa | `PARTIAL_D3B` |
| Assistência | Consulta pública CadSUAS | MDS                           | Consulta HTML paginada              | Código publicado quando disponível         | Público na página individual          | Não                                          | Exige revisão por detalhe | Não informada             | Catálogo atravessa redes públicas e não governamentais  | Gestão/situação precisam de validação por tipo                                   | Identidade e endereço candidatos, com revisão  | `PARTIAL_D3B` |
| Assistência | Carta de Serviços PMVR   | PMVR                          | HTML, não catálogo máquina completo | ID do serviço, não do equipamento          | Disponível para serviços selecionados | Não                                          | Não comprovado            | Não informada             | Pode conter contatos operacionais desnecessários        | Não cobre todo o catálogo de equipamentos                                        | Corroborar registros CadSUAS revisados         | `PARTIAL_D3B` |

## Saúde — CNES

A consulta oficial foi feita com UF `33`, município CNES `330630`, status
ativo e paginação completa. Foram observados:

- 1.103 estabelecimentos ativos e 1.103 códigos CNES únicos;
- 102 candidatos sob natureza jurídica pública explicitamente allowlisted;
- 102/102 candidatos com latitude e longitude publicadas pela fonte;
- códigos de natureza jurídica públicos admitidos: `1023`, `1031`, `1120`;
- 39 definições oficiais de tipo de unidade no dicionário consultado.

O campo de esfera administrativa não foi usado isoladamente: a própria amostra
contém estabelecimento privado descrito como esfera municipal. Relação
ambulatorial com o SUS também não comprova propriedade pública. O D3B1 deverá
versionar o mapping de tipos e excluir estruturas administrativas ou logísticas
sem utilidade territorial clara; portanto os 102 candidatos não são promovidos
automaticamente como pontos de atendimento.

Hashes de auditoria:

- páginas CNES capturadas: `fb5f1f1d7b6e58c34d0e2ce700190d14791dcc91a54849afddafea5ea961e382`;
- candidatos públicos normalizados: `3136d10f1481715456899a652c2c3ae0c85422ec3977797a1b2a5cced8a6cca6`;
- dicionário de tipos: `7bc378ed7d877f7fb6d1e860c1ff79dfa76eb0b6b7aebcb783df5f2af0a4b381`.

## Educação — INEP + SME

Do arquivo oficial do Censo Escolar 2025 V2, foram extraídos somente o
dicionário e a tabela de escolas, sem versionar o ZIP de 537 MB. Para o código
IBGE `3306305`:

- 196 escolas e 196 códigos INEP únicos;
- 130 registros públicos em funcionamento segundo dependência e situação;
- nenhum campo de endereço ou coordenada no recurso 2025;
- o dicionário oficial documenta que endereço, latitude, longitude e telefone
  foram retirados do microdado e remetidos ao Catálogo de Escolas.

O catálogo SME possui 105 páginas individuais e separa categorias como
conveniadas, CMEIs, FEVRE e unidades especializadas. Uma publicação municipal
de fevereiro de 2026 informa 101 unidades da rede, sendo 96 SME e cinco FEVRE.
Esse conflito impede snapshot: não se escolheu silenciosamente um número e
nenhuma conveniada foi classificada como `municipal_direct`.

Hashes de auditoria:

- tabela escolar: `f737d25dc5e80879e08f868d06d55f2bc1178cbb893dc14589a2123151f5b523`;
- dicionário: `140e0f3d0df0241330f1c26fd45e516e63bd2ad60fb7ae3c9ae5cb47c6290166`;
- recorte normalizado: `fe7882521fd69ddffa156b8edc7fdd0bccb27a5ced92ebfb3fbc73205ea7dc1b`;
- catálogo SME: `1d2d5a0a972c58ccdb5a07d00e2a6d6e124d507bd1bd47955eeb1b909464a649`.

## Assistência Social — CadSUAS + PMVR

A consulta pública CadSUAS para Volta Redonda retornou 89 entidades únicas em
cinco páginas. O resultado incluiu 35 CRAS, um CREAS, um Centro POP, seis
Centros Dia, 13 unidades de acolhimento, 12 centros de convivência, um posto do
Cadastro Único e 20 registros de outras redes. Foram observados 69 códigos de
unidade publicados, mas não há coordenadas oficiais.

CRAS, CREAS e Centro POP possuem tipos públicos claros; os demais grupos não
podem ser promovidos sem rever gestão e situação, pois o cadastro abrange redes
governamentais e não governamentais. A Carta de Serviços municipal corrobora
serviços selecionados, mas não substitui um catálogo completo e estruturado.

Hashes de auditoria:

- páginas de resultado CadSUAS: `0fe2b5de7613bd036789dc7cfeda758d572c24d9965afd6e247af086d408e9e4`;
- códigos publicados normalizados: `4a012fe4ec2997cddd56fcead5f2ff86fa38cfcd0dabc53e1996035eaf5245c3`;
- diretório de serviços PMVR: `d76358862ffa30fe4d8846083c9f48b162ee128ebb8e54308b306cb0bc3277e8`.

## Contrato geográfico

O contrato distingue:

- `official_public_point`: coordenada publicada pela própria fonte oficial;
- `address_only`: endereço oficial, sem coordenada;
- `derived_geocoded_point`: variante futura, proibida no D3B0.

A função pura de vínculo territorial retorna apenas `matched`,
`outside_or_geometry_gap` ou `boundary_ambiguous`. Ponto na borda ou presente
em mais de um polígono nunca é escolhido arbitrariamente. `neighborhoodLabel`
continua texto de endereço e não boundary oficial de bairro.

## Firewall e limites

- zero Relata, Wallet, conta, localização privada, anexos, forwarding, Saúde
  sensível, Educação sensível ou Proteção de crianças;
- zero geocoder Google, Mapbox, Nominatim, HERE, Bing ou outro serviço externo;
- zero inferência de usuário, aluno, paciente, família ou beneficiário;
- zero migration, backfill, UI, API, flag, deploy ou escrita Production;
- quantidade de equipamentos não foi convertida em cobertura, capacidade,
  déficit, distância de acesso ou exposição ambiental.

Permanece preservado:
`COMUN_48_2_D3A_ENVIRONMENTAL_EXPOSURE_DEFERRED_NO_CURRENT_ENVIRONMENTAL_LAYER`.

## Plano D3B1

O primeiro domínio autorizado é Saúde. Antes de snapshot ativo, D3B1 deve:

1. fixar a allowlist jurídica e o mapping versionado de tipos CNES;
2. separar pontos assistenciais de regulação, gestão, almoxarifado e unidades
   móveis quando a utilidade territorial não estiver comprovada;
3. validar IDs, coordenadas e point-in-polygon contra D3A;
4. produzir candidate snapshot, diff e revisão antes de promover.

Educação aguarda correspondência INEP↔SME/Catálogo e resolução do conflito de
contagem. Assistência aguarda classificação de gestão/situação e identidade
completa por tipo. Nenhum dos dois bloqueia o contrato D3B0.

## Resultado

`COMUN_48_2_D3B0_PUBLIC_EQUIPMENT_DATA_CONTRACT_GREEN`
