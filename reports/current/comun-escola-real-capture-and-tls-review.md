# Escola: captura real e TLS verificado — 08/10/2026

Base confirmada: `efed129d3d5dd2db653caab49d84653efef764ec`.

## Credencial e publicação

O usuário concluiu o reset do PostgreSQL no painel. A primeira autenticação
retornou 28P01; a tentativa limitada posterior autenticou com a senha preparada.
A prova confirmou PostgreSQL 17.6, `BEGIN READ ONLY`, `transaction_read_only=on`,
278 tabelas consultáveis e zero DDL/DML. Valores e URLs de conexão não integram
este relatório, o Git ou artifacts públicos.

Os dois secrets de banco do GitHub e as duas conexões Vercel já existentes foram
atualizados nos mesmos escopos. Nenhuma flag foi alterada. O redeploy do mesmo SHA
`efed129d` foi READY: `dpl_9bWeCzZzNdNpUwzMfvHuXZ74CTn9`. Sete GET-only smokes
passaram, inclusive o SHA servido. Isso não certifica todos os caminhos de banco.

**Finding TLS:** a URL estrita `sslmode=verify-full` não consegue validar a cadeia
Supabase com o trust store padrão do Node. Os dois leitores de release não
carregavam a CA. O candidato carrega a CA pública oficial apenas para conexões
Supabase que já solicitam verify-full, preserva verificação de hostname e rejeita
parâmetros TLS conflitantes. Não usa `rejectUnauthorized=false`, não modifica
permissões nem o estado dos releases. A correção ainda depende de integração e
certificação remota; os dois caminhos atuais devem ser tratados como bloqueados.

PASS local: 26 testes focais; 1.456 testes unitários / 249 arquivos; TypeScript;
ESLint focal; Prettier; diff-check. A suíte foi executada com dois workers após
OOM do ambiente. Quatro arquivos de fonte/SQL não modificados foram lidos com os
bytes exatos de HEAD para eliminar diferenças de CRLF do checkout; nenhum hash,
expectativa ou migration foi alterado. A conexão real usando o helper candidato
passou em transação read-only com CA e hostname validados.

## Recuperação real: progresso e limites

PASS: captura lógica PostgreSQL 17.6 e roles sem senhas, destino local com ACL
exclusiva, cifragem AES-256-GCM, reabertura dos arquivos e validação autenticada
com hashes. Dump original imutável; nenhuma cópia em claro no Git ou em artifact
público. A chave local usa DPAPI; custódia independente ainda não comprovada.

Dump cifrado SHA-256:
`50c40ff9a70ed59d4a100b20af4f6da4ffa75d92e32908527d25eeb9fd8de880`.
Roles cifradas SHA-256:
`bff9751e3fbf0741b7e89f926388cd0d3f11f87fe524c131bce7ffec49c34d6a`.

O primeiro restore fail-closed demonstrou uma dependência de bootstrap:
`graphql_public.graphql(text,text,jsonb,jsonb)` pertence a `pg_graphql 1.5.11` na
origem e não é reproduzida pela instalação vazia da mesma extensão. O erro de
GRANT reverteu a transação: zero tabelas após a falha. A definição e membership
foram capturadas por SELECT read-only e acrescentadas como suplemento cifrado,
sem editar o dump original ou ignorar grants.

PASS parcial: restore com suplemento em PostgreSQL offline, `--network none`,
sem portas/montagens, restaurou 278 tabelas; definição da função suplementar
idêntica. Os 277 blocos COPY têm payloads equivalentes por multiconjunto de linhas;
sequences equivalentes. Nenhuma linha privada aparece nesta evidência sanitizada.

**BLOCKED:** dumps de schema não são byte-equivalentes após round-trip (incluindo
reformatação de expressões de CHECK); essa diferença ainda exige classificação
estrutural completa. Não foi aceita por normalização genérica. Auth/Storage API,
arquivos Storage, Vault/chaves e configurações externas continuam sem prova
completa. O crash supautils prévio permanece aberto e separado.

**NOT_RUN:** migration Escola Production, ativação de flags, indexação, escrita de
negócio, recuperação independente após perda do PC. Os seis preflights permanecem
obrigatórios; #523 permanece separado/draft. Escola não liberada, V1 não concluída.

Procedimentos de restore lógico gerenciado exigem reconstrução das dependências
da plataforma; filtrar schemas e descartar ACLs não prova cobertura integral.
[Documentação oficial](https://supabase.com/docs/guides/self-hosting/restore-from-platform).

Build local: PASS com `npm run build -- --webpack`. O build padrão Turbopack foi
BLOCKED pela junction de node_modules fora da raiz; nenhum reparo de CI ou
configuração do produto foi feito para contornar isso. O build remoto padrão
continua sendo um gate independente do novo candidato.

Cópia cifrada enviada ao Drive privado já autorizado, sem incluir a chave DPAPI.
A segunda cópia de ciphertext não comprova custódia independente da chave nem
fecha a recuperação integral. ZIP SHA-256:
`2fefad45a8dbb415bb82698f657b6a056a741f1b2547a9aa402593a9932e0c4b`.
