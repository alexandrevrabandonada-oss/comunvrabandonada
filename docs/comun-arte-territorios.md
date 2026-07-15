# Arte dos Territórios

Upload real, alertas, auditoria e cleanup estão detalhados nos documentos `comun-arte-storage`, `comun-arte-alertas`, `comun-arte-auditoria` e `comun-arte-cleanup-storage`.

Obras são `comun_archive_items` de tipo `territorial_artwork`, especializadas por `comun_archive_artworks`. O módulo preserva contexto, território, autoria, direitos e relações; não oferece ranking, likes, seguidores, marketplace ou feed infinito.

O portal público usa paginação server-side e campos explicitamente sanitizados. O original nunca é público. Agentes são entidades transversais para pessoa, coletivo, organização, autoria desconhecida e futura Rádio COMUN.
