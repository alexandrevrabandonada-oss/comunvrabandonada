# Tijolo 19.3 - Auditoria local-first hard gate

## Ambiente

- Ambiente usado: local.
- Deploy executado: nao.
- Check em producao executado: nao.
- Local-only: sim.

## Resultado

A rotina de tijolos comuns foi travada para operar localmente por padrao.

## Itens auditados

- `package.json` separa `verify:local` e `verify:release`.
- `npm run verify` permanece compativel e aponta para `verify:local`.
- `verify:local` roda apenas lint, typecheck e build.
- `verify:release` exige `ALLOW_PRODUCTION_CHECKS=1` antes de prosseguir.
- Smokes HTTP que usam `NEXT_PUBLIC_SITE_URL` chamam `assertProductionChecksAllowed`.
- A trava aborta quando `NEXT_PUBLIC_SITE_URL` aponta para `https://comunvrabandonada.vercel.app` sem `ALLOW_PRODUCTION_CHECKS=1`.
- O script legado `scripts/run-sprint-14-secure.ps1` tambem exige `ALLOW_PRODUCTION_CHECKS=1` antes de `npx vercel deploy --prod --yes` e smokes de producao.
- `docs/deploy-checklist.md` declara deploy como rotina de release.
- `docs/operacao-comun.md` declara tijolos comuns como local-first.

## Mensagem de bloqueio

```text
Production checks are disabled by default. Set ALLOW_PRODUCTION_CHECKS=1 only for release validation.
```

## Conclusao

Nenhum smoke HTTP comum deve tocar producao por acidente quando configurado com a URL publica do projeto. Validacao de producao fica reservada para release com autorizacao explicita.
