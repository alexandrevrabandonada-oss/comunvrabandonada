# Política `relata-public-projection-v1`

| Categoria | Grade métrica | Mínimo | Regra |
|---|---:|---:|---|
| `public_lighting` | 300 m | 1 relato | confiança alta, localização aproximada válida |
| `power_distribution` | 800 m | 2 relatos | um relato isolado fica suprimido |
| `smoke_or_environmental_trace` | 1.000 m | 1 relato | nunca afirma fogo ativo ou origem |

Estados permitidos: `blocked`, `eligible_auto_local`, `review_required`, `visible_local_preview`, `suppressed`, `inactive`, `withdrawn`. “Publicado” não é usado na interface nem no modelo local.

São sempre bloqueados: risco elétrico, fogo ativo, emergência, saúde, crianças, violência, acusação individualizada, retaliação, classes sensíveis/restricted/high-risk e qualquer caso sem candidato de localização aproximada. O centro é o centro de uma célula métrica; o raio de incerteza nunca diminui.

O conteúdo é templated. A projeção não contém relato, protocolo, texto, foto, coordenada exata, endereço, pessoa, órgão público, hash, HMAC ou caminho de Storage.
