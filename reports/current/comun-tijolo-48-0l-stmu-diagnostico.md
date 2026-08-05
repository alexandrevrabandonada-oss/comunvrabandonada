# Tijolo 48.0L — diagnóstico STMU multicanal

Data: 2026-08-04

## Baseline

- `origin/main` e `HEAD`: `7d40abbac84daaa4a4298dcea1e471f7441b6830`.
- Branch: `codex/tijolo-48-0l-stmu-multichannel`.
- Production observado somente por smoke read-only; nenhum Supabase remoto foi consultado ou alterado.
- Flags públicas permanecem desligadas.

## Diagnóstico

O encaminhamento compartilhado já possuía um caso Relata, carteira, pacote privado, abertura assistida e tentativa append-only, mas a sequência multicanal ainda não distinguia canal, tentativa, latência e escalonamento. O e-mail oficial precisava de contrato explícito; o endereço de campo não corroborado não poderia ser tratado como canal ativo.

## Decisões

- Um único caso Relata pode ter tentativas sequenciais por canais diferentes.
- A tentativa de e-mail oficial é assistida: revisão, cópia explícita e abertura `mailto:` sem corpo ou query; nunca envio automático.
- WhatsApp, telefone e atendimento presencial permanecem canais sem automação.
- A expectativa de 72 horas é informativa, não legal, e só inicia após declaração da pessoa.
- O Gmail de campo é candidato bloqueado até verificação independente.

## Segurança

Migration local-only forward-only, RLS forçada, grants explícitos e RPCs `service_role` server-side. O laboratório usa Supabase loopback descartável. Nenhum segredo, PII, coordenada, fotografia ou protocolo oficial é gravado em URL, log público ou artifact.

## Regressão de harness

A expansão aditiva de fontes STMU tornou obsoleta a asserção do rehearsal legado que exigia exatamente três registros Fiscaliza. O harness foi corrigido de forma focal para selecionar as três evidências Fiscaliza por semântica de prazo, sem reduzir cobertura. O reset integral local também apresentou `LegacyStorageGatewayStatusError` 500 após aplicar a cadeia; um retry focal da stack permitiu executar os rehearsals verdes. Isso é falha de infraestrutura descartável, não finding do produto.
