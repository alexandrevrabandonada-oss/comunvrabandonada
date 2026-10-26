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

## Ensaio autenticado descartável implementado

```powershell
node scripts/security/rehearse-auth-identity-restore.mjs --run-disposable --output <diretorio-absoluto-novo>
```

O harness cria seis containers e uma rede interna próprios, sem portas publicadas
ou volumes persistentes. Reutiliza imagens locais por ID, sem pull: PostgreSQL17,
GoTrue2.196.0, PostgREST16.2 e Node22.19.0. Recusa contexto Docker remoto e não
aceita URL, env-file, UUID ou conta externos. Configurações são exclusivamente
sintéticas, temporárias e restritas; só o driver HTTP é montado readonly.

Origem e destino usam bancos distintos no mesmo PostgreSQL descartável em tmpfs.
Contas A/B fazem login real. O dump em memória inclui somente schemas da fixture
da aplicação e da barreira de sessão, nunca dados do schema Auth. O destino inicia
com zero contas/sessões e recebe os dados restaurados. Uma conta nova usa o e-mail
sintético de A, mas outro UUID; outra identidade de teste é recriada por operação
administrativa local com o UUID sintético conhecido. Essa recriação controlada
não é mecanismo de associação de contas reais nem prova de recuperação nativa.

Mantém-se a mesma chave de assinatura sintética entre os dois bancos para provar
a barreira de sessão, sem atribuir a negação a uma troca de chave. JWT válido na
origem não pode ler dados reservados no destino; e-mail igual não herda ownership.
Somente o UUID conhecido, com nova sessão, acessa sua linha restaurada. O ensaio
inclui logout, refresh negado, novo login sem ressuscitar JWT anterior, perfil
suspenso e banimento nativo com perfil ativo como controle positivo.

A fixture relacional é a mínima existente do M6. A migration
`20261024174838_comun_legacy_private_live_session.sql` é carregada literalmente
apenas no laboratório. Não equivale ao schema completo instalado, a teste da
Mesa/Next no browser ou à aplicação remota da migration. O helper SECURITY DEFINER
mantém sua exceção restrita já autorizada; este trabalho não amplia grants.

Intenções de criação identificam owner e nomes antes de cada operação Docker.
Limpeza exige label do owner, rede correta e ausência independente dos recursos;
verifica também zero contas sintéticas antes de destruir o banco e ausência das
configurações temporárias. Não usa prune/reset. Falha de readiness inicial ficou
preservada; o namespace foi encurtado para respeitar o limite DNS. O ciclo de
desenvolvimento seguinte passou com 24 verificações antes dos controles positivos
adicionais; a certificação do candidato inclui esses controles e hashes próprios.

Os testes de contrato cobrem rejeição de alvos externos e proteção de limpeza de
recursos alheios. Os resultados HTTP/SQL reais ficam no receipt separado, com SHA,
hashes dos fontes, IDs das imagens e cleanup. Não promover esse receipt a GREEN
do provedor: contas reais, MFA, chaves, recuperação nativa e RPO seguem pendentes.

O job M6 existente de Core Journeys executa também esse ciclo em PRs do escopo,
após preparar suas imagens locais. Exige SHA próprio, ao menos 26 verificações
PASS e cleanup integral, mantendo `nativeProviderRecoveryVerified=false`.
Preserva somente JSON agregado como artifact; não adiciona job, scheduler,
dispatch manual, secrets do projeto ou autorização de restore remoto.
O preparo CI fixa o digest da imagem Node já usada no laboratório; o harness
continua recusando pull e registra os IDs efetivamente utilizados.
