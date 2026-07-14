# Tijolo 19.3 - Verify

## Ambiente

- Ambiente usado: local.
- Deploy executado: nao.
- Check em producao executado: nao.
- Local-only: sim.

## Comandos solicitados

```text
npm run lint
npm run typecheck
npm run build
npm run verify
npm run verify:local
npm run smoke:pauta-dossier-draft
npm run smoke:pauta-dossier-publication
npm run smoke:pauta-dossier-double-review
npm run smoke:pauta-dossier-review-queue
```

## Resultado

Todos os comandos passaram localmente.

## Execucao

- `npm run lint`: passou.
- `npm run typecheck`: passou.
- `npm run build`: passou.
- `npm run verify`: passou e delegou para `verify:local`.
- `npm run verify:local`: passou.
- `NEXT_PUBLIC_SITE_URL=http://localhost:3000 npm run smoke:pauta-dossier-draft`: passou.
- `NEXT_PUBLIC_SITE_URL=http://localhost:3000 npm run smoke:pauta-dossier-publication`: passou.
- `NEXT_PUBLIC_SITE_URL=http://localhost:3000 npm run smoke:pauta-dossier-double-review`: passou.
- `NEXT_PUBLIC_SITE_URL=http://localhost:3000 npm run smoke:pauta-dossier-review-queue`: passou.
- Checagem sem rede do guard contra a URL de producao: bloqueou com a mensagem esperada.

## Observacao

Os smokes de dossie devem ser executados contra servidor local com `NEXT_PUBLIC_SITE_URL` apontando para `http://localhost:<porta>` ou `http://127.0.0.1:<porta>`.
