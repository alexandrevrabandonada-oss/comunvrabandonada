# COMUN 48.3-E3 — Criação de Pauta com baixíssima fricção

Data: 14/08/2026

Baseline: `a5073893ffe548b3ee3d9a562ef090c5ccf56412`

Estado: implementação funcional em validação; promoção e rollout ainda não registrados.

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

Ainda a registrar após exact-head merge:

- functional head e merge SHA;
- preflight/CI/Preview;
- Wave 0 com `COMUN_PAUTA_LOW_FRICTION_CREATION_ENABLED=disabled`;
- Wave 1 com somente a flag E3 em `enabled`;
- smoke GET/HEAD de `/comun`, `/comun/pautas`, `/comun/pautas/nova`, recorte por evidência e Minha participação;
- `businessWrites=0` em Production.

## Limites preservados

Não existe API REST nova, Pauta v2, IA, matching textual, publicação de autoria, editor completo, auto-attach, auto-create, fixture Production ou conversão de Relata. `launch_publicly=false` e o piloto Motorola permanecem inalterados.

O terminal só será emitido após CI, migration, rollout e smoke Production verdes.
