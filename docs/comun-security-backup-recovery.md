# Backup, recuperação e continuidade do COMUN

## Camadas

1. **Código e schema.** Git, migrations forward-only, checksums, manifests e
   release ledger. Um checkout limpo sobe Supabase local e reconstrói o schema.
2. **Banco de aplicação.** `pg_dump` custom de `public` e do ledger
   `supabase_migrations`, criado em diretório efêmero com permissão restrita. O
   dump não vai para log, artifact, repositório ou serviço externo. `auth`,
   `storage`, `vault`, `realtime` e outros schemas internos do provedor não são
   declarados como parte desse backup.
3. **Storage.** Relações da aplicação são preservadas em `public`; buckets e
   policies do Supabase são inventariados separadamente, e os objetos físicos
   do provedor ativo são baixados para workspace efêmero e verificados. O
   artifact contém somente contagem, faixa de tamanho, MIME agregado e checksum
   de conjunto sem object keys. Como as credenciais R2 de produção são
   sensíveis e não legíveis após a criação, o ensaio remoto roda dentro do
   runtime Vercel por um endpoint interno POST. A chamada exige simultaneamente
   o bearer do scheduler, HMAC com a service role, timestamp curto e namespace
   sintético; nenhum desses materiais aparece na resposta.
4. **Auth.** Senhas, tokens, sessões, identidades, e-mails e MFA não são
   exportados. A recuperação depende da capacidade nativa do Supabase Auth
   realmente contratada, além de reconstrução dos perfis `public`, invalidação
   de sessões e reautenticação. O restore usa identidades-sombra sintéticas
   para validar FKs; a capacidade ausente no plano atual permanece blocker.

O dump allowlisted é um backup integral do banco da aplicação e de seu ledger,
não um backup integral da plataforma Supabase. Essa distinção deve aparecer em
toda evidência.

## Metas V1

As metas são compromissos operacionais, não garantias jurídicas nem promessa
melhor que a infraestrutura disponível.

| Superfície                            | Meta     | Medição aceita                                           | Margem / blocker                                                           |
| ------------------------------------- | -------- | -------------------------------------------------------- | -------------------------------------------------------------------------- |
| RPO do banco da aplicação             | até 24 h | idade do último backup remoto verificado                 | bloqueia se não houver run verde nas últimas 24 h                          |
| RPO do Storage                        | até 24 h | idade do último inventário físico verificado             | R2 precisa estar acessível ao runner; metadata isolada não basta           |
| RTO leitura pública                   | 60 min   | rollback/smoke do deployment anterior                    | depende de deployment anterior `READY` e schema compatível                 |
| RTO autenticação                      | 4 h      | estratégia do provedor + reautenticação sintética        | capacidade nativa do plano deve ser registrada, nunca presumida            |
| RTO contribuição                      | 4 h      | restore do banco, Storage e smoke negativo               | contribuição pausa de forma fechada enquanto Auth/Storage estiver inseguro |
| RTO operação administrativa           | 4 h      | login sintético e Central Operacional no restore/Preview | requer pelo menos duas identidades operacionais capazes                    |
| RTO recuperação integral da aplicação | 8 h      | duração do ensaio de banco + Storage + deploy            | não inclui recuperação de serviços internos do provedor                    |

O artifact remoto registra o valor medido por faixa e a idade da evidência. Se
o plano atual não oferecer uma capacidade necessária, o resultado é
`COMUN_SECURITY_RESILIENCE_BLOCKED_PROVIDER_CAPABILITY`; nenhum plano
financeiro é alterado automaticamente.

A geração de um envelope novo não renova a observação do contrato do provedor.
O checkpoint 47.6A registra historicamente o plano Free e o limite de arquivo
do Storage; ele não comprova o plano atual, backups disponíveis, PITR ou uma
restauração de Auth. A auditoria marca essas capacidades atuais como não
verificadas e mantém a referência histórica separada. O coletor aceita apenas
o contrato de capacidade bloqueada atualmente implementado: arquivo ausente,
JSON inválido ou resultado desconhecido bloqueiam a agregação com erro. Oito
ensaios verdes podem comprovar recuperação isolada, mas não promovem backup
efêmero a ponto de recuperação durável nem liberam o domínio de segurança.

