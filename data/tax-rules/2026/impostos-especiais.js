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
   * IABA — atualizado após ronda de investigação adicional (15/08/2026).
   * Vinho tranquilo/espumante e bebidas fermentadas (sidras) têm taxas
   * confirmadas. Cerveja, bebidas espirituosas e produtos intermédios
   * continuam UNKNOWN: encontrou-se apenas a variação percentual de um
   * aumento de 2017 (+3%), não o valor absoluto em vigor em 2026 — sem
   * o valor base não é possível reconstruir o valor atual, por isso
   * mantém-se UNKNOWN em vez de estimado a partir de uma variação
   * percentual desatualizada (regra do spec §8: nunca inventar).
   */
  iaba: {
    status: "ESTIMATE",
    source: "PwC Portugal, Impostos Indiretos no OE 2026 (confirma ausência de alteração de taxas base) + AEVC (valores de vinho/sidra, herdados de 2017, sem alteração assinalada desde então)",
    sourceUrl: "https://www.pwc.pt/pt/pwcinforfisco/orcamentoestado/impostos-indiretos.html",
    notes:
      "Confirmado: (1) regime de redução de 75% do IABA para licores/'crème de' e aguardentes de medronho de certos municípios, prorrogado até 31/12/2026 (fonte PwC, análise ao OE2026); (2) vinho tranquilo e espumante mantêm taxa de €0/hl; (3) bebidas fermentadas (sidras) tributadas a €10,30/hl — valor de 2017, sem alteração legislativa encontrada desde então, mas não confirmado diretamente contra a tabela 2026 do Portal das Finanças. Cerveja, bebidas espirituosas e produtos intermédios continuam UNKNOWN — só se encontrou a variação percentual de um aumento de 2017 (+3%), não o valor absoluto atual, e extrapolar a partir de uma variação de 9 anos atrás violaria a regra de nunca inventar dados.",
    vinhoTranquiloEEspumante: { value: 0, unit: "EUR/hl" },
    bebidasFermentadas: { value: 10.3, unit: "EUR/hl", notes: "Inclui sidras. Valor de 2017, não reconfirmado para 2026." },
    reducaoMedronho: {
      percentagemPago: 0.25,
      aplicavelA: "Licores e 'crème de', aguardentes destiladas e aguardente de frutos do medronheiro, produzidos e destilados em concelhos elegíveis",
      prorrogadoAte: "2026-12-31",
    },
    cerveja: { status: "UNKNOWN" },
    bebidasEspirituosas: { status: "UNKNOWN" },
    produtosIntermedios: { status: "UNKNOWN" },
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
