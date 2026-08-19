# COST-02 — Push/Preview Frequency Reduction

Estado: implementação local concluída; aguardando PR e validação remota do checkpoint.

## Objetivo

Reduzir execuções duplicadas do GitHub Actions e Previews da Vercel sem alterar o comportamento de produção, de branches não-Codex ou de mudanças de alto risco.

## Diagnóstico comprovado

### GitHub Actions

Antes do COST-02, `.github/workflows/comun-ci.yml` aceitava simultaneamente:

- `push` em `main` e `codex/**`;
- `pull_request` para `main`;
- `deployment_status`.

Isso gerava pelo menos duas execuções para o mesmo SHA Codex: uma pelo `push` da branch e outra por `pull_request`/`synchronize`. O job `COMUN R2A / production candidate topology` não tinha condição de evento e também rodava em `deployment_status`, embora a topologia de produção só seja necessária em PR/push de `main` e chamadas explícitas completas.

Evidência remota observada no histórico:

| SHA | push | PR | deployment_status |
| --- | ---: | ---: | ---: |
| `83980fad` | `32064960099` | `32064999868` | `32065050875` |
| `eb3098ce` | `32066634176` | `32066637578` | `32066733440` |
| `75dde907` | `32066957907` | `32066959367` | `32067041839` |
| `c859906a` | `32067247185` | `32067251569` | `32067344254` |
| `6e093fe1` | `32067577658` | `32067582443` | `32067754088` |
| `08db51d1` | `32067858770` | `32067861580` | `32067978647` |

O COST-02 remove o `push` de `codex/**` e restringe o job de produção para impedir a execução acidental em `deployment_status`. O `push` de `main`, PR, `workflow_call`, `workflow_dispatch` e o nightly permanecem.

### Vercel

No projeto `comunvrabandonada`, a amostra recente apresentou 11 Previews READY em branches Codex de trabalho:

- `codex/48-5-a2-r1-operational`: 6 Previews (`83980fad`, `eb3098ce`, `75dde907`, `c859906a`, `6e093fe1`, `08db51d1`);
- `codex/48-5-a2-cultural-intake`: 3 Previews (`643d2e72`, `fa1ebc89`, `7c2d993d`);
- `codex/48-5-a0...`: 2 Previews (`3ad7d3a1`, `b5ab558b`).

Os registros tinham `environment: Preview`, estado `READY`, SHA GitHub correspondente e URL `*.vercel.app`. A amostra não informa quais builds foram efetivamente ignorados, portanto a economia abaixo é uma replay contrafactual, não uma cobrança retroativa.

Com um checkpoint por linha de trabalho, a amostra representa 3 Previews necessárias e 8 Previews intermediárias potencialmente evitáveis: redução estimada de 72,7% na frequência de Preview nessa amostra. A economia financeira real depende do tempo de build e de como a Vercel contabiliza cada execução.

## Contrato implementado

### Classificador Vercel

`vercel.json` continua delegando a decisão a `scripts/ci/vercel-ignore-build.mjs`, sem chamada de API externa.

- produção e `main`: sempre `BUILD`;
- branch não-Codex: comportamento anterior preservado;
- allowlist segura em Codex: `IGNORE`;
- runtime Codex sem `[comun-preview]`: `IGNORE` com razão `codex-runtime-awaiting-preview-checkpoint`;
- runtime Codex com `[comun-preview]`: `BUILD` com razão `codex-preview-checkpoint`;
- alto risco (`vercel.json`, `scripts/ci`, `supabase`/migrações, dependências, locks, configuração de build, env e desconhecidos): sempre `BUILD`;
- SHA inválido, diff indisponível ou mensagem de commit indisponível: `BUILD` fail-closed;
- a mensagem é obtida deterministicamente do commit correspondente ao SHA recebido pela Vercel.

### Freshness gate

O job `COST-02 / exact checkpoint Preview` roda somente em PR de branch `codex/**` contra `main` e executa `scripts/ci/verify-codex-preview-checkpoint.mjs`.

O gate:

1. calcula o merge-base com `origin/main`;
2. classifica o diff completo;
3. encontra o commit mais recente com `[comun-preview]`;
4. exige deployment GitHub `Preview` bem-sucedido para o SHA exato do checkpoint, com URL `*.vercel.app`;
5. classifica o intervalo checkpoint..HEAD;
6. reprova runtime/alto risco após o checkpoint, preview ausente/falho/SHA divergente, base diferente de `main` ou diff indisponível;
7. aprova somente mudança segura após o checkpoint ou estado sem runtime que não exige Preview.

Como a criação do deployment e a publicação do status `success` podem ocorrer alguns segundos depois do evento do PR, a consulta usa polling limitado de até 12 tentativas de 10 segundos. O limite não transforma ausência/falha em sucesso: ao esgotar a janela, o gate reprova.

Não há gate humano ou exceção ampla para Codex.

## Verificação local

Executado no worktree limpo baseado em `9602f53eaedafe391c062d9898f8e0489d2a938d`:

- sintaxe Node dos scripts novos/alterados: passou;
- contratos COST-01 + COST-02: **37/37 testes passaram**;
- `npm run lint`: passou;
- `npm run typecheck`: passou;
- `npm run test:unit`: **203 arquivos, 1.090 testes passaram**;
- `npm run build`: passou, 130 páginas estáticas geradas;
- `git diff --check`: passou.

O build local apenas emitiu o aviso já esperado de múltiplos lockfiles ao usar o worktree de validação; não houve falha de compilação.

## Limites respeitados

Não foram alterados secrets, configurações remotas da Vercel, proteção remota de branch, Supabase, banco, dados, flags, dependências ou o domínio de produção. O worktree original sujo foi preservado; a implementação foi feita em worktree limpo separado.

## Próximo estado operacional

O commit de publicação deve conter `[comun-preview]` na mensagem. Como os arquivos de CI são de alto risco, a Vercel deverá construir esse checkpoint. O PR só deve ser considerado fresco quando o deployment Preview READY tiver exatamente o SHA desse commit e o job `COST-02 / exact checkpoint Preview` estiver verde.
