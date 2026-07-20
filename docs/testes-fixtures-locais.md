# Fixtures locais do COMUN

## Seed estrutural

Usuários locais `@comun.test`, roles administrativas mínimas e configuração do Supabase local. Não incluem conteúdo editorial.

## Fixture por suíte

Cada suíte cria sua própria pauta com slug `fixture-s28-2-*`, módulos, roda, rodada, contribuição e síntese. IDs são capturados na criação e o cleanup é idempotente.

## Fixture por teste

Estados especiais pertencem ao próprio teste e são removidos ao final. Nenhum teste depende de ordem, de conteúdo remoto ou de execução prévia. `test:fixtures:assert-clean` confirma que não restaram pautas com o prefixo de teste.

As credenciais são locais, não reais e não aparecem em relatórios.
