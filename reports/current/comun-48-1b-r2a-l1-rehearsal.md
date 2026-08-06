# COMUN 48.1B-R2A-L1 — rehearsal isolado

## Resultado

`COMUN_48_1B_R2A_L1_BLOCKED_RUNTIME_E2E_SCOPE`

O núcleo R2A foi validado em banco descartável e o bundle agora contém as RPCs
necessárias para estado de evidência, rejeição de anexo e leitura autorizada.
Coletivos permanecem adiados e fail-closed. O primeiro E2E HTTP encontrou uma
allowlist de respostas incompatível na criação; a migration foi corrigida e o
checksum/manifests atualizados. A repetição completa ficou pendente porque o
daemon Docker parou de responder. O dry-run vinculado foi refeito em modo
read-only para os bytes atuais, com a exceção externa temporariamente isolada;
propôs somente a candidata e todos os arquivos foram restaurados.

## Evidências verdes

- A: portas 56000/56001; B: 56100/56101; ambos limpos após `supabase stop`.
- Relata core: criação, protocolo, timeline de quatro estados e retirada.
- Carteira: criação, múltiplos itens, rotação, recuperação e isolamento.
- Runtime HTTP local: criação chegou ao contrato e revelou a validação de
  respostas allowlisted; o fluxo completo de foto/localização/conta aguarda
  repetição com Docker estável.
- RLS: 14/14 tabelas forçadas; grants públicos `0`; RPCs anon/authenticated `0`,
  `service_role=6`.
- Storage: `comun-relata-private`, privado, 8 MB, JPEG/PNG/WebP.
- Rollback: métodos Relata e Carteira em `404` com flags desligadas; nenhum dado
  apagado.
- `typecheck`, `lint`, `build`, release validator e privilege lint verdes.

## Limites e próximos gates

O runner amplo de 48.0D/evidência/coletivos não foi usado como prova do R2A.
O blocker restante é operacional: repetir o E2E HTTP privado com o daemon
Docker estável; a PR permanece draft até a cobertura completa de
foto/localização/conta.

Nenhuma escrita remota, migration remota, flag pública, Google, allowlist,
piloto ou `launch_publicly` foi acionado.
