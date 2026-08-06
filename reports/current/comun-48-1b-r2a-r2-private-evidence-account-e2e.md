# 48.1B-R2A-R2 — evidência privada e conta

## Resultado

`COMUN_48_1B_R2A_R2_BLOCKED_RUNTIME_E2E_SCOPE`

O contrato runtime foi completado para localização segura, estado sanitizado de evidências, ciclo de fotografia (validar, selar, ler, retirar, rejeitar) e guarda explícita de agrupamento coletivo. A migration candidata foi corrigida para aceitar exatamente as chaves de respostas já allowlisted pelo runtime (`homes_power`, `smoke_active`, `blocked`, `line`, `direction`, `unit`, `school_type`). Checksum atual: `0648404b49be00b2d46dc5431c1bde4cb0072bf0f27a1c8f42075bb522cdd4f9`.

## Verificações verdes

- `npm run relata:topology:test` — verde;
- `npm run relata:release:test` — verde;
- `npm run db:privileges:lint` — verde;
- `npm run typecheck` — verde;
- `npm run lint` — verde;
- `npm run build` — verde;
- reset descartável da cadeia candidata — aplicado até a migration R2A antes da falha posterior do daemon;
- core local R2A — `COMUN_48_1B_R2A_CORE_LOCAL_GREEN`;
- dry-run remoto read-only, após quarentena temporária apenas da migration excepcional — somente a migration candidata foi planejada, sem `--include-all`, `repair`, `reset` ou escrita.
- lane CI adicionada para validar que o candidato Production não materializa migrations local-only.

## Pendência honesta

O E2E HTTP privado de localização/fotografia/carteira/conta foi criado em `scripts/solo/rehearse-r2a-private-evidence-account-local.mjs`, mas não pôde concluir após o host Docker parar (`Docker Desktop is unable to start`) durante a segunda inicialização do laboratório. O primeiro HTTP ensaio revelou e corrigiu a incompatibilidade de chaves de triagem descrita acima; o fluxo completo precisa ser repetido com o daemon estável. Nenhuma consulta ou escrita remota ocorreu.

Agrupamento coletivo permanece adiado: `associateComunRelataCollective` retorna antes de qualquer RPC quando `COMUN_RELATA_COLLECTIVE_ENABLED` não está habilitada.
