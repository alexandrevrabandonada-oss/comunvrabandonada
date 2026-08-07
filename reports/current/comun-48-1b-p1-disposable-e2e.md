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

Resultado aguardado: `COMUN_48_1B_P1_ACCOUNT_WALLET_DISPOSABLE_E2E_GREEN`.
