# COMUN 48.3-E3 — Criação de Pauta com baixíssima fricção

Data: 14/08/2026

Baseline: `a5073893ffe548b3ee3d9a562ef090c5ccf56412`

Estado: `COMUN_48_3_E3_LOW_FRICTION_PAUTA_CREATION_GREEN_PUBLIC_SAFE_NO_AUTO_ORGANIZATION`.

## Decisão de produto

A raiz permanece `public.comun_pauta_spaces`. A nova rota `/comun/pautas/nova` pergunta apenas “O que você quer entender ou mudar?” e aceita de 12 a 500 caracteres. O texto completo vai para `problem_public`; título e slug são derivações determinísticas que não inventam conteúdo. `summary`, categoria, território, comunidade, demanda, propostas e participação ficam nulos para enriquecimento posterior.

A Pauta nasce pública em `status=observing`, `public_status=received` e `risk_level=normal`. A pessoa autenticada recebe somente membership `participant`; ser a primeira participante não cria propriedade política nem papel de facilitação. Comunidade, Roda, Ação, grupo, mobilização e Dossiê não são criados.

## Auth, privacidade e safety

- leitura e preenchimento são anônimos; somente o write final exige Supabase Auth;
- antes do login o draft público fica apenas em `sessionStorage`, nunca em URL, log ou analytics;
- o retorno usa `returnTo` canônico e nunca auto-submete após autenticação;
- email, telefone, CPF e marcadores claros de URL/token privado falham fechados com orientação para remover dados pessoais ou usar “Vi um problema”;
- marcadores determinísticos de alto risco incompatível com publicação imediata não geram Pauta pública;
- nenhum texto é copiado para Relata, e nenhuma tabela privada de Relata, Wallet, anexo, forwarding ou localização é lida;
- IDs de auth, hashes de fingerprint, razões internas e draft não entram no HTML público.

Débito preservado: `COMUN_48_3_E2_RELATA_TO_PAUTA_DEFERRED_PRIVATE_BOUNDARY`.

## Atomicidade, rate limit e idempotência

O schema existente não tinha write path capaz de garantir atomicamente Pauta + membership + evidência opcional, nem ledger durável adequado para idempotência/rate limit. Por isso E3 usa exatamente uma migration forward-only:

`20260814160000_comun_pauta_low_friction_creation.sql`

SHA-256: `45bbebd810d5ba1e4a682880fcd37f8dc90721a9e4c8adf994a32fa74a6240fe`.

Ela cria um ledger mínimo em `private`, contendo somente hashes, e a função `public.comun_create_pauta_low_friction_v1`. A função é `SECURITY DEFINER`, fixa `search_path='pg_catalog'`, qualifica todas as relações, revoga `EXECUTE` de `PUBLIC`, `anon` e `authenticated`, e concede execução somente à `service_role`. O Server Action autentica a pessoa e revalida flag, pergunta, safety, duplicata, evidence ref, fingerprint, slug e chave de idempotência antes da chamada.

Contrato de limite: no máximo 3 criações bem-sucedidas por pessoa autenticada por hora, 10 por dia e 5 por fingerprint hash por hora. IP e user-agent brutos não são persistidos. Double tap/retry equivalente na mesma janela retorna a Pauta já criada.

## Duplicatas e evidência

A equivalência forte compara somente a questão normalizada, com lock transacional e consulta bounded a um candidato. O primeiro submit retorna a Pauta existente sem write; a pessoa pode abri-la ou confirmar explicitamente uma nova. Não há auto-merge nem bloqueio por similaridade incerta.

O civic search atual é uma camada de descoberta e não oferece um helper específico que satisfaça o contrato de sugestão E3 sem ampliar escopo. Débito registrado:

`COMUN_48_3_E3_RELATED_PAUTA_SUGGESTIONS_DEFERRED_NO_SAFE_EXISTING_HELPER`

Quando a entrada contém `?evidencia=<refId>`, a página resolve a referência no servidor. Manter o checkbox e criar constitui gesto explícito. No write, o servidor resolve novamente a ref e passa o `PublicEvidenceCitationV1` atual à transação; o navegador nunca envia citation payload. Se a ref mudar, a criação para até a pessoa escolher “Criar sem vincular esta evidência”.

