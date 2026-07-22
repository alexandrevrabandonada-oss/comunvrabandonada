# Readiness da migração remota da PR #23

## Estado canônico atual

O schema forward-only foi reconciliado e reproduzido duas vezes, mas a integração remota não está autorizada.

## Evidência atual

Hash final idêntico nos dois ensaios, postflight e `ALREADY_RECONCILED` aprovados, 256/256 unitários, `RLS_MATRIX_OK`, DB lint e no-leak verdes.

## Gates fechados

- hardening local;
- ensaios 1 e 2;
- postflight e idempotência;
- cleanup local/testável.

## Gates pendentes

- backup completo restaurado;
- regressão integral production-like;
- duas revisões nominais;
- aplicação remota autorizada.

## Decisão

**NO_GO_REMOTE_INTEGRATION**

Data: 21 de julho de 2026
Decisão vigente: **NO_GO_REMOTE_INTEGRATION**

## Fechamento do pacote forward-only

O alvo `LOCAL_EXPECTED_HARDENED` e o pacote modular foram implementados. Dois ensaios independentes passaram com hash final idêntico `227c39c855a626ebbe96428701848aded067acd687d2876403fcab4f80e0bbd1`; postflight e idempotência `ALREADY_RECONCILED` também passaram. Typecheck, lint, 256/256 unitários, RLS matrix, DB lint do alvo limpo e no-leak local estão verdes.

A decisão permanece **NO_GO_REMOTE_INTEGRATION** porque o gate de backup completo cifrado/restaurado, as duas revisões nominais e a regressão production-like integral sobre o snapshot reconciliado ainda não foram concluídos. Nenhuma aplicação remota ou alinhamento de histórico está autorizado.

## HISTÓRICO — SUPERADO PELO PACOTE FORWARD-ONLY

O inventário completo confirmou:

- três baselines normalizados e não equivalentes;
- origem de `comun_member_profiles`/`comun_member_inbox` em `20260720005353`, commit `bf1f953`;
- 52 tabelas-alvo ausentes e 15 existentes estruturalmente diferentes entre os objetos tocados pelas 19 migrations;
- função remota `handle_new_user()` de origem desconhecida e com EXECUTE público;
- grant `anon` indevido (`TRUNCATE`, `REFERENCES`, `TRIGGER`) em `comun_sidewalk_uploads` no estado final local;
- preflight assertions aprovadas no snapshot restaurado;
- pacote de reconciliação deliberadamente bloqueado por `PR23_RECONCILIATION_NOT_APPROVED`;
- postflight corretamente falhando no grant público;
- DB lint do `LOCAL_EXPECTED_FINAL` sem erros de schema;
- RLS matrix, regressões do portal e no-leak não executados após o fail-closed;
- restore somente de schema aprovado, mas backup/restore completo não comprovado.

Consequentemente, `COMUN_REMOTE_SCHEMA_RECONCILIATION_REHEARSAL_OK` e
`COMUN_REMOTE_BACKUP_RESTORE_VERIFIED` **não foram emitidos**. A estratégia
recomendada é reconciliação forward-only seguida de alinhamento de histórico
apenas após equivalência integral, backup restaurável e revisão por duas pessoas.

## Resumo executivo

O snapshot remoto e o ensaio isolado confirmaram que o problema não é apenas uma fila de 19 migrations. Existe **drift entre o histórico e o schema remoto**: `comun_member_profiles` já está presente e evoluída no banco remoto, mas a migration `20260715032613_comun_pauta_miniapps_circles.sql`, ausente do histórico remoto, tenta criá-la sem `IF NOT EXISTS` e falha.

O ensaio obedeceu ao fail-fast e parou na primeira falha. Não foi usado `migration repair`, nenhuma migration remota foi aplicada e nenhuma regressão posterior foi declarada como aprovada.

Além disso, o projeto Vercel que recebe GitHub/main/PR ainda não detém o domínio público. A decisão só poderá mudar para `READY_FOR_CONTROLLED_REMOTE_MIGRATION` depois de reconciliar o drift, provar backup restaurável e concluir um novo ensaio integral.

## 1. Snapshot Supabase

