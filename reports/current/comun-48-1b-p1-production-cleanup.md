# COMUN 48.1B-P1 — cleanup

O E2E usa somente dados sintéticos. A rotina remove o usuário de teste, perfil, vínculos explícitos, eventos, itens, credenciais de recuperação e Carteiras locais. O smoke de Production deve usar o mesmo princípio e registrar apenas hashes/IDs sanitizados, nunca e-mail, senha, token, recovery code ou conteúdo de participação.

Estado: `PENDING_RUNTIME_AND_PRODUCTION_EXECUTION`.
