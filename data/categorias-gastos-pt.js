// Liberdade Fiscal — Categorias de gastos mensais (redesenho de agosto
// de 2026, a pedido do autor)
//
// Substitui a captura por fatura individual (item a item, spec §6.3
// original) por uma estimativa mensal autorreportada por categoria —
// menos precisa, mas com muito menos fricção. O utilizador introduz
// quanto gasta em média por mês em cada categoria; a app decompõe
// esse valor em base + IVA (e ISP/IT quando aplicável) assumindo
// que o valor introduzido já inclui o imposto (como no preço de
// prateleira/talão), usando os mesmos parâmetros verificados de
// data/tax-rules/2026/iva.js e impostos-especiais.js.
//
// Os níveis de IVA (`tipo`) usam a mesma classificação já verificada
// em data/goods-services-pt.js (Listas I/II do CIVA) — não é um novo
// levantamento, é uma agregação das mesmas categorias por nível
// dominante.
//
// Pesos de referência (quanto gasta em média um agregado português em
// cada categoria): o INE publica o Inquérito às Despesas das Famílias
// 2022/2023 com esta informação. Numa primeira ronda (15/08/2026) não
// foi possível extrair a tabela completa por categoria. Numa
// reinvestigação (16/08/2026), obtiveram-se os três maiores blocos —
// Habitação 39,1%, Alimentação 12,9%, Transportes 12,4% — mas não a
// tabela completa das restantes categorias, e as categorias do INE não
// correspondem 1:1 às categorias desta app (p.ex. "Habitação" do INE
// inclui renda/prestação, que esta app não modela como imposto). Por
// isso, mesmo com estes três valores confirmados, a app continua sem
// os injetar como pré-preenchimento nos campos — ver
// MEDIAS_NACIONAIS_INE_REFERENCIA abaixo, usada apenas como contexto
// documental, nunca como valor por omissão.
//
// Categorias de dupla tributação (16/08/2026): Combustível e Tabaco
// têm, além do IVA, um imposto especial de consumo (ISP/IT) já
// incluído no preço — o IVA incide sobre o preço com esse imposto
// especial já dentro, daí "dupla tributação" (um imposto sobre outro
// imposto). Estas duas categorias aceitam um detalhe opcional (litros
// para combustível; nº de cigarros + preço do maço para tabaco) que
// permite calcular o imposto especial com exatidão em vez de o deixar
// por explicar — usando calcularITCigarros()/o ISP unitário já
// verificados em data/tax-engine.js. Bebidas alcoólicas continuam sem
// essa exatidão na UI: as taxas de IABA para cerveja/espirituosas/
// produtos intermédios já foram encontradas e verificadas (terceira
// ronda de investigação, 18/08/2026 — ver
// data/tax-rules/2026/impostos-especiais.js), mas calculá-las exigiria
// perguntar ao utilizador dados que a maioria não sabe de cabeça
// (volume exato por tipo de bebida, grau Plato da cerveja) — por isso
// esta categoria continua, por agora, a mostrar só o IVA. Decisão de
// UX documentada, não uma lacuna de dados.

/**
 * @typedef {object} CategoriaGasto
 * @property {string} id
 * @property {string} label
 * @property {string[]} exemplos
 * @property {"reduzida"|"intermedia"|"normal"|"combustivel"} tipo
 * @property {string} [notes]
 * @property {"combustivel"|"tabaco"} [duplaTributacao] — ativa os campos opcionais de detalhe e a explicação de dupla tributação
 */

/** @type {CategoriaGasto[]} */
export const CATEGORIAS_GASTOS_PT = [
  {
    id: "alimentacao",
    label: "Alimentação (supermercado)",
    exemplos: ["Pão, fruta, legumes", "Carne e peixe", "Azeite", "Leite e lacticínios"],
    tipo: "reduzida",
    notes:
      "A maioria dos alimentos básicos tem taxa reduzida, mas nem todos — bebidas alcoólicas, refrigerantes ou certos produtos preparados/de charcutaria fina podem estar à taxa normal. Assumimos que o teu cabaz é maioritariamente à taxa reduzida, uma simplificação da nossa parte: o Inquérito às Despesas das Famílias do INE não desagrega o gasto em alimentação por taxa de IVA, só por categoria de despesa geral, e não encontrámos dados públicos que nos permitissem estimar a proporção exata sem os inventar — e isso é algo que nunca fazemos.",
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
      "A taxa reduzida de eletricidade só se aplica até 200 kWh/mês (300 kWh para famílias numerosas) e potências até 6,9 kVA — acima disso a taxa é normal. Assumimos que estás dentro do limite; se sabes que o ultrapassas, o nosso desglose vai subestimar ligeiramente o IVA que pagas.",
  },
  {
    id: "combustivel",
    label: "Combustível",
    exemplos: ["Gasolina", "Gasóleo"],
    tipo: "combustivel",
    duplaTributacao: "combustivel",
    notes:
      "Dupla tributação: o combustível tem o ISP (Imposto sobre Produtos Petrolíferos) já incluído no preço, e depois o IVA incide sobre esse preço, já com o ISP lá dentro — ou seja, pagas IVA sobre um imposto. Se nos disseres quantos litros abasteces por mês (é opcional), conseguimos calcular-te o ISP exato; sem essa informação, só te mostramos o IVA.",
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
    notes: "Os medicamentos têm taxa reduzida; já muitos serviços de saúde são isentos de IVA (isento não é o mesmo que gratuito). Para simplificar, assumimos taxa reduzida para todo o valor que indicares aqui.",
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
    id: "tabaco",
    label: "Tabaco",
    exemplos: ["Cigarros"],
    tipo: "normal",
    duplaTributacao: "tabaco",
    notes:
      "Dupla tributação: o tabaco tem o IT (Imposto sobre o Tabaco — elemento específico + elemento ad valorem) já incluído no preço, e depois o IVA incide sobre esse preço, já com o IT lá dentro. Se nos disseres quantos cigarros fumas por mês e o preço médio do maço (é opcional), conseguimos calcular-te o IT exato; sem essa informação, só te mostramos o IVA. Por agora só temos a tabela dos cigarros verificada — ainda não modelámos charutos, tabaco de enrolar nem tabaco aquecido.",
  },
  {
    id: "alcool",
    label: "Bebidas alcoólicas",
    exemplos: ["Cerveja, vinho", "Bebidas espirituosas"],
    tipo: "normal",
    notes:
      "Além do IVA, a maioria das bebidas alcoólicas tem também o IABA (Imposto sobre o Álcool) já incluído no preço — mais uma dupla tributação, tal como acontece no combustível e no tabaco. Já sabemos as taxas oficiais (vinho tranquilo e espumante: isentos; outras bebidas fermentadas como sidra: 12,06€/hl; produtos intermédios: 87,92€/hl; bebidas espirituosas: 1.602,51€/hl de álcool puro), mas para já continuamos a mostrar-te só o IVA, não o IABA: calculá-lo exigiria perguntar-te coisas que a maioria de nós não sabe de cabeça sobre o que compra — o volume exato, o tipo de bebida, e no caso da cerveja até o grau Plato do mosto — e preferimos não arriscar um número errado a partir de dados incompletos.",
  },
];

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
    "As categorias do INE são mais amplas do que as nossas, por isso não são diretamente equiparáveis — usa este número só como ordem de grandeza, nunca o tomes como um valor que preenchemos por ti nos campos.",
};
