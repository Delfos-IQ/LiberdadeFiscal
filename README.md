# Liberdade Fiscal

> Descobre quanto do teu trabalho fica realmente contigo.

PWA que torna compreensível a carga fiscal real de trabalhar e consumir
em Portugal — impostos diretos, indiretos, especiais e patrimoniais —
culminando no "Dia da Liberdade Fiscal" pessoal do utilizador.

Ver `CLAUDE.md` para a especificação completa do produto e
`AUDITORIA-FASE-1.md` para a auditoria de qualidade da Fase 1.

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
```

## Estado do projeto

Ver o roadmap completo em `CLAUDE.md` (secção 11). Resumo:

- [x] Fase 1 — Foundation
- [ ] Fase 2 — Motor fiscal (tabelas Portugal 2026)
- [ ] Fase 3 — Quiz
- [ ] Fase 4 — Ingressos e Taxímetro
- [ ] Fase 5 — Faturas
- [ ] Fase 6 — Impostos anuais/patrimoniais
- [ ] Fase 7 — Dia da Liberdade Fiscal
- [ ] Fase 8 — Benchmark OCDE + cartão para partilhar
- [ ] Fase 9 — QA

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
