# Carteira COMUN — segurança de capacidade

- token da carteira, recibo, confirmação, sessão de Ônibus e código de recuperação são capacidades distintas;
- somente hashes SHA-256 com domínio são persistidos; nenhum segredo é guardado em texto puro;
- cookie é HttpOnly, SameSite=Lax, Secure em HTTPS e sem fingerprint/IP;
- tabelas privadas têm RLS habilitada e forçada, zero CRUD para PUBLIC/anon/authenticated e RPCs somente service_role;
- funções usam `security definer`, `search_path=pg_catalog` e argumentos allowlisted;
- listagem usa o hash do cookie e nunca aceita um protocolo sozinho para reivindicar Relata;
- carteira A não lê carteira B; token inválido e carteira inexistente têm a mesma superfície;
- retirada arquiva o item, atualiza Relata canônico e preserva evento append-only;
- limiter local registra apenas hash de tentativa e bloqueia recuperação após cinco tentativas por janela;
- logs e telemetria não recebem segredo, texto, foto, coordenada, IP, cookie, path ou signed URL.

Evidência: `wallet:db:test`, `security:rls:local`, `db:privileges:lint`, testes unitários e cloak E2E local.
