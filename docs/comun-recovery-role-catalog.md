# Catálogo global de papéis da recuperação

Este incremento da SOC-D10.M7.E inventaria metadados; não restaura
permissões do provedor ou da aplicação real. A extensão de laboratório
reconstitui somente três papéis sintéticos com atributos restritos
(NOLOGIN, NOSUPERUSER, NOINHERIT, NOCREATEROLE, NOCREATEDB,
NOREPLICATION, NOBYPASSRLS), e uma membership sem ADMIN, INHERIT
ou SET. Os nomes e comandos são literais e isolados no Docker local:
não vêm do catálogo cifrado. O comparador deve continuar apontando
divergência proposital em relação aos privilégios da origem e
`recoveryComplete=false`. Nenhum `pg_dumpall --globals-only` ou
replay de grants do provedor está autorizado.
Use o mesmo roadmap e o mesmo PR. Nenhum comando abaixo concede autorização
para criar papéis, executar SQL remoto de escrita ou mudar planos.

## Prova descartável

`node scripts/security/rehearse-recovery-role-catalog.mjs --run-disposable --output <diretório-absoluto-novo>`

Requer imagem PostgreSQL fixada já presente e Docker local. Cria somente dois
containers próprios, sem rede e volumes persistentes. Atributos e memberships
são alterados somente nesse laboratório. O relatório agrega diferenças e exige
limpeza por owner; o ensaio de reconstrução mínima não reproduz privilégios
nem equivale a recuperação organizacional. Não substitui a recuperação
nativa das contas de autenticação.

O workflow de segurança possui uma trilha PR própria
`SOC-D10.M7.E / synthetic role reconstruction`, que exige
a imagem PostgreSQL 17 pelo ID exato. Uma atualização do
rótulo `postgres:17` sem o mesmo SHA-256 reprova o ensaio
e exige revisão explícita; não permite drift silencioso.
São exigidos ao menos 17 checks, limpeza confirmada e imutabilidade de
todos os papéis e vínculos externos ao laboratório.
Apenas o JSON sanitizado é publicado, sem inventário real.

## Captura autorizada

`node scripts/security/capture-recovery-role-catalog.mjs capture --config <arquivo-privado-existente> --age <binário-absoluto> --age-sha256 <hash-aprovado> --recipient <destinatário-público> --output <arquivo-novo.age> --receipt <recibo-novo.json>`

Exige arquivos do coletor versionados e sem alterações, query fixa, CA fixada e
age 1.3.2 com checksum. A senha existente fica apenas no ambiente do processo;
os nomes e vínculos ficam no JSON cifrado, sem arquivo intermediário em claro.
O recibo e a intenção são exclusivos. Falha não autoriza repetição automática.

`node scripts/security/capture-recovery-role-catalog.mjs verify --age <binário-absoluto> --age-sha256 <hash-aprovado> --identity <arquivo-privado> --input <cipher> --cipher-sha256 <hash-do-recibo>`

Verifica hash e contrato após decifrar somente em memória. A cópia offsite exige
permissão privada confirmada, download independente e comparação dos hashes.
Nunca enviar a identidade age, conexão, senha, catálogo em claro ou nomes de
papéis para PR, logs públicos ou artefatos de CI.

O catálogo exclui passwords, configurações GUC e contas/sessões Auth. Reproduzir
papéis privilegiados ou do provedor exige revisão separada. Observação de outra
data não compõe snapshot atômico com dump anterior. `recoveryComplete=false`
permanece obrigatório mesmo com captura e integridade aprovadas.
