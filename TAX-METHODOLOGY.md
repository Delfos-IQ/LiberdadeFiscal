# Metodologia fiscal — Liberdade Fiscal (ano fiscal 2026)

Este documento explica de onde vem cada parâmetro fiscal usado pelo
motor de cálculo, que fórmula se aplica, que hipóteses assume, e que
limitações tem. É a implementação prática da secção 8 do `CLAUDE.md`:
*"Cada parâmetro deve documentar-se: fórmulas, fontes, hipóteses,
limitações... Se houver incerteza, marcar como `UNKNOWN` ou
`ESTIMATE` — nunca inventar."*

**Como se lê este documento.** Cada figura fiscal tem um estado:

- ✅ **Verificado** — confirmado contra múltiplas fontes secundárias
  independentes que citam a mesma base legal.
- 🟡 **ESTIMATE** — a estrutura/fórmula está confirmada, mas alguns
  valores numéricos concretos precisam de verificação adicional contra
  a fonte primária antes de publicar.
- 🔴 **UNKNOWN** — não foi possível verificar nesta ronda de pesquisa.
  O motor de cálculo deve recusar-se a produzir um número para esta
  figura, não assumir um valor plausível.

**Limitação honesta deste documento.** Toda a investigação desta fase
foi feita por pesquisa web a partir de um ambiente sem acesso direto ao
Portal das Finanças, à Segurança Social ou ao Diário da República
(bloqueados por lista de permissões da rede). As fontes citadas são,
na maioria, secundárias (bancos, consultoras fiscais, imprensa
económica) que referenciam a legislação primária. **Antes de publicar
esta app para uso real, cada parâmetro marcado ✅ deveria, idealmente,
confirmar-se diretamente contra a fonte primária**, e todos os
marcados 🟡 ou 🔴 têm de resolver-se.

---

## 1. IRS — Imposto sobre o Rendimento das Pessoas Singulares

**Fonte:** Lei n.º 73-A/2025 (Orçamento do Estado 2026), Art. 68.º e
68.º-A do Código do IRS (CIRS).
**Ficheiro:** `data/tax-rules/2026/irs.js`

### Escalões (Art. 68.º CIRS) — ✅ Verificado

Sistema progressivo por 9 escalões. Cada fatia do rendimento coletável
paga apenas a taxa marginal do seu próprio escalão — subir de escalão
nunca faz pagar mais sobre o rendimento já tributado nos escalões
anteriores.

| Escalão | Rendimento coletável | Taxa marginal |
|---|---|---|
| 1.º | até 8.342 € | 12,5% |
| 2.º | 8.342 € – 12.587 € | 15,7% |
| 3.º | 12.587 € – 17.838 € | 21,2% |
| 4.º | 17.838 € – 23.089 € | 24,1% |
| 5.º | 23.089 € – 29.397 € | 31,1% |
| 6.º | 29.397 € – 43.090 € | 34,9% |
| 7.º | 43.090 € – 46.566 € | 43,1% |
| 8.º | 46.566 € – 86.634 € | 44,6% |
| 9.º | superior a 86.634 € | 48,0% |

**Fórmula de cálculo por fatias** (a que o motor de cálculo usa):

```
IRS = Σ round(rendimento em cada escalão × taxa marginal desse escalão, 2 casas decimais)
```

**Nota de arredondamento (importante para reprodutibilidade):** o
imposto de cada escalão arredonda-se individualmente a cêntimo antes
de somar — não se soma tudo em precisão total e se arredonda só no
fim. Isto foi verificado empiricamente: o exemplo oficial documentado
(30.000€ → 6.260,16€) só bate certo com arredondamento por escalão; um
único arredondamento no final dá 6.260,15€, um cêntimo a menos. Ver
`tests/tax-engine.test.js`, onde este comportamento está fixado como
teste de regressão.

O Portal das Finanças usa um método equivalente e mais rápido
(rendimento × taxa média do escalão − parcela a abater), que produz o
mesmo resultado. Optámos pelo cálculo por fatias porque é mais fácil
de auditar e explicar ao utilizador — coerente com o objetivo do
produto de tornar o método visível, não só o resultado.

### Taxa adicional de solidariedade (Art. 68.º-A) — ✅ Verificado

