// Liberdade Fiscal — Catálogo de bens e serviços (Fase 5)
//
// Cada item já traz o nível de taxa de IVA resolvido (reduzida/
// intermedia/normal) — a conversão para a percentagem exata por região
// faz-se combinando com IVA_2026 de data/tax-rules/2026/iva.js.
//
// Classificação verificada via pesquisa web em 15/08/2026 contra a
// estrutura das Listas I e II do CIVA (não a redação integral e
// literal das listas, que tem centenas de verbas). Itens com
// classificação de baixa confiança estão marcados `confianca: "baixa"`
// e não devem ser tratados como definitivos sem confirmação contra o
// Portal das Finanças antes de produção — ver TAX-METHODOLOGY.md.
//
// @typedef {import('./db.js')} _unused

/** @typedef {"reduzida"|"intermedia"|"normal"} NivelIVA */

/**
 * @typedef {object} GoodService
 * @property {string} id
 * @property {string} name_pt
 * @property {string} category
 * @property {NivelIVA} iva_level
 * @property {{type: "ISP"|"IABA"|"IT", note: string}} [special_tax]
 * @property {"alta"|"media"|"baixa"} confianca
 */

/** @type {GoodService[]} */
export const GOODS_SERVICES_PT = [
  // ---------- Alimentação essencial — Lista I (reduzida) ----------
  { id: "pao", name_pt: "Pão", category: "Alimentação", iva_level: "reduzida", confianca: "alta" },
  { id: "leite", name_pt: "Leite", category: "Alimentação", iva_level: "reduzida", confianca: "alta" },
  { id: "fruta-legumes", name_pt: "Fruta e legumes frescos", category: "Alimentação", iva_level: "reduzida", confianca: "alta" },
  { id: "azeite", name_pt: "Azeite", category: "Alimentação", iva_level: "reduzida", confianca: "alta" },
  { id: "carne-peixe", name_pt: "Carne e peixe", category: "Alimentação", iva_level: "reduzida", confianca: "media" },

  // ---------- Restauração — Lista II (intermédia), álcool à parte ----------
  {
    id: "refeicao-restaurante",
    name_pt: "Refeição em restaurante (comida e bebidas não alcoólicas)",
    category: "Restauração",
    iva_level: "intermedia",
    confianca: "alta",
  },
  {
    id: "cafe",
    name_pt: "Café / bebida quente ao balcão",
    category: "Restauração",
    iva_level: "intermedia",
    confianca: "media",
  },
  {
    id: "bebida-alcoolica-restaurante",
    name_pt: "Bebida alcoólica consumida em restaurante/bar",
    category: "Restauração",
    iva_level: "normal",
    special_tax: {
      type: "IABA",
      note: "Sujeita a IABA além do IVA. Tabela de taxas IABA por bebida ainda não disponível neste simulador.",
    },
    confianca: "media",
  },

  // ---------- Cultura e conhecimento — Lista I (reduzida) ----------
  { id: "livros", name_pt: "Livros", category: "Cultura", iva_level: "reduzida", confianca: "alta" },
  { id: "jornais-revistas", name_pt: "Jornais e revistas", category: "Cultura", iva_level: "reduzida", confianca: "alta" },
  {
    id: "espetaculos",
    name_pt: "Bilhetes de música, dança, teatro ou cinema",
    category: "Cultura",
    iva_level: "intermedia",
    confianca: "media",
  },

  // ---------- Saúde — Lista I (reduzida) ----------
  { id: "medicamentos", name_pt: "Medicamentos", category: "Saúde", iva_level: "reduzida", confianca: "alta" },

  // ---------- Habitação e utilities ----------
  { id: "agua", name_pt: "Água (abastecimento)", category: "Habitação", iva_level: "reduzida", confianca: "alta" },
  {
    id: "eletricidade",
    name_pt: "Eletricidade (dentro do limite reduzido)",
    category: "Habitação",
    iva_level: "reduzida",
    confianca: "media",
    notes:
      "Taxa reduzida aplica-se só aos primeiros 200 kWh/mês (300 kWh para famílias numerosas) e a potências contratadas até 6,9 kVA. Acima disso, a taxa é normal — este item assume que o consumo está dentro do limite reduzido.",
  },
  {
    id: "eletricidade-acima-limite",
    name_pt: "Eletricidade (acima do limite reduzido)",
    category: "Habitação",
    iva_level: "normal",
    confianca: "media",
  },
  { id: "gas-aquecimento", name_pt: "Gás para aquecimento", category: "Habitação", iva_level: "intermedia", confianca: "baixa" },

  // ---------- Transportes ----------
  { id: "transporte-passageiros", name_pt: "Transporte de passageiros", category: "Transportes", iva_level: "reduzida", confianca: "alta" },
  {
    id: "combustivel-gasolina",
    name_pt: "Combustível — Gasolina",
    category: "Transportes",
    iva_level: "normal",
    special_tax: {
      type: "ISP",
      note: "O IVA calcula-se sobre o preço que já inclui o ISP — este é o parâmetro fiscal mais volátil do simulador, atualizado com muito mais frequência que os restantes.",
    },
    confianca: "alta",
  },
  {
    id: "combustivel-gasoleo",
    name_pt: "Combustível — Gasóleo",
    category: "Transportes",
    iva_level: "normal",
    special_tax: {
      type: "ISP",
      note: "O IVA calcula-se sobre o preço que já inclui o ISP — este é o parâmetro fiscal mais volátil do simulador, atualizado com muito mais frequência que os restantes.",
    },
    confianca: "alta",
  },

  // ---------- Alojamento ----------
  { id: "alojamento-hoteleiro", name_pt: "Alojamento hoteleiro", category: "Alojamento", iva_level: "reduzida", confianca: "alta" },

  // ---------- Vestuário, eletrónica, outros — taxa normal ----------
  { id: "vestuario", name_pt: "Vestuário e calçado", category: "Vestuário", iva_level: "normal", confianca: "alta" },
  { id: "eletronica", name_pt: "Eletrónica e eletrodomésticos", category: "Eletrónica", iva_level: "normal", confianca: "alta" },
  { id: "telecomunicacoes", name_pt: "Telecomunicações (telemóvel, internet)", category: "Serviços", iva_level: "normal", confianca: "alta" },
  { id: "mobiliario", name_pt: "Mobiliário", category: "Casa", iva_level: "normal", confianca: "alta" },
  { id: "produtos-limpeza", name_pt: "Produtos de limpeza", category: "Casa", iva_level: "normal", confianca: "media" },

  // ---------- Bebidas alcoólicas e tabaco fora da restauração ----------
  {
    id: "cerveja-vinho-loja",
    name_pt: "Cerveja ou vinho (compra em loja)",
    category: "Bebidas Alcoólicas",
    iva_level: "normal",
    special_tax: {
      type: "IABA",
      note: "Tabela de taxas IABA por bebida/grau alcoólico ainda não disponível neste simulador. O desglose especial não fica disponível até esse dado ser confirmado.",
    },
    confianca: "media",
  },
  {
    id: "tabaco",
    name_pt: "Tabaco (cigarros)",
    category: "Tabaco",
    iva_level: "normal",
    special_tax: {
      type: "IT",
      note: "IT com elemento específico (151,88€/1000 cigarros) + elemento ad valorem (1% do PVP), já verificado — ver data/tax-rules/2026/impostos-especiais.js.",
    },
    confianca: "alta",
  },

  // ---------- Serviços genéricos ----------
  { id: "servicos-gerais", name_pt: "Outro bem ou serviço (taxa normal)", category: "Outros", iva_level: "normal", confianca: "alta" },
];

/**
 * Devolve a taxa de IVA (fração) resolvida para um item + região.
 * @param {GoodService} item
 * @param {"continente"|"acores"|"madeira"} regiao
 * @param {import('./tax-rules/2026/iva.js').IVA_2026} ivaData
 */
export function resolveIvaRate(item, regiao, ivaData) {
  const taxasRegiao = ivaData.taxas[regiao];
  if (!taxasRegiao) {
    throw new RangeError(`Região desconhecida: ${regiao}`);
  }
  return taxasRegiao[item.iva_level];
}