| Item | Estado observado |
|---|---|
| Project ref | `nvmdszymrtacfehdynpg` |
| Nome exibido pela CLI | `nika` |
| Região de backup | `us-west-2` |
| Banco | PostgreSQL 17 no ambiente local compatível; remoto reportado pela CLI vinculada |
| Volume do banco | aproximadamente 34 MB |
| Tabelas públicas | 123 no schema dump |
| Tamanho de tabelas | aproximadamente 5.632 kB |
| Tamanho de índices | aproximadamente 7.008 kB |
| Policies públicas | 39 no schema dump |
| Funções públicas | 29 no schema dump |
| Funções `SECURITY DEFINER` | 4 ocorrências; exigem revisão individual de grants/search path |
| Edge Functions | nenhuma listada |
| Extensão requerida/observada pelo histórico | `pgcrypto`; lista completa do catálogo deve ser confirmada na janela |
| Supabase Cron | schema `cron` não encontrado pelo dump de dados; nenhum job Supabase foi comprovado |
| PITR | desativado |
| Backups físicos listados | nenhum disponível na resposta da CLI |

### Volume funcional aproximado, sem dados pessoais

- 874 itens de acervo;
- 860 fichas de identificação histórica;
- 2.584 assets;
- 859 jobs de processamento e 1.718 eventos;
- 195 heartbeats do worker;
- 185 registros de auditoria administrativa;
- demais tabelas majoritariamente vazias ou de baixo volume.

Nenhuma linha de usuário, contato, nota privada ou object key foi copiada para os relatórios. O ensaio usou apenas um dump de schema, sem dados.

### Migrations remotas

O histórico remoto é contínuo até `20260715021055`, contém `20260720005353` aplicada fora da sequência restante e não contém estas 19 versões:

1. `20260715025948_comun_field_access.sql`
2. `20260715032613_comun_pauta_miniapps_circles.sql`
3. `20260715151922_comun_pauta_miniapps_relational_guards.sql`
4. `20260715155802_comun_community_auth_profiles.sql`
5. `20260715170058_comun_territorial_art_foundation.sql`
6. `20260715174723_artwork_storage_operations.sql`
7. `20260715185344_community_radio_foundation.sql`
8. `20260715192935_comun_central_experience_inbox.sql`
9. `20260716000000_comun_sidewalk_vertical.sql`
10. `20260716120000_comun_sidewalk_fk_fix.sql`
11. `20260717013709_editorial_operation.sql`
12. `20260717022301_operational_persona_roles.sql`
13. `20260718031145_operational_queue_pagination.sql`
14. `20260719180751_comun_sidewalk_member_first_participation.sql`
15. `20260719202300_comun_persistent_communities.sql`
16. `20260720161117_comun_sidewalk_real_map.sql`
17. `20260720185530_comun_sidewalk_forwardings.sql`
18. `20260721155914_comun_sidewalk_quick_capture.sql`
19. `20260721164415_comun_sidewalk_direct_private_upload.sql`

## 2. Storage remoto

Buckets observados:

- `comun-report-attachments`;
- `comun-public-safe-attachments`;
- `archive-private-originals`;
- `archive-public-derivatives`.

`archive-private-originals` está privado, limita o bucket a 30 MiB e aceita JPEG, PNG e WebP. O contrato da PR usa:

- object key único por usuário/ticket;
- ticket de autorização com validade operacional de 10 minutos;
- upload assinado sem leitura pública;
- confirmação server-side que baixa e valida a imagem;
- original privado e derivada pública apenas após sanitização/revisão;
- service role somente no servidor.

Pendências bloqueadoras:

- `comun_sidewalk_uploads` ainda não existe remotamente;
- a expiração efetiva do token assinado precisa ser medida e comparada com os 10 minutos do ticket;
- o cleanup existente recusa execução remota por design;
- é necessário aprovar rotina idempotente de cleanup para tickets expirados, objetos órfãos e rascunhos abandonados, com dry-run, limite por lote, auditoria sanitizada e alarme.

## 3. Auth anônimo — preparação, sem ativação

O estado remoto de Anonymous Sign-In não foi confirmado pela credencial de auditoria e não foi alterado. Antes de ativar:

