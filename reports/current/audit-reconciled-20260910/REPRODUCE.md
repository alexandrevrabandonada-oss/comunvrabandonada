# Receber e reproduzir sem transferência remota

1. Em repositório local que contenha o histórico de
   `1387e1bcecdc4147bb5dad41aa7d541ec97b1497`, crie clone separado com
   `git -c core.autocrlf=false clone --no-hardlinks CAMINHO_LOCAL destino`.
   Use `git config core.autocrlf false` no destino antes do checkout do candidato.
2. Confira SHA256 do bundle pelo manifesto externo. Execute
   `git bundle verify CAMINHO_BUNDLE`; importe com
   `git fetch CAMINHO_BUNDLE refs/heads/codex/audit-reconciled-20260910:refs/heads/codex/review-audit`.
   Faça checkout da branch local e confira SHA e tree hash do manifesto.
3. Não copie `.env`, sessões ou configuração hospedada. Em terminal sem variáveis
   de projeto herdadas, use Node 22.19.0 e `npm ci --ignore-scripts` com o lockfile.
   Essa instalação limpa é passo de reprodução, não resultado executado no host
   original (lá as dependências de lock idêntico foram copiadas).
4. Configure heap de 4096 MiB apenas no processo de build/typecheck. Reserve espaço
   no volume do checkout e do Docker; use pasta temporária própria se necessário.
5. Execute sequencialmente:

```text
npm run lint
npm run test:unit -- --pool=threads --maxWorkers=1
node --test scripts/ci/comun-central.node-test.mjs scripts/ci/vercel-build-impact.node-test.mjs
npm run build
npm run typecheck
```

FFmpeg/ffprobe 8.1.1 no PATH e tsx 4.23.13 permitem
`tsx scripts/radio-storage-cycle.mjs`; usa apenas áudio sintético e memória.
O comando absoluto do host de origem aparece no log por rastreabilidade, não é
pré-requisito de caminho para outro computador.

Copie `reports/current/audit-reconciled-20260910/browser-config.txt` para
`tmp/closure-browser.config.ts` e execute:

```text
node node_modules/@playwright/test/cli.js test -c tmp/closure-browser.config.ts
```

É necessário Chromium do Playwright 1.61.1 instalado. A configuração usa os testes
existentes sem mudar assertions, cria servidor loopback:3116 e não reutiliza outro.

Para integração real, siga `scripts/audit/README-radio-lab.md`. `prepare` confere
as 63 migrations e cria proprietário exclusivo; `start` precisa retornar
`LAB_READY` antes de `radio-lab-integration.mjs`. O Docker indisponível do host de
origem não é motivo para usar Supabase hospedado. Não conte testes ausentes como
PASS. Preserve FAIL, corrija somente defeito reproduzido e reexecute no novo SHA.

O harness cobre um conjunto focal, ainda não executado integralmente; não é
certificação de toda a matriz RLS, grants de funções, cache publicado ou R2 real.
Use `stop` somente para o laboratório registrado; se Docker não responder,
registre cleanup BLOCKED sem parar stacks alheias ou apagar dados globais.

Nenhum passo deste roteiro solicita push, workflow, PR, Preview, merge ou deploy.
