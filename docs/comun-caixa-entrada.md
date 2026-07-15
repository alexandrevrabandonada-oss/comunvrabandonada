# Caixa de entrada comunitária

`comun_member_inbox` guarda avisos operacionais privados por membro: tipo, título, resumo, pauta opcional, ação, prioridade e estados de leitura/resolução. `dedupe_key` evita duplicação.

A tabela tem RLS, sem acesso de `anon` ou `authenticated`; o servidor usa service role e sempre filtra pelo usuário da sessão. A caixa não é chat, rede social nem contador de vaidade.
