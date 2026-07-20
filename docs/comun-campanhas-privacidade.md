# Privacidade das campanhas

Campanhas, planos, turnos, escala, diário, observação bruta e revisão são service-role only, com RLS habilitada e nenhum grant para `anon`/`authenticated`. Publicação usa apenas relatório aprovado e síntese agregada; payload, hash, contato, notas e instruções nunca entram em HTML público.
