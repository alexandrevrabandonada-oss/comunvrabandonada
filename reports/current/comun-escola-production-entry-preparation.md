# Escola — entrada Production separada, preparação em 09/10/2026

Base: `c4dfd5a728347a9b74c14e0a814d57cbd3bfab2d`, merge normal #537. Tree
`13e1bd55d71f0905f029f04f6737aaacfc40082a` idêntica ao candidato aceito. Deploy Git
Vercel `dpl_CPQme2egzPatdMV2bowh9LVJUGwi` READY; GitHub Production deployment
`6968395844` success, SHA servido exato e quatro GET públicos 200. CI push
`37975154564` e deployment_status `37975260257` SUCCESS. Três cancelamentos da run
anterior foram executados novamente e passaram no mesmo SHA; cancelamentos e
SKIPPED não são PASS. A certificação é de código/deploy, não de schema Escola.

## Mudança revisável

O motor transacional do #537 foi extraído para `transaction-core.mjs`, preservando
os controles de scope, PRE/POST, ledger, catálogo privado antes do COMMIT, rollback
e resultado UNKNOWN quando a resposta de COMMIT é perdida. A transação agora
declara READ WRITE explicitamente; as conexões Production devem ter default
READ ONLY. O wrapper descartável mantém exatamente a recusa de destino remoto,
porta local/run e ausência de credenciais Production. Não houve alteração da
migration ou do manifest `local_candidate/remotePromotionAllowed=false`.

`production-entry.mjs` oferece uma API separada para a única migration autorizada,
sem CLI, discovery de credencial, workflow de escrita ou retries automáticos:

- PostgreSQL nominal do projeto correto, database postgres, porta 5432 direta ou
  session pooler; transaction pooler recusado;
- TLS autenticado, sem callback de identidade permissivo ou servername diferente;
- recibo PRIVADO real previamente revisado, hash exato, pacote/fingerprints fixos,
  cobertura de banco/Auth/Storage/configuração/chave e hashes dos arquivos;
- recibo não é gerado por esta API. Integridade de um JSON não prova suas
  alegações: os artifacts e a restauração efetiva devem ser examinados antes de
  fixar o hash revisado. Nunca preencher PASS para destravar a operação;
- ponto recuperável com idade máxima de uma hora, explicitamente um limite de
  RPO e não RPO zero. Sem ampliar essa janela automaticamente se o ensaio demorar;
- captura PRE com no máximo cinco minutos, mesma tree testada, rollback read-only
  confirmado, cinco releases aceitas e somente Escola como pendência acionável;
- versão 17.6, equivalente ao ensaio atual; mudança de versão requer nova prova;
- permissão de execução interna de uso único, não fabricável como simples objeto
  JSON. Consumida antes do BEGIN; sem replay automático após qualquer falha.

As verificações de forma usam fixtures de unit test, não dados reais. O hash do
recibo deve vir de revisão local protegida, não do próprio recibo ou de conteúdo
externo não confiável. Esta preparação não declara completo o launcher privado,
a recuperação real nem a prova de transporte Production.

## Estado das provas

PASS: 121 testes Node da pasta learning, zero FAIL/SKIPPED antes do empacotamento;
guardas de transporte/recuperação, checks anteriores e não ampliação do manifest.
Após a última correção, os 24 testes específicos também passaram; o conjunto
completo e o ensaio do motor extraído serão registrados no SHA efetivamente
testado. Não transferir provas anteriores por mera semelhança de código.

BLOCKED: nova captura/backup real e recuperação completa. A credencial protegida
esperada não foi encontrada nas pastas COMUN presentes em D:. A unidade voltou
NTFS/Healthy/OK; isso não prova todos os arquivos íntegros e não confirma corrupção.
Nenhum reparo, formatação ou escrita foi feito em D:. Trabalho permanece em E:.

BLOCKED: Chrome disponível abriu o projeto nominal, mas redirecionou ao login.
O usuário deve autenticar ou conectar o perfil já autenticado; não solicitar
senhas/chaves pelo chat. Nenhuma configuração externa foi alterada.

NOT_RUN: aplicação Production e prova de transporte ao destino real. Não houve
schema/business writes. Não houve emissão de recibo real, override de manifest,
borrow de privilégios ou bypass dos seis preflights #523. Escola não liberada.

## Procedimento restante

Recuperar conexão protegida → backup novo cifrado em E: + custódia independente →
restauração isolada com provas completas e revisão dos artifacts privados →
launcher privado com credencial apenas em memória e erros sanitizados → captura
PRE read-only fresca → aplicação única atômica → recaptura POST read-only → seis
preflights #523 e smokes. Nunca restaurar sobre Production. Não contratar recursos
pagos; confirmar eventual uso/franquia de transferência antes do novo backup.

Fontes oficiais consultadas: [node-postgres TLS](https://node-postgres.com/features/ssl),
[PostgreSQL BEGIN](https://www.postgresql.org/docs/17/sql-begin.html),
[Supabase backup/restore](https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore).
Changelog consultado sem atualizar stack: rollout PostgreSQL 17.11, pinning de
extensões e mudança de APIEXTERNALURL no self-hosted são motivos para registrar
versões efetivas, não autorizações de upgrade ou alteração de configuração.

Estado: `COMUN_SCHOOL_PRODUCTION_ENTRY_PREPARED_REAL_RECOVERY_BLOCKED`.
