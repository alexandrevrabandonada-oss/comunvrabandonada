# Release readiness — Sprint 28 (RC local)

Status: **RC local bloqueado por autenticação de usuário comum ausente.**

O código está tipado, passou lint, build, reset local, auditoria RLS, teste SQL e smokes HTTP core/no-leak em localhost. Fixtures determinísticas locais foram adicionadas. O E2E por persona permanece bloqueado: só há login administrativo e Minha Participação redireciona usuários comuns para ele. Não há autorização nem execução de deploy, push ou alteração de infraestrutura remota.
