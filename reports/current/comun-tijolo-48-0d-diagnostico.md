# COMUN — Tijolo 48.0D — diagnóstico local

Data: 2026-08-03  
Baseline: `118f1d4c88cc6915ef471ba59cfcfbcf0355d770` (main documental), `6fefaa8e79de53e4c8bee1f4f4c16a71d5bc68c1` (produto/Production)

## DIAG

O worktree deste tijolo parte exatamente de `origin/main` no SHA documental confirmado. A árvore está isolada da cópia de trabalho suja do repositório e não há divergência não forward-only. A verificação read-only de Production confirmou `/comun`, App V2 e fallback com `200`, `/comun/relata` com `404` e a API de evidências dormente.

O 48.0B criou `public.comun_relata_public_snapshots` com `CHECK (publication_state = 'blocked')`, RLS forçado, grants revogados e trigger que rejeita qualquer insert/update/delete. Esse contrato é deliberadamente individual e não possui consumidor público. Ele não será alterado: a projeção do 48.0D será aditiva e local-only.

O 48.0C já fornece casos coletivos, memberships, eventos append-only, localização privada cifrada, HMACs de agrupamento e bucket privado de fotografias. Os RPCs de evidência são server-only e o proxy já mascara a família `/api/comun/relata/evidence` quando as três barreiras locais não estão ativas. A localização exacta não pode ser usada pelo banco para desenhar mapa; a célula métrica pública deve ser derivada no runtime server-side e persistida somente como candidato aproximado.

Há MapLibre/PMTiles no projeto, com carregamento dinâmico em Calçadas. A mesma técnica é apropriada para o mapa local, mas a lista acessível deve continuar disponível sem carregar o mapa. Não há rota nem API pública Relata no baseline.

## PLANO seguro

1. Acrescentar a quarta barreira `COMUN_RELATA_LOCAL_PUBLIC_MAP` e cloaking antes do dispatch para todos os métodos.
2. Criar migration forward-only, sem tocar na migration 48.0B, com tabelas server-only para projeção sanitizada, candidatos de célula e confirmações comunitárias.
3. Implementar política versionada e funções puras de elegibilidade/célula métrica, sem texto privado, coordenada exata, geohash reversível, embeddings ou LLM.
4. Expor apenas endpoints locais allowlisted e um mapa/lista lazy, com confirmação anônima first-party limitada ao próprio caso projetado.
5. Testar flags, monotonicidade espacial, sanitização, confirmação idempotente, no-leak e regressões. Production deve continuar retornando `404` para a nova superfície.

## Riscos/bloqueios observados

- A antiga tabela de snapshots permanece bloqueada por contrato; qualquer tentativa de reutilizá-la como publicação seria um blocker de segurança.
- A projeção não pode afirmar que uma fotografia é publicável e não pode revelar status oficial.
- O mapa só é elegível sob as regras templated do 48.0D; categorias de risco, emergência, saúde, crianças, violência e acusação individualizada ficam bloqueadas.

Conclusão do diagnóstico: baseline explicável, sem escrita remota, patch local aditivo seguro para iniciar.
