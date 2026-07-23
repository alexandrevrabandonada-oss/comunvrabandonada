# Inventário de branches do COMUN

Leitura realizada em 23 de julho de 2026. Nenhuma branch com commits únicos foi
apagada.

## Base e linha ativa

| Branch | SHA | PR aberta | Ancestral de `main` | Únicos | Decisão |
| --- | --- | --- | --- | ---: | --- |
| `main` | `b2f6733` | não aplicável | sim | 0 | `KEEP_MAIN` |
| `codex/tijolo-41-baseline-canonico` | `967e2df` | #30 | não | 16 | `OPEN_PR_REQUIRES_DECISION` |

A PR #30 está aberta, não draft, mesclável, baseada em `main` e é a única PR
ativa. O SHA será atualizado no fechamento documental deste lote.

## História única preservada

| Branch | SHA | Únicos | Worktree | Decisão |
| --- | --- | ---: | --- | --- |
| `codex/comun-admin-auth-remote` | `7be997a` | 1 | ativo | `KEEP_UNIQUE_HISTORY` |
| `codex/comun-auth-closeout-local` | `2477c90` | 2 | ativo | `KEEP_UNIQUE_HISTORY` |
| `codex/comun-auth-integration-validation` | `c7644f7` | 12 | ativo | `KEEP_UNIQUE_HISTORY` |

As três branches também existem no remoto. Não possuem PR aberta, mas não podem
ser removidas porque contêm commits ausentes de `main`.

## Branches mescladas com worktree ativo

As seguintes branches têm zero commit único e são ancestrais de `main`, porém
foram preservadas porque ainda pertencem a worktrees ativos:

- `codex/comun-comunidades-persistentes-local`;
- `codex/comun-comunidades-vivas-local`;
- `codex/comun-experiencia-integral-local`;
- `codex/comun-familiaridade-local`;
- `codex/comun-gate-humano-local`;
- `codex/comun-piloto-integrado-local`;
- `codex/comun-primeira-participacao-local`;
- `codex/comun-pwa-app-like-local`.

Decisão: `UNKNOWN_DO_NOT_DELETE` até remoção explícita dos worktrees.

## Branches mescladas sem worktree

- `codex/sprint-37-2-human-gate`;
- `codex/sprint-37-mapa-real-calcadas-local`;
- `codex/sprint-38-miniapp-experience-local`;
- `codex/sprint-38-miniapps-human-gate`;
- `codex/sprint-39-real-map-quick-capture`;
- `codex/sprint-40-1-mobile-preview`.

Todas são ancestrais de `main`, não têm PR aberta e têm zero commit único.
Decisão: `DELETE_MERGED`. Em 23 de julho de 2026,
`codex/sprint-40-1-mobile-preview` foi removida localmente e do remoto após a
confirmação do merge e da tag. As demais permanecem como inventário histórico.
