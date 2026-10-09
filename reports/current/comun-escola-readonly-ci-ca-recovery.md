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
