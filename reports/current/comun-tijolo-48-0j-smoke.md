# 48.0J-N1 — fechamento do smoke

Classificação: `SMOKE_WRONG_ENVIRONMENT`.

O smoke não tinha contrato stale: `scripts/smoke-comun-no-leak-http.mjs` cria a fixture local `fixture-s28-2-*`, valida HTTP 200 e textos públicos, e remove a fixture no `finally`. A falha observada ocorreu porque `localhost:3000` estava ocupado por outro processo Next; a aplicação consultava uma stack diferente da usada pelo setup da fixture, produzindo 404.

Correção operacional: executar a aplicação e o smoke com o mesmo `COMUN_BASE_URL` local (`http://localhost:3100`) e a mesma stack Supabase loopback. O smoke passou, incluindo os textos esperados, e o teardown confirmou zero resíduo. Não foi adicionado `status === 404` como sucesso, não houve remoção de assertions e nenhum banco remoto foi consultado.

Resultado do gate: `COMUN_SIDEWALK_48_0J_N1_SMOKE_GREEN`.
