# Escola — recuperação externa sem plano pago

Decisão preparada, não executada. Custo realizado nesta rodada: zero contratação.
SMTP do laboratório passou; entrega externa, Google real e configuração externa
completa continuam NOT_RUN/BLOCKED. Production não será reconfigurada para este
ensaio. O acesso PostgreSQL já está resolvido; não pedir outra troca de senha.

## Opções atuais verificadas

| Opção                   | Oferta oficial consultada em 10/10/2026 UTC                               | Requisitos ainda não provados                                                                                          |
| ----------------------- | ------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| Brevo Free              | US$0/mês, 300 envios/dia, sem cartão, e-mail transacional incluído        | Conta aprovada, remetente/domínio autorizado, acesso SMTP e limites efetivos da conta                                  |
| Resend Free             | Plano gratuito, limite 100/dia, SMTP e três domínios no comparativo atual | Conta, chave e domínio verificado; não assumir quota mensal a partir de post antigo                                    |
| SMTP integrado Supabase | Serviço gerenciado já existente                                           | Não é exportado com o dump; restrição a endereços autorizados e limites próprios; não ensaiado no destino independente |

Fontes: [Brevo Free](https://help.brevo.com/hc/en-us/articles/208589409-About-Brevo-s-pricing-plans),
[Resend pricing](https://resend.com/pricing), [Resend SMTP](https://resend.com/docs/send-with-smtp),
[Supabase SMTP](https://supabase.com/docs/guides/auth/auth-smtp).
Não cadastrar cartão, permitir cobrança por excedente, escolher add-on ou
contratar domínio novo. Revalidar a oferta e restrições na conta antes do ensaio.
Plano gratuito não garante entrega, SLA ou inexistência de limite operacional.

## Operação mínima que ainda precisa de acesso e autorização específicos

1. Identificar uma conta SMTP existente ou escolher uma conta Free. O titular
   conclui criação/termos e eventual confirmação. Remetente e destinatário do teste
   precisam ser nominais e autorizados; não inferir da lista de usuários restaurada.
   Nenhuma lista de contatos, backup ou dado de usuários será enviado ao provedor.
2. Guardar credencial SMTP pelo canal local cifrado em E:, nunca no chat, Git ou
   artifacts públicos. Para Resend, a documentação informa `smtp.resend.com`,
   usuário `resend`, porta 465 TLS ou 587 STARTTLS e chave como senha. Para Brevo,
   capturar parâmetros da própria conta. Verificar TLS e escopo antes de enviar.
3. Preparar uma mensagem sintética única em destino de teste independente,
   sem contas reais do backup, session tokens, OTPs reais ou links válidos de
   Production. Exigir autorização específica para esse envio ao destinatário
   nominal. Capturar aceitação SMTP e recebimento separadamente; aceitação SMTP
   não é comprovação de entrega. Sem retries automáticos que dupliquem mensagem.
4. Provar separadamente a configuração OAuth em um cliente de ensaio isolado.
   Consulta pública de discovery não comprova login/callback. Não ampliar rede
   do banco restaurado, alterar redirects Source, DNS ou exigir CAPTCHA humano
   sem delimitar operação/destino. Se o ensaio pedir login humano, registrá-lo
   como tal; não inventar aprovação ou responsável.

Nenhuma alteração SMTP, de providers, redirects, DNS, flags ou indexação de
Production está incluída nesse plano. Não usar senha Google/OAuth secret como
credencial SMTP. O plano não resolve automaticamente custódia/acesso ao domínio
ou recuperação de toda a infraestrutura externa. Registrar lacunas restantes.

## Retomada da migration já autorizada

Depois das provas externas aplicáveis, revisar a cobertura do recibo real completo
contra artifacts preservados. Não escrever `externalConfigurationRecoverable=true`
com base apenas no receptor local. Capturar/ensaiar um backup novo dentro da
janela de uma hora; preservar a custódia independente. Recapturar PRE em até cinco
minutos, conferir main/tree, TLS, hashes, catálogo, cinco ledgers e Escola ausente.
Só então executar exclusivamente `20261006134804` pelo motor transacional de
uso único, nunca `db push` global. Resposta de COMMIT desconhecida exige reconciliação
read-only, não retry. Depois, POST e seis preflights reais do #523.

Até lá: **migration NOT_RUN, seis preflights preservados, Escola não liberada**.
