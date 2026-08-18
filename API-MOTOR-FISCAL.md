# Motor fiscal (`data/tax-engine.js`) — referência de API

Roadmap P3-18 (`AUDITORIA-2026-08.md`). Este documento existe porque o
`data/tax-engine.js` já foi desenhado, desde a Fase 2, como uma camada
de funções puras isolada da UI — nenhuma toca o DOM, o IndexedDB ou
qualquer estado global (ver o comentário de cabeçalho do próprio
ficheiro). Isso torna-o reutilizável fora dos módulos de UI desta app,
por exemplo por um script de linha de comandos, um Node script, outro
projeto, ou testes de terceiros — desde que se respeitem as
condições abaixo.

## 0. Antes de reutilizar isto — leia primeiro

- **Isto não é uma biblioteca publicada.** É um módulo ES interno,
  sem versionamento semver, sem `package.json` próprio, sem garantias
  de estabilidade de API entre commits. Se for reutilizar isto fora
  deste repositório, copie o ficheiro (e os seus imports em
  `data/tax-rules/2026/`) para o seu projeto e trate-o como código
  vendored, não como uma dependência que atualiza sozinha.
- **Os dados fiscais têm ano de validade.** Tudo aqui assume o ano
  fiscal 2026 (`data/tax-rules/2026/*.js`). Não existe seletor de ano;
  para outro ano, seria preciso criar `data/tax-rules/AAAA/` com os
  parâmetros revalidados (ver `TAX-METHODOLOGY.md` secção 8, checklist
  de atualização anual) e apontar os imports deste ficheiro para lá.
- **Nem todos os valores são `✅ Verified`.** Vários parâmetros estão
  marcados `ESTIMATE` (fonte secundária, não a Autoridade Tributária
  diretamente) ou `UNKNOWN` (dado não encontrado). As funções
  correspondentes devolvem esse `status` explicitamente no objeto de
  resultado — nunca inventam um número. Ver `TAX-METHODOLOGY.md` para
  o estado exato de cada parâmetro antes de confiar num valor para uso
  fora deste simulador educativo.
- **Isto não é aconselhamento fiscal.** Mesmo os valores `✅ Verified`
  são uma simulação educativa (ver `CLAUDE.md` §9) — não substituem o
  cálculo oficial da Autoridade Tributária nem uma consulta a um
  contabilista certificado.
- **Import**: módulo ES puro, sem build step.
  ```js
  import { calculateIRS, calcularCadeiaSalarial } from "./data/tax-engine.js";
  ```
  Os imports internos (`./tax-rules/2026/irs.js`, etc.) resolvem por
  caminho relativo — mover `tax-engine.js` sem os ficheiros de
  `tax-rules/2026/` correspondentes parte os imports.

## 1. Convenções gerais

- **Moeda**: todos os valores monetários são números em EUR, sem
  formatação (a formatação pt-PT — `1.234,56 €` — é responsabilidade
  da camada de UI, ver `data/share-card.js` para um exemplo).
- **Arredondamento**: a maioria dos valores devolvidos já vem
  arredondada a cêntimo (`round2`, 2 casas decimais) ou, para taxas,
  a 4 casas decimais (`round4`). Isto é intencional — o arredondamento
  acontece por escalão/tramo internamente, não só no total final (ver
  nota em `calculateIRS`), porque só assim bate certo com os exemplos
  oficiais da Autoridade Tributária.
- **Erros**: as funções lançam `TypeError`/`RangeError` de forma
  síncrona para parâmetros claramente inválidos (tipo errado, negativo
  onde não devia, região/nível desconhecidos). Não há validação de
  schema completa — quem chama deve validar o input do utilizador
  antes (ver os módulos de UI para exemplos de validação de formulário).
- **`status`**: várias funções (IABA, ISV, IUC, alguns ramos do ISP)
  devolvem `{ status: "UNKNOWN", reason }` ou incluem
  `status: "ESTIMATE"` no resultado, em vez de lançar erro. Isto é
  deliberado (`CLAUDE.md` §10: nunca inventar um valor) — trate
  `status` como parte do contrato de retorno, não como metadado
  acessório.
