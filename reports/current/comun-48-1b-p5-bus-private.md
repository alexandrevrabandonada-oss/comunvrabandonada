# COMUN 48.1B-P5A — Ônibus privado no domínio

Data: 2026-08-08

## Resultado

`COMUN_P5A_BUS_PRIVATE_DOMAIN_GREEN`

## Contrato ativo

- fonte da verdade: Relata privado, com categoria forçada server-side
  `public_transport`;
- protocolo: somente `COMUN-RELATA-*`;
- adapter mínimo: `private.comun_bus_relata_intakes`;
- texto, coordenada, receipt, object key e token não são duplicados no adapter;
- Carteira: um único item Relata, enriquecido com metadata sanitizada;
- foto e localização reutilizam as capacidades privadas P3;
- coletivos e projeção pública permanecem desligados;
- flag Production: `COMUN_BUS_RELATA_ENABLED=enabled`;
- alias histórico `COMUN_BUS_LOCAL_PILOT` permanece restrito ao laboratório.

## Verificação

- E2E descartável P5A/P5B: run `31282672709`, verde;
- Quality integral, a11y, performance e rede: run `31282672718`, verde;
- unitários: 531/531;
- deploy flags-off e cloak: run `31284140151`, verde;
- ativação P5A e smoke real: run `31284226667`, verde;
- observação sintética: Relata privado, adapter e Carteira comprovados;
- cleanup: executado em `finally`, sem resíduo sintético ativo;
- publicação pública, coletivo e envio externo: zero.

Ônibus permanece ativo depois do rollback isolado e posterior reativação da
STMU. O rollback de STMU não alterou a capacidade P5A.
