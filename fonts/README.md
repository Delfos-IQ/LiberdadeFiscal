# Fonts — Poppins autoalojada

`style.css` declara `@font-face` para estes quatro ficheiros:

- `poppins-light.woff2` (peso 300)
- `poppins-regular.woff2` (peso 400)
- `poppins-semibold.woff2` (peso 600)
- `poppins-bold.woff2` (peso 700)

## Porquê autoalojar

O CLAUDE.md declara privacidade por desenho (secção 1) e diz
explicitamente que o único fluxo com saída de dados para terceiros é o
OCR de fotos (secção 9). Carregar Poppins via Google Fonts contradiz
isso — cada visita enviava o IP do utilizador à Google antes de a app
fazer seja o que for. Autoalojar resolve isto e, de bónus, faz a
tipografia funcionar offline desde a primeira visita (os ficheiros
estão em `STATIC_ASSETS` em `sw.js`).

## Origem

Descarregados em 15/08/2026 do repositório oficial
`github.com/google/fonts` (`ofl/poppins/`), que espelha o catálogo do
Google Fonts. Ficheiros `.ttf` originais convertidos para `.woff2` com
`fonttools` (`fontTools.ttLib.TTFont`, `flavor = "woff2"`).

Pesos convertidos: Light (300), Regular (400), SemiBold (600), Bold
(700) — apenas estilo normal, sem itálico, conforme o design system
não usa itálico em nenhum ecrã.

## Licença

Poppins é open-source sob a SIL Open Font License 1.1 — livre para uso
comercial. O texto integral da licença está em `OFL.txt` nesta pasta,
tal como exige a licença ao redistribuir os ficheiros.