## Procedimento remoto

1. confirmar SHA, project ref allowlisted e origem somente leitura;
2. preparar cleanup e espaço efêmero;
3. criar dump sem stdout e inventário agregado separado;
4. iniciar Postgres descartável, criar somente stubs de Auth e restaurar;
5. comparar contagens, catálogo, RLS, constraints, índices e FKs públicas;
6. executar no-leak e smoke de Preview;
7. executar o restore físico no runtime que já possui as credenciais sensíveis,
   sem copiá-las para o runner;
8. destruir banco, dump, objetos sintéticos e arquivos de ambiente no `finally`;
9. publicar somente envelopes sanitizados.

Nunca restaurar sobre produção. Um restore real do projeto Supabase continua
sendo ação destrutiva e exige gate específico.

### Pós-condição dos objetos sintéticos no restore CLI

O recorte #568 exige que a limpeza seja concluída antes de publicar evidência
verde. A verificação complementar requer também observação independente de
ausência após a exclusão de cada objeto sintético: `HeadObject` com HTTP 404
no R2 ou listagem de nome exato na pasta correspondente do Storage local.
Se restar um objeto, se a leitura falhar ou se a listagem for ambígua ou
incompleta, o sucesso é bloqueado por
`COMUN_STORAGE_DELETE_POSTFLIGHT_FAILED`, sem incluir detalhes privados
nas mensagens de erro ou emitir envelope verde.

Isso comprova somente pós-condições para objetos sintéticos do ensaio.
Não é prova de recuperação real de dados do usuário, de Auth ou de PITR.
Testes automatizados com mocks não substituem ensaio remoto independente.

## Transição de credencial do scheduler

Uma divergência entre o bearer guardado no GitHub e o runtime não autoriza
substituição direta. A transição operacional é aditiva:

1. preservar `CRON_SECRET`;
2. instalar o mesmo material já protegido no GitHub como `CRON_SECRET_NEXT`,
   sem imprimi-lo;
3. aceitar ambas as chaves com comparação constante nos endpoints internos;
4. redeployar sem trocar tráfego manualmente;
5. comprovar scheduler e ensaio de recuperação com a chave nova;
6. manter a chave anterior até uma janela posterior de revogação específica.

O modo `dual-key` do workflow executa somente os passos 2 a 4 e publica um
marcador sanitizado. Ele não remove a chave anterior. A futura revogação é uma
operação separada e não faz parte deste tijolo.

## Rollback

Migrations usam contenção, rollback transacional antes do commit, correção
forward-only, feature flag e reconciliação. Deployments voltam a um artifact
Vercel anterior somente quando o schema continua compatível. O ensaio usa
Preview/ambiente isolado; produção não recebe tráfego de teste.

Comandos operacionais, executados apenas por workflow com secrets protegidas:

```text
vercel inspect <deployment-anterior>
vercel rollback <deployment-anterior>
npm run health:production
npm run smoke:no-leak-http
```

Nenhum comando contendo credencial é documentado.

## Continuidade de pessoas

Cada execução possui um papel primário e um substituto: operação, segurança e
publicação não podem depender da memória ou da sessão de uma única pessoa. O
substituto precisa conseguir, a partir do checkout e dos sistemas responsáveis:

1. localizar a evidência sanitizada e o último SHA;
2. executar preflight, backup, restore e smoke sem receber segredo por chat;
3. conter um incidente e assumir a Central Operacional;
4. promover uma correção verde ou manter o tráfego no artifact anterior;
5. encerrar e registrar a retrospectiva.

Credenciais permanecem no GitHub, Vercel, Supabase e provedor de Storage; o
runbook registra somente o sistema responsável e o estado.

## M7.E — ensaio externo cifrado sem dados reais

