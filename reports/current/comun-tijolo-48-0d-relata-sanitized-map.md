# COMUN — Tijolo 48.0D — mapa local sanitizado

## Resultado da verificação local

**Resultado R1:** `COMUN_RELATA_48_0D_MERGED_DORMANT_LOCAL_SANITIZED_MAP_GREEN_REMOTE_UNCHANGED` (validação local concluída; merge/Production ainda não executados).

Implementação aditiva em branch `codex/tijolo-48-0d-relata-sanitized-local-map`, baseada no main documental `118f1d4c88cc6915ef471ba59cfcfbcf0355d770`. O 48.0B não foi alterado: `public.comun_relata_public_snapshots` continua com bloqueio estrutural e trigger de rejeição.

Foi criada a quarta barreira `COMUN_RELATA_LOCAL_PUBLIC_MAP`, cumulativa com Preview, Persistence e Evidence, loopback e service role. A rota `/comun/relata/mapa` e toda a família `/api/comun/relata/public` são mascaradas com 404 antes do dispatch quando a barreira está desligada; nenhuma chave ou cliente Supabase é lido nesse caminho.

## Projeção

`relata-public-projection-v1` usa somente categorias templated e células métricas de 300 m (iluminação), 800 m (energia) e 1.000 m (vestígio ambiental). O retorno contém `publicId`, título/descrição templated, estado comunitário, contagens separadas, datas de dia, centro aproximado, raio de incerteza, versão e estado de projeção. Não contém protocolo, report/case/membership ID, texto, fotos, hash, HMAC, ciphertext, path, endereço ou status oficial.

Energia exige dois relatos; risco elétrico, fogo ativo, emergência, saúde, criança, violência, retaliação, acusação individualizada e classes sensíveis ficam bloqueados. O centro é derivado server-side por grade métrica, com monotonicidade de precisão documentada; não há geohash reversível, reverse geocoder ou publicação.

## Confirmação

“Isso também acontece comigo” usa cookie first-party HttpOnly com escopo restrito, hash server-side, uma confirmação ativa por token/caso e evento append-only de confirmação/desfazer. A confirmação nunca cria relato, protocolo, localização, texto ou contato e não altera `reportCount`.

## Interface e reversibilidade

O mapa/lista é local, lista-first, com filtros de categoria, alerta de localização aproximada, detalhe sanitizado, contagens distintas, confirmação e link de retorno ao Relata. A visualização não usa feed, fotos nem texto de terceiros. A flag permite desligamento imediato; Production permanece dormente e nenhum release remoto foi promovido.

## Limitações

O laboratório usou somente Supabase descartável em loopback, com portas temporárias por conflito de reserva do Windows. Não houve `db push`, consulta remota, alteração de domínio ou secrets. A migration foi aplicada pela cadeia completa via `supabase db reset --local --yes`/retry `--no-seed`, e o seed/Storage foi verificado separadamente.

## Evidências R1

- `relata:test`: 39/39 focais, release, DB, Storage, cleanup e retenção verdes;
- rehearsal DB: `COMUN_RELATA_48_0D_DB_GREEN`, seis tabelas novas RLS forced, confirmação idempotente e precisão monotônica;
- `COMUN_RLS_COMPLETE_GREEN` e `COMUN_EXPLICIT_PRIVILEGE_CONTRACT_OK`;
- Storage/restore/cleanup/retention verdes, sem artefacts com nomes de objeto;
- E2E Relata: 20/20 em 320 px, 390 px, landscape, 768 px e PWA 430 px, Axe verde;
- no-leak dormente: `/comun` 200, `/comun/relata`/mapa/APIs evidence/public 404 e sete métodos sem 405;
- commit funcional permanece derivado de `cee9f3226667c1de693bd858f747bd023bccdf36`, com correções R1 não publicadas.
