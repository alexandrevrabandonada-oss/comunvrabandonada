# COMUN Ônibus — validação local

## Gates verdes

- migration forward-only aplicada em reset limpo;
- `npm run relata:release:test`;
- `npm run bus:db:test` — 1 linha, 1 ponto, 1 horário, idempotência, 20 tabelas RLS;
- `npm run security:rls:local`;
- `npm run db:privileges:lint`;
- `npm run security:restore:database:local`;
- `npm run security:restore:storage:local`;
- `npm run test:unit` — 470/470;
- `npm run surfaces:test` — 26/26;
- `npm run bus:e2e` — 5/5 viewports;
- `npm run typecheck`, `npm run lint`, `npm run build`;
- cloak HTTP local com flag desligada;
- smoke de rotas públicas sem alteração.

## Observação operacional

O host não conseguiu reservar a faixa 554xx para Docker; o rehearsal usou 564xx e foi encerrado sem alterar infraestrutura remota. O arquivo de configuração versionado foi restaurado antes da integração.
