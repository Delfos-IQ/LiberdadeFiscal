# Metodologia fiscal — Liberdade Fiscal (ano fiscal 2026)

**Cadência de revisão (19/08/2026).** Os parâmetros fiscais deste
documento e de `data/tax-rules/2026/` são revistos semestralmente —
1ª semana de janeiro (coincide com a entrada em vigor de alterações do
Orçamento do Estado) e 1ª semana de julho (seis meses depois, com foco
especial no ISP, que muda por Portaria com mais frequência que o resto).
A data exata da última/próxima revisão vive em
`data/tax-rules/2026/meta.js` (`REVISAO_DADOS_2026`) — fonte única,
também mostrada no footer da app — para não ficar dessincronizada entre
vários sítios. Existe uma scheduled task de Claude
(`liberdade-fiscal-revisao-semestral`) que dispara nessas datas com
instruções para rever os dados e atualizar esse ficheiro.

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

### Taxa adicional de solidariedade (Art. 68.º-A) — 🟡 ESTIMATE (cablada 18/08/2026)

Aplica-se **cumulativamente** ao IRS normal, apenas sobre a parte do
rendimento coletável acima de cada limiar. Os próprios limiares e taxas
estão ✅ verificados (exemplos oficiais documentados: 100.000€ → 500€;
300.000€ → 6.750€):

| Rendimento coletável | Taxa de solidariedade |
|---|---|
| 80.000 € – 250.000 € | 2,5% |
| superior a 250.000 € | 5,0% |

Até 18/08/2026, `calculateTaxaSolidariedade()` existia no motor mas
nunca era chamada pela cadeia salarial real (`calcularCadeiaSalarial`/
`calcularCadeiaSalarialConjunta`) — a app não aplicava esta sobretaxa a
ninguém, independentemente do rendimento. Nesta ronda foi cablada,
somada ao IRS anual **depois** da dedução por dependentes (nunca
reduzida por ela — ver justificação abaixo) e refletida em
`irsEstimadoMensal`, `taxaSolidariedadeAnual` e `detalheAnual.solidariedade`
no resultado de `calcularCadeiaSalarial`/`calcularCadeiaSalarialConjunta`,
propagado a Rendimentos, Dia da Liberdade Fiscal e Comparação OCDE. O
conjunto foi marcado `status: "ESTIMATE"` em vez de `"verified"` por
duas ambiguidades não resolvidas:

1. **Redução regional só confirmada para os Açores.** A tabela da PwC
   mostra a redução de 30% (2,5%→1,75%; 5%→3,5%) só para os Açores —
   ao contrário do mecanismo principal de IRS (Art. 68.º), que reduz
   também para a Madeira. Sem uma fonte equivalente para a Madeira
   nesta sobretaxa específica, aplicamos redução 0% à Madeira
   (`reducaoRegional: { continente: 0, madeira: 0, acores: 0.3 }` em
   `irs.js`).
2. **Interação com a dedução por dependentes é ambígua.** O Art.
   68.º-A CIRS, nos seus n.os 4 a 6 originais, prevIA um mecanismo de
   atenuação para agregados com dependentes — mas esses números foram
   **revogados pela Lei n.º 7-A/2016** (Orçamento do Estado 2016) sem
   substituição clara equivalente localizada nesta pesquisa. Por
   precaução, optámos por **não** deixar a dedução por dependentes
   reduzir esta sobretaxa (é somada à parte do IRS já líquida de
   dependentes, não à base tributável da sobretaxa).

