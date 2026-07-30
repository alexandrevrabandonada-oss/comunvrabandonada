# Baseline de entregabilidade V1 — COMUN

Data: 29/07/2026

Resultado inicial: `COMUN_V1_DELIVERABILITY_IN_PROGRESS`

## O que já está comprovado

- núcleo público, Home, Minha área, Inbox e busca possuem implementações e baterias locais anteriores;
- persistência comunitária, preferências, papéis separados e grupos possuem base de dados e RLS;
- pauta, tarefas, ações, protocolos, resultados, dossiês e operação editorial já existem como domínios do produto;
- o Mapa das Calçadas está ativo, recebeu contribuição real, publicou registro moderado e possui cockpit e piloto territorial;
- existem baterias de E2E, acessibilidade, visual, PWA, segurança, RLS, backup e restore para diferentes recortes;
- Vercel, Supabase, Auth anônimo, CAPTCHA, banco e Storage estão integrados em produção para o escopo das calçadas.

## Pendências herdadas que continuam relevantes

Relatórios anteriores registraram como pendentes:

- solicitação e aprovação moderada de comunidades;
- interface administrativa de papéis e grupos;
- conexão integral dos publicadores comunitários da Inbox;
- matriz residual de falhas PWA e autenticação;
- performance 25/50/100 com itens realmente materializados;
- ensaio humano independente;
- promoção integral e limpa do conjunto completo.

Essas pendências não são automaticamente consideradas resolvidas pela ativação do Mapa das Calçadas. Cada uma precisa de evidência atual e escopo próprio.

## Findings já visíveis

- a superfície pública do mapa ainda utiliza a expressão “registros demonstrativos”, incompatível com o lançamento integral;
- diferentes áreas possuem testes e operações fortes, mas não existe uma fonte única de verdade de go/no-go da plataforma;
- o projeto tem muitas capacidades implementadas, porém a prova de jornada integral em produção continua fragmentada;
- o lançamento integral ainda não possui escopo V1 fechado nem um único gate humano terminal.

## Decisão

O Tijolo 47.1 cria:

1. escopo V1 explícito;
2. dez domínios de entregabilidade;
3. painel administrativo de lançamento;
4. auditoria read-only diária;
5. uma única issue agregadora;
6. um único gate humano final: `launch_publicly`.

Nenhuma abertura pública integral é autorizada por este baseline.
