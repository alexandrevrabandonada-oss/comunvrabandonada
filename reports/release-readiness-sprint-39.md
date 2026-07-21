# Release readiness — Sprints 39 e 39.1

## Decisão local

**TECHNICAL_LOCAL_READY**.

- PMTiles real v3: 10.147.678 bytes, SHA-256 `d0512669d6c01cbffbc513837e30ac926ef124727feeaa12b91d9be04cd635b9`.
- Fonte OSM e limite IBGE: proveniência, licença, data e hashes registrados.
- Tippecanoe: 2.79.0 em container local reproduzível.
- Render MapLibre, HTTP Range, atribuição e fallback: validados localmente.
- Upload direto privado e confirmação em duas fases: implementados e comprovados no viewport móvel primário.
- Derivada sem EXIF: comprovada automaticamente.
- Typecheck: aprovado.
- Lint: aprovado.
- Unitários: 248/248.
- E2E geográfico/captura: 46 aprovados, 4 skips intencionais.
- RLS: `RLS_MATRIX_OK`.
- DB lint local: sem erros.
- Smoke HTTP sem vazamento: aprovado.

## Gates separados

- Dispositivos físicos: **NO_GO_PHYSICAL_DEVICE_REVIEW**
- Experiência humana: **NO_GO_HUMAN_EXPERIENCE** (0/3)
- Operação: **NO_GO_OPERATIONAL_READINESS**
- Remoto: **NO_GO_REMOTE_REVIEW**

Dispositivos físicos não foram executados, o gate humano permanece 0/3 e o piloto público não foi aberto.

Nenhum protocolo real, acesso ao Supabase remoto, R2, push ou deploy foi executado. O artefato PMTiles pesado está ignorado pelo Git. Custo externo: R$ 0.
