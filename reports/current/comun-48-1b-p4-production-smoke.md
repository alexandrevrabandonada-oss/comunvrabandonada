# COMUN 48.1B-P4 — smoke de Production

Data: 2026-08-08

## Resultado

`COMUN_48_1B_P4_SIDEWALK_REAL_DOMAIN_GREEN_REVIEWED_MAP_ONLY`

## Deployment flags-off

- Main funcional: `97ad858c92c8694adf7514d0df8cfe8d2c90754f`.
- Run: `31278490774`.
- Conta, Carteira, Relata textual, fotos privadas e localização privada foram
  preservados.
- O cloak da API P4 foi comprovado com os sete métodos em `404` antes da
  ativação; a página App Router não foi usada como substituta do contrato da
  API.

## P4A — entrada privada real

- Run: `31278576840`.
- A fixture inequívoca e sintética percorreu Relata, foto privada, localização
  privada, intake e Carteira.
- O cleanup em `finally` terminou com todos os resíduos ativos em zero:
  relatório, localização, anexo, intake, item de Carteira, Carteira e objetos
  de Storage.
- `hardDeletes=0`; `publicRecord=0`; `snapshot=0`; `forwarding=0`.
- Nenhuma URL assinada, path, coordenada, receipt ou token foi registrada.

Resultado: `COMUN_P4A_PRODUCTION_PRIVATE_INTAKE_GREEN`.

## P4B — revisão e projeção read-only

- Run: `31278723422`.
- `COMUN_SIDEWALK_PUBLIC_PROJECTION_ENABLED=enabled` habilita apenas a ação
  editorial explícita; não publica automaticamente.
- Fila pendente observada: `0`.
- Publicações automáticas observadas: `0`.
- Registro público sintético criado: `false`.
- A fila administrativa respondeu com redirecionamento de autenticação, sem
  revelar conteúdo privado.

Resultado: `COMUN_P4B_PROJECTION_CAPABILITY_READ_ONLY_GREEN`.

## Smoke HTTP final read-only

- `/comun`: `200`;
- `/comun/relatar`: `200`;
- `/comun/calcadas`: `200`;
- `/comun/calcadas/contribuir`: `200`, com controles de foto e localização;
- `/comun/admin/calcadas/relatos`: `307` para autenticação;
- `GET /api/comun/calcadas/intake`: `404` (método não operacional não revela
  a superfície);
- `/comun/onibus`: `404`.

Estado final: intake P4 ON; capacidade de revisão/projeção P4 ON; mapa mostra
somente registros revisados; publicação automática e ponto exato públicos OFF;
mapa público geral do Relata, coletivos, território, Google, Ônibus e forwarding
OFF; `launch_publicly=false`.
