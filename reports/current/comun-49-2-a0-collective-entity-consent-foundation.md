# COMUN 49.2-A0 — fundação de consentimento de entidade coletiva

## Decisão de escopo

Esta entrega continua sendo somente uma fundação privada. Ela não cria tela,
rota autenticada, RPC pública, candidato, projeção pública, relacionamento com
relatos individuais ou chave de ativação do mapa.

Para não transformar p_actor_user_id em uma alegação de identidade não
verificável, não há superfície de escrita em tempo de execução nesta etapa:
anon, authenticated e service_role não recebem SELECT, INSERT, UPDATE, DELETE,
USAGE de sequência ou EXECUTE nas primitivas desta fundação. As duas funções em
private são apenas primitivas internas de owner e da prova local de CI. O valor
de p_actor_user_id é atributo de auditoria dessa primitiva; não autentica um
chamador.

## Contratos fechados nesta revisão

| Área | Contrato agora | Limite explícito |
| --- | --- | --- |
| Entidade | Criação idempotente por creation_request_id, com trava transacional consultiva e conflito de payload explícito. | Não há criação por cliente ou API pública. |
| Representação | Estados declared, verified e revoked têm ator e tempo coerentes; transições para verified ou revoked geram evento append-only. Declarado serve para revogar, não para publicar. | Verificação de legitimidade humana ainda não existe. |
| Consentimento | Só a própria representação que consentiu, ou uma representação atualmente ativa, pode revogar; a revogação continua possível após arquivamento da entidade ou revogação da representação original. | Consentir ativo exige entidade ativa e representação não revogada. |
| Aviso | Versão, escopo sanitized_entity_projection e SHA-256 do texto exato ficam no consentimento e nos dois eventos de consentimento. | Uma mudança de texto exige nova versão, novo hash e migração de contrato. |
| Auditoria | Eventos são append-only; criação, arquivamento, verificação, revogação e consentimento têm forma obrigatória. FKs compostas e coerência consentimento–representação impedem eventos incompletos ou cruzados. | O owner do banco continua sendo a autoridade administrativa; isso não é trilha de auditoria imutável externa. |
| Privilégios | As quatro tabelas, a sequência e as funções internas são revogadas de PUBLIC, anon, authenticated e service_role; todas as tabelas têm RLS forçado. | R2 precisará desenhar concessões mínimas novas, não reabrir essas primitivas. |

O hash fixado do aviso atual é:

0f980060c1372bb4e373645b3cfbcc62a69fedcc6bec3acb96c5fd215dc536ae

## Prova de CI

O workflow dedicado roda em um Supabase local descartável e recusa credenciais
remotas ou URL não local. Ele executa a migration desde o reset local e prova:

- idempotência sequencial e concorrente da criação;
- conflito quando o mesmo request recebe outro payload;
- consentimento ativo idempotente;
- rejeição de ator sem representação;
- revogação idempotente depois de arquivar a entidade e revogar a representação;
- evento de consentimento com escopo e hash;
- rejeição de evento malformado;
- ausência efetiva de privilégios de tabela e EXECUTE para anon, authenticated e service_role.

Os testes de contrato também impedem a volta de RPC pública, de grants a
service_role e de qualquer relação com casos, candidatos, projeções ou a chave
do mapa público.

## Próxima etapa obrigatória antes de uso por pessoas (R2)

1. Criar uma rota autenticada separada, vinculada a auth.uid(), sem receber o
   ator como parâmetro controlado pelo cliente.
2. Definir e revisar a política de legitimidade da representação, incluindo
   evidência, revisão, expiração, contestação e revogação por terceiros.
3. Definir retenção, exportação, exclusão e resposta a disputa para entidade,
   representação, consentimento e eventos.
4. Manter consentimento individual separado; nunca derivar publicação de relato
   individual a partir deste consentimento coletivo.
5. Criar uma decisão de projeção sanitizada separada, com revisão humana,
   minimização de dados e controles próprios. O mapa público permanece desligado.

## Core Journeys failure triage