## Gates

- preflight remoto: metadata-only, `businessContentRead=false`, três tabelas canônicas, RLS, grants, constraints, role `participant`, índices, namespace RPC e ledger;
- plano remoto: exatamente a migration E3 antes da promoção e vazio depois, preservando o external-ledger histórico de Calçadas;
- Supabase descartável: criação normal, evidence atual, evidence inválida, idempotência, duplicata forte, rate limit, auth obrigatório, rollback e zero organização automática;
- testes unitários: derivação, normalização, safety, flag, idempotência e contrato estático do boundary;
- UI: mobile 390×844, teclado, labels, foco no erro, mensagens anunciadas e uma CTA dominante;
- regressões: unit, typecheck, lint, build e jornadas de coerência aplicáveis.

## Rollout

- PR funcional [#324](https://github.com/alexandrevrabandonada-oss/comunvrabandonada/pull/324), functional head exato `855fbef978367bf215780d594bf489606f807897`, merge `8b5c4dbe68b9b37de914d81eec24f6449b509f00`;
- CI aplicável, Preview, testes focais, 966 testes unitários, typecheck, lint, build, acessibilidade, no-leak, jornadas e Supabase descartável verdes. Sete workflows históricos não aplicáveis rejeitaram a migration E3 por escopo próprio; a classificação ficou registrada na PR, sem mascarar gate aplicável;
- promoção da migration e Wave 0 no run [31844450823](https://github.com/alexandrevrabandonada-oss/comunvrabandonada/actions/runs/31844450823): pós-flight confirmou ledger/RLS/RPC, execução exclusiva da `service_role`, flag `disabled`, rota nova 404, superfícies anteriores 200 e `businessWrites=0`;
- o primeiro smoke Wave 1 encontrou somente uma asserção de HTML acentuado. Houve rollback automático para `disabled`, correção estrutural na PR [#325](https://github.com/alexandrevrabandonada-oss/comunvrabandonada/pull/325), head `5a564a43081b5e6546acb505ca8c137e563bb68f`, merge `8b99ab144536b618bbc84543975da2eae8ef8997`;
- o segundo smoke encontrou somente divergência entre a copy esperada e a copy canônica anônima. Houve novo rollback automático, correção focal na PR [#326](https://github.com/alexandrevrabandonada-oss/comunvrabandonada/pull/326), head `3aa953bb5bac4da84972374eb0d9408d87004c3c`, merge/main `87107b3f0d5e4e33acc7be505c84c22b1fd5d8c9`;
- Wave 1 final verde no run [31845840116](https://github.com/alexandrevrabandonada-oss/comunvrabandonada/actions/runs/31845840116), promovendo o exact-main com somente `COMUN_PAUTA_LOW_FRICTION_CREATION_ENABLED=enabled`;
- preflight remoto pós-promoção [31846083045](https://github.com/alexandrevrabandonada-oss/comunvrabandonada/actions/runs/31846083045) verde no mesmo SHA: metadata-only, `businessContentRead=false`, modo promoted e `migrationCount=0`/remote plan `[]`;
- smoke independente final: GET e HEAD `200` em `/comun`, `/comun/pautas`, `/comun/pautas/nova`, `/comun/pautas?evidencia=panorama%3Aterritory%3Acoverage` e `/comun/minha-participacao`;
- HTML público confirmou textarea, nome do campo, orientação de privacidade e CTA anônima canônica; nenhum marcador privado proibido foi encontrado;
- nenhuma fixture, criação de Pauta ou outra mutação foi executada em Production: `businessWrites=0`.

## Limites preservados

Não existe API REST nova, Pauta v2, IA, matching textual, publicação de autoria, editor completo, auto-attach, auto-create, fixture Production ou conversão de Relata. `launch_publicly=false` e o piloto Motorola permanecem inalterados.

## Resultado terminal

`COMUN_48_3_E3_LOW_FRICTION_PAUTA_CREATION_GREEN_PUBLIC_SAFE_NO_AUTO_ORGANIZATION`

48.4 não foi iniciado neste ciclo.
