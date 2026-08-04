# COMUN — Tijolo 48.0E — fundação do COMUN Ônibus

## Escopo entregue

- autoridades, operadores, linhas, sentidos, padrões, pontos e calendários;
- fontes e versões de horário append-only;
- viagens programadas e entradas de tabela;
- sessões de espera, eventos, chegadas observadas e observações de veículo/acessibilidade;
- problemas de transporte, rascunhos privados de Relata e candidato de canal;
- observatório local sem inferência de viagem real;
- link privado ônibus → Relata, sem publicação ou encaminhamento.

## Contratos

A flag `COMUN_BUS_LOCAL_PILOT=enabled` é uma terceira barreira. Com ela desligada, a página e todas as APIs retornam 404 antes de criar cliente Supabase. Com ela ligada, o runtime exige `ALLOW_LOCAL_TESTS=true`, URL Supabase loopback e chave `service_role` apenas no processo server-side.

Resultado parcial: `COMUN_BUS_48_0E_DB_GREEN`.
