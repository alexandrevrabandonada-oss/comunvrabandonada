# Ensaio descartável SOC-D10.M6

Este harness cria sua própria rede Docker **interna**, quatro containers e um
volume anônimo do PostgreSQL. Não publica portas no host, não lê `.env`, não
aceita URL de banco externo, não usa contas ou chaves do projeto e não baixa imagens.
O código do repositório é montado somente para leitura. A/B são contas Auth reais
com e-mails sintéticos `.invalid`, confirmadas administrativamente apenas no lab;
nenhum e-mail, convite ou notificação real é enviado.

```powershell
node scripts/organization/rehearse-organizational-cycle.mjs --run-disposable --output <pasta-nova-de-evidencias>
```

Imagens locais necessárias: `postgres:17`,
`public.ecr.aws/supabase/gotrue:v2.196.0`,
`public.ecr.aws/supabase/postgrest:v16.2`, `node:22.19.0-bookworm-slim`.
O relatório registra os IDs das imagens e os hashes dos fontes usados.

O job `SOC-D10.M6 / authenticated continuity and RLS`, no workflow existente de
Core Journeys, executa o modo HTTP somente em pull requests e com escopo de arquivos.
Constrói a imagem a partir de `git archive` do HEAD exato, sem secrets do projeto.
O gate exige resultado `PASS`: `PARTIAL` por lacuna RLS falha a certificação e
preserva o JSON sanitizado. Não há dispatch, cron, aplicação de migration do produto
ou operação em Production. O Dockerfile deste diretório recebe `COMUN_SOURCE_SHA`.

`disposable-cycle-fixture.sql` é uma **fixture mínima**, não uma migration do
produto. As políticas de ações/tarefas e os dois gatilhos de capacidade/saída são
carregados dos contratos SQL canônicos existentes. A fixture de vínculos e perfis
não equivale ao schema completo instalado. O Auth inicializa seu próprio schema no
banco descartável; nenhuma migration é aplicada a um ambiente COMUN. O papel de
bootstrap do Auth é privilegiado apenas nesse laboratório, sem equivalência com
o isolamento de credenciais de um ambiente publicado.

O ensaio usa JWT emitido por GoTrue, `getUser`, PostgREST e PostgreSQL reais.
Concessão/revogação/pausa/saída são administração controlada da fixture; não são
prova do formulário de ingresso. Aceite por A, isolamento de B, barreira de saída
com tarefa ativa e devolução pelo helper server-side canônico são exercitados no
banco real. O helper recebe a identidade que acabou de ser validada pelo Auth.
Nenhuma flag de ações ou Escola é habilitada para fabricar liberação da interface.

Com o candidato limpo e uma imagem local `comun-m6-proof:<12 primeiros caracteres do SHA>`
construída em Linux a partir de `git archive` desse candidato, a opção
`--with-next-http` inicia o Next dentro do runner e verifica a Mesa com cookies SSR de A/B, respostas
negativas após revogação/pausa/saída e `private, no-store`. Isso não é um teste de
navegador, Service Worker, histórico, modo offline ou ensaio humano. Um artefato
compilado para outra plataforma pode impedir essa camada; o FAIL deve permanecer
registrado, sem ser substituído por testes de contrato. A imagem deve ter o label
`comun.source.sha` com o SHA completo. O harness confere label, ID da imagem,
limpeza da árvore e hashes; não monta o build Windows por cima do artefato Linux.

A saída inclui `PASS`, `FAIL` ou `PARTIAL`. Uma lacuna RLS reproduzida aparece
como `KNOWN_GAP`, nunca como aprovação de segurança. O harness não modifica
políticas para fazê-las passar: uma correção do banco exige revisão/autorização
próprias. Não há transferência automática ou exclusão do histórico de atribuição.

No `finally`, somente recursos cujo label contém o owner deste ensaio são
removidos. O relatório comprova ausência dos containers, volume anônimo e rede.
Na conclusão normal, também consulta Auth para verificar zero usuários sintéticos
antes da remoção do banco inteiro. Não usa `prune`, reset de lab compartilhado ou
limpeza por prefixo. Os relatos de falhas de preparação permanecem separados.
