# COMUN Ônibus — privacidade e no-leak

- armazenamento operacional em schema `private`;
- RLS habilitada e forçada em 20 tabelas;
- `PUBLIC`, `anon` e `authenticated` sem CRUD e sem `EXECUTE` nas RPCs;
- apenas `service_role` local acessa os contratos server-only;
- nenhum texto de passageiro, contato, localização, signed URL, segredo ou caminho de Storage é emitido;
- nenhum request externo observado no Playwright dos cinco viewports;
- `/comun/onibus` e APIs novas ficam 404 quando a flag está desligada;
- nada entra em snapshots públicos nem no mapa público do Relata.

Resultado: `COMUN_BUS_48_0E_DORMANT_NO_LEAK_GREEN`.