Quociente familiar (Art. 69.º) aplica-se normalmente — divide o
rendimento coletável combinado por 2 antes de aplicar os tramos,
multiplica o resultado de volta por 2. Cobertura de testes em
`tests/tax-engine.test.js` (`describe("calculateTaxaSolidariedade")` e
os testes de regressão em `calcularCadeiaSalarial`/
`calcularCadeiaSalarialConjunta`). Fonte: [PwC Portugal, Guia Fiscal
2026 — IRS](https://www.pwc.pt/pt/pwcinforfisco/guia-fiscal/2026/irs.html).

### Mínimo de existência — ✅ Verificado

12.880 €/ano para 2026 (= 14 × salário mínimo nacional de 920€/mês).
Abaixo deste valor de rendimento, não há IRS a pagar — o simulador deve
verificar este limiar antes de aplicar os escalões. Re-confirmado em
19/08/2026 via múltiplas fontes secundárias convergentes que derivam o
mesmo cálculo (Montepio, e-loan.pt, CGD Saldo Positivo, ECO) — ainda
sem confirmação direta contra o CIRS/Portal das Finanças.

### Dedução específica Categoria A — ✅ Verificado diretamente no CIRS (19/08/2026)

**4.587,09 €/ano**, ou as contribuições efetivas para a Segurança
Social se superiores. Aplica-se antes de calcular o rendimento
coletável de trabalho dependente. Corrigido de 4.104€ — esse valor
estava desatualizado (verificado via pesquisa web em 15/08/2026, sem
fonte primária/de referência direta). Primeiro confirmado via PwC Guia
Fiscal 2026, e depois **confirmado diretamente no texto consolidado do
CIRS** (Diário da República, 19/08/2026, via Claude in Chrome — a
extensão reconectou-se nesta sessão): o Art. 25.º, n.º1, alínea a) diz
"8,54 vezes o valor do IAS" — não é um valor fixo em euros, é uma
fórmula. Com o IAS 2026 (537,13€, já verificado nesta app), 8,54 ×
537,13 = 4.587,0902€ ≈ 4.587,09€, batendo exatamente com o valor da
PwC. Pode subir para 4.834,17€ em casos de quotas para associações
profissionais indispensáveis ao exercício da atividade — não modelado
nesta app. Fontes: [CIRS, Art. 25.º — Diário da República, versão
consolidada](https://diariodarepublica.pt/dr/legislacao-consolidada/lei/2014-70048167-902120232),
[PwC Portugal, Guia Fiscal 2026 — IRS](https://www.pwc.pt/pt/pwcinforfisco/guia-fiscal/2026/irs.html).

### Quociente familiar (Art. 69.º CIRS) — ✅ Verificado (Fase 4)

Declaração conjunta (casados/unidos de facto): quociente 2 — divide o
rendimento coletável por 2 antes de aplicar os escalões, multiplica o
imposto de volta por 2 no fim. Declaração individual: quociente 1
(sem efeito). Implementado em `calculateIRS(rendimento, { quocienteFamiliar })`.

**Dois rendimentos no mesmo agregado (roadmap P3-15, `calcularCadeiaSalarialConjunta()`)**:
`calcularCadeiaSalarial(x, { estadoCivil: "conjunta" })` aplica o
quociente familiar a um ÚNICO rendimento — correto só se esse for
mesmo o único rendimento do agregado. Quando há dois rendimentos
distintos (ex.: um casal em que ambos trabalham), o cálculo correto
soma primeiro os dois rendimentos coletáveis (cada um já com a sua
própria dedução específica da Categoria A, Art. 25.º CIRS, que é por
sujeito passivo) e só depois aplica o quociente 2 sobre a SOMA — não
sobre um rendimento sozinho. `calcularCadeiaSalarialConjunta(salarioA,
salarioB, opcoes)` implementa isto; a UI de Rendimentos usa-a
automaticamente quando o utilizador preenche o campo opcional do
rendimento do cônjuge. A Segurança Social nunca é conjunta — cada
pessoa desconta sobre o seu próprio salário, por isso os dois
descontos de SS são só somados, nunca passados pelo quociente
familiar. Esta função assume as duas pessoas como trabalhadoras por
conta de outrem (regime geral); não cobre ainda o caso de uma delas
ser trabalhadora independente.

### Dedução à coleta por dependente (Art. 78.º-A CIRS) — ✅ Verificado (Fase 4)

Subtrai-se **diretamente ao imposto já calculado**, nunca ao
rendimento coletável — são coisas distintas (dedução à coleta vs.
dedução específica). Valores 2026:

| Situação | Valor |
|---|---|
| Dependente com mais de 3 anos (e for o 1.º do agregado) | 600 €/ano |
| Dependente com até 3 anos (e for o 1.º do agregado) | 726 €/ano |
| 2.º dependente (ou seguinte) com até 6 anos, independentemente da idade do 1.º | 900 €/ano |
| Guarda conjunta com residência alternada | 300 €/ano por progenitor |

**Corrigido em 19/08/2026** ("confirmar fuentes primarias"): o motor
aplicava os 900€ apenas ao 2.º dependente (ou seguinte) com idade
**<= 3 anos**. A tabela "Deduções à coleta de IRS" do PwC Guia Fiscal
2026 mostra que o limiar correto é **<= 6 anos**, "independentemente da
idade do primeiro" — ou seja, um agregado com um dependente de 15 anos
e outro de 5 anos deduz 600€ + 900€ (1.500€), não 600€ + 600€ (1.200€,
o que o motor calculava antes).

**Confirmado diretamente no texto legal (19/08/2026, mais tarde na
mesma sessão, com Claude in Chrome já reconectado):** Art. 78.º-A,
n.º3 do CIRS, lido no texto consolidado do Diário da República, diz
literalmente: *"Quando exista mais de um dependente, à dedução
prevista nas alíneas a) e b) do n.º 1 somam-se os montantes de (euro)
300 e (euro) 150, respetivamente, para o segundo dependente e
seguintes que não ultrapassem seis anos de idade até 31 de dezembro do
ano a que respeita o imposto, independentemente da idade do primeiro
dependente."* 600€ (n.º1-a) + 300€ (n.º3) = 900€, exatamente a
correção já feita a partir da PwC — agora confirmada contra a lei em
bruto, não só uma fonte secundária. O n.º4 do mesmo artigo acrescenta
que esta bonificação e a do n.º2 (os 726€ para um único dependente
<=3 anos) "não são cumulativas" — o motor já respeita isto (nunca
soma os dois), o que a leitura direta da lei confirma como correto,
não só como uma escolha de implementação razoável.

