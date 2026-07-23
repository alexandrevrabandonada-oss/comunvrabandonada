# Ensaio de backup e restore — PR #23

## Estado canônico atual

O restore de schema está aprovado. O backup completo com dados, Auth e inventário de Storage não foi restaurado.

## Evidência atual

Snapshot de schema restaurado e usado em dois ensaios independentes; nenhum dump ou dado foi incluído no Git.

## Gates fechados

- backup lógico de schema;
- restore de schema em isolamento;
- preflight sobre o snapshot.

## Gates pendentes

- cofre/chave e retenção autorizados;
- backup completo cifrado;
- restore de dados/Auth/Storage;
- validação de RTO e integridade agregada.

## Decisão

**NO_GO_REMOTE_INTEGRATION**

> Atualização de fechamento: o restore de schema continua aprovado, mas não equivale ao gate de backup completo. O backup completo cifrado com dados/Auth/inventário Storage não foi produzido porque não existe neste ambiente um cofre/chave, política de retenção e autorização operacional específica para armazenar PII fora do serviço. `COMUN_REMOTE_BACKUP_RESTORE_VERIFIED` permanece fechado.

## Escopo executado

Foi gerado um backup lógico **somente de schema `public`**, sem dados, object keys ou segredos, usando Supabase CLI/`pg_dump`. O arquivo temporário não foi adicionado ao Git.

- formato: SQL lógico;
- baseline: REMOTE_ACTUAL;
- SHA-256 da representação normalizada: `0326fb80a9e4efc5944a3246fc5e6e9845c5b79ab705457ae79eb409de78842b`;
- destino: PostgreSQL/Supabase local isolado;
- restore: `psql` com `ON_ERROR_STOP=1`;
- duração da segunda tentativa: aproximadamente 7 segundos.

## HISTÓRICO — SUPERADO PELO PACOTE FORWARD-ONLY

A primeira tentativa de restore encontrou deadlock durante a inicialização concorrente do stack e foi descartada. Esse evento foi superado: o ambiente foi recriado do zero, aguardou readiness e o restore passou; depois, os dois ensaios forward-only também passaram.

Validação pós-restore:

- 123 tabelas do dump restauradas, excluindo `spatial_ref_sys` preexistente do stack;
- 39 policies;
- 6 funções públicas presentes no dump;
- 303 índices catalogados, incluindo índices de constraints;
- `comun_member_profiles` e `comun_member_inbox` com constraints do remoto;
- preflight assertions: `PR23_PREFLIGHT_ASSERTIONS_OK`.

## O que este ensaio não comprova

- recuperação dos dados reais;
- restauração de Auth, identidades e sessões;
- objetos e metadata de Storage;
- contagens de linhas após restore de dados;
- abertura funcional das rotas dependentes;
- RPO/RTO de produção;
- backup físico ou PITR.

PITR permanece desativado e a CLI não listou backup físico disponível. Portanto o gate amplo solicitado não pode ser emitido.

## Gate

- `COMUN_REMOTE_SCHEMA_BACKUP_RESTORE_VERIFIED`: **PASS**.
- `COMUN_REMOTE_BACKUP_RESTORE_VERIFIED`: **NÃO EMITIDO**.

## Plano para o gate completo

1. habilitar ou gerar backup restaurável autorizado antes da janela;
2. usar roles, schema e data dump conforme a documentação oficial do Supabase;
3. armazenar o backup cifrado fora do Git, com acesso mínimo e retenção definida;
4. restaurar em ambiente isolado equivalente;
5. validar contagens agregadas, checksums e integridade referencial sem exportar PII;
6. restaurar/configurar Auth e Storage separadamente quando aplicável;
7. carregar somente fixtures sintéticas para smoke de rotas;
8. medir RTO e provar o procedimento de descarte seguro.

Referência: [Backup and Restore using the CLI](https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore).
