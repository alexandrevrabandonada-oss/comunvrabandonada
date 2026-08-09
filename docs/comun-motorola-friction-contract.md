# COMUN — contrato de fricção Motorola

## Princípio

> A pessoa deve conseguir iniciar a ação antes de precisar entender como o COMUN se organiza.

O gesto de referência é: **vi um problema → um gesto → estou registrando**.

## F1 — acesso

- De qualquer superfície principal do App V2, `/comun/relatar` deve estar a um gesto intencional.
- O botão central mobile e o CTA dominante da Home abrem o Relata diretamente, sem modal e sem login.
- Conta, comunidade, pauta, território, órgão, Carteira e classificação não antecedem a captura.
- “Participar” continua como caminho secundário para as demais formas de participação.
- Linguagem primária: “Vi um problema”, “Guardar”, “Meus registros” e “Ver andamento”.
- Detalhes opcionais aparecem depois da intenção principal e não competem visualmente com ela.

Meta verificável: **Home ou navegação mobile → Relata = 1 gesto**.

## F2 — Capture First ativo

- A captura básica aceita **foto ou frase** e guarda antes de pedir detalhes que
  não mudam o destino.
- Foto sem frase preserva `original_text IS NULL`; não há visão computacional,
  texto inventado, publicação ou encaminhamento automático.
- Calçadas usa enriquecimento progressivo: guardar o Relata é diferente de
  concluir a entrada especializada na fila do mapa.
- O primeiro shortcut do PWA é “Vi um problema” e abre `/comun/relatar`.

Meta técnica preservada: **captura básica com até três ações obrigatórias**.
F2 está concluído; a medição humana de tempo e compreensão pertence a 48.1C.

## 48.1C — observação humana

Meta de observação: **mediana da captura menor que 30 segundos**. Esta meta
ainda não foi medida nem atingida. O piloto deve verificar se a pessoa vai da
intenção ao resultado sem precisar aprender a arquitetura do COMUN, inclusive
se entende “Guardado” e consegue reencontrar o registro.

## Telemetria sanitizada

A captura atual registra apenas evento, contagem de interações e faixa de duração. Nunca inclui texto, coordenada, protocolo, recibo, linha de ônibus, fotografia ou identificador privado. Os percursos a consolidar sem ampliar o schema são:

- Home → Relata → Guardado;
- Home → Calçadas → Guardado;
- Home → Ônibus → Guardado;
- Meus registros → item aberto.

## Inventário PWA

- Manifesto existente: `app/manifest.ts`.
- Primeiro shortcut: “Vi um problema” → `/comun/relatar`.
- Demais shortcuts: Participar, Territórios, Comunidades e Minha área.
- Share Target: não configurado.
- Web Share Target permanece fora do contrato atual; não existe captura por
  movimento, shake ou gesto físico obrigatório.
