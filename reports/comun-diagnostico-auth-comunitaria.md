# Diagnóstico da autenticação comunitária

O login administrativo continua em `/comun/admin/login` e exige `comun_admin_users`. As novas entradas comunitárias usam a mesma sessão SSR do Supabase, mas não consultam nem inferem acesso administrativo. Minha Participação redireciona visitantes para `/comun/entrar` com retorno seguro.
