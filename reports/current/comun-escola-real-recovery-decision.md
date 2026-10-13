# Escola — decisão externa para uma prova real de recuperação

Preparação apenas. Nenhuma operação abaixo está autorizada por este documento.
Sem contratação, recurso pago, exportação privada, restore ou migration nesta rodada.

## Destino nominal e cobertura

Destino proposto: **comun-escola-recovery-drill-20261009**, projeto Supabase novo,
na organização da origem verificada, região **us-west-2**. Status
PROPOSED_NOT_CREATED; project ref ainda inexistente. Nunca reutilizar a origem.
Identidade de origem por SHA256(JSON.stringify(projectRef)):
`63cba5e79fc964485eaa51763ce3daf9b5d7f16311d851fc49525ab212e101a2`.
Após eventual criação, registrar ref/ID do destino no registro privado e exigir
source != target antes de qualquer restore ou limpeza.

Cobertura requerida: banco completo/schema/dados, Auth, migration history,
ledger, owners/roles/grants/default ACLs, RLS/FORCE/policies, funções, triggers,
sequences, large objects e dependências de extensões presentes. O clone inclui
banco/Auth/chave raiz, mas não é prova de Storage bytes ou configuração externa.
Arquivo Storage exige inventário/versionamento/hashes e recuperação separados.
Configuração Auth/SMTP/OAuth/Edge/Realtime/cron/webhooks/Vercel/DNS deve ser
inventariada em registro protegido e reconstruída somente com endpoints de teste.
Nunca enviar e-mail/webhook ou tráfego de integração a terceiros durante o ensaio.

## Gates antes de contratar ou copiar

1. Confirmar organização e seus projetos/custos atuais por leitura; upgrade é
   da organização, não só deste banco. Não presumir um único projeto faturável.
2. Designar pessoas para operação, revisão, custódia independente e exclusão.
   Todos permanecem **UNASSIGNED**; o agente não substitui custódia humana.
3. Autorizar tratamento/cópia dos dados privados/Auth e Storage, região,
   retenção, acesso, orçamento e destino nominal. Acesso ao dashboard não é isso.
4. Demonstrar isolamento antes de efeitos externos. O restore físico não permite
   pausar/excluir extensões externas na entrada; elas podem executar ao terminar.
   Inventário de cron/webhooks/wrappers e contenção efetiva ainda BLOCKED.
   Não modificar Production para tornar esse teste possível. Se não houver
   isolamento comprovável, não executar clone: avaliar lógico offline, incluindo
   solução própria para raiz Vault e exportação integral autorizada.
5. Backup físico utilizável: hoje **NOT_AVAILABLE** no projeto Free observado.
   Após eventual Pro, verificar physical enabled, backup COMPLETED, identificador,
   instante recuperável e retenção antes da janela. Upgrade não equivale a backup.

## Orçamento atualizado em USD — tarifa não é cotação final

