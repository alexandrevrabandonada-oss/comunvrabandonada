# COMUN 48.1B-P1 — ativação Vercel

Plano staged, ainda não executado:

1. deployment inicial: `COMMUNITY_REGISTRATION_MODE=closed`, `COMUN_PARTICIPATION_WALLET_ENABLED=disabled`, território e Google desligados;
2. smoke dormente;
3. abrir cadastro com `COMMUNITY_REGISTRATION_MODE=open`;
4. smoke de cadastro/login/onboarding;
5. ativar Carteira com `COMUN_PARTICIPATION_WALLET_ENABLED=enabled`;
6. smoke sintético de Carteira e cleanup administrativo.

Não usar `NEXT_PUBLIC_*` para secrets. Não ativar Relata, Calçadas, Ônibus, coletivos ou encaminhamento.
