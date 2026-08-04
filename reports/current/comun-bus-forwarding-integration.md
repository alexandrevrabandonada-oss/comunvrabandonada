# Integração Ônibus → Relata → Carteira → STMU

O domínio Ônibus continua fonte de horários versionados, sessões e observações. Uma observação pode originar Relata com categoria `public_transport`; o Relata continua fonte da verdade e a Carteira reúne o item.

O pacote STMU usa o forwarding compartilhado, sem tabela de contato duplicada, sem carteira própria e sem protocolo próprio. Requisitos são versionados com origem (`live_menu`, `carta_211`, `structured_observation`) e estados `confirmed_required`, `source_declared`, `optional` ou `unknown`.

O texto é revisável e copiável, mas não é enviado. O telefone do canal é público e allowlisted; nome, endereço, localização precisa, recibo, token, HMAC, fotografia e protocolo oficial não entram na URL ou no clipboard automaticamente.