1. habilitar Cloudflare Turnstile ou CAPTCHA invisível e validar domínio;
2. manter limite global inicial de 30 criações anônimas/hora/IP ou torná-lo mais restritivo;
3. manter limite funcional do COMUN em 5 envios/hora e 30/dia por `user.id`;
4. revisar todas as policies `TO authenticated`, pois usuários anônimos também usam esse papel;
5. usar o claim JWT `is_anonymous` para impedir funções exclusivas de contas permanentes;
6. garantir que cadastro anônimo não cria membership nem papel comunitário/editorial;
7. testar conversão por vinculação de identidade preservando `user.id` e sem promoção;
8. definir retenção e limpeza de contas anônimas inativas; o Supabase não faz cleanup automático;
9. usar rendering dinâmico nas páginas com sessão anônima.

Referência: [Supabase Anonymous Sign-Ins](https://supabase.com/docs/guides/auth/auth-anonymous).

### Matriz de permissão proposta

| Recurso/ação | Visitante | Usuário anônimo | Conta permanente | Membro | Moderador | Admin | Service role |
|---|---:|---:|---:|---:|---:|---:|---:|
| Ler projeções públicas | sim | sim | sim | sim | sim | sim | sim |
| Criar sessão anônima | não | origem | não necessário | não necessário | não | não | não |
| Criar ticket de foto | não | backend, próprio | backend, próprio | backend, próprio | backend | backend | sim |
| Ler ticket próprio | não | sim, `auth.uid()` | sim, `auth.uid()` | sim, `auth.uid()` | somente por função operacional | operacional | sim |
| Escrever diretamente nas tabelas | não | não | não | não | não | não | sim/backend |
| Ler geometria exata/original | não | próprio apenas quando necessário no fluxo | próprio apenas quando necessário | próprio | revisão autorizada | autorizado | sim |
| Moderar/publicar | não | não | não | não por padrão | sim, papel explícito | sim | somente automação autorizada |
| Receber papel comunitário automaticamente | não | **não** | **não** | n/a | n/a | n/a | não |
| Converter conta | não | sim, vinculando identidade | n/a | n/a | n/a | n/a | suporte excepcional auditado |

As policies devem combinar `auth.uid()` com checks restritivos de `is_anonymous` quando a ação exigir conta permanente. `TO authenticated` isolado não é autorização suficiente.

## 4. Ensaio isolado

### Ambiente

- caminho local: `C:\Projetos\comun-pr23-rehearsal`;
- project ID local: `comun_pr23_rehearsal`;
- portas separadas da instância local existente;
- PostgreSQL/Supabase em Docker;
- baseline criado a partir de dump **somente de schema** do remoto;
- nenhum dado pessoal copiado;
- nenhuma branch ou projeto Supabase remoto criado;
- stack parada ao final, com volume local preservado para diagnóstico.

### Resultado fail-fast

| Ordem | Migration | Resultado |
|---:|---|---|
| 1 | `20260715025948_comun_field_access.sql` | PASS |
| 2 | `20260715032613_comun_pauta_miniapps_circles.sql` | **FAIL — execução interrompida** |

Erro:

```text
ERROR: relation "comun_member_profiles" already exists
```

Objeto: `public.comun_member_profiles`.

Dependência/drift:

- a tabela já existe no schema remoto, embora a migration que a cria esteja ausente do histórico;
- a tabela remota já contém as colunas de onboarding, termos, privacidade, visibilidade e suspensão que seriam adicionadas pela migration posterior `20260715155802`;
- não há policy diretamente na tabela no snapshot;
- a migration `20260715032613` cria sete tabelas antes de chegar ao objeto conflitante. Sem transação única, uma tentativa remota poderia deixar aplicação parcial.

### Correção mínima necessária — ainda não implementada

Não usar `migration repair` para declarar versões executadas. Preparar e revisar um plano de reconciliação de schema que:

1. compare, coluna a coluna, constraints, FKs, índices, RLS e grants dos objetos que já existem;
2. determine a origem real de `comun_member_profiles` e se outros objetos das 19 migrations também foram criados fora do histórico;
3. torne a sequência atômica ou execute cada migration dentro de transação controlada quando compatível;
4. transforme apenas os DDL conflitantes em operações idempotentes com assertions de equivalência — nunca ignorar um objeto de forma cega;
5. trate também `20260715155802`, cujos `ADD COLUMN` sem `IF NOT EXISTS` falhariam na tabela já evoluída;
6. execute novamente o baseline remoto e todas as 19 migrations desde o início;
7. somente depois produza o script operacional e a revisão por duas pessoas.

Modificar migrations históricas exige decisão formal. Uma alternativa é uma migration de reconciliação anterior à cadeia, mas ela precisa preservar o histórico real e ser compatível com ambientes que já aplicaram a sequência. Nenhuma alternativa foi escolhida neste lote.

## 5. Regressão do banco

Como a segunda migration falhou, os gates abaixo estão **NÃO EXECUTADOS**, e não podem ser inferidos de testes locais anteriores:

- DB lint pós-19;
- matriz RLS completa;
- reset/seed compatível;
- visitante, conta permanente, usuário anônimo, membro, moderador, administrador e service role;
- acervo, arte, rádio, comunidades, Inbox, Minha área e operação editorial;
- calçadas: registro, geometria privada, projeção pública, foto, ticket, moderação, prioridade, encaminhamento, resultado e memória.

Critério de repetição: novo ensaio começa de baseline limpo; não continuar o banco parcialmente alterado desta tentativa.

## 6. Plano cronológico da janela

### Pré-janela obrigatória

- resolver o drift e obter ensaio 19/19 aprovado;
- confirmar backup restaurável. PITR está desativado e a CLI não listou backup físico disponível;
- confirmar projeto Vercel canônico e equivalência das variáveis;
- obter autorização explícita separada para banco e domínio.

### T-30 — proteção e snapshot

1. congelar operação editorial e uploads;
2. registrar SHAs, deployments e aliases dos dois projetos Vercel;
3. gerar snapshot lógico e/ou backup físico e **testar restauração** em ambiente isolado;
4. registrar contagens sanitizadas, migrations e checksums do schema;
5. definir responsável por go/no-go e rollback.

### T-20 — migrations

1. confirmar zero sessões operacionais críticas;
2. aplicar a sequência reconciliada em transações controladas;
3. parar na primeira divergência;
4. nunca usar repair para esconder erro;
5. registrar duração e versão a cada passo.

### T-10 — banco, RLS, Storage e Auth

1. comparar schema esperado/real;
2. executar DB lint, advisors e matriz RLS;
3. validar buckets, MIME/tamanho, ticket, upload e confirmação;
4. validar cleanup em dry-run;
5. ativar Auth anônimo somente se o gate específico estiver aprovado e autorizado;
6. confirmar ausência de papel automático.

### T-0 — preview

Executar com contribuição marcada como demonstração e removê-la ao final:

- Home, Explorar e Participar;
- mapa, PMTiles, CORS e Range Requests;
- câmera e GPS em dispositivo real, sem declarar antes da execução;
- sessão anônima e conversão controlada;
- upload privado, confirmação e derivada sanitizada;
- Minha área e Caixa;
- no-leak HTTP/HTML/API;
- logs de runtime sem erro.

### Depois do preview

1. autorizar e executar a transferência atômica do domínio conforme o relatório Vercel;
2. testar apex, `www`, SSL e redirect 308;
3. manter o projeto antigo sem domínio como rollback;
4. somente então mudar readiness e liberar merge manual da PR;
5. monitorar deployment da `main`;
6. executar smoke de produção;
7. reverter domínio/deployment e restaurar banco se qualquer gate falhar.

## 7. Critérios de readiness

### Para `READY_FOR_CONTROLLED_REMOTE_MIGRATION`

- drift catalogado e correção revisada;
- ensaio limpo com 19/19 migrations;
- DB lint e RLS completos aprovados;
- backup restaurável comprovado;
- cleanup remoto aprovado;
- Auth anônimo documentado, protegido e autorizado;
- variáveis Vercel comparadas no painel;
- projeto/domínio com plano e rollback aprovados.

### Decisão atual

**NO_GO_REMOTE_INTEGRATION**

Motivos:

1. falha comprovada na segunda migration por drift de schema/histórico;
2. sequência 19/19 e regressões não concluídas;
3. PITR desativado e nenhum backup físico listado;
4. domínio ainda no projeto Vercel antigo;
5. Auth anônimo e cleanup remoto ainda sem gate operacional.

## Declarações

- PR #23 continua a única linha ativa.
- Nenhuma nova sprint foi aberta.
- Nenhum projeto remoto ou domínio foi criado.
- Nenhuma migration remota foi aplicada.
- Nenhum `migration repair` foi usado.
- Nenhum domínio foi movido.
- Nenhum merge foi executado.
- Nenhum deploy manual foi executado.
- Nenhum dado pessoal foi copiado para arquivo.
- Gate humano permanece **0/3**.
- Piloto público permanece **fechado**.
