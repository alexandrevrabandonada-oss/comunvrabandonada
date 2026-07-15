# Diagnóstico — Rádio Comunitária

Data: 15/07/2026. Escopo local-first.

## Reuso

- `comun_archive_items` permanece a raiz para programa, episódio e clipe.
- `comun_archive_agents` representa pessoas, coletivos, músicos e participantes sem duplicar artistas musicais; perfis musicais existentes podem ser relacionados gradualmente.
- `comun_archive_assets`, providers, buckets, fila, alertas, auditoria, relações e coleções atendem a mídia sonora.
- consentimentos de História Oral servem como referência, mas não são reaproveitados implicitamente: entrevista arquivística e episódio possuem finalidades e superfícies diferentes.
- obra de arte é relacionada como capa pelo id do item e exige direitos compatíveis; o arquivo não é copiado.
- música usada recebe registro por episódio, intervalo e autorização; link/crédito não substituem direito.
- pautas modulares recebem `community_radio`; Minha Participação reutiliza sessão e sanitização.

## Decisões

Criar especializações de programa/episódio e tabelas próprias para créditos, voz, música, segurança, transcrição, capítulos, grade, contribuições e relações editoriais. Originais entram no bucket privado existente; MP3/waveform aprovados entram no bucket público. FFmpeg/FFprobe 8.1.1 locais são o processador confiável, sem nuvem ou transformação de voz.

Transmissão ao vivo futura fica representada apenas por `live_future` na grade e por relações. Não haverá Icecast, stream contínuo, autoplay ou simulação de transmissão nesta sprint.
