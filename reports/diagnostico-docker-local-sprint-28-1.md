# Diagnóstico Docker local — Sprint 28.1

Data: 2026-07-15

## Evidência

- Docker CLI 29.2.1 e Docker Desktop 4.61.0 responderam.
- Contexto ativo: `desktop-linux`.
- Engine Linux 29.2.1 ativo, com containers locais do Supabase saudáveis.
- WSL2, `Ubuntu` e `docker-desktop` estavam em execução.
- `DOCKER_HOST` estava ausente; named pipes Docker estavam disponíveis.
- O serviço Windows `com.docker.service` estava parado, mas não é necessário para o engine WSL2 ativo.

## Causa classificada

Falha transitória de disponibilidade do engine/named pipe no instante da tentativa anterior. Não há evidência de contexto incorreto, `DOCKER_HOST` inválido, instalação incompleta ou permissão insuficiente.

## Recuperação

Nenhuma reinstalação, reset de fábrica, prune ou remoção de volume foi necessária. O engine foi revalidado e o `supabase db reset --local` passou duas vezes.
