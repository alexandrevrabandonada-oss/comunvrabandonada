# COMUN 48.1B-P3B — preflight remoto

Data: 2026-08-07

## Estado

- baseline lógico: `origin/main=fd99b55e98c9941f8bfc956f82501af3e3ac8a3d` ou descendente;
- P3A permanece verde: fotos privadas ON, localização OFF;
- no migration P3B previsto; dry-run remoto deve permanecer vazio;
- Conta, Carteira e Relata textual permanecem ativos;
- coletivos, mapa público, território, Google, Ônibus e encaminhamento permanecem desligados.

## Contrato

O runtime P3B usa apenas `COMUN_RELATA_LOCATION_ENCRYPTION_KEY` server-side. A chave HMAC espacial não é necessária para localização e não deve ser configurada nesta fase. A associação coletiva só pode ser avaliada quando a flag coletiva e a chave espacial distinta estiverem ativas.

## Ambiente local

`docker context show` respondeu `desktop-linux`, mas o daemon não respondeu a `docker version` dentro do limite operacional. A execução local foi encerrada sem reset amplo, prune ou alteração remota. A prova de banco será feita pela lane CI descartável `COMUN P3B / private location E2E`.

## Segurança herdada

O baseline R2A/P3A de RLS, force-RLS e grants service-role-only permanece inalterado. Nenhuma migration P3B é criada. O endpoint de localização continua `404` quando a flag ou a chave são ausentes.

Resultado intermediário: `COMUN_P3B_LOCAL_DOCKER_DAEMON_UNAVAILABLE_CI_REQUIRED`.
