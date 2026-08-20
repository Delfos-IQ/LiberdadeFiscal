# Liberdade Fiscal

> Descobre quanto do teu trabalho fica realmente contigo.

PWA que torna compreensível a carga fiscal real de trabalhar e consumir
em Portugal — impostos diretos, indiretos, especiais e patrimoniais —
culminando no "Dia da Liberdade Fiscal" pessoal do utilizador.

Ver `CLAUDE.md` para a especificação completa do produto,
`AUDITORIA-FASE-1.md` para a auditoria de qualidade da Fase 1,
`AUDITORIA-2026-08.md` para a auditoria de segurança/SWOT/roadmap de
agosto de 2026, `SECURITY.md` para decisões de segurança documentadas
(ex.: porque não há cifragem/PIN local), `API-MOTOR-FISCAL.md` para a
referência de API do motor fiscal puro (`data/tax-engine.js`) caso
queira reutilizá-lo fora da UI desta app, e `QA-FASE-9.md` para o
relatório final de QA e limitações conhecidas.

## Stack

HTML/CSS/JS vanilla com módulos ES. Sem framework de build, sem
dependências. Armazenamento local-first via IndexedDB — nenhum dado
fiscal do utilizador sai do dispositivo, sem exceções (o fallback de
foto+OCR previsto na Fase 5 foi eliminado em 19/08/2026, decisão
explícita do autor — ver Fase 5 abaixo).

## Estrutura

```
index.html          shell da app
app.js               entrypoint — router, service worker, bootstrap
style.css            design system (tokens, componentes)
sw.js                service worker (offline shell)
manifest.json        manifesto PWA
data/                 conteúdo estruturado (regras fiscais, catálogos,
                       perguntas do quiz) e camada de persistência
icons/                ícones da PWA, gerados a partir do logo do autor
fonts/                tipografia Poppins autoalojada (ver fonts/README.md)
modules/              módulos de UI por rota (quiz, taxímetro, faturas...)
```

## Estado do projeto

Ver o roadmap completo em `CLAUDE.md` (secção 11). Resumo:

- [x] Fase 1 — Foundation
- [x] Fase 2 — Motor fiscal (tabelas Portugal 2026) — ISV/IUC (🟡 ESTIMATE) e Imposto de Selo (✅ Verified) já implementados após ronda de investigação adicional; ver `TAX-METHODOLOGY.md` para o que ainda está por verificar (IABA para cerveja/espirituosas/intermédios, tabela de concelhos do IMI)
- [x] Fase 3 — Quiz (100 perguntas — 36 originais + tanda de 24 em 18/08/2026 + tanda de 40 em 19/08/2026 —, teto definitivo por decisão do autor, sem escalar até às 200 previstas no spec original; seleção aleatória de 10, router real)
- [x] Fase 4 — Rendimentos (ex-Taxímetro: Modo Rápido + Avançado, cadeia bruto→líquido, quociente familiar, dependentes, diferencial regional Madeira ✅/Açores ✅ (ambos 30% uniforme sobre a taxa marginal, verificado 18/08/2026), conteúdo educativo sobre o custo total para o empregador; roadmap P3-15 — modo agregado familiar: campo opcional de segundo rendimento quando "conjunta" está selecionado, soma os dois rendimentos coletáveis antes de aplicar o quociente familiar em vez de o aplicar a um só, com a Segurança Social sempre calculada por pessoa; Taxa Adicional de Solidariedade — Art. 68.º-A CIRS — cablada em 18/08/2026, 🟡 ESTIMATE, afeta só rendimentos coletáveis acima de 80.000€/ano)
- [x] Fase 5 — Gastos (ex-Faturas, redesenhado em agosto de 2026: estimativa mensal autorreportada por categoria com desglose de IVA/ISP em tempo real, em vez de fatura a fatura; o fluxo antigo item-a-item + atajo QR continua no código, fora da navegação ativa, como possível "modo avançado" futuro. O fallback de foto+IA (`data/ocr-client.js`, `modules/faturas-foto-ocr.js`, `worker/ocr-fatura.js`) foi **eliminado em 19/08/2026**, decisão explícita do autor — nunca chegou a ser desplegado, e removê-lo simplifica a promessa de privacidade da app: já não há nenhuma exceção "sem servidor nosso", é sem servidor mesmo. `"photo_ocr"` deixou de ser um `source` válido para uma Invoice)
- [x] Fase 6 — Taxas (ex-Impostos anuais/patrimoniais, formulário simplificado a tipo + valor: IMI/IUC/ISV/IMT/Imposto de Selo/CAV/Taxa Municipal Turística; motor de cálculo `calcularISV()`/`calcularIUC()`/`calcularImpostoSelo()` já implementado em `data/tax-engine.js` com dados de `data/tax-rules/2026/patrimoniais.js`; IMI tem agora tabela por concelho — 299 dos 308 municípios, 🟡 ESTIMATE, embutida 18/08/2026; Contribuição Audiovisual e Taxa Municipal Turística adicionadas 18/08/2026, ver `TAX-METHODOLOGY.md` §5b — TGR/TRH/TMDP avaliadas e deliberadamente não modeladas)
- [x] Fase 7 — Dia da Liberdade Fiscal (redesenhado em agosto de 2026: consome o "Período" acumulado por Rendimentos → Gastos → Taxas via `data/db.js`, sem voltar a pedir dados; assinala explicitamente o que ficou de fora quando algum passo não foi preenchido; permite fechar o período e começar um novo, guardando histórico; ver metodologia em `TAX-METHODOLOGY.md` secção 6b)
- [x] Fase 8 — Benchmark OCDE (tax wedge, Taxing Wages 2026, PT/ES/FR/DE/IE/NL/CH) + cartão para partilhar (Web Share API com fallback de download/clipboard — inclui partilha nativa para WhatsApp quando `navigator.share({files})` está disponível)
- [x] Fase 9 — QA final (verificações estáticas scriptadas, ver `QA-FASE-9.md` para o relatório completo e as limitações conhecidas)
- [x] Glossário fiscal (19/08/2026, a pedido do autor: conteúdo opcional "para quem quiser mais", sem tocar no fluxo principal) — 13 figuras (as 11 da tabela do CLAUDE.md §7 + CAV + Taxa Municipal Turística), em linguagem simples, cada uma com badge de confiança (verificado/estimativa/não confirmado) e link para a fonte oficial; acesso pelo footer, fora do fluxo principal e da navegação principal

## Testes

```bash
npm install   # só a primeira vez — instala o jsdom, usado apenas para os testes de UI
npm test
```

Cobertura atual: 317 testes (motor fiscal, lógica do quiz, catálogo de bens/serviços, parser de QR de faturas [dormant], persistência IndexedDB incluindo o acumulador de "Período" e exportação/importação de dados, integridade dos dados do Glossário fiscal, acessibilidade via axe-core, integração de UI de todos os módulos via jsdom + fake-indexeddb).

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

## Licença

Todos os direitos reservados — ver `LICENSE`.
