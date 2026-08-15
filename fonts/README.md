# Fonts — Poppins autoalojada (pendente de upload)

Este directorio está vazío a propósito, igual que `icons/`. O sandbox
de construção não tem acesso à rede fora de uma lista branca, por isso
não foi possível descarregar os ficheiros aqui — precisam de ser
adicionados manualmente pelo autor.

## Porquê autoalojar

O CLAUDE.md declara privacidade por desenho (secção 1) e diz
explicitamente que o único fluxo com saída de dados para terceiros é o
OCR de fotos (secção 9). Carregar Poppins via Google Fonts contradiz
isso — cada visita enviava o IP do utilizador à Google antes de a app
fazer seja o que for. Autoalojar resolve isto e, de bónus, faz a
tipografia funcionar offline desde a primeira visita.

## Ficheiros necessários

`style.css` já tem as declarações `@font-face` prontas, à espera destes
quatro ficheiros nesta pasta:

- `poppins-light.woff2` (peso 300)
- `poppins-regular.woff2` (peso 400)
- `poppins-semibold.woff2` (peso 600)
- `poppins-bold.woff2` (peso 700)

## Como obtê-los

Poppins é open-source sob licença SIL Open Font License 1.1 — livre
para uso comercial, basta manter a licença junto aos ficheiros.

**Opção A — google-webfonts-helper (mais simples, já vem em woff2):**
1. Visita `https://gwfh.mranftl.com/fonts/poppins`
2. Seleciona os pesos 300, 400, 600, 700 (apenas "normal", sem itálico)
3. Escolhe "Modern Browsers" (só woff2)
4. Descarrega o `.zip`, renomeia os ficheiros para os nomes acima e
   coloca-os aqui

**Opção B — repositório oficial Google Fonts:**
1. `https://github.com/google/fonts/tree/main/ofl/poppins`
2. Descarrega os `.ttf` dos pesos necessários
3. Converte para `.woff2` (p.ex. com `fonttools` — `pip install
   fonttools brotli` e depois `fonttools varLib.instancer` ou um
   conversor online de confiança)

## Depois de adicionar os ficheiros

Atualiza `sw.js`: adiciona os quatro caminhos a `STATIC_ASSETS` para
que fiquem pré-cacheados e disponíveis offline desde a primeira visita,
tal como o resto do shell.
