# COMUN 48.1B-P5A — Ônibus privado

Estado: implementação candidata, flags desligadas.

## Contrato

- fonte da verdade: Relata, categoria forçada server-side `public_transport`;
- protocolo: somente `COMUN-RELATA-*`;
- adapter mínimo: `private.comun_bus_relata_intakes`;
- texto, coordenada, receipt, object key e token não são duplicados no adapter;
- Carteira: um único item Relata, enriquecido com metadata sanitizada;
- foto e localização reutilizam integralmente as capacidades privadas P3;
- coletivos e projeção pública permanecem desligados;
- flag Production: `COMUN_BUS_RELATA_ENABLED`;
- alias histórico `COMUN_BUS_LOCAL_PILOT` permanece restrito ao laboratório loopback.

## Verificação

- validator forward-only: verde;
- lint de privilégios explícitos: verde;
- testes focais: 8/8;
- typecheck, lint e build: verdes;
- E2E descartável: pendente na lane `COMUN P5 / private bus and STMU E2E`;
- Production: ainda sem alteração.
