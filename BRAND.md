# Liberdade Fiscal — Brand Book

Fonte: brand board fornecido pelo autor (`icons/ChatGPT Image 15 ago
2026, 21_37_50.png`), extraído e verificado contra `CLAUDE.md` §4 e
`style.css` em 15/08/2026. Nenhuma discrepância encontrada — os dois
já estavam alinhados; este ficheiro apenas consolida a informação que
antes só existia dispersa numa imagem.

## Claim

> Descobre quanto do teu trabalho fica realmente contigo.

## Conceito do símbolo

O símbolo é uma ave estilizada com barras de crescimento na base da
cauda. Quatro ideias deliberadas, por ordem de leitura no brand board:

1. **Liberdade** — a ave representa liberdade, leveza e o direito de
   escolher o caminho.
2. **Valor e crescimento** — as barras simbolizam dados, transparência
   e crescimento do valor.
3. **Letra "F"** — a forma do conjunto (asa + corpo) cria a inicial de
   "Fiscal" de forma subtil.
4. **Foco no dinheiro do utilizador** — tudo gira em torno do que a
   pessoa gera e do que realmente lhe fica.

## Paleta de cores

Verificado pixel-a-pixel contra o brand board — coincide exatamente
com `CLAUDE.md` §4 e as custom properties em `style.css` (`:root`).

| Cor | Hex | Papel |
|---|---|---|
| Navy | `#0D1321` | Confiança e estabilidade |
| Green | `#22C55E` | Liberdade e crescimento — **apenas** fundos/preenchimentos/ícones grandes (falha WCAG AA como cor de texto, ver `--color-green-text` em `style.css`) |
| Mint | `#7EEBC1` | Energia e foco / estados positivos |
| Gold | `#F6C453` | Atenção e dinheiro |
| Background | `#F1F3F5` | Clareza e neutralidade |
| White | `#FFFFFF` | — |

## Tipografia

Poppins (Google Fonts, SIL OFL 1.1). O board usa "Poppins SemiBold"
para títulos grandes; o design system em `style.css` usa Light /
Regular / SemiBold / Bold consoante o peso semântico do texto — ver
`fonts/README.md` para a origem exata dos ficheiros autoalojados.

## Personalidade da marca

Cinco traços, mostrados no board com ícones próprios:

- **Transparente**
- **Precisa**
- **Privada**
- **Empoderadora**
- **Independente**

Estes cinco traços mapeiam diretamente para os princípios não
negociáveis do produto em `CLAUDE.md` §1: neutralidade política
("mostra os números, explica o método"), rigor de dados fiscais
(fonte + ano + versionamento), privacidade por desenho (local-first,
sem contas), e o enquadramento que deixa o utilizador tirar as suas
próprias conclusões.

## Variações do símbolo

O board define 5 variações oficiais:

1. **Colorido (principal)** — gradiente verde/mint com asa navy.
2. **Monocromático claro** — símbolo a branco, para fundos escuros.
3. **Monocromático verde** — símbolo a verde sólido.
4. **Em fundo escuro** — dentro de um círculo/quadrado navy.
5. **Em fundo claro** — dentro de um círculo/quadrado branco.

## Ícone de app

O board mostra duas variantes lado a lado: quadrado arredondado navy
com o símbolo colorido, e quadrado arredondado branco com o símbolo em
navy/verde. Os ícones gerados em `icons/icon-192.png`,
`icons/icon-512.png` e `icons/icon-maskable.png` seguem a variante
navy (consistente com `theme_color` em `manifest.json`) — ver
`icons/README.md` para o processo de geração e a margem de segurança
usada no ícone maskable.

## Cartão para partilhar

O mockup do board confirma o formato descrito em `CLAUDE.md` §6.7:
nome da app, bandeira/país, "Dia da Liberdade Fiscal", percentagem de
carga fiscal e um CTA para `liberdadefiscal.pt` — sem dados pessoais.
Já implementado em `data/share-card.js` (Fase 8).

## Ficheiros de origem

Os três ficheiros PNG originais enviados pelo autor ficam em `icons/`:

- `Liberdade_Fiscal_App_Icon_Extracted.png` — arte do símbolo isolada,
  fundo transparente, usada para gerar os ícones da PWA.
- `ChatGPT Image 15 ago 2026, 21_33_27.png` — hero/splash com o
  símbolo e o claim sobre fundo escuro com efeito de brilho (glow),
  útil como referência para ecrãs de splash ou material de
  apresentação.
- `ChatGPT Image 15 ago 2026, 21_37_50.png` — brand board completo
  (fonte deste documento).
