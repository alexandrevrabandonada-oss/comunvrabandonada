# Tijolo 42 — experiência do núcleo vivo

## Decisão

O núcleo vivo passa a ser a pauta. Home, roda, ferramenta, contribuição, acompanhamento e memória compõem uma única jornada.

## Implementado

- Home orientada por “Agora no território”, próxima participação, pautas em construção e resultados.
- Pauta com navegação persistente em seis etapas: Entenda, Converse, Contribua, Construa, Acompanhe e Memória.
- Mapa das Calçadas apresentado como ferramenta da pauta, sem virar produto paralelo.
- Retorno explícito do miniapp à pauta em desktop e celular.
- Participações estruturadas por tipo e aviso de moderação/continuidade.
- Comunidade-piloto editorial “Mobilidade e Acessibilidade”, sem registro artificial no banco.
- Marcadores locais de jornada sem PII.

## Dados

Nenhuma migration foi criada. Permanecem canônicas as tabelas de pautas, módulos, rodas, contribuições, sínteses, timeline, calçadas, prioridades, mobilizações, resultados, memória, memberships e inbox.

## Limites

- piloto público: fechado;
- gate humano: 0/3;
- fixtures sintéticas: somente local;
- Supabase remoto: não alterado;
- domínio: não alterado.

## Publicação técnica

- branch: `codex/tijolo-42-nucleo-vivo`;
- HEAD técnico validado: `072006b458d04319a983d7823ed814199f8884da`;
- PR: [#31 — Tijolo 42: cria o núcleo vivo da experiência COMUN](https://github.com/alexandrevrabandonada-oss/comunvrabandonada/pull/31);
- estado da PR: aberta e mesclável;
- FAST, FULL e Vercel Preview: aprovados;
- merge: não executado;
- produção: não alterada por esta PR.

## Decisão final

`COMUN_NUCLEO_VIVO_READY`
