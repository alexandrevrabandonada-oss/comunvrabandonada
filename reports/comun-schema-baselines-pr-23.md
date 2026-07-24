# Baselines de schema — PR #23

> Documento histórico. Estado superado pelo fechamento verde da PR #23 em
> 23 de julho de 2026. Consulte
> `reports/current/estado-atual-comun.md`.

## Estado canônico atual

`LOCAL_EXPECTED_HARDENED` é o alvo vigente. O pacote transforma `REMOTE_ACTUAL` nesse alvo sem executar a fila histórica nem apagar objetos legados.

## Evidência atual

Dois ensaios independentes produziram hash bruto idêntico `227c39c855a626ebbe96428701848aded067acd687d2876403fcab4f80e0bbd1` e 175 tabelas, 45 policies, 428 índices e 9 funções.

## Gates fechados

- baseline remoto restaurado;
- baseline endurecido gerado;
- equivalência estrutural COMUN pós-reconciliação;
- idempotência controlada.

## Gates pendentes

- backup completo restaurado;
- regressão integral production-like;
- duas revisões nominais;
- aplicação remota autorizada.

## Decisão

**NO_GO_REMOTE_INTEGRATION**

> Atualização de fechamento: `LOCAL_EXPECTED_HARDENED` foi criado pela migration `20260722003105_pr23_schema_security_hardening.sql`. Dois ensaios independentes do pacote forward-only produziram o mesmo dump bruto SHA-256 `227c39c855a626ebbe96428701848aded067acd687d2876403fcab4f80e0bbd1` e as mesmas contagens: 175 tabelas (incluindo sete legadas remotas preservadas), 45 policies, 428 índices e 9 funções. O postflight passou em ambos.

## HISTÓRICO — SUPERADO PELO PACOTE FORWARD-ONLY

Data: 21 de julho de 2026
Project ref remoto: `nvmdszymrtacfehdynpg`
Escopo: somente schema e histórico técnico; nenhum dado de usuário, object key ou segredo foi incluído.

## Método

Foram construídos três bancos PostgreSQL/Supabase isolados:

- **REMOTE_ACTUAL:** dump `public` do remoto, restaurado num banco local vazio;
- **LOCAL_BEFORE_19:** migrations registradas no remoto até `20260715021055`, mais a migration fora de ordem `20260720005353`;
- **LOCAL_EXPECTED_FINAL:** reset limpo com as 60 migrations atuais do repositório.

Os dumps ficaram apenas no diretório temporário durante a auditoria. Para a representação normalizada foram removidos owners, `SET`, comentários voláteis, timestamps/caminhos e whitespace; nenhum dump foi adicionado ao Git.

## Representações normalizadas

| Baseline | SHA-256 normalizado | Tabelas públicas | Views | Policies | Índices |
|---|---|---:|---:|---:|---:|
| REMOTE_ACTUAL | `0326fb80a9e4efc5944a3246fc5e6e9845c5b79ab705457ae79eb409de78842b` | 123 | 1 | 39 | 128 |
| LOCAL_BEFORE_19 | `8f9f76ac5c4bc4b48d823945724c1ecc94574692e60c88b60531d9e857f5e723` | 116 | 1 | 19 | 114 |
| LOCAL_EXPECTED_FINAL | `0df3e99b431cdef67e65ec52e28fb6c73ad87a31f9fae01abd9af3fc09fc44db` | 168 | 1 | 25 | 156 |

Os hashes não são equivalentes. O remoto real está sete tabelas e vinte policies à frente do baseline produzido somente pelo histórico registrado, mas continua 45 tabelas atrás do estado final.

## Conteúdo preservado na comparação

- tabelas, views e colunas;
- tipo, ordem, default e nullability;
- PK, FK, unique e checks;
- índices e predicados parciais;
- triggers e funções;
- grants para `anon`, `authenticated` e `service_role`;
- RLS e policies;
- extensão requerida `pgcrypto`.

