# Escola — estratégia de recuperação e decisão pendente

Data de consulta: 08/10/2026. Base: `2151826f540cbc4ccf27ec413b28f9a6e98b821d`.
#523 continua draft em `cf0e8e41a084e073a728cca269a0dbc38683bfe1`:
Quality PASS, seis preflights School FAILURE, sem dispensa. Nenhum upgrade,
migration Production, alteração de flags/indexação, dump real ou restore real.

## Checkpoint confirmado

O corpo de #523 e `D:/COMUN-49H-QA/COMUN-ESCOLA-FECHAMENTO-20261008.md`
registram o acesso ao dashboard correto em outro perfil Chrome. A identidade
foi vinculada ao PRE por SHA256(JSON.stringify(projectRef)),
`63cba5e79fc964485eaa51763ce3daf9b5d7f16311d851fc49525ab212e101a2`.
O painel indica Free, sem backups; PITR e restore em novo projeto exigem
upgrade. O bloqueio deixou de ser somente acesso. Não presumimos inexistência
de backup externo que não tenha sido apresentado. A evidência sanitizada está
em `D:/COMUN-49H-QA/escola-provider-browser-evidence.json`.

## Opções e custos observados

| Opção               | Custo público atual em USD                                                                               | Requisito e limite                                                                                                                           |
| ------------------- | -------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| Lógica independente | Não exige upgrade para usar pg_dump; disco/off-site, egress e trabalho operacional precisam de orçamento | Snapshot DB, globals separados, chaves e serviços externos precisam de tratamento próprio; RPO é a frequência real da captura                |
| Pro + diário        | A partir de US$25/mês; crédito compute de US$10, suficiente para um Micro; retenção diária de sete dias  | Aguardar backup efetivo e provar restore; clone gera cobrança adicional de compute/disco; não cobre arquivos Storage                         |
| Pro + PITR          | Adicional aproximado US$100/200/400 por mês para 7/14/28 dias; exige pelo menos Small, US$15/mês         | Exemplo inferido de um Small: 25 + 15 − 10 + 100 ≈ US$130/mês, sem clone, excedentes, impostos ou câmbio; preço final depende da organização |

