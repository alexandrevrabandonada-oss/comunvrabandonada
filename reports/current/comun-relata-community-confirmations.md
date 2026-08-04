# Confirmações comunitárias — 48.0D

A confirmação é uma ação first-party sobre uma projeção local já elegível. O servidor cria um token aleatório, grava apenas SHA-256 com domínio `comun-relata-confirm-v1` e limita o cookie ao caminho `/api/comun/relata/public`. Uma combinação token/caso possui no máximo uma confirmação ativa; `DELETE` gera evento append-only de desfazer e não remove história.

O endpoint devolve somente `active` e `confirmationCount`. Não recebe nem retorna protocolo, report, conta, contacto, texto ou localização. `confirmationCount` é independente de `reportCount`. O reset/limpeza do cookie pode impedir o desfazer pelo mesmo navegador; isso é uma limitação explícita e não expõe a identidade.