Simplificação conhecida, não resolvida: a lei refere-se ao "1.º
dependente" por ordem de nascimento/registo civil, que esta app não
recolhe — usa-se a ordem crescente de idade como aproximação
determinística (o dependente mais novo do agregado é tratado como
"2.º ou seguinte" sempre que houver mais do que um).

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

**Açores — ✅ Verificado, correção de mecanismo (18/08/2026, ronda
"vamos a por los estimates").** Uma ronda anterior (16/08/2026) tinha
codificado um mecanismo diferenciado por escalão (30% no 1.º escalão,
20% nos restantes), baseado em múltiplas fontes secundárias
convergentes mas sem nenhuma tabela numérica a confirmá-lo. Esta ronda
encontrou dois elementos que corrigem essa hipótese: (1) a PwC
Portugal, "Guia Fiscal 2026 — IRS", tem uma tabela numérica completa
dos 9 escalões para os Açores, idêntica à da Madeira, com cada taxa a
corresponder exatamente à taxa nacional × 0,7 (ex.: 12,5% → 8,75%; 48%
→ 33,60%) — uma redução **uniforme** de 30%, não diferenciada; (2) o
texto do **Art. 4.º, n.º 1 do Decreto Legislativo Regional n.º 2/99/A**
(na redação do Art. 47.º da DLR n.º 15-A/2021/A), obtido via pesquisa e
corroborado pela Circular n.º 6/2025 da Autoridade Tributária (que cita
a mesma base legal para as tabelas de retenção), diz: *"Às taxas
nacionais do imposto sobre o rendimento das pessoas singulares, em
vigor em cada ano, é aplicada uma redução de 30%"* — sem qualificação
por escalão.

O motor foi simplificado (`irs.js` e `calculateIRS()` em
`tax-engine.js`) para usar o mesmo campo uniforme `reducaoSobreTaxaMarginal`
já usado pela Madeira, removendo o mecanismo diferenciado por escalão.

