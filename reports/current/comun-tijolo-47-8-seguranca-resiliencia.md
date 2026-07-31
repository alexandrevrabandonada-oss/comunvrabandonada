# Tijolo 47.8 — Segurança, privacidade e recuperação

## Decisão

`COMUN_SECURITY_RESILIENCE_BLOCKED_PROVIDER_CAPABILITY`

Os controles implementáveis e os ensaios remotos estão verdes. O domínio não
é promovido porque o plano Supabase observado é `free`: backup automático,
PITR e um ponto durável de recuperação dos dados internos de Auth não estão
disponíveis no contrato atual. O Storage possui backup físico efêmero
verificado, mas ainda não possui cópia secundária durável comprovada.

Nenhum plano financeiro foi alterado e `launch_publicly` não foi acionado.

## Integração

- base confirmada: `3721a9fbcec74d8573f7356717a07ded67f08c57`;
- PR principal: `#117`;
- correções focais de evidência e dupla chave: `#118` a `#121`;
- SHA remoto ensaiado: `708aa9009b6ef7e901d215b97d8b402a3ef152a0`;
- deployment Production `5686481830`: `success`;
- lane final de PR: run `30604641109`, verde;
- transição aditiva de dupla chave: run `30604879649`, verde;
- ensaio remoto completo: run `30604977938`, verde;
- artifact final sanitizado:
  `comun-security-resilience-remote-708aa9009b6ef7e901d215b97d8b402a3ef152a0-30604977938`.

A divergência entre o bearer do GitHub e o runtime foi corrigida sem rotação
direta: `CRON_SECRET` foi preservado, a chave aditiva foi instalada, ambas
permanecem aceitas e nenhuma delas apareceu em log ou artifact.

## Evidência remota

| Controle | Resultado |
| --- | --- |
| RLS, grants, views e funções | `COMUN_RLS_COMPLETE_GREEN` |
| Fronteira de segredos | `COMUN_SECRETS_BOUNDARY_GREEN` |
| Restore isolado do banco | `COMUN_DATABASE_RESTORE_REHEARSAL_GREEN` |
| Restore físico de Storage | `COMUN_STORAGE_RESTORE_REHEARSAL_GREEN` |
| Recuperação de migration | `COMUN_MIGRATION_RECOVERY_GREEN` |
| Rollback de deployment | `COMUN_DEPLOYMENT_ROLLBACK_GREEN` |
| Retenção e exclusão | `COMUN_RETENTION_POLICY_GREEN` |
| Resposta a incidentes | `COMUN_INCIDENT_RESPONSE_REHEARSAL_GREEN` |

### Banco e aplicação

- 188 tabelas remotas inventariadas, todas com RLS e zero finding;
- backup custom de `public` e ledger, criado somente no runner efêmero;
- 11.872 linhas agregadas restauradas, sem imprimir conteúdo;
- 188 tabelas, 61 policies, 466 índices e 1.131 constraints validados;
- zero índice inválido, constraint não validada ou FK pública órfã;
- ledger de 70 migrations conferido;
- Home e nove superfícies V1 executadas contra o restore;
- login sintético, permissão negativa e no-leak verdes;
- dump, banco isolado e manifestos privados destruídos no `finally`.

O backup é integral para o banco da aplicação allowlisted. Ele não é declarado
como backup integral dos schemas internos gerenciados pelo Supabase.

### Storage

- dois buckets físicos inventariados no runtime que já possui as credenciais;
- inventário real atual: zero objetos, sem object keys no artifact;
- cinco objetos sintéticos cobriram original privado, derivado público, áudio
  privado, waveform público e Calçadas;
- bytes, checksum, MIME, visibilidade, URL assinada expirada e relação com o
  banco validados;
- objetos de origem e restore, fixture de banco e workspace privado removidos;
- zero objeto real excluído e zero notificação enviada.

### Segurança e incidentes

- 1.684 arquivos e os 30 commits recentes inspecionados;
- zero exposição encontrada em repositório, bundle ou source map;
- valores, prefixos, comprimentos e hashes de segredos não foram publicados;
- 15 incidentes ensaiados: 2 P0, 10 P1 e 3 P2;
- detecção, contenção, entrada operacional, responsável, SLA, deduplicação,
  encerramento e cleanup verdes;
- zero duplicidade operacional e zero credencial real em fixture.

### Retenção, migrations e deployment

- política explícita para 14 tipos de dado, sem prazo legal inventado;
- dry-run verde e zero exclusão de dado real;
- signed URL limitada a 15 minutos e nenhuma URL excessiva observada;
- oito cenários de migration recuperados sem escrita em produção;
- estratégia forward-only, rollback transacional e cleanup completo;
- SHA atual e artifact anterior `READY` identificados;
- rollback de tráfego simulado sem mudar produção e sem escrever no banco.

## RPO e RTO

| Superfície | Meta | Medido | Margem / blocker |
| --- | --- | --- | --- |
| RPO banco | 24 h | snapshot efêmero no início do run | sem margem; falta ponto durável |
| RPO Storage | 24 h | snapshot sob demanda | falta cópia secundária durável |
| RTO leitura pública | 60 min | menos de 1 min | dentro da meta com deploy compatível |
| RTO autenticação | 4 h | menos de 1 min no sintético | recovery interno do provedor não ensaiado |
| RTO contribuição | 4 h | menos de 1 min | dentro da meta isolada |
| RTO administração | 4 h | menos de 1 min | exige identidade substituta independente |
| RTO recuperação integral | 8 h | menos de 1 min no ensaio | fonte durável continua ausente |

## Blocker preservado

O backup lógico remoto e os restores isolados provam utilizabilidade e
integridade, mas são destruídos ao fim do job por desenho. Eles não constituem
um recovery point durável. Para retirar o blocker é necessário, sem presumir
capacidade do plano:

1. estabelecer backup durável do banco e capacidade de recuperação de Auth;
2. estabelecer cópia secundária durável dos objetos físicos;
3. medir a idade dessas cópias contra o RPO de 24 horas;
4. repetir o ensaio isolado a partir do ponto durável.

Até lá, `security_resilience` permanece `blocked`. A sequência preservada é
47.9A, 47.9B, 47.10 e 47.11; nenhum redesign amplo foi iniciado.

