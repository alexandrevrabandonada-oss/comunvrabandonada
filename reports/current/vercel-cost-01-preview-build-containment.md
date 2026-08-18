# VERCEL-COST-01 — Preview build containment

## Escopo

Projeto: `alexandrevrabandonada-oss/comunvrabandonada`

Baseline canônico: `origin/main` = `3529bb9e52856c6a37f6fd642867cc99a06109f4`

Este tijolo altera somente o classificador local do Ignored Build Step. Não
houve alteração remota no Vercel, alteração no Supabase, mudança de feature
flag, mudança funcional no COMUN ou início do A3.

## Baseline

`vercel.json` já apontava para:

```text
node scripts/ci/vercel-ignore-build.mjs
```

A regra anterior ignorava somente diffs compostos exclusivamente por
`docs/**` ou `reports/**`. Qualquer outro arquivo forçava BUILD.

## Regra nova

O comando agora delega a decisão a
`scripts/ci/vercel-build-impact.mjs`, que retorna `IGNORE` ou `BUILD` com
razão sanitizada.

IGNORA somente quando todos os arquivos alterados pertencem à allowlist
no-runtime:

- `docs/**`;
- `reports/**`;
- Markdown seguro na raiz (`README.md`, `CHANGELOG.md`, `CONTRIBUTING.md`);
- `tests/**`, `e2e/**` e arquivos `*.test.ts`, `*.test.tsx`, `*.spec.ts` ou
  `*.spec.tsx`;
- `.github/workflows/**`;
- `scripts/solo/**`, `scripts/audit/**` e `scripts/diagnostics/**`.

Foi verificado que o script `build` do `package.json` é `next build`; os
scripts operacionais allowlisted não são chamados pelo build da aplicação.

BUILD continua obrigatório para produção, `main`, runtime, dependências,
configuração, `vercel.json`, `scripts/ci/**`, migrations e qualquer path
desconhecido. Um diff misto sempre resulta em BUILD.

Falha de `git diff`, revisão inválida, diff vazio ou ambiente Vercel ausente/
inconsistente também resulta em BUILD.

## Auditoria histórica

Amostra: 14 previews recentes do Vercel, principalmente nos branches
`codex/48-5-a2-r1-operational`, `codex/48-5-a2-cultural-intake` e
`codex/48-5-a0-culture-memory-reconciliation`.

| Commit | Arquivos alterados resumidos | Regra anterior | Regra nova |
| --- | --- | --- | --- |
| `50a18585` | workflow de rollout | BUILD | IGNORE |
| `08db51d1` | migration cultural R1 | BUILD | BUILD |
| `6e093fe1` | migration cultural R1 | BUILD | BUILD |
| `c859906a` | SQL descartável operacional | BUILD | BUILD |
| `75dde907` | SQL descartável operacional | BUILD | BUILD |
| `eb3098ce` | workflow + reports + SQL descartável | BUILD | BUILD |
| `83980fad` | `app/` + reports + migration | BUILD | BUILD |
| `7c2d993d` | `lib/` | BUILD | BUILD |
| `fa1ebc89` | migration cultural | BUILD | BUILD |
| `643d2e72` | `app/` + `lib/` + migration | BUILD | BUILD |
| `2f849478` | `lib/` + teste em `lib/` + reports | BUILD | BUILD |
| `22f62a30` | `app/` + `lib/` + reports | BUILD | BUILD |
| `b5ab558b` | workflow + report | BUILD | IGNORE |
| `3ad7d3a1` | workflow + teste/runtime em `lib/` + reports | BUILD | BUILD |

Resultado da amostra:

- `avoidablePreviewCount`: 2;
- `requiredPreviewCount`: 12;
- `estimatedAvoidanceRate`: 14,3%.

O resultado ficou abaixo da meta de 60% porque os previews recentes foram
majoritariamente mudanças reais de runtime ou migrations. A allowlist não foi
ampliada de forma arriscada. O percentual é uma estimativa da amostra, não uma
promessa de economia global.

## Testes

Arquivo: `scripts/ci/vercel-build-impact.node-test.mjs`

Cobertura explícita para docs, reports, testes, workflows, scripts seguros,
runtime, assets públicos, migrations, configuração, dependências, arquivos
desconhecidos, diffs mistos, produção, ambiente inconsistente e falha de diff.

Resultado local:

```text
13 passed, 0 failed
```

Também foram executados `node --check` no classificador e no comando do
Vercel, além de `git diff --check` sem ocorrências.

No worktree limpo baseado em `origin/main`, com dependências restauradas
somente pelo lockfile (`npm ci --ignore-scripts --no-audit --no-fund`), os gates
globais passaram:

```text
npm run typecheck   PASS
npm run lint        PASS
npm run build       PASS
npm run test:unit   PASS — 203 arquivos, 1.090 testes
```

A recuperação do npm foi necessária porque a inspeção local encontrou
`UNABLE_TO_VERIFY_LEAF_SIGNATURE` com o registry oficial
`https://registry.npmjs.org/`. O Windows Schannel e `curl` validaram a cadeia,
e o certificado raiz `Avast Web/Mail Shield Root` confirmou interceptação local
de TLS. A recuperação segura e reversível foi process-local:

```text
NODE_OPTIONS=--use-system-ca npm ci --ignore-scripts --no-audit --no-fund
```

O `strict-ssl` permaneceu ativo; nenhum registry alternativo, atualização de
dependência, `strict-ssl=false` ou `NODE_TLS_REJECT_UNAUTHORIZED=0` foi usado.
O `NODE_OPTIONS` não foi persistido nem incluído no commit. Classificação
diagnóstica: `PROXY_CERTIFICATE_INTERCEPTION` / incompatibilidade entre a
cadeia local e o trust store padrão do Node.

## Segurança e escopo

- zero mudança em `app/`, `components/`, `lib/`, `public/` ou `supabase/`;
- zero business writes;
- zero Supabase writes;
- zero mudança de feature flag;
- zero mudança remota no Vercel;
- produção e `main` continuam BUILD;
- nenhuma alteração na build machine, memória, concorrência, ISR ou cache.

## Conclusão

O contrato está implementado fail-closed e pronto para ser validado em uma
PR. A economia imediata esperada deste tijolo é conservadora; o histórico
mostra que a maior redução exigirá controlar a frequência dos pushes/previews,
o que fica fora deste COST-01.
