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

## 4b. Verificação técnica em browser real (18/08/2026, ronda "verificação em mundo real")

Até esta ronda, tudo o que existia era verificação via jsdom/axe-core —
um substituto razoável mas não o veredito final. Usando um browser real
(Claude in Chrome, controlando um Chrome de verdade) contra a app já
publicada em produção (`https://delfos-iq.github.io/LiberdadeFiscal/`),
foi possível verificar genuinamente:

- **Deploy**: `git push` estava 3 commits atrasado (produção servia
  `liberdade-fiscal-v0.38-static`, a Açores/solidariedade/IMI desta
  sessão nunca tinham ido a produção). Corrigido nesta ronda — a
  produção está agora sincronizada com `master` (v0.41 confirmado ao
  vivo).
- **Manifest.json**: válido, servido com todos os campos obrigatórios
  (`name`, `short_name`, `start_url`, `display: "standalone"`,
  `background_color`, `theme_color`, ícones 192×192/512×512/maskable) —
  lido diretamente do JSON servido em produção, não do ficheiro local.
- **Ícones da PWA**: os três ficheiros (`icon-192.png`, `icon-512.png`,
  `icon-maskable.png`) carregam com `200 OK` e `Content-Type: image/png`
  a partir de produção.
- **Service worker**: regista-se, ativa (`state: "activated"`) no scope
  correto (`https://delfos-iq.github.io/LiberdadeFiscal/`), e o handler
  `activate` limpa mesmo caches de versões antigas (confirmado: só
  ficou 1 cache `liberdade-fiscal-v0.41-static` depois do deploy, a
  v0.38 anterior foi apagada).
- **Pré-cache do shell offline**: os 46 URLs de `STATIC_ASSETS` (lidos
  diretamente do `sw.js` servido, não do ficheiro local) estão TODOS
  presentes na Cache Storage real do browser — 0 em falta. Isto é o que
  determina se o shell offline funciona, e está confirmado
  programaticamente. **Não confirmado**: o corte de rede real (ver
  limitações abaixo).
- **CSP**: verificado um falso alarme — uma requisição a
  `fonts.googleapis.com` (fonte "Inter") apareceu no separador de rede,
  mas foi confirmado que (a) não existe no código-fonte da app, e (b) a
  própria CSP (`font-src 'self'`) tê-la-ia bloqueado se viesse da app —
  origem: uma extensão do Chrome instalada no browser de teste, não a
  aplicação.
- **Foco visível por teclado**: testado com uma tecla Tab real (não
  `.focus()` programático, que não ativa `:focus-visible` na maioria
  dos browsers) — o elemento seguinte na ordem de tabulação mostra
  `:focus-visible` verdadeiro com contorno sólido de 3px. Isto é algo
  que o jsdom não consegue verificar, porque não tem motor de CSS.
  Ordem de tabulação inspecionada (checkbox → CTA → link de dados →
  nav) é coerente com a ordem visual do DOM.
- **Consola/rede**: 0 erros de consola, 0 pedidos falhados (todos os
  assets da própria app devolveram `200`) no carregamento da página em
  produção.

### Limitações genuínas desta ronda (não simuladas, não inventadas)

- **`resize_window` não altera o viewport real** neste ambiente de
  automação — `window.innerWidth` continuou em 1920px mesmo depois de
  pedir 375×667 e 390×844. Não foi possível verificar visualmente o
  layout mobile num viewport de telemóvel real a partir daqui. O CSS é
  mobile-first por construção (`style.css`) e a navegação inferior por
  abas já está desenhada para ecrãs estreitos, mas isto **continua por
  confirmar visualmente** num dispositivo ou emulador real.
- **Sem alternância real de offline**: as ferramentas de automação
  disponíveis não incluem um controlo de "cortar rede" equivalente à
  checkbox "Offline" do painel Network do DevTools. A confirmação de
  que o shell offline funciona assenta em prova indireta mas forte (os
  46 assets estão mesmo em cache, e o código de `sw.js` usa
  `caches.match()` antes de tentar a rede para esses assets) — não numa
  desconexão de rede real e reload subsequente.
- **Sem leitores de ecrã reais** (VoiceOver/NVDA/TalkBack): fora do
  alcance de um browser controlado por automação — são integrações do
  sistema operativo, não do browser.
- **Sem instalação real como PWA** em Android/iOS: precisa de um
  dispositivo físico ou emulador com Play Store/App Store, que este
  ambiente não tem.
- **Sem Lighthouse**: as ferramentas disponíveis não incluem o motor de
  Lighthouse (Performance/SEO/Best Practices/PWA installability como
  pontuação única) — as verificações acima cobrem manualmente os
  critérios de instalabilidade mais importantes (manifest válido,
  ícones corretos, SW ativo, HTTPS), mas sem o relatório consolidado.

**Passos recomendados para fechar o que ficou por confirmar** (o autor
tem de os fazer, exigem hardware/software fora deste ambiente):
1. Abrir a app no telemóvel, testar o layout em ecrã pequeno de verdade.
2. No Chrome desktop, DevTools → Network → marcar "Offline" → recarregar
   → confirmar que o shell continua a funcionar.
3. Instalar como PWA num Android (Chrome → "Adicionar ao ecrã principal")
   e num iOS (Safari → Partilhar → "Adicionar ao ecrã principal").
4. Ativar VoiceOver (iOS/macOS) ou TalkBack (Android) e navegar pelo
   menos o fluxo do Quiz e do Dia da Liberdade Fiscal de ponta a ponta.
5. Correr `npx lighthouse https://delfos-iq.github.io/LiberdadeFiscal/ --view`
   a partir de um Chrome local, para o relatório consolidado com
   pontuação.

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
- **Deployment**: ~~sem deployment~~ — desde 18/08/2026 a app está em
  produção em `https://delfos-iq.github.io/LiberdadeFiscal/` via GitHub
  Pages, confirmado a servir a versão mais recente (ver secção 4b).
  Continua por desplegar: o worker de OCR (Cloudflare Workers),
  decisão de negócio deliberadamente adiada.
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
