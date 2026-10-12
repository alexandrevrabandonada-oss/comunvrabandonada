# Escola — reprodução da incompatibilidade de transporte API

Estado: `BREVO_API_RECEIVED_AUTH_LINK_REWRITTEN_WITH_TRACKING_FALSE`.
Data local: 11/10/2026. Não é certificação da recuperação real.

## Operação e resultado

Um convite Auth sintético gerado em laboratório vazio pinned foi encaminhado
uma única vez à conta do titular, com autorização específica, pelo endpoint
`POST https://api.brevo.com/v3/smtp/email`. Payload tem somente sender, subject,
htmlContent e um destinatário `to`, com `contactPixelTrackingConsent: false`.
Sem cc/bcc, anexos, templateId ou headers não documentados.

Configuração Brevo antes do envio: consentimento por contato Sim e tracking
desconhecido Não, salvamento confirmado. Chave exclusiva temporária, plano Free;
nenhum dado de usuário restaurado, sessão ou token Production foi enviado.

HTTP201 não foi tratado como fidelidade. Message-ID retornado foi localizado
no Gmail; MIME entregue contém link de clique sendibt2.com e duas imagens.
O único link esperado era loopback `/verify` do laboratório. Guard recusou
a divergência antes de confirmação. Sem acesso ao redirect/pixels e sem retry.

## Evidências e limites

- Prova MIME sanitizada: SHA-256
  `f41f77da688dbe0840fa5d5b0674eee5e32a45253ad69dca4abf9f08a64b869e`.
- MIME original cifrado: SHA-256
  `5523e5e484681189cc37e344bd68cd83313c437fc5b218ac73bc3f2b4cb2f9a7`.
- Originais, contexto Auth, credenciais e autorizações ficam no E: privado;
  não anexar o MIME ou os links com token a um ticket público.
- Laboratório removido após arquivamento cifrado, zero sessões. Zero escritas
  Production, custos contratados ou alterações no SMTP Source.

A documentação descreve false como ausência de tracking:
[contrato de consentimento](https://help.brevo.com/hc/en-us/articles/37113920427922-About-email-tracking-pixels-and-the-CNIL-recommendation-in-Brevo).
A [referência API](https://developers.brevo.com/reference/send-transac-email)
confirma endpoint/autenticação, mas o aceite do payload não demonstra que cada
propriedade foi aplicada. A causa interna não está comprovada.

## Requisito externo delimitado

Obter confirmação técnica do mecanismo efetivamente suportado nesta conta para
preservar o link Auth sem tracking, incluindo eventuais requisitos de ativação
e o schema API aceito. Depois preparar um ensaio distinto revisado, com nova
autorização nominal. Este documento é reprodução para revisão, não mensagem
enviada ao suporte. Não ignorar o finding, inventar header, repetir tentativa
equivalente ou trocar provedor silenciosamente.

Até resolver esse requisito e os demais contratos externos: recuperação integral
BLOCKED; permit NOT_ISSUED; migration NOT_RUN; seis preflights intactos.