Consulta oficial 08/10/2026. [Plano](https://supabase.com/pricing) e
[compute por hora](https://supabase.com/docs/guides/platform/manage-your-usage/compute).

| Item                                           | Tarifa pública                                | Limite da decisão                                               |
| ---------------------------------------------- | --------------------------------------------- | --------------------------------------------------------------- |
| Pro organização                                | US$25/mês                                     | Não contratado; outros projetos podem acrescentar compute       |
| Crédito compute                                | US$10/mês por organização                     | Não um crédito por projeto                                      |
| Micro (também Nano legado em organização paga) | US$0,01344/h                                  | Novo projeto pago mínimo Micro; confirmar tamanho real do clone |
| Clone Micro limitado a 48 horas faturadas      | US$0,64512 de compute                         | Cálculo, não quote; fração de hora cobra hora completa          |
| Small                                          | US$0,0206/h                                   | Não necessário automaticamente ao diário                        |
| PITR sete dias                                 | adicional aproximado US$100/mês, Small mínimo | Fora da proposta inicial                                        |
| Disk padrão acima da franquia                  | US$0,125/GB/mês                               | Volume/recursos espelhados precisam de cotação real             |
| Egress acima de 250 GB Pro                     | US$0,09/GB                                    | Inventariar volume e demais projetos                            |
| Cofre/off-site/Storage externo                 | NOT_QUOTED                                    | Provedor, volume, acesso e custo precisam ser aprovados         |

Exemplo condicional: uma única origem Micro coberta pelo crédito, um clone Micro
48h, sem excedentes => US$25,64512 antes de impostos/câmbio. **Não é o total
confirmado desta organização.** O console mostra a cotação específica antes do
restore; ela ainda não está disponível neste Free sem backup. Não inventar um
valor exato de clone, orçamento total ou teto aprovado. Não aceitar orçamento
ilimitado; exigir quote e limite monetário explícito antes de criar/copiar.
Fontes: [restore e cobrança](https://supabase.com/docs/guides/platform/clone-project),
[backup/PITR](https://supabase.com/docs/guides/platform/backups).

## Autorização necessária, separada em etapas

**A — contratação futura, ainda bloqueada:** escolher plano Pro diário sem PITR,
identificar organização e todos os projetos afetados, confirmar orçamento final
e teto, nomear operador/revisor. Autorizar somente a contratação desse plano;
isso não autoriza restore, cópia de dados, mudança de compute ou migration.
Não executar A antes de resolver a viabilidade do isolamento em princípio.

**B — uma prova real, ainda não autorizada:** após backup físico completado,
quote e isolamento comprovados, autorizar uma restauração daquele backup/instante
para o destino nominal acima; copiar banco privado/Auth e, separadamente, os
arquivos Storage especificados no inventário, cifrados; testar integridade e
acesso; preservar somente hashes/status públicos. Aprovar custo exato do quote,
teto, intervalo máximo de 48h, responsáveis e exclusão apenas desse destino.
Nenhuma restauração sobre Production, promoção da Escola ou canário Production.

**Alternativa C — lógico independente:** autorizar explicitamente dump completo
read-only e Storage para armazenamento cifrado nominal fora do Git, e restauração
em cluster isolado offline com egress bloqueado. Ainda exige exportação integral
com papel real, chave Vault recuperável, configuração externa e testes de API.
O harness sintético do #534 não é executor de dump do projeto real.

Uma autorização executável precisa preencher: A/B/C; identidade da organização;
backup ID/instante (B); destino/ref após criação; inventário coberto; pessoas;
cofre/escrow; retenção; quote/teto e moeda; isolamento aprovado. Sem esses campos,
continua BLOCKED, sem pedir permissão genérica para "seguir".

## Custódia, retenção e aceite

Proposta sujeita à aprovação: sete backups diários e quatro semanais independentes;
snapshot pré-janela; clone máximo 48h; exclusão privada do ensaio e chaves ao fim
do prazo aprovado; relatório sanitizado sem dados pessoais. Não existe job de
retenção contratado. DPAPI no mesmo PC não é custódia independente: usar cofre
separado e operador de recuperação distinto, demonstrando abertura da chave sem
depender da máquina de origem. Raiz Vault do clone gerenciado não prova escrow.

Aceite: ponto durável identificável; hash/inventário; catálogo e dados completos,
history/ledger e zero drift; controles de acesso com A/B/anon/service-role;
Auth/Storage API em destino isolado sem contatos reais; leitura de dados cifrados;
chave por custódia independente; zero efeitos externos; descarte autorizado do
destino; tempo medido sem prometer RTO. Nenhum PASS de fixture substitui isso.
Falha, cobertura parcial, falta de chave, quote divergente ou isolamento incerto
interrompem o procedimento, sem alterar expectativas nem Production.

Estado: **REAL_RECOVERY_AUTHORIZATION_PACKAGE_PREPARED_EXECUTION_BLOCKED**.
Os seis preflights e o #523 draft permanecem. Escola não liberada; V1 incompleta.
