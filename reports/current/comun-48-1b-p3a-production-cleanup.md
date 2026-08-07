# COMUN 48.1B-P3A — cleanup

Nenhuma fixture foi criada em Production. O cleanup remoto não foi necessário.

A lane CI descartável usa imagem sintética gerada no teste, retira o anexo e
remove o relato por IDs exatos antes de parar o Supabase local. O artifact não
deve conter signed URL, token, cookie, texto ou nome de objeto.

Estado: `COMUN_P3A_PRODUCTION_SYNTHETIC_CLEANUP_NOT_RUN_NO_FIXTURE`.
