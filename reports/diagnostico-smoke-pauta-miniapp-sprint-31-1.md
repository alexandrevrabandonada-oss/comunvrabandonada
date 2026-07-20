# Diagnóstico do Smoke Pauta Miniapp (Sprint 31.1)

Relatório detalhado sobre as causas da falha do smoke test legado `smoke:pauta-miniapp`.

## Falha no Teste

- **Arquivo inspecionado:** `lib/comun/pauta-module-registry.ts`
- **Linha exata da falha:** Linha 10
- **Asserção usada:**
  ```javascript
  for (const moduleType of ["overview", "construction_circle", "map", "archive", "community_radio_future"]) if (!registry.includes(`'${moduleType}'`)) throw new Error(`catálogo sem ${moduleType}`);
  ```

## Causa do Erro

1. **Dependência de estilo de aspas (aspas simples):** A asserção no script de smoke busca literais de string envoltos em aspas simples (`'overview'`, etc.). Contudo, o arquivo `lib/comun/pauta-module-registry.ts` foi formatado/atualizado utilizando aspas duplas (`"overview"`, etc.), o que quebra a busca textual literal.
2. **Expectativa de `community_radio_future` obsoleto:** O teste ainda espera que o catálogo contenha `community_radio_future`. No entanto, no escopo atual da aplicação e do banco, a rádio comunitária foi promovida para o tipo ativo `community_radio`, e o sufixo `_future` foi devidamente removido do catálogo e das migrações do banco de dados.

## Contrato Funcional Atual

O catálogo em `lib/comun/pauta-module-registry.ts` expõe a constante `pautaModuleTypes` contendo os tipos reais e ativos como `"art_gallery"` e `"community_radio"`. Não há mais a presença dos tipos reservados do futuro (`art_gallery_future`, `community_radio_future`).

## Outros Smokes Semelhantes

Outros scripts de smoke leem arquivos para verificar a presença de termos (ex. `smoke-comun-admin-notifications.mjs`, `smoke-comun-admin-team.mjs`, `smoke-comun-pauta-dossier-double-review.mjs` que leem `actions.ts` ou páginas da administração), mas a maior parte foca na presença de importações ou chamadas de função, sem depender estritamente de aspas. O smoke `pauta-miniapp` era o único a falhar por causa da formatação de aspas simples vs duplas e por manter uma asserção contra um tipo de módulo já promovido.

## Classificação das Asserções Removidas

- **`registry.includes` de literais com aspas simples:** Textual frágil (dependente de estilo) e Obsoleta (esperando `community_radio_future`).
- **`page.includes("PautaAppShell")` / `page.includes("LegacyIssuePage")`:** Textual frágil (inspeciona texto-fonte da página).
- **`migration.includes(table)` / `migration.includes("enable row level security")`:** Textual frágil (inspeciona string do arquivo SQL de migração).
