# COMUN — Tijolo 48.0D — mapa local sanitizado

## Resultado da verificação local

**Gate atual:** `COMUN_RELATA_48_0D_BLOCKED_LOCAL_DB_VALIDATION_UNAVAILABLE`

O código e os contratos locais estão implementados, mas a integração/merge fica bloqueada até que o Supabase CLI/harness descartável esteja disponível para aplicar a migration somente localmente e executar a matriz RLS/authorization. Não houve escrita remota.

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

O CLI Supabase não está instalado nesta máquina; a migration foi criada manualmente com checksum e manifesto local-only, sem `db push`, sem consulta remota e sem alteração de domínio/secrets. A validação de banco deve continuar restrita ao Supabase descartável quando o harness local estiver disponível.
