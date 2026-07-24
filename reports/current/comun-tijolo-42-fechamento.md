# Fechamento do Tijolo 42 — Núcleo Vivo

Atualizado em 24 de julho de 2026.

## Identificação

- base `main`: `7152bb7d946ac4245053ae3cd0e2563a3822ac51`;
- branch: `codex/tijolo-42-nucleo-vivo`;
- HEAD técnico validado: `072006b458d04319a983d7823ed814199f8884da`;
- HEAD documental: `ca40c96b5fd2b4991e4fe987b636a7e8811fdbe1`;
- merge commit na `main`: `41d218fa670a24eef8d2a1ce3e3a35a9c5172a47`;
- PR: [#31](https://github.com/alexandrevrabandonada-oss/comunvrabandonada/pull/31);
- migration: nenhuma.

## Entrega

A pauta tornou-se a unidade central da experiência. Home, roda, participação,
Mapa das Calçadas, Minha Participação, Caixa de entrada, resultados e memória
agora apresentam continuidade explícita.

O mapa permanece na rota especializada, mas deixa claro que pertence à pauta
“Calçadas em circulação” e oferece retorno visível em desktop e mobile. A
comunidade-piloto é “Mobilidade e Acessibilidade”.

## Evidências

- typecheck e lint aprovados;
- 256/256 testes unitários;
- build aprovado;
- E2E específico 10/10;
- Axe 6/6;
- smoke `COMUN_NUCLEO_VIVO_LOCAL_OK`;
- FAST e FULL aprovados no run `30122395558`;
- Vercel Preview aprovado;
- reconciliação dupla, regressões críticas, no-leak e cleanup aprovados.
- PR #31 mesclada por merge commit em 24 de julho de 2026, sem squash,
  rebase ou promoção;
- CI da `main` aprovado no
  [run 30125728267](https://github.com/alexandrevrabandonada-oss/comunvrabandonada/actions/runs/30125728267);
- deployment Vercel da `main` aprovado no merge SHA;
- `/comun`, `/comun/calcadas` e `/comun/participar`: HTTP 200;
- `/comun/minha-participacao` e `/comun/caixa-de-entrada`: HTTP 307 para o
  fluxo autenticado;
- PMTiles canônico: HTTP 206 com `Range`;
- `/comun/pautas/calcadas-em-circulacao`: HTTP 404.

## Gate pós-merge

O merge e o deployment foram concluídos, mas o smoke encontrou um link interno
quebrado: o Mapa das Calçadas aponta para a pauta canônica, enquanto essa rota
retorna 404 no domínio `comunsocial.online`. A navegação pauta ↔ mapa não pode
ser considerada aprovada.

O Tijolo 43 não foi iniciado. A correção exige uma decisão controlada entre:

- corrigir a aplicação por uma PR mínima; ou
- criar/publicar o registro ausente por uma operação remota explicitamente
  autorizada.

Nenhuma dessas ações foi executada durante o fechamento.

## Hotfix 42.1 em validação

A branch `codex/tijolo-42-1-pauta-canonica` partiu do merge SHA e implementa
um fallback editorial local, sem registro remoto. O registro público real
mantém precedência; linha privada, arquivada ou erro de consulta não ativam o
fallback.

O gate local passou com 263/263 unitários, build, smokes, 14/14 E2E, 8/8 Axe e
fixtures limpas. A decisão de produção permanece bloqueada até CI, merge e
smoke público.

## Declarações

- merge: executado por merge commit;
- piloto público: fechado;
- gate humano: 0/3;
- Supabase remoto: não alterado;
- domínio: não alterado;
- promoção remota: não necessária;
- decisão técnica pré-merge: `COMUN_NUCLEO_VIVO_READY_TO_MERGE`;
- decisão de produção: `NO_GO_PAUTA_CANONICA_404`;
- `COMUN_NUCLEO_VIVO_PRODUCTION_GREEN`: não declarado.