Free inclui 5 GB de egress; no Pro, 250 GB incluídos e excedente US$0,09/GB.
Não há preço total aprovado para armazenamento externo ou destino restaurado.
Projetos adicionais começam em US$10/mês, com recursos cobrados conforme uso.
Não confundir preço de branch com preço do clone. Nenhuma contratação feita.
Fontes: [preços oficiais](https://supabase.com/pricing),
[backups e PITR](https://supabase.com/docs/guides/platform/backups),
[restore em novo projeto](https://supabase.com/docs/guides/platform/clone-project).

## Cobertura necessária, sem alegação de recuperação total

| Camada               | Captura necessária                                                                                                          | Prova descartável / lacuna real                                                                                                                   |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| Schema e dados       | Todos os schemas não sistêmicos, relações, constraints, índices, sequences e large objects aplicáveis                       | Dump custom completo da fixture; catálogo e hashes por tabela comparados. Inventário real e objetos fora da fixture não comprovados               |
| Histórico e ledger   | `supabase_migrations` e `public.comun_schema_releases` com dados e hashes                                                   | Incluídos no mesmo dump do banco; não reinseridos por conveniência depois do restore                                                              |
| Segurança DB         | Owners, roles, memberships, grants/default privileges, RLS/FORCE, policies, funções/configurações e triggers                | Globals sem senhas separados; catálogo/roles/memberships e comportamento A/B comparados; capacidade real do leitor para dump integral não provada |
| Auth                 | Schema/dados, usuários, identidades e dependências; hash de senha e tokens tratados como segredo                            | Fixture contém usuários sintéticos. Login GoTrue, MFA, sessão e OAuth após restore: NOT_RUN                                                       |
| Storage DB           | Buckets, metadata, owners e policies                                                                                        | Restaurados e verificados no banco; não equivale ao conteúdo dos arquivos                                                                         |
| Storage bytes        | Arquivos/version IDs, hashes e vínculo com metadata                                                                         | Arquivo sintético cifrado separado e restaurado. Storage API e inventário real: NOT_RUN                                                           |
| Vault/criptografia   | Dependências e raiz de criptografia em custódia adequada                                                                    | Não há prova de recuperação de raiz Vault. Dump SQL sozinho não a resolve                                                                         |
| Configuração externa | Auth/JWT/SMTP/OAuth/hooks, secrets, API keys, URLs, Storage/S3, Edge Functions, Realtime, cron/webhooks, rede, DNS e Vercel | Inventário protegido e procedimento separados; nenhum secret capturado. Replay operacional completo: NOT_RUN                                      |

`pg_dump` não exporta roles de cluster; schemas selecionados não incluem
automaticamente suas dependências. O plano não usa dump somente das tabelas
Escola como recuperação de todo o projeto. Ver [PostgreSQL SQL dump](https://www.postgresql.org/docs/17/backup-dump.html)
e [pg_dump](https://www.postgresql.org/docs/17/app-pgdump.html).

O [guia Supabase CLI](https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore)
exige atenção a histórico e customizações Auth/Storage. A documentação distingue
restore lógico manual da cópia gerenciada da chave raiz. Não removemos grants,
owners ou erros para obter sucesso. Um projeto gerenciado já inicializado tem
roles e schemas existentes: o restore em cluster vazio deste ensaio NÃO prova
que o mesmo SQL funciona diretamente nesse destino. Proibido resolver colisões
com `--clean`, `--no-owner`, `--no-privileges` ou ignorar erros indiscriminadamente.

O clone gerenciado é uma cópia do banco, incluindo Auth e chave raiz; Storage
files, funções Edge e configurações de serviços ainda exigem trabalho separado.
Portanto, também não representa recuperação integral automática do produto.

## Procedimento preparado — captura real ainda não autorizada

Responsáveis humanos por backup, custódia de chave, restore e revisão:
**UNASSIGNED**. Nenhum nome ou aprovação inferidos. Proposta operacional:
backup diário, sete diários e quatro semanais, mais snapshot imediatamente
anterior à janela de schema; retenção de dados privados sujeita à decisão do
responsável. Isso é política proposta, não job instalado ou retenção contratada.
RPO alvo proposto 24h fora da janela; para schema, snapshot pré-janela validado.
RTO real não é inferido do tempo do laboratório.

1. Aprovar destino nominal, jurisdição/local, acesso restrito, armazenamento
   externo cifrado, orçamento e prazo de exclusão do ensaio real. Não usar uma
   pasta Git, CI artifact público, chat ou projeto desconhecido como destino.
2. Usar acesso existente aprovado. Confirmar source por allowlist/hash e
   `transaction_read_only=on`. Conexão via service/pgpass protegido, sem URL ou
   senha em argv/logs. Não redefinir senha nem criar privilégios nesta rodada.
3. Fazer dump binário consistente do banco e globals sem senhas. Modelo a
   revisar para execução: `PGSERVICE=comun-source-readonly`,
   `PGOPTIONS='-c default_transaction_read_only=on'`,
   `pg_dump --format=custom --lock-wait-timeout=5s`; globals:
   `pg_dumpall --roles-only --no-role-passwords`. Exportar todos os schemas
   necessários, sem omitir auth/private/history/ledger por conveniência.
4. O leitor real é postgres não superuser, enquanto a fixture usa supabase_admin
   para backup integral. Permissão de dump/auth/vault não demonstrada: qualquer
   acesso negado bloqueia, sem dump parcial ou `--enable-row-security` para
   mascará-lo. Inventariar extensões e versões, owner, encoding e collation.
5. Globals não compartilham automaticamente o snapshot MVCC do dump. Aprovar
   janela sem alterações de roles/configuração, comparar inventário antes/depois
   e rejeitar divergência. Não congelar writes ou alterar flags sem autorização.
6. Storage requer captura versionada e verificação de referências/hashes. DB e
   S3 não formam transação única. Sem versionamento/coerência demonstrados, o
   snapshot conjunto permanece parcial; não declarar ponto de recuperação completo.
7. Cifrar antes de persistir fora da área protegida; usar ferramenta revisada e
   chave em cofre/escrow separado. Checksums, identidade, horários, versões,
   cobertura e resultado em manifesto sanitizado. Verificar integridade após
   leitura do armazenamento, não apenas antes do upload.
8. Manter uma cópia off-site e testar acesso à chave por operador de recuperação
   distinto da origem. Não colocar chave junto ao backup sem proteção; DPAPI
   de um único Windows NÃO comprova escrow nem recuperação após perda do PC.

## Destino isolado e operação real que exigem decisão

Não existe destino real autorizado nominalmente. Operação proposta: ler de
Production **todos os dados do banco**, incluindo dados privados, Auth/hashes
de senha e ledger, e os arquivos Storage necessários; cifrar em repositório
privado aprovado; restaurar somente em novo cluster/projeto identificado e
restrito, nunca sobre Production. Definir operador, revisor, custódia de chave,
local/destino, prazo, custo e autorização dessa cópia antes de executar.

O destino deve impedir saída SMTP/OAuth/webhooks/cron/replicação antes de iniciar
serviços; restrição de acesso de entrada não prova bloqueio de egress. Garantir
isso é pré-condição, não promessa baseada no nome "isolado". Restaurar globals
e DB com fail-on-error, comparar catálogo/dados/history/ledger, verificar A/B,
anon/service-role, triggers e integridade. Reativar serviços somente no destino
com configuração de teste e sem endpoints Production. Validar Auth/Storage API
e leitura de conteúdo criptografado. Evidências públicas só têm hashes/status.

Interromper em destino incorreto/não vazio, ACL indevida, corrupção, leitura
parcial, papel faltante, diferença de catálogo/dados, perda de chave ou efeito
externo. Não executar restore in-place. Não fazer replay automático ou atualizar
fingerprints para acomodar drift. Nenhuma mutation real é autorizada por este texto.

## Ensaio reproduzível exclusivamente sintético

`node --test scripts/learning/recovery-disposable.node-test.mjs`.
Para SQL real local: preparar pasta externa com ACL exclusiva do operador e
executar `node scripts/learning/recovery-disposable.mjs D:/COMUN-RECOVERY-SYNTHETIC-20261008`.
Requer Windows DPAPI, Node 22, Docker e a imagem por digest do script. O harness
não aceita DB URL nem target remoto; recusa ambiente com credenciais Production.
Antes de cada escrita/remoção, confere label, run, imagem e network=none do
container criado pela execução. Não usa os containers locais preexistentes.

Dados são exclusivamente sintéticos, gerados sobre fixture de catálogo PR437
mais migration Escola imutável. Isso representa dependências DB da Escola,
não a totalidade do catálogo R1–R5/volume/dados/configuração do projeto real.
O ledger adicional tem identidade sintética, sem fingir ser release Production.
Backup AES-256-GCM fica fora do Git; chave protegida por DPAPI CurrentUser e ACL
externa. Origem é removida antes de reabrir o backup e restaurar em cluster novo.
Senha de role não exportada: provisionamento de login no destino é etapa separada.

Controles: archive adulterado rejeitado; roles ausentes fazem restore falhar
atomicamente; restore não sobrescreve destino não vazio; DB dump não materializa
arquivo Storage; restauração separada do arquivo confere seu hash. Comparação
de schema (só normaliza marcadores aleatórios pg_dump), hashes de todas as tabelas,
roles/memberships; A/B, anon, negação de RPC/escrita direta, trigger e RPC reais
no PostgreSQL restaurado. Não são mocks de banco. Login/Storage API e ensaio
humano continuam NOT_RUN neste ensaio de recuperação.

## Recomendação e gate

Recomendação para decisão: Pro + backup diário físico efetivo + restore em novo
projeto como caminho gerenciado para o banco, mantendo captura lógica independente
como segunda linha. PITR somente se o RPO aprovado exigir granularidade menor que
diária; não é pré-condição financeira automática deste pacote. Storage/configuração
externa requerem plano próprio em ambas as alternativas.

Pacote concreto gerenciado: aprovar orçamento/operadores/destino/cópia de dados;
upgrade por decisão humana; confirmar backups físicos realmente habilitados e
aguardar ponto válido pré-janela; revisar custo do clone; garantir isolamento de
efeitos externos; restaurar em projeto novo; verificar catálogo/Auth/Storage e
limites; registrar evidência; só então avaliar autorização específica de schema.
Upgrade sozinho não é prova de backup nem restauração. Nada disso foi contratado.

O ensaio lógico pode provar recuperação da fixture, mas **não libera a Escola**:
capacidade de captura real, Vault, Storage real, serviços externos, off-site/key
escrow e restore real continuam sem prova. Nenhuma dispensa dos seis preflights.
Estado: `ESCOLA_SYNTHETIC_RECOVERY_REVIEW_REAL_RECOVERY_BLOCKED`.

## Evidências de execução — resultados não transferidos

Os controles descritos acima são o contrato do harness. A certificação depende
explicitamente da execução e do hash do script, não desta descrição.

FAIL preservado: `school-1791507621689-3b1c9806`, script SHA-256
`b3e9b0ce25579a98ee9ea44b8cbab547811db56e575a8264c7af9897650ff095`.
Chamada da RPC Escola como anon derrubou o backend com signal 11 na imagem
pinada. Reproduziu a execução anterior. Sem OOM observado; não classificado
como flake nem como erro Production. Logs sintéticos privados preservados,
containers próprios removidos. Nenhuma chamada equivalente feita em Production.
O gate de negação da RPC exige permission denied, nunca aceita backend fechado.

FAIL preservado: `school-1791508045752-bacca349`, comparação inicial de dump.
Diagnóstico identificou ordem por collation nos registros, ordenação por OID das
roles de policies/default ACLs e árvore AND gerada por BETWEEN em CHECK legado.
O harness final preserva locale/encoding, ordena dados em C e canonicaliza apenas
conjuntos de roles/default ACLs. Não remove privilégios nem altera expressões.
Um teste negativo conserva diferenças de grants, policy, roles e CHECK.
A fixture sintética reinterpreta o CHECK legado usando pg_get_constraintdef
antes de estabelecer seu baseline; migrations e expectativas Production intactas.
Hashes brutos e SQL sintético local continuam preservados para revisão.

A restauração de globals mantém ALTER/grants/grantor integralmente. initdb usa
supabase_admin como bootstrap OID 10, igual à origem; somente sua CREATE ROLE
já executada é removida, com cardinalidade exata e identidade verificadas.
Isso não é um restore genérico em projeto Supabase inicializado.

Testes Node com dependências locais: 78 PASS, zero skipped, antes do novo teste
de canonicalização; seis testes específicos PASS depois da correção do harness.
A tentativa anterior sem dependências teve 64 PASS e dois arquivos BLOCKED por
@playwright/test/js-yaml ausentes; não foi contabilizada como suite verde.
Prova SQL final e estado de restauração devem constar no complemento abaixo.