- **`fonte`/`sourceUrl`**: quase todas as funções devolvem de onde veio
  o parâmetro usado. Propague isto se construir algo que mostra
  resultados a um utilizador — é o que evita apresentar uma estimativa
  como se fosse um dado oficial.

## 2. Índice de funções

| Função | Figura tributária | Estado dos dados |
|---|---|---|
| `calculateIRS(rendimentoColetavel, opcoes)` | IRS (Art. 68.º/69.º CIRS) | ✅ Verified (escalões); região ESTIMATE |
| `calcularDeducaoDependentes(dependentes)` | IRS — dedução à coleta (Art. 78.º-A) | ✅ Verified |
| `calculateTaxaSolidariedade(rendimentoColetavel)` | IRS — taxa adicional de solidariedade (Art. 68.º-A) | ✅ Verified |
| `calcularRendimentoColetavelCategoriaA(bruto, ssAnual)` | IRS — dedução específica Cat. A (Art. 25.º) | ✅ Verified |
| `calculateTSU(salarioBrutoMensal)` | Segurança Social — TSU regime geral | ✅ Verified |
| `calcularCadeiaSalarial(salarioBrutoMensal, opcoes)` | Cadeia bruto→líquido completa (orquestra IRS+SS) | mista, ver campos individuais |
| `calculateIVA(baseTributavel, regiao, nivel)` | IVA, a partir da base | ✅ Verified |
| `decomporIVADeTotal(valorTotal, regiao, nivel)` | IVA, a partir do total já pago | ✅ Verified |
| `decomporCombustivel(valorTotalPago, tipo, regiao)` | ISP + IVA sobre combustível | ESTIMATE, ISP muda por portaria semanal/mensal |
| `decomporIABA()` | Imposto sobre o Álcool | Sempre `UNKNOWN` — ver nota abaixo |
| `calcularITCigarros(numeroCigarros, precoVendaPublico)` | IT — cigarros | ✅ Verified |
| `calcularIMI(vpt, taxaConcelho, tipo)` | IMI | ✅ Verified (taxas legais); exige taxa do concelho como input |
| `calcularISV(opcoes)` | ISV | ✅ Verified (cruzado com AT, ver P1-8) |
| `calcularIUC(opcoes)` | IUC | ✅ Verified para categoriaB/categoriaAPre2007 (ver P1-8); resto ESTIMATE/UNKNOWN |
| `calcularImpostoSelo(verba, valor, opcoes)` | Imposto de Selo | ✅ Verified |
| `calculateFiscalFreedomDay(input)` | Consolidação — Dia da Liberdade Fiscal | depende dos inputs fornecidos |

Ver o JSDoc de cada função em `data/tax-engine.js` para a assinatura
completa de parâmetros e forma exata do objeto devolvido — este
documento resume, não substitui essa fonte.

### Nota sobre `decomporIABA()`

Ao contrário das outras funções "especiais", esta devolve sempre
`UNKNOWN` — existe como um ponto único e óbvio a substituir quando (se)
uma calculadora de IABA for implementada, em vez de a UI ter de saber
que a figura não está calculada. Desde a investigação de 18/08/2026
(P1-8) já existem as taxas oficiais verificadas em
`data/tax-rules/2026/impostos-especiais.js` (`IMPOSTOS_ESPECIAIS_2026.iaba`)
— o motivo de `decomporIABA()` continuar sem lógica não é falta de
dados, é uma decisão de UX (calcular exigiria pedir ao utilizador o
grau Plato da cerveja, informação que a maioria não sabe de cor). Ver
`data/categorias-gastos-pt.js` para a explicação completa.

## 3. Exemplos de uso

### 3.1 IRS simples (declaração individual, Continente)

