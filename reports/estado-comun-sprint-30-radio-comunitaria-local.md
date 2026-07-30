# Estado COMUN — Sprint 30 — Rádio Comunitária local

Data: 2026-07-15. Status: implementação local concluída e candidata a release local.

## Entrega

- Diagnóstico e ambiente: concluídos; loader obtém `supabase status`, exige localhost, mascara segredos e não altera `.env.local`.
- Programas, temporadas e episódios: item-base do Acervo reutilizado, especializações e curadoria administrativa criadas.
- Créditos: múltiplos agentes e papéis, visibilidade explícita e notas privadas.
- Consentimento e menores: permissões de voz granulares; menor e localização sensível exigem revisão reforçada.
- Música: uso e permissão por finalidade; pendência bloqueia publicação.
- Storage: original no bucket privado; MP3 e waveform no bucket público local.
  Upload direto assinado no perfil V1 gratuito, com teto de 45 MiB por arquivo.
- Processamento: magic bytes + FFprobe; FFmpeg 8.1.1 local; MP3 160 kbps, loudnorm, metadados removidos e peaks JSON.
- Transcrição e capítulos: edição humana versionada, publicação explícita e capítulos ordenados.
- Portal e player: páginas de rádio, programa, episódio, grade, contribuição e direitos; `<audio>` sem autoplay, saltos, velocidade, capítulos e download condicionado.
- Pautas, Arte e participação: módulo `community_radio` com Zod, obra referenciada sem cópia e contribuições exibidas em Minha Participação.
- Alertas e auditoria: 13 tipos deduplicáveis com resolução automática; eventos administrativos usam payload sanitizado.
- Retirada: despublica item e episódio, cancela grade e preserva histórico privado.
- RLS: onze tabelas internas, sem grants `anon`/`authenticated`; `RLS_MATRIX_OK`.

## Verificação

- `lint`: passou.
- `typecheck`: passou.
- unitários: 18 arquivos, 101 testes, passou duas vezes.
- banco: migration aplicada do zero; `supabase db lint --local` sem erros.
- Storage readiness: passou; no segundo reset foi necessário reinício limitado apenas do Kong após 502.
- smoke de rádio: WAV real, original privado, bloqueios de consentimento e música, FFmpeg, MP3, waveform, página pública, retirada e cleanup; passou em ambas as rodadas e em `next start`.
- Playwright/axe: 24 testes, quatro viewports; zero `serious` e zero `critical`; passou duas vezes.
- build: Next.js 16.2.10 passou. O build production-like final foi executado pelo loader local para evitar incorporar o `.env.local` remoto.
- cleanup: `COMUN_TEST_FIXTURES_CLEAN`.
- `npm audit --audit-level=high`: sem vulnerabilidade alta/crítica; 2 moderadas transitivas de PostCSS via Next. `--force` não executado.

## Declarações obrigatórias

- Vercel deploy: NÃO EXECUTADO
- Git push: NÃO EXECUTADO
- Supabase remoto: NÃO ALTERADO
- R2 real: NÃO UTILIZADO
- Streaming externo: NÃO UTILIZADO
- Serviço de transcrição externo: NÃO UTILIZADO
- Smoke remoto: NÃO EXECUTADO
- Custo externo: R$ 0

## Transmissão ao vivo futura

O modelo reserva `live_future` apenas como aviso de capacidade não habilitada. Antes de qualquer sprint ao vivo serão necessários consentimento específico, operação de moderação, segurança, retenção e avaliação de custo; não se recomenda habilitar streaming nesta release.