O harness `scripts/security/rehearse-offsite-encrypted-recovery.mjs` comprova
somente o percurso sintético. Usa age v1.3.2 oficial, banco source/restore próprios
sem rede, imagem fixada, dump custom cifrado por stream e arquivo externo privado.
Não admite URL de origem, modo remoto, chave real ou resultado de backup real.

```text
node scripts/security/rehearse-offsite-encrypted-recovery.mjs prepare --root <diretorio-externo-absoluto> --age <age-absoluto-verificado> --keygen <age-keygen-absoluto-verificado>
node scripts/security/rehearse-offsite-encrypted-recovery.mjs verify --directory <diretorio-retornado> --downloaded <cifra-baixada-absoluta> --age <age-absoluto-verificado>
```

Entre as etapas, enviar somente `synthetic.dump.age` e baixar o mesmo arquivo
por acesso autenticado ao destino privado. Nunca enviar `synthetic-identity.txt`;
é uma identidade efêmera, removida após verificação. O recibo registra hashes,
duas linhas sintéticas, rejeição de corrupção e ausência dos containers. Não
persistir dump decifrado: a restauração passa por pipe para o banco descartável,
com transação única e verificação do processo de decifragem e do restore.

A chave real de recuperação é separada desse ensaio, tem custódia humana em
gerenciador de senhas e não deve ser versionada ou colocada junto da cópia.
A presença de pasta/arquivo sintético no Drive não comprova cópia durável dos
dados reais. O executor real ainda exige acesso configurado à origem protegida,
TLS verificado, alvo allowlisted, somente leitura e transporte privado; não
buscar/expor chaves, abrir permissões ou usar artifacts/logs como ponte.

### Preflight explícito da origem (M7.E)

`scripts/security/preflight-recovery-source.mjs --config <arquivo-absoluto>`
valida o arquivo privado e executa somente uma consulta de dois booleanos
dentro de `BEGIN READ ONLY`/`ROLLBACK`: transação read-only e PostgreSQL 17+.
TLS do cliente ao Session pooler é obrigatório por libpq `verify-full` com CA
fixada. `pg_stat_ssl` no servidor mede outro trecho (pooler ao backend), portanto
não comprova nem refuta o TLS do cliente. Não lê tabelas da aplicação,
não exporta dados, não restaura e não redefine credenciais. O comando não é
agendado e não faz retries; executar novamente somente após mudança relevante.

O alvo é o Session pooler exato conferido no painel do projeto, porta 5432.
URLs de outro projeto, overrides por query/fragmento, placeholders e variáveis
desconhecidas/duplicadas são rejeitados antes da rede. A CA versionada tem hash
fixado; `verify-full` e `default_transaction_read_only=on` não são opcionais.
O caminho de CA informado no arquivo não substitui a CA fixada pelo executor.
A imagem PostgreSQL é fixada pelo ID existente, sem pull; a senha passa apenas
por ambiente, nunca por argumentos ou saída. O container cliente não monta o
arquivo de configuração, usa filesystem somente leitura e não recebe capabilities.
`PGOPTIONS` é apenas defesa adicional: no ensaio real o pooler não encaminhou
essa opção inicial, por isso a transação explícita é obrigatória e seu estado
é conferido na própria consulta. O Docker local é parte da fronteira confiável: seu administrador ainda pode
inspecionar o ambiente do processo/container durante a execução.

Saída é um envelope categórico `SOURCE_CONNECTIVITY_ONLY_NOT_BACKUP`, incluindo
`backupVerified=false` mesmo quando a conexão passa. Erros do provedor, URLs,
senhas e exceções de filesystem não são impressos. Configuração precisa conter
`SUPABASE_PROJECT_REF`, `PGSSLMODE=verify-full` e
`PGOPTIONS=-c default_transaction_read_only=on`, além da conexão privada.

Readback da origem: o humano informou não possuir a senha do banco. Endereço,
usuário, porta e banco foram comparados ao painel; a última tentativa anterior
retornou autenticação recusada. Não repetir com a mesma credencial. Redefinição
não foi autorizada nem executada; exige análise de dependências e execução humana
coordenada. Testes locais de contrato não validam a senha ou a conexão remota.

