# Release readiness — Sprint 28 (RC local)

Status: **RC local condicionado somente ao fechamento de fixtures visuais/autenticadas.**

O código está tipado, passou lint, build, reset local, auditoria RLS, teste SQL e smokes HTTP core/no-leak em localhost. O smoke visual ainda depende de uma fixture editorial que não é recriada pelo reset, e não foi executado um E2E autenticado completo neste fechamento. Não há autorização nem execução de deploy, push ou alteração de infraestrutura remota.
