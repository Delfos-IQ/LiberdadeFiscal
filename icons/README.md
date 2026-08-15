# Icons — gerados a partir do logo do autor

`manifest.json` referencia:

- `icon-192.png` (192×192, `purpose: "any"`)
- `icon-512.png` (512×512, `purpose: "any"`)
- `icon-maskable.png` (512×512, `purpose: "maskable"`)

## Origem

Gerados a partir de `Liberdade_Fiscal_App_Icon_Extracted.png` (o
pássaro estilizado + barras de crescimento, em PNG com fundo
transparente, 1024×1024) fornecido pelo autor em 15/08/2026.

## Como foram construídos

1. Recorte da caixa delimitadora real da arte (removendo a margem
   transparente irregular do ficheiro original).
2. Composição num canvas quadrado com fundo `#0D1321` (navy, cor de
   marca) — replica a variante "fundo escuro" mostrada no brand board
   do autor (`ChatGPT Image 15 ago 2026, 21_37_50.png`, secção "Ícone
   de app").
3. `icon-192.png` / `icon-512.png` (`purpose: "any"`): a arte ocupa
   ~72% da altura do canvas. O sistema operativo aplica o seu próprio
   recorte de cantos (ícone quadrado "cru", sem arredondamento manual).
4. `icon-maskable.png`: a arte ocupa apenas ~55% da altura do canvas,
   deixando uma margem de segurança generosa para a "safe zone" da
   spec de ícones maskable — testado com uma máscara circular (o caso
   mais agressivo) sem cortar nenhuma parte do pássaro.

## Ficheiros de origem mantidos no repositório

- `Liberdade_Fiscal_App_Icon_Extracted.png` — arte limpa em fundo
  transparente, usada para gerar os três ícones acima.
- `ChatGPT Image 15 ago 2026, 21_33_27.png` e
  `ChatGPT Image 15 ago 2026, 21_37_50.png` — brand board completo do
  autor (paleta, tipografia, variações do símbolo, mockups). Mantidos
  como referência de marca; ver também `BRAND.md` na raiz do projeto.

Se o autor quiser trocar a cor de fundo do ícone (p.ex. usar a
variante clara em vez da escura), basta regenerar os três ficheiros a
partir do PNG de origem — o script usado está documentado no histórico
de commits desta alteração.
