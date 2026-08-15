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
// 2022/2023 com esta informação (alimentação passou de 14,3% para
// 12,9% do orçamento familiar entre edições), mas não foi possível
// extrair a tabela completa por categoria nesta ronda de investigação
// (15/08/2026) — o portal do INE serve os dados via JavaScript, fora
// do alcance das ferramentas de pesquisa disponíveis. Por isso esta
// categoria fica sem valores de referência pré-preenchidos: o
// utilizador estima do zero, sem uma "resposta certa" para comparar.
// Ver TAX-METHODOLOGY.md.

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
