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

Estado: mecanismo local preparado. Execução real bloqueada pela ausência de um
caminho de execução aprovado no runtime que detém credenciais R2. Não instalar
endpoint, decrypt de variáveis ou código de Production para contornar o bloqueio.
