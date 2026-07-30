# Áudio da rádio

Originais WAV, MP3, M4A, Ogg e FLAC ficam em
`radio-private-originals`, com limite de 45 MiB, 30 minutos e dois canais
(mono ou estéreo). A interface e o servidor bloqueiam arquivos acima de
45 MiB antes do upload. Magic bytes e FFprobe confirmam o conteúdo, a duração
e os canais antes do processamento.

FFmpeg gera MP3 público a 160 kbps normalizado e waveform JSON, removendo
metadados. A derivada também é validada contra o teto de 45 MiB. O original
nunca é publicado.

Programas mais longos devem ser divididos editorialmente em partes ou
episódios. Cada parte recebe título próprio e pode usar os campos de temporada
e número do episódio já existentes, preservando ordem e contexto. O COMUN não
faz corte automático nem transforma uma gravação longa em fragmentos sem
revisão editorial.
