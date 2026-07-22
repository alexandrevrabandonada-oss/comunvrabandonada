# Preflight remoto da PR #23

Data da verificação: 21 de julho de 2026
Escopo: auditoria somente leitura; nenhuma migration, configuração, contribuição, deploy ou merge foi executado.

## Decisão

**NO_GO_REMOTE_INTEGRATION**

A PR está compilada e o deployment de preview está `READY`, mas ainda não pode ser liberada para merge. Há dois bloqueadores independentes:

1. o Supabase remoto está 19 migrations locais atrás. As quatro migrations deste preflight não podem ser aplicadas isoladamente porque dependem de tabelas criadas por migrations anteriores ainda ausentes;
2. a PR e a `main` são implantadas pelo projeto Vercel `comunvrabandonada`, enquanto `comunsocial.online` está ligado ao projeto separado `comun-social`, atualmente em outro commit. Um merge na `main` não garante a atualização do domínio público.

O próximo estado possível é `READY_FOR_CONTROLLED_REMOTE_MIGRATION`, depois que esses dois bloqueadores forem resolvidos em uma janela controlada. `READY_TO_MERGE_AND_MONITOR` ainda não se aplica.

## 1. Snapshot remoto

### GitHub

| Item | Evidência |
|---|---|
| Repositório | `alexandrevrabandonada-oss/comunvrabandonada` |
| PR canônica | `#23`, aberta como draft |
| Branch | `codex/sprint-40-1-mobile-preview` |
| HEAD da PR | `0085178ec921030a96a4b4b64b8a6c1dc26ff916` |
| SHA atual de `main` | `a599d124a84c5542ec3a56052276024b9bd4854a` |
| Linha ativa | PR #23; nenhuma branch ou PR criada neste preflight |

### Vercel — projeto que recebe a PR

| Item | Evidência |
|---|---|
| Equipe | `alexandrevrabandonada-oss' projects` (`team_LBVwyK8FQMO7tA3hzVXXeumF`) |
| Projeto | `comunvrabandonada` (`prj_BNUDaIwZKzt7IQ1PZUjo8c6Ljc3X`) |
| Framework/runtime | Next.js; Node.js 24; raiz `.` |
| Branch de produção observada | `main` |
| Deployment de produção | `dpl_GnYtHEwaQvvwSgdZjvPufw2XFYuk` |
| URL do deployment de produção | `https://comunvrabandonada-ce72d4vig-alexandrevrabandonada-oss-projects.vercel.app` |
| SHA em produção nesse projeto | `a599d124a84c5542ec3a56052276024b9bd4854a` |
| Preview da PR | `dpl_GvvVBwntQD8LvJZZhhnrafrYfd9F` |
| URL do preview | `https://comunvrabandonada-ckvidoam3-alexandrevrabandonada-oss-projects.vercel.app` |
| Estado do preview | `READY`; build concluído sem erros |
| SHA do preview | `0085178ec921030a96a4b4b64b8a6c1dc26ff916` |
| Proteção | Vercel Authentication; navegação não autenticada redireciona para login |
| Domínios do projeto | aliases `*.vercel.app`; não inclui `comunsocial.online` |

### Vercel — projeto ligado ao domínio público

| Item | Evidência |
|---|---|
| Projeto | `comun-social` (`prj_cussCItqOwJYJ3ELKyKr6M35KrJj`) |
| Deployment público atual | `dpl_3PWgyGVUUyPBrdjdwR9kVfe5YLkG` |
| URL do deployment | `https://comun-social-9vm9axr4r-alexandrevrabandonada-oss-projects.vercel.app` |
| SHA implantado | `dc0a3a54f5d2589fd1365a09b9fbed585452668a` |
| Commit implantado | `feat: consolida arte dos territorios no acervo (#21)` |
| Domínios | `comunsocial.online`, `www.comunsocial.online` e aliases Vercel |
| DNS | domínio servido pela Vercel, mas a inspeção registra nameservers atuais da Hostinger diferentes dos nameservers Vercel sugeridos |

**Conclusão Vercel:** há duas linhas de produção. Antes do merge é necessário escolher um projeto canônico e provar que a `main` atualiza o projeto que detém `comunsocial.online`, sem criar domínio novo.

### Variáveis de ambiente

Somente nomes e escopos foram auditados; nenhum valor secreto foi registrado.

