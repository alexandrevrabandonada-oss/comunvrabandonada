# Diagnóstico do envio de Calçadas — pauta canônica

Data: 2026-07-29

Branch: `codex/fix-sidewalk-pauta-upload-cleanup`

Base: `240829bf83278abf89b010ef5f367127ba509f12`

## Causa comprovada

Os logs sanitizados do deployment de produção registraram dois `POST` para
`/comun/mapa/contribuir` com HTTP 500 e o mesmo erro seguro:
`Pauta das calçadas indisponível.` O fluxo já havia concluído sessão anônima,
autorização e upload privado; a falha ocorreu ao confirmar o registro.

Uma consulta remota somente leitura confirmou:

- `public.comun_pauta_spaces`: zero linhas;
- pauta `calcadas-em-circulacao`: ausente;
- registros de calçada criados nas duas tentativas: zero;
- autorizações órfãs recentes: duas, ambas `uploaded/failed_retryable`;
- objetos privados recentes sem registro confirmado: dois.

A migration histórica `20260720161117` consta no histórico remoto, mas seu seed
canônico não está mais presente. Ausência de linha no estado atual, portanto,
não equivale a migration histórica ausente.

## Correção preparada

- restauração idempotente da pauta canônica em migration nova e independente;
- validação da pauta antes de criar ticket ou URL assinada;
- erro esperado retornado de forma sanitizada ao formulário mobile;
- compensação do upload direto no bucket Supabase que emitiu a URL;
- ticket compensado passa a `abandoned`, evitando bloquear uma nova tentativa.

## Segurança e estado remoto

O diagnóstico executou apenas consultas de leitura. Nenhuma migration foi
aplicada, nenhuma variável ou flag foi alterada e nenhuma contribuição foi
criada. Os dois objetos/tickets históricos não foram removidos: a limpeza
remota exige autorização específica e permanecerá separada da correção de
código.

O próximo gate remoto é a autorização exata da nova migration, depois de
integrada e identificada por SHA-256. Até lá, não repetir o envio.
