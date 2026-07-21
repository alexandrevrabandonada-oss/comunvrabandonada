# Sprint 39 — câmera e GPS

Implementado fluxo público sem login prévio: botão único abre `input[type=file]` com `accept="image/*"` e `capture="environment"`; há fallback de galeria, prévia, refazer, remover e compressão JPEG moderada acima de 1,5 MB. A imagem não vai para localStorage.

Após a foto, o app solicita `getCurrentPosition` uma vez, com alta precisão, timeout configurável e `maximumAge` curto; não usa `watchPosition`. Estados de localização, permissão negada, indisponibilidade, timeout e baixa precisão são explícitos. Precisão acima de 50 m exige confirmação, e o ponto pode ser reposicionado manualmente.

Uma sessão Supabase anônima é criada somente após a escolha da foto. O teste local comprovou envio `under_review`, visibilidade interna, foto pendente/privada, precisão armazenada e zero papel comunitário para o usuário anônimo.

Limitação: o upload ainda transita pela Server Action existente. A troca por URL de upload direto e confirmação em duas fases permanece necessária antes do gate final.
