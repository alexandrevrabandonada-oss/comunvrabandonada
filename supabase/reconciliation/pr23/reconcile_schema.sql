\set ON_ERROR_STOP on

-- Manifesto do pacote forward-only. Não executar diretamente em ambiente
-- remoto; o runner aplica preflight, módulos e postflight, parando na primeira
-- falha e exigindo allowlist explícita fora de localhost.
\ir modules/02-foundations.sql
\ir modules/03-pautas-circles.sql
\ir modules/04-member-profiles-inbox.sql
\ir modules/05-art-radio.sql
\ir modules/06-communities.sql
\ir modules/07-editorial-operation.sql
\ir modules/08-sidewalks.sql
\ir modules/09-security-hardening.sql
