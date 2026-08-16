# COMUN 48.4-A4 — Onboarding de organizações da economia solidária

Data da implementação: 16/08/2026

Baseline: `3aca11f0cfc1893d3e77e935318f2a08af7ddb52`

Estado: Production green; migration promovida com a superfície cloaked na Wave 0 e onboarding habilitado isoladamente na Wave 1.

## Resultado funcional

A4 resolve o débito `COMUN_48_4_A2_NEW_ORGANIZATION_ONBOARDING_DEFERRED` sem criar uma nova entidade econômica. A organização pública continua sendo `public.comun_territorial_organizations`, ligada ao território canônico em `public.comun_hub_territories`. A única raiz nova é o workflow privado `private.comun_solidarity_organization_onboarding`.

O fluxo é:

`nome → rascunho privado → detalhes de verificação → submitted → uma revisão humana → organização pública + primeiro facilitator`.

Não existe publicação automática, seller, loja, pedido, pagamento, chat, oferta ou necessidade criada pelo onboarding.

## Migration e contrato privado

- única migration forward-only: `20260816181040_comun_solidarity_organization_onboarding.sql`;
- SHA-256: `3a0d882f0efd10e4db6d8e3269b9a130c018499c13c178fbef382209e2d67a0b`;
- estados: `draft`, `submitted`, `needs_changes`, `approved`, `rejected`, `withdrawn`;
- RLS e FORCE RLS ativos; `public`, `anon` e `authenticated` não possuem grants na tabela;
- RPCs com `SECURITY DEFINER`, `search_path=pg_catalog`, relações qualificadas e execução apenas por `service_role`;
- `create_request_id`, `last_mutation_request_id` e advisory locks protegem double submit;
- rate limit usa somente `applicant_user_id` autenticado, sem IP bruto;
- trilha de transição, pessoa candidata, nota de participação e mensagens de revisão permanecem privadas.

## Save first e autenticação

O primeiro formulário pergunta somente “Qual organização você quer incluir?”. Antes do login, o nome fica em `sessionStorage` sob chave versionada. O login recebe `returnTo` para a rota canônica, o nome nunca entra na query string e o navegador não reenvia automaticamente depois da autenticação.

O primeiro write autenticado cria somente um registro `draft`. Nesse ponto:

- território +0;
- organização +0;
- acesso A2 +0;
- Oferta +0;
- Necessidade +0.

Depois do save, a pessoa informa tipo, apresentação, território de atuação opcional, contato público opcional com consentimento explícito, fonte pública opcional e a nota privada de participação. A submissão ainda não cria objeto público.

## Verificação e aprovação atômica

Somente uma pessoa ativa com papel canônico `admin` em `comun_admin_users` pode pedir ajustes, rejeitar ou aprovar. O papel `editor` da plataforma, facilitadores de outras organizações e a própria pessoa candidata falham fechados.

Na aprovação, uma única RPC transacional:

1. confirma a classificação pública;
2. exige fonte pública, revisão da plataforma ou confirmação operacional documentada;
3. cria território `monitoring/public/source_checked` sem coordenada e com precisão `hidden`;
4. cria organização `forming/source_checked`;
5. registra a proveniência em `comun_territorial_sources` com `review_status=reviewed`;
6. ativa um acesso A2 `facilitator/active/platform` para a pessoa candidata;
7. marca o onboarding `approved`.

O mapeamento territorial é determinístico: `cooperative → cooperative`; os demais tipos do primeiro ciclo usam `solidarity_collective`. `verified` nunca é o default. Contato só é promovido quando o consentimento explícito está salvo; conta e `private_contact` nunca são fallback.

## Duplicatas e legado

O nome é normalizado no banco e protegido por advisory lock. Uma organização pública equivalente devolve a ficha canônica e o CTA A2 “Pedir vínculo com ela”, sem criar onboarding nem nova raiz pública. Similaridade incerta não faz merge automático e não usa IA.

`comun_territorial_contributions` com `contribution_type=organization` permanece `LEGACY_KEEP_COMPAT`. A4 não faz dual-write.

## Experiência

- entrada secundária na Feirinha: `/comun/cooperativas/nova`;
- continuação autenticada por token opaco: `/comun/cooperativas/nova/[onboardingToken]`;
- rascunhos, pedidos enviados e ajustes aparecem na seção Organizações de Minha Participação;
- fila de revisão integra a Sala de Organização existente;
- após aprovação, o acesso A2 ativo leva naturalmente à ficha e aos writes A3 já existentes;
- Home permanece sem quinta porta.

Feature flag: `COMUN_SOLIDARITY_ORGANIZATION_ONBOARDING_ENABLED`, efetiva apenas quando A1 e A2 também estão `enabled`. A3 permanece independente.

## Privacidade e propagação zero

Nenhum DTO público recebeu `applicant_user_id`, `participation_note_private`, `review_message_private`, request IDs, token de continuação ou histórico. A query pública A1 segue como única autoridade da Feirinha.

Aprovar uma organização não cria Oferta, Necessidade, Comunidade, membership, Pauta, Roda, Ação ou Grupo de Trabalho. O primeiro acesso é facilitação operacional revogável no COMUN; não prova fundação, representação jurídica ou vínculo trabalhista.

## Gates de promoção e rollout concluído

- preflight remoto: metadata-only em `BEGIN READ ONLY`, `businessContentRead=false` e plano 0/1 restrito à migration A4;
- descartável: draft, submit, needs changes, reject, withdraw, duplicata, idempotência, contato público, primeiro facilitator, RLS/grants, privacidade e propagação zero, sempre com rollback;
- Wave 0: promover a migration exata com A4 `disabled` e provar a rota cloaked;
- Wave 1: habilitar somente A4 e executar smoke GET/HEAD;
- nenhuma fixture ou write de negócio em Production.

Evidência final:

- PR funcional `#336`;
- head funcional exato `b4038ccc4ffb4d1ecea2c92ecfa56bc2cd94016b`;
- merge/main exato `810e9f944b37490f201f01ad1dc0cebbbbf54085`;
- preflight remoto A4 `31972719160` e prova descartável A4 `31972719126` verdes;
- todos os gates aplicáveis de produto, superfície, segurança, qualidade, coerência e jornadas verdes no exact-head;
- oito preflights históricos de plano global vazio foram classificados como não aplicáveis à PR com a única migration A4 deliberada; nenhum foi relabelado como green;
- Wave 0 `31974384419`: migration exata aplicada, postflight metadata-only verde, flag A4 desligada e rotas cloaked;
- Wave 1 `31974507739`: somente `COMUN_SOLIDARITY_ORGANIZATION_ONBOARDING_ENABLED=enabled`, GET/HEAD verdes nas rotas A4 e dependências A1/A2 preservadas;
- `businessWrites=0` durante o rollout e zero fixture em Production.

O Docker local encontrou falha de infraestrutura na imagem Supabase antes do ensaio SQL. A prova descartável Linux do PR permanece obrigatória e não será substituída por green documental.

## Deferidos

- `COMUN_48_4_A1_INDIVIDUAL_PRODUCERS_DEFERRED_FIRST_CYCLE`;
- conexão/interesse privado fica para `48.4-A5`;
- onboarding não cria conteúdo econômico automaticamente;
- `COMUN_48_1C_MOTOROLA_PILOT_PAUSED_BY_PRODUCT_DECISION` e `launch_publicly=false` permanecem.

Estado terminal:

`COMUN_48_4_A4_ORGANIZATION_ONBOARDING_GREEN_VERIFIED_FIRST_FACILITATOR_NO_OWNER`
