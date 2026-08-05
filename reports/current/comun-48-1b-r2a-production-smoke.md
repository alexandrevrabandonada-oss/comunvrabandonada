# 48.1B-R2A — smoke pós-merge

Não executado: a PR #174 permanece draft porque o E2E privado encontrou a falha
funcional `42702 ambiguous_column` na RPC de início de anexo. Portanto não houve
merge, deployment, alteração de flags, migration remota, criação de registros
ou acesso às superfícies do piloto em Production.

Smoke planejado após merge dormente: `/comun=200`, `/comun/relatar` preservado,
`/comun/calcadas=200`, APIs R2A em `404` com flags desligadas, zero `405`, zero
registros novos e `launch_publicly=false`.
