# Tijolo 19.3 - Local-first hard gate

## Ambiente

- Ambiente usado: local.
- Deploy executado: nao.
- Check em producao executado: nao.
- Local-only: sim.

## Implementado

- Criado `scripts/production-guard.mjs` com trava central para checks contra producao.
- Criado `scripts/require-production-checks.mjs` para comandos de release.
- Smokes HTTP que usam `NEXT_PUBLIC_SITE_URL` agora abortam quando a URL aponta para producao sem `ALLOW_PRODUCTION_CHECKS=1`.
- O script legado `scripts/run-sprint-14-secure.ps1` tambem foi protegido antes de deploy/smokes de producao.
- `package.json` agora possui:
  - `verify:local`;
  - `verify:release`;
  - `verify` apontando para `verify:local`.
- `docs/deploy-checklist.md` foi atualizado para tratar deploy como release, nao como rotina de tijolo comum.
- `docs/operacao-comun.md` foi atualizado com a regra local-first e a obrigacao dos relatorios futuros.

## Seguranca operacional

Produção fica bloqueada por padrao para smokes HTTP. A autorizacao passa a ser dupla: pedido explicito da pessoa operadora e `ALLOW_PRODUCTION_CHECKS=1` no ambiente.

## Nao executado

- Nenhum deploy.
- Nenhum smoke contra `https://comunvrabandonada.vercel.app`.
- Nenhum teste contra producao.

## Proximo tijolo recomendado

Criar um script de release separado que prepare ambiente, exija confirmacao explicita e rode `verify:release` apenas quando for de fato uma janela de publicacao.
