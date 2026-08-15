// Liberdade Fiscal — Impostos Especiais de Consumo (IEC), ano fiscal 2026
// ISP (combustível), IABA (álcool), IT (tabaco)
//
// AVISO IMPORTANTE sobre o ISP: ao contrário de quase todos os outros
// parâmetros deste projeto, o ISP é ajustado por Portaria do Governo
// com frequência SEMANAL ou MENSAL (mecanismo de estabilização do
// preço dos combustíveis), não apenas uma vez por ano fiscal. O valor
// aqui guardado é uma fotografia de uma data concreta, marcada
// explicitamente como tal — nunca tratar como uma tabela anual fixa
// como as restantes. Antes de publicar, ou periodicamente em produção,
// verificar a Portaria em vigor em diariodarepublica.pt.

export const IMPOSTOS_ESPECIAIS_2026 = {
  year: 2026,
  source: "Código dos Impostos Especiais de Consumo (CIEC) + Portarias mensais/semanais do ISP",
  sourceUrl: "https://diariodarepublica.pt",
  retrievedNote:
    "Dados obtidos via pesquisa web em 15/08/2026. O ISP muda com muito mais frequência que os restantes parâmetros — ver aviso acima.",

  isp: {
    status: "ESTIMATE",
    asOfDate: "2026-05",
    notes:
      "Fotografia de maio de 2026, sujeita a alteração por portaria a qualquer momento. NÃO usar como referência anual fixa — o ISP é o parâmetro mais volátil de todo o motor fiscal.",
    gasolina: { value: 0.437, unit: "EUR/litro" },
    gasoleoRodoviario: { value: 0.298, unit: "EUR/litro" },
  },

  /**
   * IABA — apenas o enquadramento geral foi confirmado (isenção parcial
   * de 75% para licores/aguardentes de medronho de certos municípios,
   * prorrogada até 31/12/2026). A tabela completa de taxas por tipo de
   * bebida e grau alcoólico (cerveja €/hl consoante grau Plato, vinho,
   * espumantes, bebidas espirituosas €/hl de álcool puro) NÃO foi
   * verificada nesta pesquisa.
   */
  iaba: {
    status: "UNKNOWN",
    notes:
      "Apenas confirmado o regime de redução de 75% para medronho de certos municípios (prorrogado até 31/12/2026). Tabela completa de taxas por bebida/grau alcoólico pendente de consulta direta ao CIEC / Portal das Finanças. NÃO INVENTAR valores — o motor fiscal deve recusar-se a calcular IABA até este parâmetro ser preenchido.",
    taxas: null,
  },

  /**
   * IT (tabaco) — cigarros confirmados com os dois elementos do CIEC
   * (específico + ad valorem). Bolsas de nicotina são uma figura nova
   * de 2026. Outros produtos de tabaco (charutos, tabaco de enrolar,
   * tabaco aquecido) não foram verificados.
   */
  it: {
    cigarros: {
      elementoEspecifico: { value: 151.88, unit: "EUR/1000 cigarros" },
      elementoAdValorem: { value: 0.01, unit: "fração do preço de venda ao público" },
    },
    bolsasNicotina: {
      value: 0.065,
      unit: "EUR/grama",
      notes: "Figura fiscal nova em 2026 (primeiro ano de aplicação).",
    },
    outrosProdutos: {
      status: "UNKNOWN",
      notes: "Charutos, tabaco de enrolar e tabaco aquecido não verificados nesta pesquisa.",
    },
  },
};