## Diferenças de alto nível

### REMOTE_ACTUAL versus LOCAL_BEFORE_19

O remoto não é explicado apenas pelo histórico:

- `20260720005353` introduziu antecipadamente `comun_member_profiles` e `comun_member_inbox`;
- a mesma migration introduziu a campanha de identificação e suas tabelas/policies;
- `handle_new_user()` existe somente no remoto e tem origem não encontrada no Git;
- grants restaurados de dump precisam ser comparados pelo SQL de grants do próprio dump, pois default privileges do stack local adicionam privilégios não representativos durante restore.

### REMOTE_ACTUAL versus LOCAL_EXPECTED_FINAL

- 52 tabelas referenciadas pelas 19 migrations estão ausentes;
- 15 tabelas existentes possuem estrutura anterior ou diferente do final;
- `comun_member_profiles` e `comun_member_inbox` são interseções conflitantes, não equivalentes;
- arte territorial, rádio, círculos, comunidades persistentes, operação editorial e toda a vertical de calçadas permanecem majoritariamente ausentes;
- o final local contém grants `anon` inadequados em `comun_sidewalk_uploads`, detectados pelo postflight.

## Baseline específico de `comun_member_profiles`

As 16 colunas remotas têm tipos/defaults/nullability compatíveis semanticamente com o conjunto final, embora a ordem física difira. Constraints não são equivalentes:

- remoto: FK `user_id → auth.users(id) ON DELETE CASCADE`;
- final local: FK `territory_id → comun_hub_territories(id) ON DELETE SET NULL`;
- cada baseline carece da FK segura presente no outro.

Uma reconciliação forward-only deve preservar a FK remota e adicionar a FK territorial; não deve remover proteção referencial.

## Baseline específico de `comun_member_inbox`

- remoto: FK `member_user_id → auth.users(id) ON DELETE CASCADE`;
- final local: FK `pauta_id → comun_pauta_spaces(id) ON DELETE CASCADE`;
- remoto não contém os tipos de encaminhamento `sidewalk_forwarding_prepared`, `sidewalk_forwarding_approved` e `sidewalk_memory_published`;
- final local contém esses tipos.

Também aqui o alvo reconciliado seguro é um superset revisado, não a remoção da FK remota.

## SECURITY DEFINER

A contagem anterior de “quatro” era contagem de ocorrências textuais no dump, não quatro funções. O catálogo restaurado contém **duas funções**:

| Função | Owner | Search path | EXECUTE | Tabelas | Resultado |
|---|---|---|---|---|---|
| `claim_next_archive_processing_job(text)` | `postgres` | `public` explícito | somente `service_role` | `comun_archive_processing_jobs` | equivalente ao local; risco controlado pelo grant |
| `handle_new_user()` | `postgres` | `public` explícito | `PUBLIC`, `anon`, `authenticated`, `service_role` | insere em `profiles`; lê `NEW.raw_user_meta_data` | `UNKNOWN_ORIGIN`; não existe no histórico/final local |

`handle_new_user()` retorna `trigger`, portanto chamada direta normal tende a falhar fora de trigger, mas o grant público continua desnecessário e contrário ao padrão de hardening. A função usa metadata editável apenas para conteúdo de perfil, não para autorização; mesmo assim precisa de revisão do trigger em `auth.users`, colisões de username e revogação explícita.

## Limitações

- Auth e Storage gerenciados não são integralmente representados por dump `public`;
- dados e contagens pessoais não foram restaurados;
- um restore de schema comprova recuperabilidade estrutural, não backup operacional completo;
- fingerprints catalogais precisam ser recalculados imediatamente antes de qualquer janela.

## Resultado

`REMOTE_ACTUAL`, `LOCAL_BEFORE_19` e `LOCAL_EXPECTED_FINAL` estão identificados e não são equivalentes. O snapshot auditado é suficiente para assertions fail-closed, mas não para autorizar migração.
