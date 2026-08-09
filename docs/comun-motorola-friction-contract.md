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

## F2 — captura futura

Meta: **captura básica com até três ações obrigatórias**. F1 não habilita foto-only, não altera os campos obrigatórios de Calçadas e não muda o contrato de persistência.

## 48.1C — observação humana

Meta de observação: **mediana da captura menor que 30 segundos**. Esta meta ainda não foi medida nem atingida por declaração.

## Telemetria sanitizada

A captura atual registra apenas evento, contagem de interações e faixa de duração. Nunca inclui texto, coordenada, protocolo, recibo, linha de ônibus, fotografia ou identificador privado. Os percursos a consolidar sem ampliar o schema são:

- Home → Relata → Guardado;
- Home → Calçadas → Guardado;
- Home → Ônibus → Guardado;
- Meus registros → item aberto.

## Inventário PWA (somente leitura em F1)

- Manifesto existente: `app/manifest.ts`.
- Shortcuts atuais: Participar, Territórios, Comunidades e Minha área.
- Share Target: não configurado.
- Recomendação para F2: avaliar shortcut “Vi um problema” e Web Share Target sem habilitar captura por movimento, shake ou gesto físico obrigatório.