Aplica-se **cumulativamente** ao IRS normal, apenas sobre a parte do
rendimento coletável acima de cada limiar:

| Rendimento coletável | Taxa de solidariedade |
|---|---|
| 80.000 € – 250.000 € | 2,5% |
| superior a 250.000 € | 5,0% |

### Mínimo de existência — ✅ Verificado

12.880 €/ano para 2026. Abaixo deste valor de rendimento, não há IRS a
pagar — o simulador deve verificar este limiar antes de aplicar os
escalões.

### Dedução específica Categoria A — ✅ Verificado

4.104 €/ano, ou as contribuições efetivas para a Segurança Social se
superiores. Aplica-se antes de calcular o rendimento coletável de
trabalho dependente.

### Quociente familiar (Art. 69.º CIRS) — ✅ Verificado (Fase 4)

Declaração conjunta (casados/unidos de facto): quociente 2 — divide o
rendimento coletável por 2 antes de aplicar os escalões, multiplica o
imposto de volta por 2 no fim. Declaração individual: quociente 1
(sem efeito). Implementado em `calculateIRS(rendimento, { quocienteFamiliar })`.

### Dedução à coleta por dependente (Art. 78.º-A CIRS) — ✅ Verificado (Fase 4)

Subtrai-se **diretamente ao imposto já calculado**, nunca ao
rendimento coletável — são coisas distintas (dedução à coleta vs.
dedução específica). Valores 2026:

| Situação | Valor |
|---|---|
| Dependente com mais de 3 anos | 600 €/ano |
| Dependente com até 3 anos (o 1.º) | 726 €/ano |
| 2.º dependente (ou seguinte) com até 3 anos | 900 €/ano |
| Guarda conjunta com residência alternada | 300 €/ano por progenitor |

Implementado em `calcularDeducaoDependentes()`. Nunca deixa o IRS
final ficar negativo — a dedução aplica-se com `Math.max(0, ...)`.

### Diferencial regional de IRS — Açores e Madeira