```js
import { calculateIRS } from "./data/tax-engine.js";

const resultado = calculateIRS(24000, { regiao: "continente", quocienteFamiliar: 1 });
// resultado.imposto            → IRS anual em EUR
// resultado.taxaEfetiva        → fração (ex.: 0.1832 = 18,32%)
// resultado.decomposicaoPorEscalao → array por escalão, para um "Como chegámos a este número?"
```

### 3.2 Cadeia salarial completa (o que o Taxímetro/Rendimentos usa)

```js
import { calcularCadeiaSalarial } from "./data/tax-engine.js";

const cadeia = calcularCadeiaSalarial(1800, {
  tipoTrabalhador: "dependente",
  estadoCivil: "individual",
  dependentes: [{ idade: 5 }],
  regiao: "continente",
});
// cadeia.custoTotalEmpregadorMensal → custo para o empregador (TSU patronal incluída)
// cadeia.salarioLiquidoMensal       → o que o trabalhador recebe, já com SS e IRS descontados
```

### 3.3 IVA a partir de um valor já pago (fluxo de Gastos)

```js
import { decomporIVADeTotal } from "./data/tax-engine.js";

const { baseTributavel, imposto } = decomporIVADeTotal(120, "continente", "normal");
// imposto = IVA contido nos 120€ pagos, à taxa normal (23%) do Continente
```

### 3.4 Dia da Liberdade Fiscal, a partir de totais já apurados

```js
import { calculateFiscalFreedomDay } from "./data/tax-engine.js";

const dia = calculateFiscalFreedomDay({
  ano: 2026,
  rendimentoBrutoAnual: 21600,
  irsAnual: 2100,
  ssTrabalhadorAnual: 2376,
  ivaEEspeciaisRegistado: 850,
  patrimoniaisRegistado: 300,
});
// dia.date        → "2026-06-27" (exemplo)
// dia.percentage  → fração do ano dedicada a impostos
// dia.methodology → texto completo das hipóteses, para mostrar ao utilizador
```

### 3.5 Tratar `UNKNOWN`/`ESTIMATE` corretamente

```js
import { calcularIUC } from "./data/tax-engine.js";

const iuc = calcularIUC({ cilindrada: 1598, co2: 128, anoMatricula: 2019, combustivel: "gasolina" });

if (iuc.status === "UNKNOWN") {
  // Não mostrar um número — mostrar iuc.reason ao utilizador e pedir
  // que introduza o valor manualmente (é o que modules/impostos-anuais.js faz).
} else {
  // iuc.status === "ESTIMATE" — mostrar o valor, mas rotulado como
  // estimativa, com iuc.fonte visível.
  console.log(iuc.imposto, iuc.fonte);
}
```

## 4. Onde estão os dados de origem

```
data/tax-rules/2026/
  irs.js                  escalões, quociente familiar, mínimo de existência, dependentes
  seguranca-social.js     TSU regime geral, trabalhador independente
  iva.js                  taxas por região (Continente/Açores/Madeira) × nível
  impostos-especiais.js   ISP (combustível), IABA (álcool), IT (tabaco)
  patrimoniais.js         IMI, ISV, IUC, Imposto de Selo
```

Cada ficheiro segue o `TaxParameter`-like shape documentado em
`CLAUDE.md` §5 (`value`, `unit`, `year`, `source`, `sourceUrl`,
`status`) — nunca uma taxa solta sem proveniência. Para saber se um
valor concreto pode ser usado com confiança fora deste simulador,
confirme o `status` no ficheiro de dados correspondente, não só no
resultado da função (o resultado nem sempre repete `status` quando o
dado subjacente é `✅ Verified`, porque nesse caso não há ambiguidade a
sinalizar).

## 5. Testes

`tests/tax-engine.test.js` e `tests/tax-engine-patrimoniais.test.js`
cobrem estas funções com casos de salário baixo/médio/alto, várias
regiões e vários tipos de consumo (ver `QA-FASE-9.md`). Se for
reutilizar `tax-engine.js` fora deste repositório, recomenda-se copiar
também estes testes como ponto de partida para validar a portabilidade.
