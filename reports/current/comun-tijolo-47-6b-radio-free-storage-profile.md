# Tijolo 47.6B — perfil gratuito da Rádio e desbloqueio cultural

## Decisão de produto

O perfil de 45 MiB e 30 minutos é o escopo operacional da Rádio na V1. Ele
preserva segurança, original privado, qualidade pública e acessibilidade sem
criar custo obrigatório antes de existir demanda real.

A ampliação de capacidade não é blocker da V1. Ela será reconsiderada quando
episódios reais demonstrarem necessidade operacional. O limite de 250 MiB é
somente uma possibilidade pós-V1.

## Base e preflight

- base: `09f9156915b306290ab6e589f9474fa6eaf09fad`;
- branch: `codex/tijolo-47-6b-radio-free-storage-profile`;
- preflight remoto read-only: run `30583497665`;
- target remoto: verificado e allowlisted;
- schema cultural: 11/11;
- tabelas culturais sem RLS: 0;
- grants públicos perigosos: 0;
- Storage antes: 2/4;
- buckets ausentes: `radio-private-originals` e `radio-public-audio`;
- buckets incompatíveis ou semelhantes inesperados: 0;
- policies perigosas: 0;
- objetos nos buckets ausentes: 0;
- imagem pública sem texto alternativo: 1;
- conteúdo real comprovado em Acervo, Rádio e Arte: 0;
- escritas remotas do preflight: nenhuma.

## Perfil central

A fonte única `config/radio-v1-media-profile.json` define:

- tamanho máximo de entrada: 47.185.920 bytes;
- duração máxima: 1.800 segundos;
- canais: mono ou estéreo;
- derivada pública: MP3 a 160 kbps;
- formatos de entrada: WAV, MP3, M4A/MP4 de áudio, Ogg e FLAC;
- waveform: JSON;
- transcrição: texto ou VTT;
- original preservado em bucket privado;
- conteúdos longos divididos em episódios ou partes editoriais permanentes.

O cliente valida MIME e tamanho antes de solicitar upload. O servidor repete a
validação. Magic bytes e FFprobe validam conteúdo, duração e canais antes do
processamento. FFmpeg remove metadados e produz MP3 a 160 kbps; a saída acima
de 45 MiB é bloqueada, sem redução silenciosa de bitrate.

## Migration

`20260730213205_radio_v1_free_storage_profile.sql` é forward-only, idempotente
e restrita aos dois buckets da Rádio. Ela cria os buckets ausentes ou ajusta
somente `public`, `file_size_limit` e `allowed_mime_types` desses dois registros.
Não altera policies, buckets do Acervo, objetos, conteúdo, direitos ou
consentimentos.

O reset local completo chegou ao perfil final 4/4. A reaplicação focal resultou
em zero linha alterada, e as migrations históricas permaneceram byte a byte
intactas. O plano remoto será aceito somente quando contiver exclusivamente a
nova migration.

## Evidência local

- testes unitários: 364/364;
- testes focais de perfil, migration, audit, repair e workflow: verdes;
- Rádio E2E/a11y: 24/24 em 360×800, 390×844, 768×1024 e 1366×768;
- Arte E2E/a11y: 28/28 nas mesmas classes de viewport;
- smoke da Rádio: verde;
- smokes de Acervo, Arte, Storage territorial e no-leak: verdes;
- RLS matrix: verde;
- typecheck, lint e build de produção: verdes;
- Storage local final: 4/4, dois buckets de Rádio com 47.185.920 bytes;
- objetos de Storage criados pelo reset/reaplicação focal da migration: 0.

O smoke histórico de R2 não foi habilitado: este checkpoint proíbe Cloudflare
R2, provedor paralelo ou escrita externa. O smoke público legado conserva
expectativas textuais anteriores e não foi usado para enfraquecer testes nem
alterar produto fora do escopo.

## Promoção controlada

Após integração, a lane executará separadamente:

1. preflight remoto read-only;
2. dry-run e aplicação exclusiva da nova migration;
3. postflight independente;
4. correção otimista de exatamente um `alt_text`, sem Storage write;
5. novo postflight;
6. ensaio privado transacional com rollback e zero objeto remoto.

O texto alternativo só poderá ser aplicado enquanto o asset continuar
aprovado, público, publicado, vazio e byte a byte igual à evidência visual
inspecionada. O contrato atual é:

> Trecho de calçada de concreto com rachaduras, vegetação e uma abertura
> circular junto a um muro amarelo.

## Estado de entregabilidade

- `archive_radio_art`: `evidence_required`;
- `miniapps`: `in_progress`;
- `launch_publicly`: não acionado.

O resultado máximo deste checkpoint é
`COMUN_ARCHIVE_RADIO_ART_READY_FOR_REAL_CONTENT_REHEARSAL`. O domínio não pode
ser marcado como `green` sem conteúdo real autorizado, direitos, transcrição,
créditos, vínculo territorial ou de pauta e smoke público.