Na janela posteriormente autorizada pelo humano, a senha foi redefinida por ele.
A conexão real passou com certificado válido e transação explicitamente read-only,
tanto no cliente Node quanto no preflight Docker corrigido. Secrets existentes
do GitHub e a variável sensível de conexão de Production foram atualizados sem
leitura pública de valores. O deployment autorizado reutiliza somente o commit
de Production `242f19cd`; a PR #572 permanece separada. Esse acesso comprovado
ainda não representa exportação real, restore ou backup durável.

### Complemento de proprietários e ACLs — M7.E

A cópia real de dados foi seguida por um archive custom **schema-only**, sem
`--no-owner`/`--no-acl`, dos mesmos schemas. Não reexporta linhas. Ambos os
archives são cifrados por stream antes de persistência, enviados a destino
externo owner-only, baixados e verificados por checksum. O catálogo normalizado
de ACLs também é cifrado e mantido separado da chave. Auth, Storage, senhas de
papéis e dados internos do provedor não fazem parte desses arquivos.

`scripts/security/recovery-acl-catalog.sql` lê somente metadata: proprietários,
concedentes/destinatários, privilégios/opções de repasse, ACLs de coluna e
privilégios padrão dos schemas permitidos. Arrays ACL vazios representam nenhuma
concessão; não são substituídos pelos defaults. Sequências usam `acldefault('s',
owner)`: `S` maiúsculo designa servidor estrangeiro e produz uma comparação errada.

`recovery-acl-contract.mjs` compara catálogos por conteúdo canônico, rejeitando
campos extras, duplicatas e diferenças reais. O plano offline admite apenas
reposição de concessões ausentes, emitidas pelo proprietário, em schema ou
sequência. Bloqueia grants extras, mudança de dono/defaults, outros tipos de
objeto e identidades SQL inválidas. Não conecta nem executa SQL. Seu consumidor
deve confirmar owner/isolamento do laboratório e comparar **todo** o catálogo
novamente após executar o plano. Nunca aplicar esse plano na origem/Production.

O ensaio real usou archive de schema/proprietários/ACLs para pre/post-data e o
archive cifrado original para data. Papéis ausentes foram stubs NOLOGIN no banco
descartável; isso não clona atributos globais, memberships ou credenciais.
O catálogo coincidiu em 3.564 objetos e seis entradas de privilégios padrão.
Foi necessário repor no laboratório um USAGE de schema registrado na origem,
omitido pelo archive por pressupor o baseline do banco novo. Nenhum GRANT/REVOKE
foi executado remotamente. Oito probes SQL sem identidade em tabelas reservadas,
com anon/authenticated, foram negados ou retornaram zero linhas. Não são prova
de login, JWT revogado, autorização positiva ou sessão Auth recuperada.

As 239 tabelas/33.493 linhas foram conferidas pelo checksum de contagens do
mesmo ponto original, encadeado ao hash do dump cifrado. A origem viva tinha
três linhas adicionais em uma tabela; essa divergência foi preservada, não
apagada ou convertida em igualdade. Comparar um snapshot imutável à origem em
movimento não mede a fidelidade daquele ponto. O manifesto novo registra o
checksum canônico portátil para verificações futuras.

Prova sintética reproduzível, em Docker com imagem existente fixada e sem rede:

```text
npm run security:test
npm run security:acl-rehearsal
```

O segundo comando requer a imagem indicada pelo harness já carregada. Testa
PostgreSQL real: ACL vazia, concessão de coluna, repasse, defaults e replay mínimo
seguido de igualdade integral; não usa dados reais. Containers próprios são
removidos e sua ausência é verificada, inclusive em falha. Falhas iniciais do
catálogo e do restore foram preservadas. O diagnóstico cifrado antigo com o
default incorreto foi marcado obsoleto; somente o catálogo v2 é referência ativa.

Permanecem separados: atributos/memberships globais de papéis, recuperação nativa
de Auth, ensaio autenticado completo contra o restore, bytes do Storage e RPO
contínuo. Correspondência de ACLs e estrutura RLS não certifica essas superfícies.
