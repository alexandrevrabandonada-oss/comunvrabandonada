# Arquitetura de informação do COMUN — Sprint 34

## Navegação principal

Em mobile e desktop, a navegação principal tem cinco destinos:

1. **Início** — ponto de partida, contexto e próxima ação.
2. **Comunidades** — pessoas, grupos e vínculos públicos.
3. **Participar** — escolha por objetivo, tempo e consequência.
4. **Territórios** — leitura situada de pautas, ações e memória.
5. **Minha área** — acompanhamento pessoal autenticado.

## Navegação complementar

Pautas, Agenda (ações), Rádio, Arte, Acervo, Observatórios, Buscar, Segurança e privacidade e Sobre ficam no rodapé, nas páginas de contexto e na busca. São ferramentas ou aprofundamentos; não competem com os cinco caminhos principais.

## Conteúdo e relação

```text
território
  └─ comunidade
      └─ pauta
          ├─ ferramenta (roda, mapa, observatório, acervo, rádio, arte)
          └─ ação
              └─ resultado
                  └─ memória
```

## Regras de design

- A home tem seções finitas, sem feed infinito, curtidas, ranking ou métricas decorativas.
- A busca agrupa origem e tipo; não apresenta popularidade como critério.
- O login é contextual: só aparece como requisito ao acompanhar, publicar, assumir ou proteger dados.
- A área pessoal usa prioridade por próxima ação, não por volume de conteúdo.
