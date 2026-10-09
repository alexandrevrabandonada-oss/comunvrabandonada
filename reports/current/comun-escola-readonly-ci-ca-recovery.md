# Escola: recuperação privada e certificação pós-merge — 09/10/2026

Base: `041f6b17a49286249fb8290428b7422695a87937`, merge normal do #535.
Tree: `339bef6eecad5bffbdd4024ad5360ecc27fcf11f`, igual à candidata revisada.

## Publicação da correção TLS

PASS: #535 passou 26 checks; 66 SKIPPED, nenhum contado como PASS. Quality
`37877356746` passou; CI do evento ready-for-review `37880324210` também.
Deploy automático Git/main `dpl_BTQnpZUjwDAfJUvs8JrypKpHs9iz` READY, aliases sem
erro; GitHub Deployment `6952420162` Production/success no merge SHA. Sete smokes
GET-only passaram, incluindo SHA servido, quatro páginas HTTP200, Range206 e
www308. Isso não certifica todas as jornadas.

FAIL pós-merge: quatro checks, com três causas/lanes distintas:

- Quality `37880515663`: captura read-only bloqueada antes dos controles SQL.
- Civic Graph `37880515656`: Consistência falha com
  `SELF_SIGNED_CERT_IN_CHAIN`; Classificação propaga corretamente esse bloqueio.
- Core Journeys `37880515686`: 33 testes passaram; duas execuções de Participar
  não navegaram em cinco segundos. Três tentativas locais Chromium navegaram
  corretamente; causa remota ainda UNPROVEN. Sem alteração de UI, timeout ou
  expectativa; não classificar como flake encerrado.

## Correção focal de CI

A URL estrita renovada pede `verify-full`. Os scripts Node de CI não carregam a
CA Supabase, ao contrário dos leitores corrigidos no #535. Reprodução real:
cliente padrão retorna `SELF_SIGNED_CERT_IN_CHAIN`; CA oficial permite executar
o mesmo verificador Quality em `BEGIN READ ONLY`, controles íntegros e ROLLBACK.

Este patch acrescenta a CA pública oficial e `NODE_EXTRA_CA_CERTS` somente aos
dois passos de inspeção afetados. Nenhum secret, grant, SQL, migration, manifest,
flag, expectativa, fingerprint ou configuração Production muda. Não desabilita
verificação de certificado/hostname. O certificado DER coincide com o já fixado
no leitor server-only; fingerprint SHA256
`80:70:25:AD:50:D4:ED:21:9D:2C:9C:7D:29:9C:00:4F:82:4E:B0:0C:F7:F6:5A:FE:F6:07:D0:7B:72:E6:CA:FA`.

PASS real local: scripts Quality e Civic exatos, carregando a CA no início do
processo, encerraram com código zero. Quality `COMUN_QUALITY_REMOTE_READ_ONLY_GREEN`;
Civic `consistent`, 15 agregados, um finding informativo, nenhum crítico.
Captura estritamente read-only; nenhum schema/history/ledger/business write.
Isso não substitui nova prova remota do candidato nem resolve Core Journeys.

PASS: 32 regressões Node em container Linux isolado, incluindo cinco novas de
certificado/escopo/read-only, Quality e 48.2-A. Imagem Node22.19 pinned por digest
`4a4884e8a44826194dff92ba316264f392056cbe243dcc9fd3551e71cea02b90`, sem rede/credenciais
Production; fonte de ensaio SHA256
`22936477a365b175bbfb71fbf9d1bff99c389623ebcb48ce78fcd3c1088280fa`.
No Windows, 48.2-A bloqueou no cleanup `EBUSY` e dois mocks POSIX de performance
não encontraram seus executáveis. Esses resultados foram preservados; não
alteramos os testes. O PASS Linux demonstra o contrato no ambiente adequado,
sem declarar o ambiente Windows corrigido. Vitest da execução ampla não chegou
a iniciar após as falhas Windows: NOT_RUN para esse comando nesta rodada.
Execução separada `vitest run lib/quality-performance.test.ts lib/comun-pwa.test.ts
--maxWorkers=2`: quatro testes em dois arquivos PASS.

## Recuperação real: cobertura e limites

