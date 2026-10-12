# Escola — bateria externa delimitada

Preparação, não envio nem recibo integral. Convite recebido via Gmail já provado;
não repeti-lo. Auth vazio pinned PG17.6/GoTrue v2.196, sem dados Source, mounts ou
portas externas; laboratório e receptor SMTP próprios. Usar somente templates
capturados e valores legíveis, preservando hashes e capturas originais.

## Lote proposto para decisão única

Transporte: conector Gmail já conectado, remetente
`alexandrevrabandonada@gmail.com`. Destinos exclusivos, ambos aliases da mesma
caixa do titular: `alexandrevrabandonada+comun-escola-lab-a@gmail.com` e
`alexandrevrabandonada+comun-escola-lab-b@gmail.com`. Nenhum terceiro, cc/bcc,
anexo, envio Production, custo ou reenvio automático.

| Fluxo             | Operação no Auth local             | Destino                         | Máximo |
| ----------------- | ---------------------------------- | ------------------------------- | ------ |
| Cadastro          | signup protegido, identidade A     | A                               | 1      |
| Recuperação       | recover de A                       | A                               | 1      |
| Magic link/OTP    | otp de A                           | A                               | 1      |
| Mudança de e-mail | user update autenticado A → B      | A e B, conforme política Source | 2      |
| Reautenticação    | reauthenticate da identidade final | B                               | 1      |

Máximo total: **6 mensagens**, cinco operações, cada operação uma única vez.
Uma política que gere menos mensagens não autoriza usar o saldo. Qualquer mensagem
extra, destinatário diferente ou template divergente bloqueia antes do transporte.
Este lote ainda não foi autorizado; convites anteriores consumidos não o cobrem.

## Preparação antes de qualquer envio

1. Completar Subject Source change-email por interface suportada; se indisponível,
   uma leitura humana não secreta, marcada HUMAN_READ_SOURCE. Nunca default presumido.
2. Reproduzir os cinco fluxos primeiro no receptor local, contar MIME reais e
   confirmar política de mudança de e-mail. Manter CAPTCHA Source: negação sem
   token não prova aprovação; não usar admin generate_link como substituto.
3. Adaptador deve suportar explicitamente mensagens com link e código OTP. O
   adaptador atual de convite não suporta OTP e não será usado silenciosamente.
4. Conferir assunto/body/hash, destinatários, tipo de fluxo, ausência de tracking
   e identidade exclusivamente sintética. Token fica cifrado; nunca Git/artifact público.
5. Criar marcador persistente exclusivo por mensagem antes de chamar o conector.
   Aceite ou resultado incerto consome a tentativa. Nenhum retry automático.

## Assertions e limpeza

Recebimento ligado ao Message-ID e INBOX; assunto/HTML fiéis, sem link reescrito,
pixel ou destinatário adicional. Confirmar somente link/código **recebido**, antes
de consumir o original. Exigir sessão do usuário sintético correto, recusa cruzada,
logout e zero sessões; mudança de e-mail segue política capturada, sem reduzi-la.
Token alterado, tracking, extra recipient, replay, máscara e resposta incerta
devem bloquear. Preservar MIME e logs privados cifrados antes da limpeza restrita
aos containers/identidades identificados pelo run. Não abrir rede do restore real.

## Limites e sequência da migration

Interação humana CAPTCHA, quando necessária, não será simulada. Prova de conector
operacional não equivale a custódia/restauração da configuração externa inteira.
Fechar essas provas antes de renovar backup. Depois: backup real protegido → restore
isolado/dez requisitos → recibo revisado <=1h → PRE <=5min → avaliação do executor
→ única migration já autorizada condicionalmente. COMMIT desconhecido: reconciliação
read-only; nenhum replay automático. Seis preflights #523 continuam obrigatórios.

Gates existentes inalterados. Não foi introduzido gate humano de lançamento como
pré-condição nova da migration. Crash da instância padrão permanece finding separado.
