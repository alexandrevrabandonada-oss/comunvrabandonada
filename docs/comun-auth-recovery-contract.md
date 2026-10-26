# M7.E — contrato mínimo de recuperação Auth/identidade

## Estado observado em 26/10/2026

O painel autenticado do projeto canônico exibe plano Free, sem backups agendados
do projeto. A tela PITR exige mudança de plano. A disponibilidade atual foi lida
nas duas superfícies; não houve compra, ativação ou tentativa de restore remoto.
Referência: [backups do Supabase](https://supabase.com/docs/guides/platform/backups).

A cópia cifrada do banco da aplicação e o ponto separado do R2 têm provas próprias.
Eles não contêm contas, senhas, sessões, tokens, identidades, e-mails ou MFA do
Auth. Stubs usados no restore PostgreSQL preservam referências para ensaios SQL;
não recuperam contas ou autenticam pessoas. Os pontos de banco e Storage não são
um snapshot atômico conjunto nem prova de RPO contínuo.

## Limites de identidade no restore

1. Preservar UUID e associação de ownership somente com identidade comprovada.
   Mesmo endereço de e-mail, nome ou perfil não autoriza vincular uma nova conta
   a dados ou funções de outra identidade. Nunca reatribuir em massa para fazer
   login voltar a funcionar.
2. Restaurar dados comunitários não aceita automaticamente convites, vínculos ou
   responsabilidades. Pausas, desligamentos, revogações e suspensões continuam
   limitando acesso; histórico preservado não equivale a função ativa.
3. Sessões antigas precisam de revogação e nova autenticação verificáveis. Não
   copiar JWTs, refresh tokens, sessões ou chaves do provedor para o laboratório.
4. Papéis SQL, owners/ACLs e vínculos de pessoas são contratos distintos.
   Membership global não pode ser inferido de ACL de tabela. Nenhum privilégio
   remoto é concedido como parte desta preparação.
5. Falha ou ausência de Auth deve negar acesso reservado. Recuperação parcial não
   libera contribuição/administração nem transforma perfil recuperado em login.

## Prova necessária antes de declarar recuperação Auth

- Capacidade e ponto de recuperação do provedor demonstrados, com finalidade,
  retenção e alvo isolado autorizados. Mudança de plano/custo ou exportação de
  dados internos exige autorização específica, ainda ausente.
- Restauração em alvo descartável, sem trocar URLs, secrets ou flags de Production.
- Duas identidades sintéticas, login real contra Auth e UUIDs associados aos dados
  corretos; negar dados de outra pessoa/comunidade e negar nova conta com contexto
  parecido. Revalidar suspensão, papel revogado e vínculo encerrado.
- Negar JWT antigo/sessão revogada e comprovar reautenticação. Nenhuma notificação,
  convite ou reset real; nenhum novo papel nasce de conclusão de formação.
- Limpeza e ausência do alvo verificadas; provas públicas somente agregadas,
  vinculadas ao SHA e ao ponto realmente restaurado.

Esses critérios são requisitos, não resultados já obtidos. O gate permanece
`COMUN_SECURITY_RESILIENCE_BLOCKED_PROVIDER_CAPABILITY`.

## Observação atual versus capacidade recuperada

`COMUN_PROVIDER_CAPABILITY_OBSERVATION_FILE` permite ao auditor consumir somente
o formato bloqueado implementado em `provider-availability-observation.mjs`.
Projeto, origem, campos, horários e digests de duas capturas são validados.
Observações com mais de 24h, futuro além da tolerância, campos extras ou alegação
de restore/PASS são rejeitados. A geração do envelope não renova `observedAt`.
Digests vinculam capturas operacionais; não autenticam um arquivo recebido de
terceiros. O operador deve produzir a observação pela inspeção autorizada.

Escopo verificado: plano e disponibilidade de backups/PITR. Capacidade integral
de recuperação continua não verificada; o coletor não possui novo caminho GREEN.
Sem arquivo, a observação histórica permanece histórica. Esta entrada não importa
as cópias pontuais de banco/R2 para o coletor nem renova sua idade.

Próximo incremento seguro: ensaio de reautenticação e não reatribuição de ownership
no restore com duas identidades totalmente sintéticas e Auth local descartável.
Isso testa o contrato da aplicação; não substituirá a prova nativa da origem.
