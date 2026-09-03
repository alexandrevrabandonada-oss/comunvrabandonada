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
