# COMUN 48.1B-P5B — STMU assistida

Estado: implementação candidata, flag desligada.

## Limite operacional

- pacote criado server-side a partir do Relata e do adapter de Ônibus;
- mensagem e assunto sempre visíveis antes da cópia;
- WhatsApp: destino exato `https://wa.me/5524992958558`, sem query;
- e-mail: destinatário oficial canônico em `mailto:` sem subject/body;
- abrir canal cria apenas tentativa `prepared`;
- somente o gesto explícito “Já enviei” cria `person_declared_sent`;
- expectativa de 72 horas começa depois dessa declaração e não é prazo legal nem garantia;
- protocolo externo é opcional e informado pela pessoa;
- nenhuma integração com sessão de WhatsApp, caixa de e-mail, bot ou envio server-side.

## Segurança

- tabelas privadas com RLS habilitada e forçada;
- zero CRUD direto para `PUBLIC`, `anon` e `authenticated`;
- RPCs apenas `service_role`, com `search_path` fixado;
- eventos append-only;
- autorização por hash da Carteira;
- múltiplas tentativas preservadas no mesmo pacote;
- flag Production: `COMUN_STMU_ASSISTED_ENABLED`, cumulativa com Ônibus e Carteira.
