// Liberdade Fiscal — Categorias de gastos mensais (redesenho de agosto
// de 2026, a pedido do autor)
//
// Substitui a captura por fatura individual (item a item, spec §6.3
// original) por uma estimativa mensal autorreportada por categoria —
// menos precisa, mas com muito menos fricção. O utilizador introduz
// quanto gasta em média por mês em cada categoria; a app decompõe
// esse valor em base + IVA (e ISP/IABA quando aplicável) assumindo
// que o valor introduzido já inclui o imposto (como no preço de
// prateleira/talão), usando os mesmos parâmetros verificados de
// data/tax-rules/2026/iva.js e impostos-especiais.js.
//
// Os níveis de IVA (`ivaLevel`) usam a mesma classificação já
// verificada em data/goods-services-pt.js (Listas I/II do CIVA) — não
// é um novo levantamento, é uma agregação das mesmas categorias por
// nível dominante.
//
// Pesos de referência (quanto gasta em média um agregado português em
// cada categoria): o INE publica o Inquérito às Despesas das Famílias
// 2022/2023 com esta informação. Numa primeira ronda (15/08/2026) não
// foi possível extrair a tabela completa por categoria — o portal do
// INE serve os dados via JavaScript, fora do alcance das ferramentas
// de pesquisa disponíveis. Numa reinvestigação (16/08/2026), via
// imprensa que citou o destaque do INE diretamente (Jornal de
// Negócios, 20/12/2023), obtiveram-se os três maiores blocos —
// Habitação 39,1%, Alimentação 12,9%, Transportes 12,4% — mas não a
// tabela completa das restantes categorias, e as categorias do INE não
// correspondem 1:1 às categorias desta app (p.ex. "Habitação" do INE
// inclui renda/prestação, que esta app não modela como imposto). Por
// isso, mesmo com estes três valores confirmados, a app continua sem
// os injetar como pré-preenchimento nos campos — ver
// MEDIAS_NACIONAIS_INE_REFERENCIA abaixo, usada apenas como contexto
// documental, nunca como valor por omissão. Ver TAX-METHODOLOGY.md.

/**
 * Referência apenas informativa (NÃO usada para pré-preencher nada na
 * UI) — média nacional de peso no orçamento familiar, segundo o
 * Inquérito às Despesas das Famílias do INE 2022/2023, despesa média
 * anual total de referência: 23.900€/agregado. Fonte: Jornal de
 * Negócios, "Peso da despesa das famílias com habitação
 * praticamente duplicou" (20/12/2023), citando diretamente o INE.
 * As categorias do INE são mais amplas que as desta app (incluem
 * renda, prestações de crédito habitação, etc., que aqui não contam
 * como imposto) — por isso não são diretamente comparáveis categoria
 * a categoria, só uma ordem de grandeza.
 */
export const MEDIAS_NACIONAIS_INE_REFERENCIA = {
  status: "ESTIMATE",
  fonte: "INE, Inquérito às Despesas das Famílias 2022/2023, via Jornal de Negócios (20/12/2023)",
  fonteUrl:
    "https://www.jornaldenegocios.pt/economia/detalhe/-peso-da-despesa-das-familias-com-habitacao-praticamente-duplicou",
  despesaMediaAnualTotal: 23900,
  pesos: {
    habitacao: 0.391,
    alimentacao: 0.129,
    transportes: 0.124,
    restauracaoEAlojamento: 0.089,
  },
  notes:
    "Categorias amplas do INE, não diretamente equiparáveis às categorias desta app — usar apenas como ordem de grandeza, nunca como valor por omissão nos campos.",
};

/**
 * @typedef {object} CategoriaGasto
 * @property {string} id
 * @property {string} label
 * @property {string[]} exemplos
 * @property {"reduzida"|"intermedia"|"normal"|"combustivel"} tipo
 * @property {string} [notes]
 */

/** @type {CategoriaGasto[]} */
export const CATEGORIAS_GASTOS_PT = [
  {
    id: "alimentacao",
    label: "Alimentação (supermercado)",
    exemplos: ["Pão, fruta, legumes", "Carne e peixe", "Azeite", "Leite e lacticínios"],
    tipo: "reduzida",
  },
  {
    id: "restauracao",
    label: "Restauração",
    exemplos: ["Refeições em restaurante", "Café", "Take-away"],
    tipo: "intermedia",
  },
  {
    id: "habitacao",
    label: "Habitação e suministros",
    exemplos: ["Água", "Eletricidade (dentro do limite)", "Gás"],
    tipo: "reduzida",
    notes:
      "A taxa reduzida de eletricidade só se aplica até 200 kWh/mês (300 kWh para famílias numerosas) e potências até 6,9 kVA — acima disso a taxa é normal. Este valor assume que estás dentro do limite; se sabes que ultrapassas, o desglose vai subestimar ligeiramente o IVA pago.",
  },
  {
    id: "combustivel",
    label: "Combustível",
    exemplos: ["Gasolina", "Gasóleo"],
    tipo: "combustivel",
    notes: "Além do IVA, o combustível tem o ISP (Imposto sobre Produtos Petrolíferos) já incluído no preço — o IVA incide sobre o preço com ISP incluído.",
  },
  {
    id: "transportes",
    label: "Transportes públicos",
    exemplos: ["Passe mensal", "Bilhetes de comboio/autocarro/metro"],
    tipo: "reduzida",
  },
  {
    id: "saude",
    label: "Saúde",
    exemplos: ["Medicamentos", "Consultas e exames"],
    tipo: "reduzida",
    notes: "Medicamentos têm taxa reduzida; muitos serviços de saúde são isentos de IVA (isento não é o mesmo que gratuito) — este desglose assume taxa reduzida para todo o valor, uma simplificação.",
  },
  {
    id: "cultura-lazer",
    label: "Cultura e lazer",
    exemplos: ["Livros", "Cinema, teatro, concertos", "Streaming"],
    tipo: "intermedia",
  },
  {
    id: "vestuario-outros",
    label: "Vestuário e outros bens",
    exemplos: ["Roupa e calçado", "Eletrónica", "Mobiliário"],
    tipo: "normal",
  },
  {
    id: "alcool-tabaco",
    label: "Bebidas alcoólicas e tabaco",
    exemplos: ["Cerveja, vinho", "Tabaco"],
    tipo: "normal",
    notes: "Além do IVA, estas categorias têm impostos especiais (IABA/IT) — parte da tabela de IABA continua UNKNOWN (ver TAX-METHODOLOGY.md), por isso o desglose especial só aparece para tabaco.",
  },
];