PASS parcial: banco/roles cifrados, reabertos e restaurados offline com suplemento
GraphQL capturado read-only. 278 tabelas; payloads de 277 COPY e sequences iguais;
runner, ledgers e políticas conferem. 35 tabelas privadas continuam inacessíveis
diretamente a anon/authenticated. Original dump preservado.

PASS parcial Storage: 2.582 objetos, 357.014.118 bytes capturados por GET, cifrados
AES-256-GCM e restaurados como arquivos; SHA256/MD5 conferem; zero temporários em
claro restantes. Cópia privada no Drive, quatro partes recompostas após download,
ZIP SHA256 `3b5d0a28092ff9ea6ef2b8735b00f1b21dff1289d47a5c3d2453b3e956e689e2`.
Nenhuma chave, nome de objeto ou dado privado integra Git/artifacts públicos.

PASS parcial Auth: segunda cópia offline leu os seis usuários restaurados via
API pinned; identidades conferem. Login de usuário sintético, leitura própria,
recusa de senha incorreta/admin anônimo e limpeza passaram. Nenhum usuário real
foi usado para login; nenhum e-mail enviado. OAuth/SMTP/configuração externa
NOT_RUN. Credenciais da API são sintéticas; namespace sem rede externa ou portas.

Primeiro ensaio Storage API BLOCKED: a imagem `storage-api:v1.72.1`, digest
`105a2584129c9600aebed6f5ac49ca4371c92b996ecd1af7179750333e9e2120`, contém migrations
até 0067. O banco restaurado contém 0072 `drop-bucketid-objname-index`; o servidor
recusa iniciar com `Migration drop-bucketid-objname-index not found`. Zero arquivos
restaurados por esse servidor. Não modificamos history/hashes nem liberamos refresh
para acomodar a diferença. A evidência original desse bloqueio foi preservada.

PASS no ensaio posterior: `storage-api:v1.80.2`, source commit
`db42280506a07a165376219b2d6ac7bc92ccdfcc`, imagem pinned por digest
`95b217a9c59e0ac06c6dcb539df3189a1668a2445fb43dbf29660d6968ffd7d2`,
reconhece a cadeia capturada. Freeze em 0072; refresh desabilitado. Todos os
2.582 objetos foram restaurados no backend isolado e lidos pela API com hashes
iguais; 863 acessos anônimos a objetos privados foram recusados. Metadata antes
e depois idêntica; history completo com 73 entradas (0–72) inalterado, sem 0073.
Nenhum grant foi ampliado. Isso prova bytes/API e recusa anônima; não certifica
todas as políticas por usuário nem configurações externas do projeto.

Uma interrupção do executor Docker encerrou o primeiro ensaio v1.80.2 após 643
readbacks, sem OOM informado; causa raiz UNPROVEN. Logs e resultado parcial foram
preservados. Uma retomada limitada, apenas dos containers desta execução,
revalidou todos os arquivos, mantendo operações sequenciais e sem sobrescrever
arquivos existentes válidos. O PASS posterior não apaga a interrupção.

Evidência sanitizada local: `offline-storage-v1802-resume-api-proof.json`, SHA256
`b9e485b34ae127dc2041781215b33c2893d2428ae3cd54ac28508c9abc34c62c`.
Auth login/negative/cleanup: SHA256
`2a2de105ca67e801f287c7cdf828fb0d474e317937ff39b4b4acfc28b52788dc`.
As provas originais e os backups privados ficam fora do Git/artifacts públicos.

BLOCKED: custódia da chave independente deste perfil Windows; equivalência
canônica estrita de CHECK reagrupado no round-trip; configuração externa.
O crash supautils anterior permanece separado/aberto. Nenhum PASS de
outra instância encerra esses findings. Backup lógico não é recuperação integral.

Nova captura após merge confirmou PRE, cinco ledgers aceitos, ledger Escola
ABSENT, zero findings e fingerprints runner/canonical anteriores intactos.
GET-only smokes SHA256
`1aa00e088b604252d0ea8eaa0fc1aad37c6b001eea7e7f4ec80134691108e334`.

NOT_RUN: migration Escola Production. #523 continua separado/draft com seis
preflights obrigatórios; flags e indexação intactas. Manifest/migration Escola
continuam byte-identical aos blobs Git aceitos. Nenhum upgrade ou recurso pago.