**Madeira — ✅ Verificado (atualizado 15/08/2026).** Confirmado
diretamente contra fonte oficial da Autoridade Tributária e Aduaneira
da RAM (Agenda Fiscal, janeiro de 2026): em 2026 a Madeira aplica um
diferencial de 30% face às taxas de IRS do Continente a **todos os
nove escalões** (antes limitado aos escalões mais baixos). O motor
aplica esta redução de 30% à taxa marginal de cada escalão nacional —
`status: "verified"` em `irs.js` para a Madeira. **Simplificação
conhecida, não corrigida nesta ronda:** os limites dos próprios
escalões estão também atualizados em +3,51% face a 2025 na RAM (a
Madeira usa patamares de rendimento diferentes dos do Continente, não
só taxas diferentes) — este motor aplica a redução de taxa sobre os
limites nacionais, o que subestima ligeiramente o benefício real.
Também não modelado: o reforço do mínimo de existência que isenta
totalmente quem aufere o salário mínimo regional. Fonte:
[at.madeira.gov.pt, Agenda Fiscal Janeiro 2026](https://at.madeira.gov.pt/Ficheiros/NL/AFJaneiro2026.pdf).

**Açores — 🟡 ESTIMATE, não reconfirmado.** A fonte encontrada em
15/08/2026 (Despacho n.º 1179/2026, que aprova as tabelas de retenção
na fonte para os Açores) descreve algo estruturalmente diferente do
caso da Madeira: os escalões de IRS aplicados nos Açores são,
segundo essa fonte, **os mesmos do Código do IRS nacional**, com a
diferença nos *coeficientes de retenção na fonte mensal* — não
necessariamente numa redução de 30% sobre o imposto anual devido.
Mantém-se o valor de 0,3 herdado de uma ronda de pesquisa anterior
como estimativa de trabalho (`status: "ESTIMATE"` em `irs.js`), mas
**não está confirmado para 2026** e pode estar a modelar o mecanismo
errado (retenção mensal em vez de imposto anual). A UI do Rendimentos
mostra um aviso explícito sempre que `diferencialRegionalAplicado` é
`true`. Antes de publicar em produção, confirmar contra o Decreto
Legislativo Regional dos Açores correspondente, não apenas contra
imprensa ou despachos de retenção na fonte.

### Coeficiente do regime simplificado (trabalhadores independentes) — 🟡 ESTIMATE

Confirmado o coeficiente-regra de 0,75 para prestação de serviços
(Art. 151.º CIRS). A tabela completa por atividade (CAE) não foi
verificada — necessária antes de a Fase 4 (Taxímetro) suportar
trabalhadores independentes com rigor.

### Retenção na fonte vs. imposto anual — nota metodológica

A retenção na fonte (tabelas mensais, patamares em `irs.js`) é um
**adiantamento** por conta do IRS anual — não é o imposto final. O
Taxímetro (Fase 4) deve deixar claro ao utilizador que o número que vê
mês a mês é uma estimativa de retenção, e que o valor definitivo só se
apura na declaração anual (com deduções à coleta, despesas, etc., que
este produto não modela na v1).

---

## 2. Segurança Social

**Fonte:** Código dos Regimes Contributivos (Lei n.º 110/2009).
**Ficheiro:** `data/tax-rules/2026/seguranca-social.js`

### Taxa Social Única, regime geral — ✅ Verificado

| | Taxa |
|---|---|
| Total (TSU) | 34,75% |
| Trabalhador (retido do salário) | 11,00% |
| Entidade patronal (adicional ao salário bruto) | 23,75% |

**Ponto crítico de UX (spec §6.2):** a parte da entidade patronal
**não sai do bolso do trabalhador** — é um custo adicional para o
empregador, sobre o salário bruto. O Taxímetro tem de mostrar a cadeia
completa (custo total empregador → salário bruto → SS trabalhador →
IRS → líquido) sem nunca somar a TSU patronal ao que "desconta" ao
trabalhador — isso duplicaria e confundiria o número.

### FCT / FGCT (fundos de compensação) — ✅ Verificado: custo é €0 em 2026

Investigado em 15/08/2026 a pedido do autor, que apontou corretamente
que estes dois fundos (FCT 0,925% + FGCT 0,075% sobre a retribuição
base, historicamente parte do custo real do empregador) não estavam
considerados em lado nenhum do motor. Verificação contra fonte
primária (Lei n.º 13/2023, Art. 32.º; Decreto-Lei n.º 115/2023) revela
que **não devem ser somados ao custo do empregador em 2026**:

- **FCT**: a obrigação de contribuir terminou em definitivo a partir
  de 1 de janeiro de 2024 (Decreto-Lei 115/2023). O fundo está fechado
  a novas entradas.
- **FGCT**: as entregas estão suspensas desde 1 de maio de 2023 (Lei
  13/2023, Art. 32.º) e a suspensão dura enquanto vigorar o Acordo de
  Médio Prazo de 2022, isto é, **até final de 2026**. Retomam em 2027
  salvo nova alteração legal.

**Decisão de produto:** não adicionar estes 1% ao "custo total para o
empregador" do Rendimentos, porque isso sobrestimaria o custo real
atual. Documentado aqui para revisão em janeiro de 2027, altura em que
convém confirmar se o FGCT foi mesmo retomado.

Fonte: [Lei n.º 13/2023, Art. 32.º (DRE)](https://diariodarepublica.pt/dr/detalhe/lei/13-2023-211340863),
[Decreto-Lei n.º 115/2023 (DRE)](https://diariodarepublica.pt/dr/detalhe/decreto-lei/115-2023-261867080).

### Trabalhadores independentes — 🟡 ESTIMATE

Taxa-regra de 21,4% confirmada, mas o mecanismo de apuramento
trimestral da base de incidência contributiva (70% do valor de
serviços prestados, 20% de produção/venda de bens) não foi verificado
em detalhe.

---

## 3. IVA — Imposto sobre o Valor Acrescentado

**Fonte:** Código do IVA (CIVA), Art. 18.º e Listas I/II anexas.
**Ficheiro:** `data/tax-rules/2026/iva.js`

### Taxas gerais por região — ✅ Verificado

| Região | Reduzida | Intermédia | Normal |
|---|---|---|---|
| Continente | 6% | 13% | 23% |
| Açores | 4% | 9% | 16% |
| Madeira | 4% | 12% | 22% |

### Limitação importante

Estas são as **três taxas gerais**. Que taxa se aplica a um bem ou
serviço concreto depende da sua classificação nas Listas I e II do
CIVA (Lista I → reduzida, Lista II → intermédia, fora de ambas →
normal). **Esta classificação não foi feita aqui** — é trabalho da
Fase 5, ao construir `data/goods-services-pt.js`, e cada item do
catálogo precisa da sua própria verificação contra as listas oficiais.
Não assumir a taxa normal (23%) por defeito para bens não
classificados; marcar como pendente de verificação.

---

## 4. Impostos Especiais de Consumo (IEC)

**Fonte:** Código dos Impostos Especiais de Consumo (CIEC).
**Ficheiro:** `data/tax-rules/2026/impostos-especiais.js`

### ISP (combustível) — 🟡 ESTIMATE, extremamente volátil

**Isto é diferente de todos os outros parâmetros do projeto.** O ISP
ajusta-se por Portaria do Governo com frequência semanal ou mensal
(mecanismo de estabilização do preço dos combustíveis ao consumidor),
não uma vez por ano fiscal como o resto. O valor guardado
(gasolina ≈ 0,437 €/L, gasóleo rodoviário ≈ 0,298 €/L) é uma fotografia
de maio de 2026.

**Implicação de produto:** o desglose educativo de ISP+IVA sobre
combustível (spec §6.3) vai ficar sistematicamente desatualizado se
não se reconstruir este parâmetro com regularidade. Recomenda-se um
processo de atualização mensal, não anual, especificamente para este
valor — distinto do resto do processo de atualização de janeiro.

### IABA (álcool) — 🟡 ESTIMATE parcial (atualizado 15/08/2026)

Ronda de investigação adicional confirmou três elementos via fonte
secundária (PwC Portugal, análise de impostos indiretos ao OE2026, e
AEVC para os valores de vinho/sidra):

1. Regime de redução de 75% do IABA para licores/"crème de" e
   aguardentes de medronho de municípios elegíveis, prorrogado até
   31/12/2026.
2. Vinho tranquilo e espumante mantêm taxa de €0/hl.
3. Bebidas fermentadas (sidras) tributadas a €10,30/hl — valor herdado
   de 2017, sem alteração legislativa encontrada desde então, mas
   **não confirmado diretamente** contra a tabela oficial 2026 do
   Portal das Finanças.

Cerveja, bebidas espirituosas e produtos intermédios **continuam
UNKNOWN**: encontrou-se apenas a variação percentual de um aumento de
2017 (+3%), não o valor absoluto em vigor em 2026. Extrapolar a partir
de uma variação de 9 anos atrás sem o valor base violaria a regra de
nunca inventar dados (spec §8) — por isso estes três elementos
mantêm-se explicitamente `UNKNOWN` em vez de estimados.

### IT (tabaco) — ✅ Verificado para cigarros, 🔴 UNKNOWN para o resto

| Elemento | Valor |
|---|---|
| Específico (cigarros) | 151,88 €/1000 cigarros |
| Ad valorem (cigarros) | 1% do PVP |
| Bolsas de nicotina (nova figura 2026) | 0,065 €/grama |

Charutos, tabaco de enrolar e tabaco aquecido não foram verificados.

---

## 5. Impostos Patrimoniais e de Veículo

**Fonte:** Código do IMI, Código do ISV, Código do IUC, Código do
Imposto de Selo.
**Ficheiro:** `data/tax-rules/2026/patrimoniais.js`

### IMI — 🟡 estrutura verificada, tabela por concelho 🔴 UNKNOWN

Intervalo legal nacional: 0,3%–0,45% do VPT/ano para prédios urbanos
(até 0,5% em casos específicos — devolutos, degradados), 0,8% fixo
para prédios rústicos. A maioria dos 308 municípios aplica a taxa
mínima em 2026, mas **a taxa exata é decidida por cada câmara
municipal** — a tabela completa não foi recolhida. O simulador deve
pedir o concelho ao utilizador, nunca assumir 0,3% silenciosamente.

### ISV — 🟡 ESTIMATE (atualizado 15/08/2026)

Tabelas numéricas completas obtidas (componente cilindrada + componente
ambiental CO₂ em protocolo WLTP, para gasolina e gasóleo; desconto por
idade para usados importados; regime PHEV 2026; isenção total de
elétricos). Fonte: EcoImport
(ecoimport.pt/isv-2026-novas-regras/), um agregador especializado em
importação automóvel — **não a AT diretamente** (o texto do Código do
ISV devolveu uma página sem conteúdo acessível nesta pesquisa), por
isso mantém-se ESTIMATE e não ✅ Verified. Os dois exemplos numéricos
do artigo foram reproduzidos manualmente: um bate certo, o outro (VW
Golf) revelou um erro de 1€ na própria conta da fonte (1.498×5,61−
6.194,88 = 2.208,90€, não os 2.209,90€ que o artigo reporta) — o motor
desta app usa o valor recalculado corretamente, não o valor com erro
da fonte. Só o protocolo WLTP tem tabela — veículos homologados em
NEDC (tipicamente pré-2018) continuam a devolver `UNKNOWN`.
Implementado em `calcularISV()`.

### IUC — 🟡 ESTIMATE (atualizado 15/08/2026)

Tabela completa da categoria B (ligeiros de passageiros/mistos, 1.ª
matrícula desde 1/7/2007 — a mais comum) obtida, incluindo componente
cilindrada, componente CO₂ (NEDC e WLTP), coeficiente por ano de
matrícula e adicional para gasóleo. Também obtidas as tabelas de
veículos pré-2007 (categoria A) e de motociclos/triciclos/quadriciclos
(categoria E). Fonte: DECO PROteste
(deco.proteste.pt/dinheiro/impostos/noticias/tabelas-iuc-quanto-paga),
associação de defesa do consumidor — não é a AT, por isso ESTIMATE.
Os dois exemplos numéricos do artigo foram reproduzidos manualmente e
batem certo com a fórmula. Categorias C/D (veículos de mercadorias, por
peso bruto) e F (potência em kW) continuam sem tabela numérica.
Implementado em `calcularIUC()`.

### Imposto de Selo — ✅ Verified (atualizado 15/08/2026)

Tabela Geral completa (30 verbas) obtida diretamente da fonte primária:
Autoridade Tributária e Aduaneira,
info.portaldasfinancas.gov.pt/pt/informacao_fiscal/codigos_tributarios/selo/Pages/ccod-selo-tabgiselo.aspx,
consultada em 15/08/2026 (versão em vigor nessa data). Esta app
modela em código de cálculo só as verbas mais relevantes para um
utilizador particular: aquisição onerosa de imóveis (verba 1.1, 0,8%),
transmissão gratuita/herança (verba 1.2, 10%), arrendamento (verba 2,
10% sobre 1 mês de renda), garantias (verba 10, 0,04%/mês a <1 ano,
0,5% a partir de 1 ano, 0,6% a partir de 5 anos), crédito ao consumo
(verba 17.2, 0,141%/mês a <1 ano, 1,76% a partir de 1 ano), e seguros
por ramo (verba 22, 3% a 9% consoante o ramo). As restantes verbas da
Tabela Geral ficam transcritas em `data/tax-rules/2026/patrimoniais.js`
para referência, mas sem função de cálculo dedicada.

**Isenção familiar na verba 1.2 — investigado e implementado em
15/08/2026.** O Art. 6.º, al. e) do Código do Imposto do Selo isenta
desta verba (transmissões gratuitas — heranças e doações) as
transmissões a favor de cônjuge/unido de facto, descendentes ou
ascendentes. `calcularImpostoSelo("transmissaoGratuita", valor, {
parentesco })` devolve `imposto: 0` para estes três casos; sem o
parâmetro `parentesco`, aplica a taxa de 10% e devolve uma nota a
avisar que pode haver isenção aplicável. Esta isenção é exclusiva da
verba 1.2 — nunca se aplica à verba 1.1 (aquisição onerosa de
imóveis).

**Nota editorial obrigatória do spec (§6.3):** Imposto de Selo e IVA
são mutuamente exclusivos — nunca se acumulam sobre o mesmo ato. Relevante sobretudo
em transmissões de imóveis (onde acresce ao IMT, não ao IVA) e
operações financeiras/de crédito. Implementado em
`calcularImpostoSelo(verba, valor, opcoes)`.

---

## 6. Retenção na fonte vs. imposto anual — princípio transversal

Vale para IRS e, por extensão, para a lógica do Taxímetro: os valores
retidos mensalmente (tabelas de retenção, TSU) são **adiantamentos**,
não o imposto final. O "Dia da Liberdade Fiscal" (Fase 7) soma
retenções reais ao longo do ano — é uma boa aproximação para o produto,
mas não é juridicamente o mesmo que o imposto apurado na declaração
anual. Este produto não modela deduções à coleta (saúde, educação,
habitação) nem outras variáveis da declaração anual — é uma limitação
consciente da v1, a comunicar no disclaimer.

---

## 6b. Dia da Liberdade Fiscal — metodologia de consolidação (Fase 7)

`calculateFiscalFreedomDay()` em `data/tax-engine.js` combina as
figuras já calculadas/registadas noutros módulos numa única
percentagem e data. Decisões explícitas de metodologia:

- **Numerador** (total de impostos): IRS anual (após dedução por
  dependentes) + Segurança Social do trabalhador (não a TSU patronal)
  + soma do `amount_tax` de todas as faturas registadas em Faturas +
  soma do `amount` de todos os registos em Impostos Anuais.
- **Denominador** (rendimento de referência): rendimento bruto anual de
  trabalho do utilizador (salário bruto mensal × 12 — mesma
  simplificação do Taxímetro, sem 13º/14º separados).
- **TSU patronal excluída de propósito**: o custo total para o
  empregador já é mostrado como cifra informativa à parte no Taxímetro
  (spec §6.2: "nunca misturar estas cifras num único número sem
  explicar o que representa cada uma"). Incluí-la aqui inflacionaria a
  percentagem sem corresponder ao rendimento que a pessoa reconhece
  como seu.
- **IVA/especiais e patrimoniais são o que foi registado, não uma
  projeção**: se o utilizador só registou 3 faturas, o resultado reflete
  só essas 3 faturas — comunicado explicitamente no ecrã (texto
  "Baseado em N registo(s)...") e na string `methodology` devolvida
  pela função. Isto é uma limitação consciente da v1: não existe ainda
  extrapolação estatística do consumo anual a partir de uma amostra.
- **Nunca "a partir de hoje deixas de pagar impostos"**: o texto de
  enquadramento no ecrã de resultado usa sempre a formulação do spec
  §6.5 ("segundo as hipóteses utilizadas nesta simulação, esta é a data
  correspondente à proporção anual...").
- **Saturação em 100%**: se o total de impostos ultrapassar o
  rendimento bruto anual (possível com valores patrimoniais/consumo
  desproporcionalmente altos face a um rendimento baixo introduzido), a
  percentagem satura em 100% (31 de dezembro) em vez de produzir uma
  data inválida.

---

## 7. Processo de atualização recomendado

| Parâmetro | Cadência de revisão |
|---|---|
| ISP | Mensal (idealmente, verificação automática da última Portaria) |
| Todos os restantes | Anual, em janeiro, após publicação do Orçamento do Estado |
| Tabela de concelhos IMI | Anual, em janeiro |
| Tabelas ISV/IUC completas | Antes da Fase 6, depois anual |

## 8. Checklist antes de publicar em produção

- [ ] Confirmar todos os parâmetros ✅ diretamente contra
      portaldasfinancas.gov.pt / seg-social.pt / diariodarepublica.pt
- [ ] Resolver o coeficiente completo do regime simplificado (IRS)
- [ ] Resolver a tabela completa de IABA (cerveja, bebidas
      espirituosas, produtos intermédios continuam UNKNOWN; vinho,
      espumante e bebidas fermentadas já ✅/🟡 — ver secção 4)
- [ ] Resolver a tabela de concelhos do IMI (308 concelhos, ainda não
      investigada)
- [x] Resolver as tabelas numéricas de ISV e IUC — 🟡 ESTIMATE,
      implementadas em `calcularISV()`/`calcularIUC()` com fonte
      EcoImport/DECO PROteste (ver secção 5); protocolo NEDC (ISV) e
      matrículas pré-2007 (IUC) continuam UNKNOWN por falta de tabelas
- [x] Resolver o Imposto de Selo — ✅ Verified diretamente contra
      info.portaldasfinancas.gov.pt (Tabela Geral), implementado em
      `calcularImpostoSelo()` para as verbas principais (ver secção 5)
- [ ] Classificar cada item de `data/goods-services-pt.js` contra as
      Listas I/II do CIVA (Fase 5)
- [ ] Estabelecer o processo de verificação mensal do ISP
