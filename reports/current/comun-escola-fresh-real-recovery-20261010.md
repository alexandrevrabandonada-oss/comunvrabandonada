# Escola — recuperação real em E:, 10/10/2026 UTC

Estado: `REAL_RECOVERY_SUBCONTRACTS_PASS_EXTERNAL_CONFIGURATION_NOT_CERTIFIED`.
Migration Production: **NOT_RUN**. Escritas de schema e negócio nesta rodada: zero.
Não foi emitido recibo completo nem permissão de uso único para o executor.

Código preservado: `73d28606230bd5642d47d81293c60ec5ffc35ce3`, tree
`db82ab810d30b9b71a0075296059527ef0890950`, idêntica ao merge #538 em main
`400b17b350a00de913b6e802586c890c1e2999d9`. Main reconsultado nesta rodada.
As provas abaixo são da recuperação, não certificam #523 nem liberam a Escola.
Nenhuma migration, manifest, flag, indexação ou controle foi modificado.

## Acesso e captura — PASS

A conexão protegida em E: autenticou em PostgreSQL 17.6, tanto direta quanto
session pooler, com TLS autenticado. O `28P01` anterior não permanece como bloqueio:
os dois acessos passaram após a rotação. Nenhum novo reset foi necessário.

Nova captura PRE `fresh-school-pre-1791595943510.json`: transação READ ONLY,
ROLLBACK confirmado, zero findings, Escola/ledger ausentes e cinco releases
anteriores `PRESENT_ACCEPTED`. Canônico
`160face699d0b22b88b0434a6393cedf587ce0ccf1f8338dd8765ec56f6fab4a`;
runner `ccb89095e56cad37b6b0e8459eee4eee9c130abd709b78940a85578a302c317f`.
Essas expectativas não foram atualizadas para acomodar a restauração.

## Banco real e integridade — PASS com limites explícitos

Backup iniciado `2026-10-10T00:41:54.632Z`, concluído `00:46:11.554Z`:
snapshot exportado REPEATABLE READ READ ONLY, `pg_dump` 17.6 usando esse snapshot.
Roles foram capturados separadamente, sem senhas; não alegar atomicidade entre
todos os globais e os dados. Banco, roles e metadados foram cifrados com AES-GCM.

Database ciphertext SHA-256:
`a44085a55b4d499dd1aa7d4788d4153e0ffaec900dd5bbc1806a99e3484264d3`.
Roles ciphertext SHA-256:
`9927152f06601cae8f2c190d170ea9a3811f24d5af6c89db2ae0a6bc2be152ac`.
Backups, chaves, configurações e linhas privadas permanecem fora do Git/artifacts
públicos, em diretório local restrito. Chave independente privada no Drive teve
readback destes arquivos validado sem usar DPAPI e sem gravar a chave em claro.

Restauração b6 em container sem rede externa, portas publicadas ou mounts, imagem
`public.ecr.aws/supabase/postgres:17.6.1.100`, ID
`sha256:8002645276dc3431d55a5049721a879e4d11c34177086dc0f13b61d98cff1e52`.
Todas as 278 tabelas conferidas: 272 hashes originais exatos; seis diferenças de
ordenação foram comprovadas por hashes C-order/multiset e estabilidade do hash
original no Source. Collation Source `153.121`, local `2.40`: essa diferença não
foi ocultada nem tratada como igualdade de comportamento de collation.

Nove versões e owners de extensões, owner do banco, bootstrap e wrapper GraphQL
conferidos. 69 statements de roles/settings/memberships iguais; grantor preservado.
O wrapper GraphQL da plataforma foi preservado separadamente a partir da captura
cifrada; sua ACL foi adiada e aplicada, não descartada. Tentativas anteriores com
bootstrap/versões incompatíveis continuam falhas preservadas.

Runner restaurado igual ao PRE. Hash canônico bruto restaurado permanece diferente:
`0d7331bb46ce494c748c813215f5c4bfcdd564cce1fab4c4e86b7af4acf86de2`.
Prova restrita cobriu um CHECK com AST igual exceto posições de origem e oito ACLs
efetivas iguais, incluindo controles negativos. Não é autorização para normalizar
o gate de promoção nem prova genérica de equivalência de toda a plataforma.

## Auth e Storage — PASS nos ensaios identificados

Auth b4: dois usuários sintéticos autenticaram; acesso cruzado administrativo e
anônimo recusados; fixtures removidas. Nenhuma credencial de usuário real usada.
Essa configuração sintética não substitui o contrato de proteção do Source.

Auth b6: Google e hCaptcha reais capturados cifrados foram carregados somente no
ambiente offline. Confirmação de e-mail exigida; signup/password sem CAPTCHA
recusados. Login real Google, CAPTCHA válido e envio externo de e-mail: **NOT_RUN**.

Storage b4: 2.582 objetos/357.014.118 bytes, versões e mapeamento exatos com o novo
snapshot; zero órfãos. API devolveu bytes com hashes iguais e negou as rotas anônima
e pública dos 863 objetos privados. Zero escritas de API. Arquivos vieram da captura
anterior imutável, comprovadamente correspondentes às versões do novo snapshot;
não alegar nova coleta de bytes do Source. Não transferir PASS b4 para b6.

## Configurações externas — BLOCKED para cobertura completa

17 capturas cifradas passaram readback autenticado: políticas/configuração Auth,
sessões, proteção, Google/hCaptcha, MFA, URLs, limites e seis templates de e-mail.
OAuth Server e passkeys estavam desabilitados. Edge Functions exibiu ausência de
funções implantadas. Nenhuma configuração do provedor foi salva/modificada.