- Preview da PR: `NEXT_PUBLIC_VOLTA_REDONDA_PMTILES_URL`, `NEXT_PUBLIC_SIDEWALK_BASEMAP_PROVIDER`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` e `SUPABASE_SERVICE_ROLE_KEY`.
- Produção do projeto Git: variáveis Supabase, `NEXT_PUBLIC_SITE_URL`, `SUPABASE_PROJECT_ID`, `CRON_SECRET`, `COMUN_LOOKUP_HASH_SALT` e configuração R2.
- Produção do projeto do domínio: variáveis Supabase, `NEXT_PUBLIC_SITE_URL`, `SUPABASE_PROJECT_ID`, `CRON_SECRET`, `MEDIA_STORAGE_PROVIDER` e credencial administrativa legada.
- O host público da URL Supabase de produção identifica o projeto `nvmdszymrtacfehdynpg`.
- Os valores de Preview e Production não foram comparados porque permanecem cifrados para a credencial de auditoria. Antes da migração, comparar os valores no painel sem copiá-los para relatório ou terminal.

### Supabase

| Item | Evidência |
|---|---|
| Projeto vinculado | `nvmdszymrtacfehdynpg` |
| Nome exibido pela CLI | `nika` |
| Compatibilidade com Vercel | o project ref coincide com o host Supabase configurado em produção |
| Última sequência remota contínua | até `20260715021055` |
| Migration posterior remota | `20260720005353`, aplicada fora da sequência local restante |
| Drift | 19 migrations locais ainda ausentes no remoto |

## 2. Migration diff

### Cadeia ausente

O remoto não contém estas 19 migrations locais, em ordem:

1. `20260715025948_comun_field_access`
2. `20260715032613_comun_pauta_miniapps_circles`
3. `20260715151922_comun_relational_guards`
4. `20260715155802_comun_community_auth_profiles`
5. `20260715170058_comun_territorial_art_foundation`
6. `20260715174723_comun_artwork_storage_operations`
7. `20260715185344_community_radio_foundation`
8. `20260715192935_comun_central_experience_inbox`
9. `20260716000000_comun_sidewalk_vertical`
10. `20260716120000_comun_sidewalk_fk_fix`
11. `20260717013709_comun_editorial_operation`
12. `20260717022301_comun_operational_persona_roles`
13. `20260718031145_comun_operational_queue_pagination`
14. `20260719180751_comun_sidewalk_member_first_participation`
15. `20260719202300_comun_persistent_communities`
16. `20260720161117_comun_sidewalk_real_map`
17. `20260720185530_comun_sidewalk_forwardings`
18. `20260721155914_comun_sidewalk_quick_capture`
19. `20260721164415_comun_sidewalk_direct_private_upload`

Não é seguro selecionar apenas as quatro últimas. A primeira migration-alvo altera `comun_sidewalk_records`, criada em `20260716000000_comun_sidewalk_vertical`, que também está ausente.

### Diff das quatro migrations-alvo

| Migration | Estado remoto | Estruturas/efeito | RLS, grants e funções | Impacto e rollback |
|---|---|---|---|---|
| `20260720161117_comun_sidewalk_real_map.sql` | Ausente; `comun_sidewalk_records`, `comun_sidewalk_observations` e `comun_sidewalk_municipal_configs` não existem | Evolui registros com município, bairro, geometria privada/pública, origem/precisão, condição e encaminhamento; cria observações e configuração municipal; índices e conteúdo editorial inicial | Ativa RLS nas tabelas novas; acessos operacionais via backend/service role | DDL e seeds aditivos, mas dependentes da vertical anterior. Rollback preferencial por restauração de snapshot; não tratar como down migration trivial. |
| `20260720185530_comun_sidewalk_forwardings.sql` | Ausente; tabelas de encaminhamento e eventos não existem | Cria encaminhamentos, histórico de eventos e integrações com memória, inbox, prioridade, pauta, ação e território | RLS habilitada; escrita operacional server-side; grants de service role | Dependência ampla de migrations anteriores. Rollback por snapshot e redeploy anterior; preservar evidência de eventos se houver dados. |
| `20260721155914_comun_sidewalk_quick_capture.sql` | Ausente; colunas e índice não existem | Adiciona sinal anônimo, precisão privada, geometria sugerida, rua/bairro inferidos e risco geográfico; índice de limite | Policy `member_reads_own_sidewalk_records` para `authenticated`, isolada por `auth.uid()`; escrita continua no backend | Aditiva, mas depende de `comun_sidewalk_records`. Reversão por snapshot; remoção de colunas destruiria evidência capturada. |
| `20260721164415_comun_sidewalk_direct_private_upload.sql` | Ausente; `comun_sidewalk_uploads` e sua policy não existem | Cria autorização de upload em duas fases, validade de 10 minutos, estados, limites MIME/tamanho e índices de cleanup | RLS habilitada; dono autenticado lê somente seus tickets; escrita concedida ao service role; nenhuma leitura pública | Aditiva e dependente de registros. Rollback por desativação do fluxo, cleanup de objetos órfãos e restauração de snapshot. |

### Validação mínima após aplicação

- confirmar as 19 versões na tabela de migrations, sem reparo manual de histórico;
- validar tabelas, constraints, FKs, índices e seeds;
- executar lint do banco e matriz RLS;
- provar que visitante, usuário autenticado comum e sessão anônima não escrevem diretamente;
- provar isolamento por `auth.uid()` para registros e tickets;
- provar que geometria exata, precisão, payload, object key e original não entram em projeções públicas;
- confirmar que service role existe apenas no servidor.

### Tempo estimado

- snapshot/backup e checagem de restauração: 10–20 min;
- ensaio das 19 migrations em ambiente isolado: 15–30 min;
- aplicação controlada: 5–15 min, se o ensaio passar;
- schema, RLS, Storage e Auth: 30–60 min;
- preview funcional e no-leak: 30–60 min.

Reservar janela de 2 horas com responsável técnico disponível. Interromper na primeira divergência; não executar migrations parcialmente selecionadas.

## 3. Auth

### Estado observado

- A configuração remota de **Anonymous Sign-In não pôde ser confirmada** com acesso somente leitura disponível; não foi ativada.
- O código deriva `user.is_anonymous`, limita envios a 5 por hora e 30 por dia por `user.id` e grava `submitter_is_anonymous` apenas como sinal de auditoria.
- A migration declara explicitamente que anonimato não concede papel comunitário ou editorial.
- Não há atribuição automática de `comun_community_role_assignments` no fluxo de captura. Papéis continuam em tabela própria e são verificados separadamente.
- Sessões anônimas usam o papel Postgres `authenticated`; por isso as policies precisam também considerar o claim `is_anonymous` sempre que uma função for reservada a contas permanentes.
- A conversão futura deve preservar o mesmo usuário, conforme o fluxo oficial de vincular identidade, e nunca promover papel automaticamente.
- O Supabase não remove usuários anônimos automaticamente. É obrigatório definir retenção e rotina operacional antes da ativação.

### Gate antes de ativar

1. documentar estado atual, limites e CAPTCHA/Turnstile;
2. validar policies com JWT anônimo real em ambiente isolado;
3. confirmar 5/h e 30/d no backend e limites globais do Auth;
4. validar conversão para conta permanente sem mudança de autorização;
5. definir limpeza de usuários anônimos inativos e objetos órfãos;
6. confirmar que nenhum papel comunitário/editorial nasce do cadastro;
7. só então ativar Anonymous Sign-In e repetir o preview.

Referências oficiais: [Anonymous Sign-Ins](https://supabase.com/docs/guides/auth/auth-anonymous) e [segurança de Anonymous Sign-Ins](https://supabase.com/docs/guides/troubleshooting/security-of-anonymous-sign-ins-iOrGCL).

## 4. Storage

### Snapshot

Buckets remotos existentes:

- `comun-report-attachments`;
- `comun-public-safe-attachments`;
- `archive-private-originals`;
- `archive-public-derivatives`.

O fluxo de calçadas reutiliza `archive-private-originals`; não há bucket novo específico. O bucket está privado, aceita JPEG/PNG/WebP e possui limite de 31.457.280 bytes. A aplicação aplica limite de 30 MiB.

### Contrato auditado

- autorização server-side cria ticket para usuário, object key específico e validade operacional de 10 minutos;
- URL/token assinado autoriza upload apenas daquele objeto, sem tornar o bucket público;
- confirmação server-side baixa o objeto privado, valida conteúdo, tamanho e imagem antes de persistir o registro;
- policy de ticket permite ao papel `authenticated` apenas SELECT do próprio ticket por `auth.uid()`;
- não há service role no cliente; ela está cadastrada como variável server-side cifrada;
- originais permanecem privados e somente derivadas aprovadas podem ser públicas.

### Pendências

- a tabela de autorização ainda não existe remotamente, portanto upload e confirmação não podem ser testados no preview;
- o script de cleanup atual bloqueia explicitamente execução remota e serve apenas ao Supabase local;
- antes da ativação remota, implementar operacionalmente — sem ampliar o escopo da PR — uma rotina aprovada para tickets/objetos órfãos ou manter o fluxo desativado;
- confirmar a expiração efetiva do token assinado e alinhá-la à janela de 10 minutos do ticket;
- testar falhas entre upload, validação, criação do item e confirmação para evitar órfãos.

## 5. Vercel e PMTiles

- `main` produz deployment de produção no projeto Git `comunvrabandonada`.
- A PR possui preview `READY` no commit correto e o build não registrou erros.
- O domínio público está no projeto separado `comun-social`, em commit anterior; este é bloqueador de release.
- O preview contém nomes de variáveis específicas para provider e URL PMTiles, mas seus valores não foram expostos nem comparados.
- O artefato PMTiles pesado não está no Git. É necessário confirmar que a URL de Preview e Production aponta para artefato autorizado e imutável, com hash/proveniência correspondentes ao manifesto.
- Range Requests e limite/tamanho do PMTiles **não foram validados remotamente**, porque o preview exige Vercel Authentication.
- Com o Supabase ainda não migrado, rotas que consultam as novas tabelas devem falhar fechadas ou mostrar indisponibilidade; captura, Minha área e Caixa não podem ser consideradas funcionais.

## 6. Plano controlado de aplicação

1. **Backup/snapshot:** registrar horário, responsável, SHA, deployment, migrations e ponto de restauração do Supabase.
2. **Reconciliação Vercel:** escolher o projeto canônico; anexar `comunsocial.online` ao pipeline que recebe `main` ou configurar explicitamente o mesmo repositório/branch no projeto do domínio. Não criar domínio novo.
3. **Ensaio isolado:** aplicar toda a sequência de 19 migrations numa branch/clone do banco, nunca apenas as quatro últimas.
4. **Aplicar migrations:** janela controlada, ordem exata, interrupção na primeira falha.
5. **Validar schema/RLS:** diff pós-aplicação, DB lint, advisors, matriz visitante/conta/sessão anônima/admin.
6. **Validar Storage:** bucket privado, MIME/tamanho, upload assinado, confirmação server-side, expiração e cleanup.
7. **Configurar Auth anônimo:** somente após o gate documentado, limites e proteção antiabuso; nenhuma atribuição automática de papel.
8. **Testar preview:** liberar acesso restrito aos validadores, usar apenas uma contribuição marcada como demonstração e removê-la no final.
9. **Liberar merge:** somente com preview completo, projeto/domínio reconciliado e plano de rollback ensaiado.
10. **Monitorar deployment:** observar build, runtime, Auth, API, Storage, erros e latência.
11. **Smoke de produção:** Home, Explorar, Participar, mapa/Range, captura, GPS, sessão anônima, upload, confirmação, Minha área, Caixa e no-leak.
12. **Rollback:** interromper tráfego do fluxo novo, reimplantar `dpl_GnYtHEwaQvvwSgdZjvPufw2XFYuk` ou o último deployment canônico comprovado, restaurar snapshot/PITR se DDL/dados exigirem e remover objetos de demonstração.

## 7. Preview remoto

| Jornada | Resultado |
|---|---|
| Deployment/build | **PASS** — `READY`, commit correto, build sem erro |
| Home e Explorar | **NÃO VALIDADO** — preview protegido por login Vercel |
| Participar e mapa | **NÃO VALIDADO** — preview protegido; schema remoto incompatível |
| PMTiles e Range Requests | **NÃO VALIDADO** — resposta da proteção não prova Range do artefato |
| Câmera e GPS | **NÃO EXECUTADO** — nenhum dispositivo físico declarado |
| Sessão anônima | **NÃO EXECUTADO** — estado remoto de Auth não confirmado |
| Upload privado e confirmação | **BLOQUEADO** — tabela/policies ausentes remotamente |
| Minha área e Caixa | **BLOQUEADO** — migrations dependentes ausentes |
| No-leak remoto | **NÃO CONCLUÍDO** — build não substitui inspeção HTTP autenticada do fluxo |
| Contribuição de demonstração | **NÃO CRIADA** |

Não houve tráfego funcional suficiente para gerar logs de runtime do preview. O status `READY` comprova compilação/implantação, não prontidão operacional.

## 8. Gates para mudar a decisão

Para `READY_FOR_CONTROLLED_REMOTE_MIGRATION`:

- reconciliar projeto Vercel e domínio canônico;
- ensaiar as 19 migrations e provar rollback;
- confirmar configurações Auth/Storage e proteção antiabuso;
- definir cleanup remoto seguro;
- disponibilizar acesso protegido ao preview para validadores.

Para `READY_TO_MERGE_AND_MONITOR`:

- migrations, schema e RLS validados remotamente;
- Home, Explorar, Participar, mapa, PMTiles/Range e jornadas autenticadas aprovadas no preview;
- captura com sessão anônima, upload privado e confirmação aprovados com fixture removida;
- no-leak remoto aprovado;
- projeto do domínio comprovadamente ligado à `main` e ao deployment correto.

## Declarações finais

- PR #23 continua a única linha ativa.
- Nenhuma nova sprint foi aberta.
- Nenhuma branch ou PR foi criada.
- Nenhum domínio foi criado ou alterado.
- Nenhuma migration foi aplicada.
- Auth anônimo não foi ativado.
- Storage, R2 e Supabase remoto não foram alterados.
- Nenhum protocolo real foi criado.
- Nenhuma contribuição, nem mesmo fixture, foi enviada ao remoto.
- Nenhum merge ou deploy foi executado.
- Gate humano permanece **0/3**.
- Piloto público permanece **fechado**.
