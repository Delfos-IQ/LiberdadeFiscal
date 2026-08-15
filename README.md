# Liberdade Fiscal

> Descobre quanto do teu trabalho fica realmente contigo.

PWA que torna compreensível a carga fiscal real de trabalhar e consumir
em Portugal — impostos diretos, indiretos, especiais e patrimoniais —
culminando no "Dia da Liberdade Fiscal" pessoal do utilizador.

Ver `CLAUDE.md` para a especificação completa do produto,
`AUDITORIA-FASE-1.md` para a auditoria de qualidade da Fase 1, e
`QA-FASE-9.md` para o relatório final de QA e limitações conhecidas.

## Stack

HTML/CSS/JS vanilla com módulos ES. Sem framework de build, sem
dependências. Armazenamento local-first via IndexedDB — nenhum dado
fiscal do utilizador sai do dispositivo, exceto o fluxo opcional e
explícito de foto+OCR (Fase 5).

## Estrutura

```
index.html          shell da app
app.js               entrypoint — router, service worker, bootstrap
style.css            design system (tokens, componentes)
sw.js                service worker (offline shell)
manifest.json        manifesto PWA
data/                 conteúdo estruturado (regras fiscais, catálogos,
                       perguntas do quiz) e camada de persistência
icons/                ícones da PWA (pendente de upload)
fonts/                tipografia Poppins autoalojada (pendente de upload)
modules/              módulos de UI por rota (quiz, taxímetro, faturas...)
worker/               Cloudflare Worker do fallback foto+IA (não desplegado)
```

## Estado do projeto

Ver o roadmap completo em `CLAUDE.md` (secção 11). Resumo:

- [x] Fase 1 — Foundation
- [x] Fase 2 — Motor fiscal (tabelas Portugal 2026) — ver `TAX-METHODOLOGY.md` para o que ainda está por verificar (IABA, ISV, IUC, Imposto de Selo, tabela de concelhos do IMI)
- [x] Fase 3 — Quiz (36 perguntas, seleção aleatória de 10, router real)
- [x] Fase 4 — Ingressos e Taxímetro (Modo Rápido + Avançado, cadeia bruto→líquido, quociente familiar, dependentes, diferencial regional ESTIMATE)
- [x] Fase 5 — Faturas (onboarding de região, catálogo de 28 bens/serviços, fluxo manual, atajo QR por colagem de texto, persistência com `confirmed_by_user` obrigatório, worker de foto+IA escrito mas **não desplegado**)
- [x] Fase 6 — Impostos anuais/patrimoniais (registo manual de IMI/IUC/ISV/IMT/Imposto de Selo — não calculados, porque as tabelas completas estão UNKNOWN/ESTIMATE em `data/tax-rules/2026/patrimoniais.js`)
- [x] Fase 7 — Dia da Liberdade Fiscal (consolida IRS + SS trabalhador + IVA/especiais registados + patrimoniais registados; ver metodologia em `TAX-METHODOLOGY.md` secção 6b)
- [x] Fase 8 — Benchmark OCDE (tax wedge, Taxing Wages 2026, PT/ES/FR/DE/IE/NL/CH) + cartão para partilhar (Web Share API com fallback de download/clipboard)
- [x] Fase 9 — QA final (verificações estáticas scriptadas, ver `QA-FASE-9.md` para o relatório completo e as limitações conhecidas)

## Testes

```bash
npm install   # só a primeira vez — instala o jsdom, usado apenas para os testes de UI
npm test
```

Cobertura atual: 175 testes (motor fiscal, lógica do quiz, catálogo de bens/serviços, parser de QR de faturas, persistência IndexedDB, integração de UI do quiz/taxímetro/faturas/impostos anuais via jsdom + fake-indexeddb).

## Desenvolvimento local

Sem build step. Basta servir a raiz com qualquer servidor estático
(o `fetch` de módulos ES e o service worker exigem `http://`, não
`file://`):

```bash
python3 -m http.server 8000
# ou
npx serve .
```

Depois abrir `http://localhost:8000`.

## Pendências antes de instalar como PWA

- Adicionar `icons/icon-192.png`, `icons/icon-512.png` e
  `icons/icon-maskable.png` (ver `icons/README.md`)
- Adicionar os `.woff2` de Poppins em `fonts/` (ver `fonts/README.md`)

## Licença

Todos os direitos reservados — ver `LICENSE`.