**Confirmação direta na fonte primária (18/08/2026, ronda "verificação
em mundo real"):** usando um browser real (via Claude in Chrome, que
consegue renderizar JavaScript, ao contrário das ferramentas de
pesquisa/fetch usadas nas rondas anteriores), foi lida diretamente a
versão consolidada do DLR n.º 2/99/A em
https://diariodarepublica.pt/dr/legislacao-consolidada/decreto-legislativo-regional/1999-164477580-164477048
— Capítulo II, Artigo 4.º ("IRS"), texto integral: *"1 - Às taxas
nacionais do imposto sobre o rendimento das pessoas singulares, em
vigor em cada ano, é aplicada uma redução de 30 %."* Sem qualificação
por escalão — confirma a hipótese uniforme. A nota de alterações no
próprio artigo confirma também a segunda fonte já usada: *"Alterado
pelo/a Artigo 47.º do/a Decreto Legislativo Regional n.º 15-A/2021/A -
Diário da República n.º 105/2021, 1.º Suplemento, Série I de
2021-05-31, em vigor a partir de 2021-06-05, produz efeitos a partir de
2022-01-01"*. Este ponto passa de "duas fontes secundárias
convergentes" para confirmação direta no diploma consolidado oficial —
item retirado da checklist de produção. **Achado relacionado, cablado
nesta mesma ronda (18/08/2026):**
a mesma tabela da PwC mostra a Taxa Adicional de Solidariedade (Art.
68.º-A CIRS) também reduzida em 30% nos Açores (2,5%→1,75%; 5%→3,5%) —
ver detalhe completo mais acima, na subsecção "Taxa adicional de
solidariedade".
Fonte: [PwC Portugal, Guia Fiscal 2026 — IRS](https://www.pwc.pt/pt/pwcinforfisco/guia-fiscal/2026/irs.html).

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

Re-confirmado em 19/08/2026 diretamente na tabela "Regimes de
Segurança Social" do [PwC Guia Fiscal 2026 — Segurança
Social](https://www.pwc.pt/pt/pwcinforfisco/guia-fiscal/2026/seguranca-social.html)
(mesma tabela também fornece o IAS 2026 de 537,13€, já usado nesta
app) — coincide exatamente com os valores já guardados. Ainda sem
confirmação direta contra o Código dos Regimes Contributivos ou
seg-social.pt.

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

### Trabalhadores independentes — ✅ Verificado (18/08/2026)

Taxa-regra de 21,4% e o fator de 70% (rendimento relevante para
prestação de serviços) confirmados contra o Art. 168.º do Código dos
Regimes Contributivos (CRCSPSS), via simuladorneto.pt — fórmula
explícita "Faturação trimestral × 70% ÷ 3 × 21,4%", com exemplos
numéricos reproduzidos e conferidos à mão, e consistente com o IAS
2026 (537,13€) já verificado nesta app.

**Bug corrigido nesta ronda:** `data/tax-engine.js` aplicava os 21,4%
diretamente sobre a faturação bruta do trabalhador independente, sem
passar pelo fator de 70% do "rendimento relevante" — isto sobrestimava
a contribuição de Segurança Social em cerca de 43% (21,4% do bruto em
vez de 21,4% de 70% do bruto = 14,98% efetivo do bruto). Corrigido para
`descontoSSMensal = salarioBrutoMensal × 0,7 × 0,214`. O fator de 20%
para produção/venda de bens continua por modelar (a app só cobre
prestação de serviços). Limites de contribuição mensal (mínimo 20€ ou
148,36€ sem rendimento declarado; máximo 1.379,35€ = 12× IAS × 21,4%)
continuam não modelados — o motor calcula sempre a proporção exata,
sem aplicar pisos/tetos.
Fonte: [simuladorneto.pt — Segurança Social Trabalhadores Independentes 2026](https://simuladorneto.pt/seguranca-social-trabalhadores-independentes).

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

Re-confirmado em 19/08/2026 com uma segunda ronda de pesquisa
independente (calculariva.pt, InvoiceXpress, Cegid Vendus,
odiverse.com) — convergência total com os valores já guardados. Ainda
sem acesso direto ao CIVA/Portal das Finanças a partir deste ambiente.

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

### IABA (álcool) — ✅ Verificado (fonte primária direta, 18/08/2026)

Duas rondas iniciais (15/08 e 16/08/2026) não conseguiram aceder à
tabela oficial da AT — só fontes secundárias incompatíveis entre si
para a cerveja, e nenhum valor absoluto para espirituosas/intermédios
(esses dois elementos ficaram `UNKNOWN` durante essas rondas). A
terceira ronda (18/08/2026, roadmap P1-8) encontrou e leu diretamente
o folheto oficial da AT "Sistema Fiscal Português — Taxas Aplicáveis"
(info.portaldasfinancas.gov.pt), que tem uma secção IABA completa —
fechando todos os valores antes `UNKNOWN`:

| Produto | Taxa |
|---|---|
| Vinho tranquilo e espumante | €0/hl |
| Bebidas fermentadas (inclui sidras) | €12,06/hl (corrige os €10,30/hl herdados de 2017) |
| Produtos intermédios | €87,92/hl |
| Álcool etílico | €1.602,51/hl de álcool contido |
| Bebidas espirituosas | €1.602,51/hl de álcool contido (mesma base do álcool etílico) |
| Cerveja | escalões por % vol./grau Plato, de €9,64 a €33,85/hl — tabela completa em `impostos-especiais.js`, ainda não exposta na UI de Gastos (a unidade tributável exige dados que o utilizador tipicamente não sabe de cabeça) |

Regime de redução de 75% para licores/"crème de" e aguardentes de
medronho, prorrogado até 31/12/2026. A edição do folheto é de 2025 —
confirmado de forma independente (PwC Portugal, Observador) que o
OE2026 não alterou as taxas base do IABA, só prorrogou o regime do
medronho. Regras específicas dos Açores e da Madeira confirmadas mas
não implementadas (esta app assume sempre a taxa do Continente, como
já documentado para o IVA). Fonte: [AT, "Sistema Fiscal Português —
Taxas Aplicáveis 2025"](https://info.portaldasfinancas.gov.pt/pt/apoio_contribuinte/Folhetos_informativos/Documents/SFP-Taxas-2025.pdf).

### IT (tabaco) — ✅ Verificado (completado 19/08/2026, mesma fonte primária)

| Elemento | Elemento específico | Elemento ad valorem |
|---|---|---|
| Cigarros | 151,88 €/1000 | 1% do PVP |
| Tabaco aquecido | 0,0935 €/g | 15% do PVP |
| Charutos e cigarrilhas | 0,091 €/g | 15% do PVP |
| Tabaco de fumar/enrolar, rapé, tabaco de mascar | — | 25% do PVP |
| Tabaco para cachimbo de água | — | 75% do PVP |
| Líquido p/ cigarros eletrónicos, com nicotina | 0,351 €/ml | — |
| Líquido p/ cigarros eletrónicos, sem nicotina | 0,175 €/ml | — |
| Bolsas de nicotina | 0,065 €/g | — (figura nova de 2026, não consta no folheto 2025) |

Os valores de cigarros foram re-confirmados de forma independente
contra o mesmo folheto — batem exatamente com o que já estava
guardado. Os restantes produtos (charutos, tabaco de fumar/enrolar,
cachimbo de água, líquidos de cigarro eletrónico) estavam `UNKNOWN`
até esta ronda; nenhum tem função de cálculo dedicada ainda — a UI de
Gastos só cobre combustível e cigarros — mas ficam documentados para
referência futura, seguindo o mesmo padrão já usado para a tabela de
cerveja do IABA. Mesma fonte: [AT, "Sistema Fiscal Português — Taxas
Aplicáveis 2025", secção 3.3](https://info.portaldasfinancas.gov.pt/pt/apoio_contribuinte/Folhetos_informativos/Documents/SFP-Taxas-2025.pdf).

---

## 5. Impostos Patrimoniais e de Veículo

**Fonte:** Código do IMI, Código do ISV, Código do IUC, Código do
Imposto de Selo.
**Ficheiro:** `data/tax-rules/2026/patrimoniais.js`

### IMI — 🟡 estrutura verificada, tabela por concelho 🟡 ESTIMATE completa (embutida 18/08/2026)

Intervalo legal nacional: 0,3%–0,45% do VPT/ano para prédios urbanos
(até 0,5% em casos específicos — devolutos, degradados), 0,8% fixo
para prédios rústicos.

**Ronda "verificação em mundo real" (18/08/2026):** a tabela completa
por concelho foi finalmente embutida em `data/tax-rules/2026/patrimoniais.js`
(`imi.tabelaPorConcelho.lista`), usando um browser real (Claude in
Chrome, capaz de renderizar JavaScript — ao contrário das ferramentas
de pesquisa/fetch usadas em rondas anteriores) para ler o artigo da
Economia e Finanças, "Taxas de IMI por Município a pagar em 2026"
(02/01/2026), que por sua vez declara ter extraído os dados
diretamente do Portal das Finanças. Cobertura: 299 dos 308 municípios
com uma taxa exata; os 6 concelhos com taxa diferenciada por freguesia
(Freixo de Espada à Cinta, Idanha-a-Nova, Lagos, Porto Santo, Aguiar da
Beira, Sesimbra) ficam com `taxa: null` — a app explica isto ao
utilizador em vez de mostrar um número inventado; os ~9 municípios
sem informação nem nesta fonte simplesmente não aparecem na lista, e a
app cai no aviso genérico de "taxa desconhecida" para eles.

**Achado desta ronda:** a lista de exceções usada até agora ("só 3
concelhos com taxa máxima") estava desatualizada — a leitura da tabela
completa revela um **4.º** concelho com a taxa máxima de 0,45%:
Nazaré, além de Vila Real de Santo António, Oeiras e Cartaxo (31
municípios desceram a taxa e 6 subiram-na face a 2025, incluindo
Oeiras, que passou da taxa mínima para a máxima).

O simulador continua a usar 0,3% como valor sugerido apenas para
concelhos totalmente ausentes da tabela, mostrando sempre a taxa exata
quando o concelho está coberto, e continua a pedir confirmação
explícita contra o Portal das Finanças ou a Câmara Municipal — nunca
assume silenciosamente. **Continua ESTIMATE, não verified**, porque
não houve confirmação cruzada direta com o Portal das Finanças (o
simulador oficial de IMI corre em JavaScript e não expõe um
endpoint/tabela pública a que esta app tenha conseguido aceder,
mesmo com browser real) nem com a Portaria/deliberação de cada
câmara municipal. Fonte: [Economia e Finanças, "Taxas de IMI por
Município a pagar em 2026"](https://economiafinancas.com/2026/taxas-de-imi-por-municipio-a-pagar-em-2026/).

### ISV — 🟡 ESTIMATE (atualizado 15/08/2026)

Tabelas numéricas completas obtidas (componente cilindrada + componente
ambiental CO₂, para gasolina e gasóleo; desconto por idade para usados
importados; regime PHEV 2026; isenção total de elétricos). Fonte
original: EcoImport (ecoimport.pt/isv-2026-novas-regras/), um agregador
especializado em importação automóvel. **Verificação direta (18/08/2026,
roadmap P1-8):** a tabela WLTP foi cruzada, número a número, contra o
folheto oficial da AT "Sistema Fiscal Português — Taxas Aplicáveis
2025" (info.portaldasfinancas.gov.pt) — todos os valores batem
exatamente, e como o OE2026 não alterou estas tabelas, a confirmação
de 2025 vale para 2026. Passa de ESTIMATE a ✅ Verified nessa ronda. Os
dois exemplos numéricos do artigo EcoImport foram reproduzidos
manualmente: um bate certo, o outro (VW Golf) revelou um erro de 1€ na
própria conta da fonte (1.498×5,61−6.194,88 = 2.208,90€, não os
2.209,90€ que o artigo reporta) — o motor desta app usa o valor
recalculado corretamente, não o valor com erro da fonte.

**Tabela NEDC acrescentada em 19/08/2026** (ronda "vamos a por ello"):
até então só a tabela WLTP estava implementada — veículos homologados
em NEDC (tipicamente matriculados antes de meados de 2018) deviam
`UNKNOWN`. A mesma fonte da AT tem a secção NEDC completa (gasolina e
gasóleo); lida via `web_fetch` e cruzada com a tabela já existente.
`calcularISV()` agora aceita `protocolo: "NEDC"` e calcula
normalmente. Implementado em `calcularISV()`.

### IUC — ✅ Verified para categorias A/B/E (atualizado 19/08/2026)

Tabela completa da categoria B (ligeiros de passageiros/mistos, 1.ª
matrícula desde 1/7/2007 — a mais comum), categoria A pré-2007 e
categoria E (motociclos/triciclos/quadriciclos). Fonte original: DECO
PROteste. **Verificação direta (18/08/2026):** categoriaB e
categoriaAPre2007 cruzadas número a número contra o mesmo folheto
oficial da AT usado para o ISV — passam a ✅ Verified.
categoriaEMotociclos manteve-se ESTIMATE nessa ronda (não re-cruzada).

**Ronda 19/08/2026 ("vamos a por ello"), a partir da mesma fonte:**

- **categoriaEMotociclos passa a ✅ Verified**: a coluna "posterior a
  1996" já batia certo (confirmação extra); acrescentada a coluna em
  falta "entre 1992 e 1996" (Art.º 13.º CIUC).
- **Adicional de altas emissões (Art. 10.º, n.º2 do CIUC), NOVO —
  corrige uma subestimação real**: veículos da categoria B com 1.ª
  matrícula a partir de 2017 pagam um adicional de 31,77€ ou 63,74€
  consoante o CO₂ (por cima da taxa base). `calcularIUC()` não
  aplicava nada disto até esta ronda — subestimava sistematicamente o
  imposto de veículos pós-2017 com emissões mais altas. Corrigido,
  com testes de regressão que comparam o mesmo veículo antes/depois de
  2017.
- **categoriaF** (2,95 €/kW, Art. 14.º CIUC) e **categoriaG** (0,75
  €/kg, limite 13.705,25€, Art. 15.º CIUC) acrescentadas como dados de
  referência — sem função de cálculo dedicada (nenhuma UI desta app
  pede potência em kW ou peso em kg).
- **Categorias C e D continuam UNKNOWN**: o folheto da AT remete para
  tabelas "disponíveis no próprio artigo" (Art. 11.º/12.º CIUC) sem as
  reproduzir — precisam de consulta direta ao Código do IUC. Baixa
  prioridade: são veículos pesados de mercadorias, fora do público-alvo
  típico deste simulador.

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

## 5b. Outras contribuições — CAV e Taxa Municipal Turística (18/08/2026)

Adicionadas a pedido explícito do autor ("piensa en otros impuestos que
podamos incluir, por ejemplo el impuesto de audiovisuales, el impuesto
sobre el tratamiento de residuos"). A investigação avaliou cinco
candidatos; dois foram implementados, três foram deliberadamente
deixados de fora — ver justificação abaixo.

### Contribuição Audiovisual (CAV) — ✅ Verified

Cobrada mensalmente na fatura de eletricidade de (quase) todos os
consumidores em Portugal Continental, para financiar a RTP (Lei n.º
30/2003, de 22 de agosto). Valor 2026: 2,85€ + IVA (6%) = 3,02€/mês
(36,24€/ano) na tarifa normal; 1€ + IVA = 1,06€/mês (12,72€/ano) na
tarifa reduzida; isento se o consumo anual for inferior a 400 kWh.
Implementado em `data/tax-rules/2026/outras-taxas.js`
(`OUTRAS_TAXAS_2026.cav`) e no formulário de Taxas
(`modules/impostos-anuais.js`), com um seletor de situação
(normal/reduzida/isento) que sugere o valor anual mas nunca o bloqueia
— o utilizador pode sempre corrigir a partir da própria fatura.

**Atualização (19/08/2026, ronda "verificar o glossário contra a
fonte"):** passa de ESTIMATE a ✅ Verified — o Art. 4.º da Lei n.º
30/2003 foi lido DIRETAMENTE na versão consolidada do Diário da
República (`diariodarepublica.pt`, "Em vigor", última alteração
2017-12-29), já não depende de imprensa/comercializadoras de energia
como fonte primária. Confirma exatamente os valores já guardados e
acrescenta o critério exato de elegibilidade à tarifa reduzida (Art.
4.º, n.º 2): beneficiários do complemento solidário para idosos, do
rendimento social de inserção, do subsídio social de desemprego, do
1.º escalão do abono de família, ou da pensão social de invalidez —
mais preciso do que "tarifa social de energia" (a formulação da DGEG,
mantida como referência secundária). Fonte primária: [Diário da
República, Lei n.º 30/2003, Art.
4.º](https://diariodarepublica.pt/dr/legislacao-consolidada/lei/2003-105700797-105720191).

### Taxa Municipal Turística — 🟡 ESTIMATE

Cobrada por pessoa/noite em hotéis e alojamento local, tipicamente só
nas primeiras 7 noites consecutivas de estadia. Ao contrário do IMI,
**não existe uma taxa nacional única** — cada município decide,
autonomamente, se cobra e quanto; só uma parte dos 308 municípios a
cobra. Por isso a app não tenta embutir uma tabela completa por
concelho (seria um esforço de tamanho semelhante ao do IMI, mas para um
imposto que a maioria dos utilizadores só paga ocasionalmente, em
viagem — não compensa). Em vez disso, mostra dois exemplos de
referência (Lisboa 4€/noite, Porto 3€/noite — dados 2026) e oferece uma
calculadora opcional de noites × valor/noite que preenche o campo
"Valor pago", sempre editável a partir da fatura real do alojamento.
Implementado em `data/tax-rules/2026/outras-taxas.js`
(`OUTRAS_TAXAS_2026.taxaTuristica`). Fonte: [Host Wise, Taxa Turística
em Portugal](https://www.hostwise.pt/blog/taxa-turistica-alojamento-local-portugal),
Lisboa.pt, Câmara Municipal do Porto.

### Deixados de fora, deliberadamente: TGR, TRH e TMDP

Três contribuições foram investigadas e **não** implementadas, por
decisão conjunta com o autor — não por falta de dados, mas porque o
esforço de as modelar com precisão não compensaria o efeito no
resultado final:

- **Taxa de Gestão de Resíduos (TGR)** e **Taxa de Recursos Hídricos
  (TRH)** — cobradas em cêntimos por m³ na fatura da água (ex.:
  ~0,08€/m³ e ~0,06€/m³ em 2026, valores que variam por entidade
  gestora municipal), tipicamente somando poucos euros por ano e quase
  invisíveis ao utilizador médio sem ler a fatura da água linha a
  linha.
- **Taxa Municipal de Direitos de Passagem (TMDP)** — até 0,25% da
  fatura de telecomunicações (o próprio município decide a percentagem,
  até esse limite), nem sequer cobrada em todos os municípios, e alvo
  de controvérsia legal sobre a sua cobrança.

Estas três aparecem mencionadas explicitamente como limitação no ecrã
do Dia da Liberdade Fiscal ("O que fica sempre de fora"), para que o
resultado nunca seja apresentado como 100% completo sem o dizer.

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

## 8. Checklist operacional — atualização anual (Auditoria 2026-08, hallazgo B-4)

A secção 7 já dizia "anual, em janeiro" — mas uma cadência sem passos
concretos é fácil de adiar sem se notar. Esta é a amenaça mais séria
identificada na auditoria de 18/08/2026: sem isto, a app passa de útil
a silenciosamente incorreta a cada Orçamento do Estado, sem que
ninguém se aperceba (`AUDITORIA-2026-08.md`, secção 5, "Amenazas").

**Gatilho:** correr esta checklist assim que o Orçamento do Estado do
ano seguinte for publicado em Diário da República (tipicamente
dezembro), e o mais tardar antes de 31 de janeiro.

- [ ] Criar `data/tax-rules/AAAA/` (novo ano) copiando a estrutura de
      `data/tax-rules/2026/` — nunca editar os ficheiros do ano
      anterior no local: os períodos já fechados
      (`periodosFechados`) guardam o *resultado* já calculado, não
      recalculam com as tabelas atuais, mas se algum dia a app passar
      a recalcular histórico, vai precisar das tabelas antigas
      intactas.
- [ ] Atualizar cada parâmetro em `data/tax-rules/AAAA/*.js` contra a
      fonte primária (secção 8 do CLAUDE.md: AT, Segurança Social,
      Diário da República — nunca uma fonte secundária como único
      apoio). Marcar `UNKNOWN`/`ESTIMATE` o que não se conseguir
      confirmar, nunca copiar o valor do ano anterior "a assumir que
      não mudou" sem verificar.
- [ ] Atualizar os 5 imports em `data/tax-engine.js` (linhas ~16-20)
      para o novo caminho `./tax-rules/AAAA/...`.
- [ ] Atualizar o import em `modules/impostos-anuais.js`
      (`PATRIMONIAIS_2026`) e em `modules/faturas.js`
      (`IMPOSTOS_ESPECIAIS_2026`, `IVA_2026`) — grep por
      `tax-rules/2026` no projeto para apanhar qualquer sítio
      adicional que se tenha acrescentado entretanto.
- [ ] Atualizar `ANO_FISCAL` em `modules/dia-liberdade.js`.
- [ ] Atualizar as 5 entradas `data/tax-rules/2026/*.js` em
      `STATIC_ASSETS` (`sw.js`) para o novo caminho, e subir
      `CACHE_VERSION`.
- [ ] Correr `npm test` — os testes do motor fiscal
      (`tests/tax-engine*.test.js`) vão falhar em qualquer valor que
      mude, o que é o comportamento esperado: atualizar os valores
      esperados nos testes é a forma de confirmar que a mudança foi
      intencional, não um efeito colateral.
- [ ] Rever esta checklist e a secção 9 abaixo — atualizar datas e
      estados UNKNOWN/ESTIMATE conforme o que se resolveu ou não nesta
      ronda.
- [ ] Registar a data em que esta checklist foi executada, e por quem,
      no `CHANGELOG` do commit — não é preciso um ficheiro à parte,
      mas tem de ficar rastreável no histórico do git.

## 9. Checklist antes de publicar em produção

- [ ] Confirmar todos os parâmetros ✅ diretamente contra
      portaldasfinancas.gov.pt / seg-social.pt / diariodarepublica.pt
- [ ] Resolver o coeficiente completo do regime simplificado (IRS)
- [ ] Resolver a tabela completa de IABA (cerveja, bebidas
      espirituosas, produtos intermédios continuam UNKNOWN após duas
      rondas de investigação — 15/08 e 16/08/2026; vinho, espumante e
      bebidas fermentadas já ✅/🟡 — ver secção 4)
- [x] Resolver a tabela completa de concelhos do IMI — 🟡 ESTIMATE
      (embutida 18/08/2026, ronda "verificação em mundo real"): 299 dos
      308 concelhos de Portugal com taxa exata, lidos diretamente via
      browser real de um artigo (Economia e Finanças, 02/01/2026) que
      declara tê-los extraído do Portal das Finanças; os 6 concelhos com
      taxa diferenciada por freguesia ficam marcados com taxa `null` em
      vez de um valor inventado, e ~9 concelhos continuam sem
      informação disponível nem nesta fonte. Achado desta ronda: a
      lista anterior de "3 concelhos com taxa máxima" estava
      desatualizada — são 4 (falta a Nazaré). Continua ESTIMATE porque
      não houve confirmação cruzada direta com o Portal das Finanças
      (simulador em JavaScript, sem endpoint tabular acessível) — ver
      secção 5.
- [x] Diferencial regional de IRS dos Açores — ✅ Verified (confirmação
      final 18/08/2026, ronda "verificação em mundo real"): corrigido de
      um mecanismo diferenciado por escalão (nunca confirmado
      numericamente) para uma redução uniforme de 30%, confirmada
      diretamente no texto consolidado do Art. 4.º do DLR 2/99/A via
      leitura direta em diariodarepublica.pt (browser real, JS
      renderizado) — já não depende só de fontes secundárias. Ver
      secção 1.
- [x] Cablar a Taxa Adicional de Solidariedade (Art. 68.º-A CIRS) na
      cadeia salarial real — 🟡 ESTIMATE (cablada 18/08/2026):
      `calculateTaxaSolidariedade()` já é chamada por
      `calcularCadeiaSalarial`/`calcularCadeiaSalarialConjunta`, com
      quociente familiar e redução regional só para Açores (30%,
      confirmada), sem redução para Madeira (não confirmada), e sem
      deixar a dedução por dependentes reduzir a sobretaxa (Art. 68.º-A
      n.os 4-6, que previam essa atenuação, foram revogados pela Lei
      7-A/2016) — ver secção 1. **Continua por confirmar**: redução
      regional da Madeira nesta sobretaxa específica (0% assumido por
      precaução, pode estar incorreto).
- [ ] Obter a tabela completa de pesos de categorias de consumo do INE
      (Inquérito às Despesas das Famílias 2022/2023) — só se
      confirmaram os três maiores blocos (Habitação, Alimentação,
      Transportes) via imprensa; o portal do INE serve os dados via
      JavaScript, inacessível às ferramentas de pesquisa usadas nas
      duas rondas tentadas (15/08 e 16/08/2026) — ver
      `data/categorias-gastos-pt.js`
- [x] Resolver as tabelas numéricas de ISV e IUC — 🟡 ESTIMATE,
      implementadas em `calcularISV()`/`calcularIUC()` com fonte
      EcoImport/DECO PROteste (ver secção 5); protocolo NEDC (ISV) e
      matrículas pré-2007 (IUC) continuam UNKNOWN por falta de tabelas
- [x] Resolver o Imposto de Selo — ✅ Verified diretamente contra
      info.portaldasfinancas.gov.pt (Tabela Geral), implementado em
      `calcularImpostoSelo()` para as verbas principais (ver secção 5)
- [x] Segurança Social de trabalhadores independentes — ✅ Verified
      (18/08/2026): confirmados a taxa de 21,4% e o fator de 70% do
      "rendimento relevante" contra o Art. 168.º CRCSPSS; corrigido um
      bug real no motor que aplicava a taxa sobre a faturação bruta em
      vez de sobre 70% dela (sobrestimava a contribuição em ~43%) — ver
      secção 2. Limites de contribuição mensal (mínimo/máximo) e o
      fator de 20% para produção/venda de bens continuam por modelar.
- [ ] Classificar cada item de `data/goods-services-pt.js` contra as
      Listas I/II do CIVA (Fase 5)
- [ ] Estabelecer o processo de verificação mensal do ISP
