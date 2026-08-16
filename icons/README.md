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

## Variante branca do logo do header + favicon (16/08/2026)

O símbolo colorido (`logo-mark.png`) tem a asa superior em navy escuro
— sobre o header navy da app (mesma cor de fundo), essa parte
desaparecia quase por completo, fazendo o logo parecer cortado e
pequeno. Gerados dois ficheiros novos a partir de `logo-mark.png`,
usando o canal alpha como máscara (Pillow):

- `logo-mark-white.png` — silhueta branca sólida, fundo transparente,
  recortada à caixa delimitadora real da arte. Usada em
  `.app-header__logo` (ver `index.html`), agora a 48px/56px de altura
  (antes 32px com o logo colorido).
- `favicon-512.png` (+ derivados `favicon-{16,32,48,180,192}.png` e
  `favicon.ico` multi-resolução) — a mesma silhueta branca, centrada
  num quadrado navy sólido com margem generosa. Substitui o antigo
  favicon (`icon-192.png`, colorido, detalhes finos ilegíveis a
  16-32px) nos `<link rel="icon">` de `index.html`.

Script de geração (Pillow — `python3`, executado a partir de `icons/`):

```python
from PIL import Image

img = Image.open("logo-mark.png").convert("RGBA")
alpha = img.split()[3]
bbox = alpha.point(lambda p: 255 if p > 10 else 0).getbbox()
cropped = img.crop(bbox)

# Silhueta branca, fundo transparente
white = Image.new("RGBA", cropped.size, (255, 255, 255, 255))
white.putalpha(cropped.split()[3])
white.save("logo-mark-white.png")

# Favicon: mesma silhueta, centrada num quadrado navy (#0D1321)
canvas = Image.new("RGBA", (512, 512), (13, 19, 33, 255))
scale = (512 - 2 * round(512 * 0.14)) / max(cropped.size)
resized = white.resize([round(d * scale) for d in cropped.size], Image.LANCZOS)
pos = tuple((512 - d) // 2 for d in resized.size)
canvas.alpha_composite(resized, pos)
canvas.save("favicon-512.png")
```

O `manifest.json` (ícone da tela principal do telemóvel) mantém-se
com os ícones coloridos originais — mais vívidos onde há espaço para
os detalhes; só o header/favicon (contextos pequenos e sobre navy)
precisavam da variante branca.
