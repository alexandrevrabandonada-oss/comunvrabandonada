# Diagnóstico Auth da paginação — Sprint 33.2.2

O setup anterior falhava antes da central porque criava a matriz completa de personas; a segunda persona podia falhar no refresh local (`Invalid Refresh Token`). O setup dedicado agora usa somente `operations_admin`, com usuário/identity/perfil, login real, cookie e storageState validados em novo contexto, e emite `COMUN_EDITORIAL_PAGINATION_AUTH_READY`.

O diagnóstico também identificou duas falhas de produto corrigidas: perda de contexto em `db.rpc` (`undefined.rest`) e `ESCAPE` SQL inválido na busca. A suíte autenticada passou depois delas (2/2) antes da inclusão do gate Axe.

Evolução posterior: o setup passou a preparar também a única persona negativa necessária (`participant`), mantendo a matriz completa fora desta suíte. A fixture recupera uma rotação de refresh token local com relogin real único e valida os storage states separadamente. A suíte passou 3/3, incluindo participante e visitante sem acesso à central.

Servidor: porta 3102; distDir interno `.next-s33-2-2-pagination`; nenhum servidor externo ou remoto foi usado.
