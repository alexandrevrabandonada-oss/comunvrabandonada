# COMUN — Tijolo 48.0G — diagnóstico

Data: 2026-08-04 · branch `codex/tijolo-48-0g-wallet`

## Baseline

`origin/main` foi confirmado em `8947b3db28280b988c0a1f72ac67947c9bca7455`, descendente do estado informado. A implementação trabalha em worktree isolada; não houve escrita, consulta ou migration no Supabase remoto. O contrato de origem é o Relata: recibo e protocolo continuam independentes da carteira.

## Diagnóstico de domínio

- `Minha Participação` já era a superfície canônica; não foi criada uma aplicação paralela.
- o cookie `comun_relata_receipt_v1` continua intacto e a carteira usa `comun_participation_wallet_v1` separado;
- protocolos legados são acompanhados, não reivindicados como posse privada;
- Ônibus e casos coletivos entram como referências sanitizadas, sem duplicar a fonte da verdade;
- antes do protocolo, `sessionStorage` continua transitório; depois dele, a carteira server-side é a fonte da verdade.

## Riscos tratados

Tokens, recibos, códigos e hashes não aparecem em respostas rotineiras ou logs. A recuperação rotaciona o token e invalida o código usado. As APIs são server-mediated e a barreira cumulativa exige flag, loopback e service role local. Com a flag desligada, o proxy devolve `404` para a raiz e todos os métodos experimentais.

## Banco local

O primeiro reset encontrou um container compartilhado em inicialização parcial. Um retry focal com `npx supabase db reset --local --yes --no-seed --debug` aplicou toda a cadeia forward-only, incluindo `20260804135032_participation_wallet_local.sql`. O rehearsal posterior passou. A ocorrência foi infraestrutural e não foi promovida a finding do produto.

## Resultado diagnóstico

Carteira anônima local-only implementável sem dual-write: Relata é fonte da verdade; carteira é autorização e organização adicional. O gate técnico segue para PR/Preview; ensaio humano 48.0F-H1 continua pendente.