- Run inicial: `33770844333`, job `100702071777`, head `2df1f1bc51642bed3e26bb7b0118c17cc6cd1ee3`.
- Comando: `npm run test:e2e:app-shell-v2`, após `npm run journeys:e2e` passar 35/35.
- Teste: `tests/app-shell-v2/app-shell-v2.spec.ts:238`, `reduced motion and forced colors retain state cues`, viewport `landscape-844x390`.
- Evidência: 34/35 cenários passaram; não houve assertion funcional, retry interno ou timeout. Chromium headless shell encerrou com `Received signal 11 SEGV_MAPERR`; Playwright então reportou `browserContext.close: Test ended`. A etapa durou cerca de 2m29s e o teste anterior de Core Journeys completou 35/35 em 1.1m.
- Relação com este PR: inexistente. O diff de `8db81d1` até o head contém migration privada, libs de contrato não carregadas pelo runtime/UI, testes, CI e relatório; não altera `app/`, `components/`, specs ou configs Playwright.
- Reexecução focal: attempt 2 do mesmo run, mesmo SHA, Node e Chromium concluiu a etapa `E2E, cinco viewports e acessibilidade` verde. Classificação: `CHROMIUM_CRASH_FLAKE`.
- Correção mínima: o segundo comando passou a usar `scripts/quality/run-with-chromium-crash-retry.sh`, padrão já usado pelo workflow pós-merge. Ele repete somente uma vez e somente quando o log contém `SIGSEGV`; assertions, timeouts e outras falhas continuam vermelhos. A alteração está em `75e529b0`; o contrato de CI correspondente, que passou de dois para três usos explícitos do wrapper aprovado, está em `b0864d41`.
- Evidência final de rerun: `COMUN Core Journeys Deliverability` run `33778184114`, no head `b0864d4148dae5eced23f4932702d7c052828189`, concluiu `success`: auditoria, E2E/a11y de cinco viewports, regressão de qualidade/PWA/performance, estática/build e whitespace ficaram verdes.
- Status final da triagem: `CORE_JOURNEYS=GREEN`. O PR permanece DRAFT e não recebe `R1_TECHNICALLY_READY_FOR_REVIEW` enquanto `COST-02 / exact checkpoint Preview` não encontrar um Preview pronto para o SHA do checkpoint.

## R2 contract review readiness

### auth.uid()

R1 não expõe RPC nem rota de mutation. `p_actor_user_id` existe somente em primitives owner-only privadas e é documentado como atributo de auditoria, nunca prova de identidade de quem chama. R2 deve criar uma rota autenticada que derive o ator de `auth.uid()` no servidor, sem aceitar esse UUID do cliente. Não há blocker crítico em R1 porque ela não é utilizável por runtime.

### Legitimidade

`declared`, `verified` e `revoked` são estados distintos. Uma declaração não cria autoridade de publicação; nem `verified` liga mapa, projeção ou publicação. O consentimento é escopado a projeção sanitizada futura e não substitui consentimento individual. A política humana/evidencial de verificação permanece pendência explícita de R2.

### Retenção

Revogação e arquivamento preservam entidade, representação, consentimento e eventos por FKs restritivas e auditoria append-only, para provar transições e impedir reescrita histórica. R1 não fixa prazo legal, exportação ou exclusão; os dados potencialmente minimizáveis no futuro são nome público, identificadores de usuário, ator/auditoria e timestamps. Isso é um contrato técnico de preservação, não uma política jurídica completa, e precisa de decisão R2 antes de uso por pessoas.

### Contestação

Uma contestação pode ser modelada hoje ao revogar/inativar a representação: isso preserva a trilha, bloqueia novo consentimento ativo dessa representação e ainda permite a revogação de consentimento já dado pelo próprio consentidor ou por representação ativa. Não existe, por escolha de escopo, uma superfície segura para terceiro contestar, suspender provisoriamente ou adjudicar legitimidade. Esse fluxo de disputa é blocker explícito para R2, não para a fundação owner-only R1.