Não realizar outra integração enquanto a certificação pós-merge estiver bloqueada.
Este pacote fica draft/revisável. Escola não liberada; V1 não concluída.

## Retomada e diagnóstico focal — 09/10/2026

PASS no checkpoint `e70ab6af8cf90be5f289dc54100562130c409c5d`: 19 workflows
pull_request completed/success. COST-02 run `37882458922`, job `113664971668`,
registrou `COMUN_COST_02_PASS:checkpoint-fresh`. Preview Git
`dpl_GWz6Ps6YodWanEYaq6Tshep9soeG` READY com metadata do SHA exato; nenhum erro
de alias. Quality `37882459121`, Civic `37882459020` e Core PR `37882459127`
verdes. Seus jobs pós-merge SKIPPED não certificam main nem encerram a falha
Core `37880515686` (33 PASS/2 FAIL).

O executor voltou a responder após abrir nova sessão no Codex e usar cmd. A
unidade D: está indisponível nesta sessão: sem filesystem, tamanho zero; os
worktrees, provas privadas e chave DPAPI anteriores não podem ser acessados.
Não remontamos, formatamos ou recriamos essa unidade. Busca limitada em pastas
de trabalho de C:, sem ler conteúdo dos arquivos, não encontrou a chave. Isso
não prova perda definitiva. Requisito externo: reconectar a origem ou informar
a cópia preservada; nunca enviar a chave/senha ao chat.

Cópia isolada da branch criada em C:, preservando a árvore original. A
instalação ampla foi interrompida após diagnóstico de espaço limitado; apenas
node_modules incompleto criado nesta execução foi removido, com caminho e
ausência de symlink verificados. Nenhum arquivo preexistente foi limpo.

Novo harness no commit `49f82ef5ed8268b9eff1e4718a0bd456de14bead` usa CI existente
para navegar no main servido exato `041f6b17`, sem credenciais Production,
contextos novos, service workers bloqueados e todas as requisições fora de
GET/HEAD recusadas. Preserva timeout original de cinco segundos. Essa diferença
de isolamento é explícita: o diagnóstico não substitui o gate pós-merge.
Artefatos contêm somente contagens, tempos, estados e SHAs; nenhuma sessão,
cookie, screenshot privado ou payload de banco.

Primeira run do harness `37943118942`, job `113862338934`: FAIL na formatação,
antes do navegador; jornada NOT_RUN. O candidato seguinte formata o arquivo,
fixa Prettier 3.9.6 e cria envelope NOT_RUN antes das dependências para preservar
diagnósticos de setup. Não amplia timeout nem transforma falha funcional em
sucesso. Syntax/Prettier/diff-check locais são gates focais; nova execução remota
continua independente.

Supabase MCP recusou `get_project` por falta de permissão. Não tentamos SQL por
esse conector sem identidade comprovada, nem enviamos backups/chaves ao CI.
Backup cifrado no Drive permanece evidência histórica válida de ciphertext;
restauração independente atual está BLOCKED sem a chave. CHECK/configuração
externa e crash supautils permanecem abertos. Migration Escola NOT_RUN; nenhum
gate, fingerprint, flag ou expectativa foi relaxado.

