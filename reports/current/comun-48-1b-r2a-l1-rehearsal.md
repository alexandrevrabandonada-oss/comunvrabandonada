# COMUN 48.1B-R2A-L1 — rehearsal isolado

## Resultado

`COMUN_48_1B_R2A_L1_BLOCKED_RUNTIME_E2E_SCOPE`

O núcleo R2A foi validado em dois bancos descartáveis independentes, mas o
terminal verde não é emitido: o bundle não contém as funções de coletivos e
evidências das migrations local-only, portanto o E2E completo de foto/localização
não pode ser alegado. O dry-run vinculado foi então refeito em modo read-only para
o SHA atual, com a exceção externa e as migrations explicitamente local-only em
quarentena temporária; propôs somente a candidata e todos os arquivos foram
restaurados.

## Evidências verdes

- A: portas 56000/56001; B: 56100/56101; ambos limpos após `supabase stop`.
- Relata core: criação, protocolo, timeline de quatro estados e retirada.
- Carteira: criação, múltiplos itens, rotação, recuperação e isolamento.
- Runtime HTTP local: wallet `201`, Relata `201`, `noOfficialSend=true`.
- RLS: 14/14 tabelas forçadas; grants públicos `0`; RPCs anon/authenticated `0`,
  `service_role=6`.
- Storage: `comun-relata-private`, privado, 8 MB, JPEG/PNG/WebP.
- Rollback: métodos Relata e Carteira em `404` com flags desligadas; nenhum dado
  apagado.
- `typecheck`, `lint`, `build`, release validator e privilege lint verdes.

## Limites e próximos gates

O runner amplo de 48.0D/evidência/coletivos não foi usado como prova do R2A,
porque suas funções não estão na migration candidata. É necessário decidir em
R2A-R2 se essas capacidades serão promovidas por bundle canônico separado ou se
o E2E será explicitamente fatiado. O blocker restante é de escopo runtime; a PR
permanece draft até a cobertura completa de foto/localização/conta.

Nenhuma escrita remota, migration remota, flag pública, Google, allowlist,
piloto ou `launch_publicly` foi acionado.
