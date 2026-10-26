# Storage: exportação cifrada por stream (M7.E)

CLI privado, sem endpoint HTTP e sem operação de escrita no provedor. Executar
somente em processo protegido que já possua as variáveis R2 existentes. Não usar
`env pull`, não copiar credenciais para o laboratório e não publicar este código
em Production como parte da preparação. Endpoint aceito: HTTPS canônico da conta
R2, sem caminho ou credenciais na URL; buckets privado e público distintos.

```text
node scripts/security/export-storage-encrypted.mjs --age <binário-absoluto> --age-sha256 <checksum-verificado> --recipient <destinatário-público-age> --output <arquivo-absoluto-novo.age>
node scripts/security/verify-storage-encrypted.mjs --age <binário-absoluto> --age-sha256 <checksum-verificado> --identity <identidade-privada-no-destino> --input <cifra-baixada> --cipher-sha256 <checksum-do-recibo-confiável>
```

O exportador recebe apenas a chave pública. A identidade privada pertence ao
destino e não deve ser levada à origem nem enviada pelo chat. `age` v1.3.2 exige
checksum do binário previamente verificado por fonte independente. A cifra
protege confidencialidade/integridade; a chave pública não autentica remetente.
Conferir checksum e manifesto com recibo confiável mantido separadamente.

Listagem completa, ETag forte, GetObject com If-Match, tamanho exato e SHA256 de
cada objeto. Segunda listagem detecta alterações observáveis; não é snapshot
atômico nem prova de ausência de mudanças intermediárias. Limites: 10 mil objetos,
256 MiB de bytes, manifesto 8 MiB e cinco minutos. Exceder orçamento bloqueia;
não divide silenciosamente nem gera recibo de sucesso parcial. Sem retries.

TAR contém nomes numéricos e manifesto interno cifrado com escopo, chave, ETag,
tamanho, checksum e metadados de conteúdo. Não há dump em claro no disco durante
exportação/verificação. O verificador não extrai paths e rejeita links, nomes
inesperados e divergências. Arquivo de saída exige criação exclusiva. Falha remove
somente saída criada nesta operação; arquivo anterior é preservado. Interrupção
abrupta do SO pode deixar cifra incompleta: nunca aceitá-la sem recibo/verificação.

Saída pública contém somente agregados. Não registrar stderr do provedor,
credenciais, chaves de objetos ou URLs assinadas. Guardar cifra e recibo no destino
privado durável autorizado, baixar e verificar antes de declarar cópia offsite.
Verificação TAR não é restauração no R2: replay de bytes/metadados em destino
descartável e remoção comprovada continuam gates separados.

Ensaio sintético reproduzível: `rehearse-storage-encrypted-stream.mjs` recebe
binário age, checksum, age-keygen e diretório de evidência absolutos. Gera identidade
descartável, cifra bytes binários/objeto vazio, verifica hashes, colisão de saída e
cifra corrompida; remove identidade e arquivos. Não consulta R2 real.

## Prova real de 26/10/2026

A autorização humana específica permitiu uma credencial de usuário separada
Object Read only, restrita aos dois buckets existentes, com TTL de 24h. Não foram
extraídas ou rotacionadas credenciais de Production. A cópia real com o código
`cf4c9ea9` leu um objeto (174.445 bytes); o bucket público estava vazio. Inventário
reconferido; nenhum Put/Delete na origem. Cifra de 177.896 bytes enviada à pasta
privada durável aprovada, com acesso owner-only conferido. Download retornou o
mesmo checksum e manifesto; age e validação interna PASS.

Token temporário removido após exportação, token de Production preservado.
Probe posterior foi negado com HTTP401; expectativa inicial restrita a 403 foi
registrada como falha do probe, preservada e corrigida na interpretação. Arquivo
local da credencial revogada removido. Nenhuma credencial nova permanece ativa.

Bytes reais baixados do destino foram restaurados em container próprio sem rede,
root filesystem readonly, swap desabilitado e destino tmpfs. Readback de bytes,
checksums, identidade lógica e índice de metadados coincidiu; ausência do container
após cleanup confirmada. Isso não certifica replay S3/R2, Auth ou RPO contínuo.

O replay reutilizável está em `scripts/security/replay-storage-archive-tmpfs.mjs`.
Recebe TAR decifrado por stdin, valida o archive antes de escrever, exige Linux
e `/restore` realmente tmpfs, limita entrada a 16MiB e nunca usa chaves de objetos
como paths. Montar o repositório readonly, fixar a imagem existente, usar container
novo `--rm -i --network none --read-only --memory 256m --memory-swap 256m
--tmpfs /restore:rw,noexec,nosuid,size=16m`, executar o script com Node e transmitir
stdout do age diretamente ao stdin. Nenhuma identidade privada montada no
container. Conferir receipt e ausência do container independentemente do exit.

Não instalar endpoint, decrypt de variáveis ou código de Production como caminho
de backup. Esta prova pontual não cria scheduler nem autoriza renovação recorrente
de credenciais/cópias. Novos pontos de recuperação precisam de escopo próprio.