PostgreSQL documenta que `pg_get_constraintdef` reconstrói SQL a partir do
catálogo, sem preservar necessariamente o texto original. Isso sustenta a
hipótese de deparse, mas não prova por si só equivalência do restore real:
[documentação PostgreSQL 17](https://www.postgresql.org/docs/17/functions-info.html).

## Retomada em E: — 09/10/2026

A unidade E: foi autorizada e a pasta de recuperação recebeu ACL exclusiva do usuário Windows. A árvore original C: e os containers anteriores foram preservados. Dois exports de containers parados, sem mounts/portas, foram criptografados com AES-256-GCM e verificados por descriptografia, tag e hash do plaintext. Banco: ciphertext SHA-256 4f7963bcdb0ca15f710efcd4f710f8b5c0e50699dab837f043e64ae16f8c5efc (1.546.809.892 bytes). Storage: f321a5c5dc43176bccb76beb4e3e47ae13022181ebdb77a57f1593b8158c83db (1.299.296.804 bytes). Os arquivos privados permanecem fora do Git. Essa preservação não é nova captura Production nem certificação de restore. A nova chave DPAPI não recupera a chave antiga ausente em D:; custódia independente permanece BLOCKED.

No checkpoint ec882ef05340060c3c4db9bfe9a268ce0c4614d0, a run 37956953532 ultrapassou setup/formatação e falhou na navegação. A reprodução local identificou uma asserção introduzida no diagnóstico: o href esperado incluía experiencia=app-v2, enquanto o código de main e o link servido usam /comun/pautas. O gate original não exige esse parâmetro. Corrigido somente o diagnóstico e adicionados estágio/categoria sanitizados de falha; timeout, navegação, heading e ausência de diálogo permanecem.

Diagnóstico local Chromium na árvore modificada: cinco contextos frescos PASS; viewport efetivo 1280×800 em todos, conforme override do teste original; served SHA 041f6b17a49286249fb8290428b7422695a87937; dez requisições não GET/HEAD recusadas; zero requests de escrita executadas e zero browser errors. Artefato sanitizado SHA-256 24cf3506afa97f60d4ced7aa334dbc3daece477b587e769e01b952ec28c85500. Este resultado não certifica aparelhos móveis reais, PWA ou a run pós-merge original: service workers foram bloqueados para interceptação de escrita e originalPostmergeGateCertified=false. Prova remota da correção ainda PENDING.

Migration e manifest Escola, seis preflights, flags e indexação permanecem inalterados. Zero migration/DDL/DML Production nesta retomada. Recuperação integral e liberação da Escola continuam BLOCKED.

## Provas de preservação em E: — 09/10/2026

Dois exports privados AES-256-GCM foram descriptografados/verificados e importados em containers novos, network=none, sem portas/mounts. Banco PG17.6: 278 tabelas, 6 auth users, 2582 storage objects, 7 buckets e 10 ledger rows; migration Escola ausente. Login postgres/read-only reproduziu exatamente o fingerprint do restore anterior 0d7331bb46ce494c748c813215f5c4bfcdd564cce1fab4c4e86b7af4acf86de2, zero canonical findings. Login supabase_admin + SET ROLE não aplica configurações de login postgres; a diferença de perspectiva foi diagnosticada sem mudar expectativas. Dump original recuperado: SHA-256 6787b247bd1c515a5ae3ed59d1bc52f11de7fbaf94de39a6f0478501a37b0318.

Storage importado: 2582 arquivos / 357014118 bytes; multiset size+MD5 igual à metadata restaurada, agregado SHA-256 35e5ae2fc9dc9ae63419e9858fa6854dbe889ad79131947555afadb12810a984. API Auth/Storage e mapping por object key na nova cópia: NOT_RUN. Configuração externa, CHECK contra PRE Production, custódia independente da chave e crash supautils continuam BLOCKED/abertos. DPAPI protege a nova chave local, que não recupera a chave antiga ausente de D:. Dados privados e exports permanecem fora do Git. Isso não é uma captura Production nova nem certificação integral. Zero schema/business writes Production.

Candidato funcional #536: 3a20c5874663603b3ab01734238f63607f37c39b. Diagnóstico remoto 37957915619/job 113913030743: cinco casos PASS, zero browser errors e escritas executadas; served SHA 041f6b17. GITHUB_SHA registra merge-ref de teste 98b210bc1fe0dc2649cb7c2a702c75f55c71241a, separado do head. OriginalPostmergeGateCertified=false: diagnóstico não substitui a falha original. Preview Git dpl_HTGeMLwT2uA9Rd5ruoFKd3zJws3f READY, SHA/branch exatos, target null/aliasError null; COST-02 37957915355/job 113913030986 checkpoint-fresh. Cinco Node CA + 14 Vitest TLS PASS no clone E:.

Civic Intelligence 37957915383 falhou antes dos testes em npm ci/ECONNRESET: uma única reexecução dos failed jobs foi solicitada, sem alteração de código ou workflow_dispatch. Quality permanece pendente atrás da run 37956953605 em execução. Não classificar o conjunto como verde antes de terminar. #536 permanece draft; nenhum merge adicional. Seis preflights #523, migrations, manifest, flags e indexação preservados. Escola não liberada.
