# COMUN Ônibus — sessões e observações

A sessão é iniciada por recibo local opaco, com linha, sentido, ponto, versão, data de serviço e horário previsto. Repetições com o mesmo token são idempotentes. Eventos suportados incluem chegada, passagem sem parada e encerramento sem observação; são append-only e usam timestamp do servidor.

Problemas podem ser guardados como relato privado no COMUN, com categoria `public_transport`. O fluxo não cria protocolo de órgão público, não envia mensagem e não altera métricas reais do piloto.

Rehearsal local comprovou criação idempotente e transição para `bus_arrived`.
