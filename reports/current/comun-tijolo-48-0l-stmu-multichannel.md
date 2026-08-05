# Tijolo 48.0L — STMU multicanal e e-mail assistido

## Resultado técnico

`COMUN_STMU_48_0L_LOCAL_MULTICHANNEL_GREEN` — candidato local, dormente e pronto para PR/Preview. O resultado terminal de integração permanece condicionado aos checks externos; não houve envio de WhatsApp/e-mail nem alteração remota.

## Modelo

`private.comun_forwarding_attempts` agora registra `channel_id`, versão do adaptador, sequência, estado, latência em faixas e tentativa substituída. Eventos e avaliações de escalonamento são append-only. Uma mesma embalagem/caso permanece idempotente e tentativas não são duplicadas em paralelo.

## Canais

- WhatsApp STMU: `vr-stmu-whatsapp`, fonte verificada, menu vivo 1/2/3 e atendimento 8h–17h; opção 3, perguntas, anexos, protocolo e handoff ainda pendentes.
- E-mail oficial: `stmu@voltaredonda.rj.gov.br`, fonte oficial atual, operação e protocolo ainda não testados; abertura assistida local.
- E-mail de campo: `ouvidoria.onibusvr@gmail.com`, somente observação de sinalização fornecida, não corroborado e bloqueado.
- Telefone `+55 24 3511-3728` e atendimento presencial: fontes verificadas, sem discagem/automação.

## E-mail

O pacote exige assunto, descrição, linha, sentido, local, data, horário, número de ordem quando disponível e pedido de protocolo. O botão de cópia é separado por campo. “Abrir cliente de e-mail” só executa após gesto e usa o destino exato sem corpo, query ou anexo; o envio fica sob controle da pessoa.

## Prazo e escalonamento

72 horas é uma expectativa declarada em fonte oficial, não prazo legal nem garantia do canal. O relógio só começa em `person_declared_sent`; sem declaração, não há vencimento. Tentativas posteriores preservam a anterior e registram a razão.

## Gates preservados

`COMUN_STMU_MULTICHANNEL_LOCAL` é cumulativa com Relata, Carteira, Ônibus, forwarding e WhatsApp locais. Production permanece sem requests, sem migration e sem flag pública.

## Regressão integral local

Também verdes: `COMUN_STMU_48_0K_DB_GREEN`, `COMUN_WALLET_48_0G_DB_GREEN`, `COMUN_FORWARDING_48_0H_DB_GREEN`, `COMUN_SIDEWALK_48_0J_DB_GREEN` e `COMUN_RELATA_48_0D_DB_GREEN`. O smoke HTTP do endpoint multicanal retornou `404` para GET/POST/PATCH/PUT/DELETE com flags desligadas.
