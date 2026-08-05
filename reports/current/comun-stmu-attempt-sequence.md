# Sequência de tentativas e escalonamento — 48.0L

Uma tentativa pertence a um único pacote/caso e possui `sequence_no`. A primeira tentativa não é apagada quando uma segunda é criada; a substituição é explícita via `supersedes_attempt_id`. Estados suportados incluem preparação, abertura pela pessoa, declaração de envio, aguardando reconhecimento/protocolo, resposta, resolução, sem resposta, indisponível, abandono e substituição.

Regra operacional:

1. preparar e revisar;
2. abrir o canal por gesto;
3. pessoa declara se enviou;
4. somente então iniciar a expectativa de 72 horas;
5. registrar protocolo/resposta se a pessoa informar;
6. avaliar nova tentativa sem duplicar envio simultâneo.

O rehearsal local comprovou um caso Relata, múltiplas tentativas isoladas, idempotência e ausência de submissão externa.

