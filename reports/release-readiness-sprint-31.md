# Release readiness — Sprint 31

Status: **candidato local aprovado com ressalva de regressão legada**.

| Gate | Resultado |
| --- | --- |
| Banco local limpo e migration reproduzível | passou |
| RLS e ausência de exposição direta | passou |
| Lint, tipos, unitários e build | passou |
| Acessibilidade séria/crítica | passou |
| Responsividade 360, 390, 768, 1024 e 1366 | passou |
| Fluxo central e autenticação local | passou |
| Smoke legado pauta-miniapp | bloqueado por expectativa textual obsoleta |
| Serviços remotos / custo | não usados / R$ 0 |

Antes de promover, recomenda-se atualizar o smoke legado para validar semanticamente `pautaModuleTypes` e aceitar `community_radio`, executar novamente a suíte integral em produção local e somente então realizar revisão humana de publicação. Nenhuma ação remota foi realizada.
