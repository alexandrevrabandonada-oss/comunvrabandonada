# COMUN — Tijolo 48.0G — Carteira de participação

## Contrato

`/comun/minha-participacao` incorpora uma lista única com `Precisa de você` no topo, relatos, observações, casos acompanhados, protocolos acompanhados e protocolos oficiais vazios. Não há cadastro obrigatório.

## Capacidades

- criação anônima com cookie HttpOnly separado do recibo;
- múltiplos relatos e itens ordenados por ação necessária;
- `relata_report`, `legacy_report_follow`, `bus_observation`, `collective_case_follow` e `community_confirmation` como tipos allowlisted;
- recuperação por código de 24 caracteres em grupos, exibido uma vez, copiável e salvável em arquivo;
- redeem e rotate invalidam credenciais anteriores;
- retirar/arquivar respeita o histórico e, para Relata, usa a retirada canônica;
- nenhum detalhe privado, coordenada, foto, hash, path ou segredo na lista.

## Compatibilidade

O protocolo legado aparece como “Protocolo acompanhado”. Relata continua com protocolo e recibo próprios. A associação é idempotente e compensável: se a carteira falhar, o registro Relata já criado permanece válido. O Ônibus é referência `public_transport`, não `other`, e não dispara envio externo.

## Cloak e reversibilidade

`COMUN_PARTICIPATION_WALLET_LOCAL=enabled` é cumulativa com ambiente local e service role loopback. Fora do laboratório não há cliente Supabase, segredo lido, asset experimental ou resposta `405`; as APIs retornam `404`. A implementação não torna App V2 padrão nem altera `launch_publicly`.

## Evidência

Migration local-only, manifesto com checksum e `requiresPromotion=false`; DB rehearsal, RLS, grants, unitários, build, surfaces e E2E/Axe em cinco viewports verdes.

Restore descartável de banco e Storage também passou (`COMUN_DATABASE_RESTORE_REHEARSAL_GREEN`, `COMUN_STORAGE_RESTORE_REHEARSAL_GREEN`).
