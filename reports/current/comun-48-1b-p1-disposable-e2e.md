# COMUN 48.1B-P1 — E2E descartável

Script: `scripts/solo/rehearse-p1-account-wallet-local.mjs`  
Comando: `npm run account:wallet:e2e:local`  
Lane: `COMUN P1 / account and wallet runtime E2E`

Escopo:

- usuário sintético criado e removido no Supabase descartável;
- login, logout e novo login;
- Minha Participação acessível com sessão;
- criação anônima de Carteira;
- recuperação em contexto sem cookie;
- isolamento entre Carteiras;
- vínculo e desvinculação explícitos da conta;
- senha incorreta recusada;
- território e Google desligados;
- cleanup de perfil, vínculos, eventos, itens, recovery e Carteiras.

O host local não possui Docker disponível nesta execução. A prova runtime é obrigatória na lane CI efêmera, sem credenciais ou projeto remoto.

Resultado CI: `COMUN_48_1B_P1_ACCOUNT_WALLET_DISPOSABLE_E2E_GREEN` (run `31139892110`, head `8df5057d`).

O host local permaneceu sem Docker. A regressão da lane Quality Performance no novo
head `e0bfedb` não atingiu o E2E P1: a suíte P1 foi marcada como pendente enquanto
o runner focal ficou preso na etapa de acessibilidade de outras superfícies.

## CI1 — isolamento do servidor de Quality Performance

- Script: `scripts/quality/run-isolated-a11y.mjs`.
- Porta dedicada: `127.0.0.1:3037`.
- O script inicia um único `next start` após o build, aguarda `/comun` e
  `/comun/entrar`, monitora PID/HTTP a cada 10 segundos e encerra o grupo no
  cleanup.
- `PLAYWRIGHT_SKIP_WEBSERVER=1` impede que o Playwright crie outro Next.
- A lane obrigatória `COMUN Quality / isolated a11y` executa Chromium único,
  um worker e zero retry, publicando apenas diagnóstico sanitizado.
- O mega-job mantém sua cobertura e usa o mesmo executor isolado para as suítes
  a11y focais e WCAG.
- Smoke local do executor: `COMUN_P1_CI_A11Y_TARGETED_GREEN`.
- O contrato `disposableSidewalkLedgerExact` foi ajustado para reconhecer o
  comando isolado sem aceitar remoção da cobertura de Calçadas.

### Resultado CI1 no head `6cf606e` (2026-08-07)

- Run `31144115752`: `COMUN Quality / isolated a11y` verde, com health gate,
  servidor monitorado e cleanup (`COMUN_P1_CI_A11Y_TARGETED_GREEN`).
- `pr-lane` e a lane territorial falharam antes das suítes por `502` do
  Supabase descartável durante restart dos containers.
- Um único retry focal repetiu o `502` (`invalid response received from the
  upstream server`); nenhum Playwright funcional foi iniciado nessa tentativa.
- Resultado: `COMUN_48_1B_P1_BLOCKED_CI_RUNTIME_INFRASTRUCTURE`.
- PR #179 permanece draft; sem READY, merge ou ativação Vercel.

### Reexecução no head `b715da9` (2026-08-07)

- Run `31144761069`: `COMUN Quality / isolated a11y`, rede e contratos
  territoriais verdes; o Supabase descartável iniciou normalmente.
- O `pr-lane` chegou às jornadas integrais, mas cinco viewports falharam no
  mesmo ponto: o cenário esperava `/comun/onboarding?returnTo=`, enquanto o
  processo permaneceu em `/comun/criar-conta?returnTo=...`.
- O servidor estava respondendo e não houve `ERR_ABORTED`; a causa foi
  configuração incompleta do ambiente descartável: `COMMUNITY_REGISTRATION_MODE`
  estava definido apenas na lane de rede, não na `pr-lane` que executa a jornada.
- Correção CI-only aplicada no próximo patch: `COMMUNITY_REGISTRATION_MODE=open`
  no escopo da `pr-lane`; Production continua controlada por suas flags de
  deployment.
- Resultado permanece bloqueado até a nova execução no SHA corrigido; não houve
  migration, escrita remota, ativação ou alteração funcional do P1.
