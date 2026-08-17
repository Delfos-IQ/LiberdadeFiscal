# QA final — Fase 9

Verificações executadas ao fechar a construção autónoma das Fases 2-8
(ver `CLAUDE.md` secção 11 para o roadmap completo).

## 1. Testes automatizados

```
npm test
# tests 175
# suites 40
# pass 175
# fail 0
```

175 testes, executados 3× consecutivas sem falhas intermitentes (motor
fiscal puro, lógica do quiz, catálogo de bens/serviços, parser de QR,
persistência IndexedDB, integração de UI de todos os 7 módulos via
jsdom + fake-indexeddb, acessibilidade básica em cada ecrã).

## 2. Verificações estáticas (scriptadas, não "a olho")

- **Sintaxe**: todos os `.js` do projeto passam `node --check` sem
  erros (app.js, sw.js, todos os `data/*.js`, todos os `modules/*.js`,
  `worker/ocr-fatura.js`).
- **`manifest.json`**: JSON válido (`json.load` sem exceção).
- **`sw.js` STATIC_ASSETS**: as 26 entradas do array correspondem a
  ficheiros que existem de facto no repositório (verificado
  programaticamente, não por inspeção visual) — evita o caso clássico
  de o service worker tentar pré-cachear um ficheiro inexistente e
  falhar a instalação silenciosamente.
- **Rotas do router (`app.js`)**: todas as 7 entradas de
  `ROUTE_MODULES` que apontam para um módulo real (`quiz`, `taximetro`,
  `faturas`, `impostos-anuais`, `dia-liberdade`, `benchmark-ocde`)
  resolvem para ficheiros existentes em `modules/`.
- **Sem `console.log`/`console.debug` esquecidos** em nenhum ficheiro
  do projeto (só `console.error` em pontos de tratamento de erro
  genuíno, que é o uso correto).
- **Sem `TODO`/`FIXME`/`XXX` pendentes** no código.

## 3. Conformidade com a secção 9 do CLAUDE.md (privacidade/disclaimer)

- Disclaimer legal presente nos três locais obrigatórios: onboarding
  (`modules/onboarding.js`), ecrã do Dia da Liberdade Fiscal
  (`modules/dia-liberdade.js`), e footer persistente (`index.html`,
  fora do `#app-main` para sobreviver a trocas de rota — regressão
  apanhada e corrigida na Fase 4).
- Único ponto de saída de dados a terceiros continua a ser o worker de
  foto+IA, e continua **não desplegado** — a app funciona por completo
  sem ele.
- `saveInvoice()` e `savePeriodicTax()` são os únicos pontos de escrita
  nos respetivos stores IndexedDB, com validação de forma aplicada em
  código (não só documentada).

## 4. Acessibilidade (WCAG 2.2 AA) — verificação incremental por fase

- Contraste de cor verificado computacionalmente (cálculo de luminância
  relativa) na Fase 1 para a paleta base; `--color-green-text` mantido
  para todo texto sobre fundo claro.
- Todos os ecrãs têm exatamente um `<h1>` com `tabIndex=-1` e foco
  programático ao carregar (verificado por teste em todos os 7
  módulos).
- Todos os campos de formulário têm `<label for>` associado a um `id`
  existente (verificado por teste em todos os módulos com formulários).
- Erros de validação usam `role="alert"` (nunca só cor).
- Tap targets ≥44px aplicados a controlos de ação (`button`,
  `a.btn`, inputs, selects) — não a todos os `<a>` genéricos.
- **Atualização 2026-08 (roadmap P1-7)**: `tests/accessibility-axe.test.js`
  corre o axe-core (a mesma engine usada pelo Lighthouse e pelas
  extensões de acessibilidade de browser) sobre jsdom, contra os 9
  principais estados de ecrã da app — 0 violações em todas as regras
  estruturais/ARIA (labels, nomes acessíveis, ids duplicados, ordem de
  headings, uso de ARIA). Isto não substitui um teste com leitor de
  ecrã real, mas é uma verificação genuína e automatizada, não apenas
  inferida do código.
- **Continua não verificado**: navegação por teclado ponta-a-ponta num
  browser real, leitura por leitor de ecrã real (VoiceOver/NVDA), e
  pontuação Lighthouse (que também mede performance/SEO, não só
  acessibilidade) — o sandbox de execução não tem um browser
  disponível. O contraste de cor (color-contrast) também fica sempre
  "incomplete" em jsdom, porque depende de um motor de rendering CSS
  real — foi verificado à parte por cálculo de luminância relativa
  (`AUDITORIA-FASE-1.md`, hallazgo C-1). Recomenda-se correr
  `npx lighthouse` e um teste manual com leitor de ecrã antes de
  publicar em produção.

## 5. Limitações conhecidas, não bloqueantes para o MVP

- **Ícones e tipografia**: `icons/*.png` e `fonts/*.woff2` continuam
  por enviar pelo autor (o sandbox de construção não consegue
  descarregá-los — rede restrita a uma allowlist). Instruções exatas
  em `icons/README.md` e `fonts/README.md`.
- **Dados fiscais UNKNOWN/ESTIMATE**: ISV, IUC, Imposto de Selo, tabela
  de concelhos do IMI, tabela completa de IABA — ver checklist
  detalhado em `TAX-METHODOLOGY.md` secção 8. A app nunca inventa
  valores para estes casos; ou pede o dado ao utilizador (IMI), ou
  devolve `{status: "UNKNOWN"}` explicitamente.
- **Sem deployment**: nenhum remote git configurado, GitHub Pages não
  ativado, worker de OCR não desplegado — todos requerem credenciais/
  contas do autor que o agente não tem.
- **Ano fiscal fixo**: `ANO_FISCAL = 2026` está hardcoded em
  `modules/dia-liberdade.js`; não há ainda seletor de ano fiscal
  (fora do âmbito da v1 per spec §5).

## 6. Próximos passos recomendados (fora do âmbito desta construção)

1. Autor: enviar ícones e fontes, criar conta/repo GitHub em
   `delfos-iq`, configurar remote e publicar via GitHub Pages.
2. Autor ou revisão jurídica/fiscal: validar os parâmetros ✅
   diretamente contra fonte oficial antes de qualquer uso em produção
   (checklist completo em `TAX-METHODOLOGY.md` secção 8).
3. Teste manual num browser real: Lighthouse, leitor de ecrã,
   instalação como PWA em Android/iOS, funcionamento offline completo.
4. Decisão de negócio: desplegar (ou não) o worker de foto+IA.
