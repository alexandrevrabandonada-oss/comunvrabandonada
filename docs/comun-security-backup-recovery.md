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
   de conjunto sem object keys.
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

## Procedimento remoto

1. confirmar SHA, project ref allowlisted e origem somente leitura;
2. preparar cleanup e espaço efêmero;
3. criar dump sem stdout e inventário agregado separado;
4. iniciar Postgres descartável, criar somente stubs de Auth e restaurar;
5. comparar contagens, catálogo, RLS, constraints, índices e FKs públicas;
6. executar no-leak e smoke de Preview;
7. destruir banco, dump, objetos sintéticos e arquivos de ambiente no `finally`;
8. publicar somente envelopes sanitizados.

Nunca restaurar sobre produção. Um restore real do projeto Supabase continua
sendo ação destrutiva e exige gate específico.

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
