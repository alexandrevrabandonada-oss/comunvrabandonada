# Alinhamento de histórico — PR #23

Status: **não aprovado para execução**.

## Fato causador

`20260720005353_comun_archive_identification_campaign.sql` está registrada no
remoto, embora 19 migrations anteriores/posteriores relevantes estejam
ausentes. Ela cria antecipadamente `comun_member_profiles` e
`comun_member_inbox`. Por isso `20260715032613` falha ao tentar criar a primeira
tabela sem guarda, e `20260715192935` falharia ao criar a segunda.

## Estratégias comparadas

### A. Alterar migrations históricas para idempotência

- Novos ambientes: pode preservar reset se cada guarda vier acompanhada de
  assertion estrutural.
- Ambientes completos: risco de mudar artefatos já auditados.
- Remoto atual: permitiria executar a cadeia, mas mistura correção operacional
  com reescrita histórica.
- CI/CLI: funciona, porém hashes e significado histórico mudam.
- Risco futuro: médio/alto.
- Auditabilidade: baixa sem versões imutáveis das cópias anteriores.
- Rollback: difícil.

### B. Reconciliação anterior à cadeia

- DDL apenas aditivo não resolve `CREATE TABLE` incondicional das migrations
  antigas.
- Renomear ou remover tabelas para deixar a cadeia rodar seria destrutivo e
  exigiria migração de dados.
- Resultado: **inviável nas restrições atuais**.

### C. Aplicar reconciliação e alinhar histórico posteriormente

- Um script forward-only poderia construir o schema final diretamente a partir
  do remoto auditado.
- O histórico só poderia ser alinhado depois de equivalência integral,
  backup restaurável e revisão por duas pessoas.
- `migration repair` seria apenas uma hipótese de alinhamento, nunca o mecanismo
  de criação do schema.
- Novos ambientes continuam usando as migrations originais.
- Risco futuro: médio; exige assertions fortes e registro exato de versões.
- Auditabilidade: alta se o script, fingerprints e revisão forem preservados.
- Rollback: snapshot/PITR, pois o DDL é forward-only.

### D. Baseline/squash operacional

- Simplifica o remoto existente, mas cria duas genealogias de schema.
- Complica CI, resets e ambientes que já aplicaram a sequência.
- Exige mudança coordenada de todos os ambientes e documentação permanente.
- Risco futuro: alto neste momento.

## Recomendação

Recomenda-se **C**, condicionada a:

1. gerar diff catalogal completo remoto → final;
2. revisar cada alteração e transformar o diff em DDL aditivo/assertivo;
3. adicionar no schema final local as FKs seguras que o remoto já possui
   (`member_profiles.user_id → auth.users` e
   `member_inbox.member_user_id → auth.users`), evitando removê-las;
4. ensaiar duas vezes a partir do snapshot remoto;
5. restaurar backup completo em ambiente isolado;
6. obter revisão nominal de duas pessoas;
7. somente então documentar, sem executar neste pacote, as versões e o eventual
   comando de alinhamento do histórico.

Nenhum comando de `migration repair` está autorizado ou especificado enquanto
esses gates estiverem fechados.