O Source usa e-mail integrado do Supabase, sem SMTP próprio. Capturar templates
não comprova recuperar esse serviço gerenciado em destino independente. Ainda
faltam um procedimento executável e ensaio da configuração externa completa,
incluindo entrega de e-mail e vínculos OAuth/URLs no destino de recuperação.
Não cadastrar provedor, contratar plano, alterar redirect/DNS ou enviar mensagens
reais automaticamente. É possível estudar uma alternativa gratuita; não assumir
que ela já existe ou funciona. O armazenamento protegido/readback está provado,
mas `externalConfigurationRecoverable` não recebe PASS.

[Restore oficial Supabase](https://supabase.com/docs/guides/self-hosting/restore-from-platform)
separa banco de Storage, JWT/API keys, providers, SMTP, funções e DNS; usuários
precisam reautenticar com novas chaves. O [serviço de e-mail integrado](https://supabase.com/docs/guides/auth/auth-smtp)
tem limitações próprias. Documentação não substitui um ensaio no destino nominal.

## Evidência selada e próximos gates

Pacote privado `real-backup-1791592910412/sealed-recovery-subcontracts.json`,
SHA-256 `f3206e17a5afb346c7214f9cc711acdcb1c74148ecb7230fca07a589d2f2f1ed`,
vincula 16 provas e 17 capturas de configuração. Não é o recibo completo exigido
pelo executor. O crash original supautils continua **REPRODUCED_OPEN_NOT_FIXED**;
PASS dos novos clusters sem esse preload não encerra o finding original.

Próximo passo: fechar o contrato de recuperação das configurações externas em
destino isolado, sem prometer envio/login real a partir de mocks. Somente depois
revisar o recibo completo, renovar backup se ultrapassar uma hora e recapturar PRE
com idade máxima de cinco minutos. Não ampliar esses limites nem fabricar PASS.
Aplicar exclusivamente Escola pelo executor transacional já revisado, sob a
autorização existente, somente com todos os gates satisfeitos; recapturar POST e
então executar os seis preflights reais de #523. Os seis continuam bloqueantes.

Escola não liberada. V1 não concluída. Nenhum upgrade/restauração sobre Production.

## Continuação — envio local real e decisão gratuita preparada

PASS: seis templates capturados foram restaurados no laboratório. O Auth pinned
v2.196.0 renderizou o convite e enviou uma mensagem pelo protocolo SMTP real para
um receptor exclusivamente loopback, sem relay ou internet. As variáveis foram
preenchidas, a URL de confirmação existia e CAPTCHA permaneceu obrigatório.
Não houve envio externo nem reprodução do SMTP gerenciado. Prova
`external-recovery-1791597136159/proof.json`, SHA-256
`af404fa269d58ac5d7e171616bfbc1a91ff881705580e89c5b3faf77ace4fbb1`.
Isso não dá PASS aos outros cinco fluxos de envio: os seis templates tiveram
readback exato, mas somente convite foi enviado neste ensaio.

O ensaio combinado falhou ao exigir redirecionamento Google. Esse resultado
continua FAIL/BLOCKED; não foi transformado em sucesso pelo ensaio SMTP separado.
O namespace não tem rede e `getent hosts accounts.google.com` saiu com código 2.
O [provider oficial pinned](https://github.com/supabase/auth/blob/v2.196.0/internal/api/provider/google.go)
consulta discovery OIDC antes de criar o redirect. A restrição de rede explica
uma dependência não satisfeita; não foi capturado o status HTTP específico nem
provada causalidade completa da falha do endpoint. Login real permanece NOT_RUN.
Não abrir a rede do banco restaurado ou usar mock como prova do Google.

As três fixtures deixadas pelas tentativas combinadas foram removidas somente
por e-mail/UUID sintéticos exatos, com eventos correspondentes. O ensaio SMTP
separado removeu sua própria fixture e dois eventos. Depois, **todas as 27 tabelas
Auth** voltaram aos counts/hashes originais do snapshot cifrado. Prova
`auth-config-cleanup-snapshot-proof.json`, SHA-256
`3371bdc64a8048460730a81450537d215c14ac6b819b4b70a1a9414fda01bd34`.
Containers temporários com configuração privada foram encerrados/removidos;
arquivo cifrado, banco restaurado e tentativas anteriores preservados.

Conexão read-only voltou a passar em `2026-10-10T01:55:19.523Z`, PG17.6 e TLS
autenticado. Isso prova transporte, não renova o snapshot nem sua idade. O ponto
de recuperação de `00:41:54.632Z` agora ultrapassou uma hora e não pode liberar
o executor. Renovar somente após concluir os demais requisitos; sem alterar o RPO.

#523 reconsultado: OPEN/draft, head `cf0e8e41a084e073a728cca269a0dbc38683bfe1`,
CONFLICTING; 45 SUCCESS, 76 SKIPPED, seis FAILURE, zero pending na consulta atual.
Quality permanece SUCCESS. Nenhum rerun dos seis preflights foi solicitado.
O número atual de SKIPPED não foi convertido em PASS nem substituído por contagem
histórica. Antes de integrar produto, resolver schema e reconciliar a base final.

24 testes do contrato de entrada Production passaram novamente, zero skips;
isso comprova guardas/recusas, não recuperação real completa. Migration/manifest
e fingerprints permanecem fixos. Recibo e autorização interna de uso único não
foram emitidos. Plano concreto sem contratação:
[recuperação externa gratuita](comun-escola-external-recovery-free-decision.md).
