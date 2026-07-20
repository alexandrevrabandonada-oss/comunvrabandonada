# Release readiness — Sprint 32

Status: **candidato local integralmente aprovado — piloto Mapa Popular das Calçadas**.

| Gate | Resultado |
| --- | --- |
| Banco local limpo e migration reproduzível | passou (reset duplo) |
| RLS e ausência de exposição direta | passou (RLS_MATRIX_OK) |
| Lint, tipos, unitários e build | passou |
| Acessibilidade séria/crítica | passou (zero serious/critical) |
| Responsividade 360, 390, 768, 1024 e 1366 | passou (screenshots revisados) |
| Fluxo integral do piloto de calçadas | passou (smoke + E2E) |
| Serviços remotos / custo | não usados / R$ 0 |

## Declarações obrigatórias

- Vercel deploy: NÃO EXECUTADO
- Git push: NÃO EXECUTADO
- Supabase remoto: NÃO ALTERADO
- R2 real: NÃO UTILIZADO
- APIs externas: NÃO UTILIZADAS
- Dados reais: NÃO INSERIDOS
- Atividade de campo real: NÃO REALIZADA
- Smoke remoto: NÃO EXECUTADO
- Custo externo: R$ 0
# Atualização Sprint 32.1 — 16/07/2026

Status: **RC local aprovado**. Dois resets independentes, build/`next start`, 75/75 E2E, 25/25 Axe, 151 unitários, `RLS_MATRIX_OK`, DB lint, nove regressões e cleanup passaram. Nenhuma operação remota foi realizada; custo R$ 0.
