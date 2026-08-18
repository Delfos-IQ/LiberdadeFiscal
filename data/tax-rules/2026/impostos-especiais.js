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
   * IABA — atualizado após terceira ronda de investigação (18/08/2026,
   * roadmap P1-8 da AUDITORIA-2026-08.md). As duas rondas anteriores
   * (15/08 e 16/08/2026) não tinham conseguido aceder à tabela oficial
   * da AT — só fontes secundárias incompatíveis entre si para a
   * cerveja, e nenhum valor absoluto para espirituosas/intermédios.
   *
   * Esta ronda encontrou e leu diretamente o folheto oficial da AT
   * "Sistema Fiscal Português — Taxas Aplicáveis", que tem uma secção
   * IABA completa com todas as figuras antes UNKNOWN. É a mesma fonte
   * (info.portaldasfinancas.gov.pt) e o mesmo tipo de documento já
   * usado para o Imposto de Selo (✅ Verified nesta mesma secção). A
   * edição encontrada está datada de 2025 — não se encontrou ainda uma
   * edição 2026 do próprio folheto — mas o OE2026 não alterou as taxas
   * base do IABA (confirmado de forma independente via PwC Portugal e
   * Observador, ambos já citados abaixo): a única mudança de 2026 é a
   * prorrogação do regime de redução do medronho, já refletida aqui.
   * Por isso as taxas ficam ✅ Verified (fonte primária direta), com a
   * ressalva textual da edição.
   */
  iaba: {
    status: "verified",
    source:
      "Autoridade Tributária e Aduaneira, \"Sistema Fiscal Português — Taxas Aplicáveis 2025\" (info.portaldasfinancas.gov.pt/pt/apoio_contribuinte/Folhetos_informativos/Documents/SFP-Taxas-2025.pdf), secção IABA, consultado diretamente 18/08/2026 — reconfirma art.os 71.º a 76.º do CIEC. Ausência de alteração das taxas base para 2026 corroborada por PwC Portugal (Impostos Indiretos no OE 2026) e por imprensa (Observador, 10/10/2025, sobre o congelamento da taxa de espirituosas).",
    sourceUrl:
      "https://info.portaldasfinancas.gov.pt/pt/apoio_contribuinte/Folhetos_informativos/Documents/SFP-Taxas-2025.pdf",
    notes:
      "Vinho tranquilo e espumante (Art.º 72.º do CIEC): €0/hl. Outras bebidas fermentadas, tranquilas e espumantes — ex.: sidras (Art.º 73.º): €12,06/hl — CORRIGE o valor anterior desta app (€10,30/hl, herdado de uma fonte de 2017 sem confirmação); o valor correto e atual é 12,06€. Produtos intermédios (Art.º 74.º): €87,92/hl. Álcool etílico (Art.º 75.º): €1.602,51/hl de álcool contido (base 100% vol., 20°C). Bebidas espirituosas (Art.º 76.º): mesma base e mesmo valor do álcool etílico, €1.602,51/hl de álcool contido — confirmado tanto pela estrutura da tabela oficial (a linha de bebidas espirituosas remete para o mesmo tipo de unidade tributável) como por uma fonte jurídica independente (informador.pt, compilação do texto do Art.º 76.º do CIEC). Regime de redução de 75% (paga-se 25% da taxa) para licores/'crème de' e aguardentes de medronho de concelhos elegíveis, prorrogado até 31/12/2026. Regimes especiais adicionais confirmados nesta ronda: pequenas destilarias e pequenas cervejeiras pagam 50% da taxa normal; pequenos produtores independentes pagam 50% da taxa normal de produtos intermédios/outras bebidas fermentadas (Art.os 79.º/80.º/80.º-A do CIEC) — não modelados nesta app (afetam produtores, não o consumidor final que é quem usa este simulador). Regras específicas dos Açores (25%/50% da taxa continental consoante produção/consumo) e da Madeira (taxa própria de €1.253,70/hl para espirituosas/álcool etílico) também confirmadas mas não implementadas — esta app assume sempre a taxa do Continente para IABA, tal como já documentado para o IVA.",
    vinhoTranquiloEEspumante: { value: 0, unit: "EUR/hl" },
    bebidasFermentadas: {
      value: 12.06,
      unit: "EUR/hl",
      notes: "Inclui sidras (Art.º 73.º do CIEC). Corrigido nesta ronda — o valor anterior (10,30€) vinha de 2017 e estava desatualizado.",
    },
    produtosIntermedios: { value: 87.92, unit: "EUR/hl", notes: "Art.º 74.º do CIEC." },
    alcoolEtilico: {
      value: 1602.51,
      unit: "EUR/hl de álcool contido (base 100% vol., 20°C)",
      notes: "Art.º 75.º do CIEC.",
    },
    bebidasEspirituosas: {
      value: 1602.51,
      unit: "EUR/hl de álcool contido (base 100% vol., 20°C)",
      notes: "Art.º 76.º do CIEC — mesma unidade e valor do álcool etílico.",
    },
    cerveja: {
      unit: "EUR/hl de produto acabado",
      fonte: "Art.º 71.º do CIEC",
      notes:
        "A unidade tributável combina volume (hectolitro) com o teor alcoólico OU o grau Plato (uma medida da densidade do mosto antes da fermentação, que a maioria dos consumidores não sabe de cabeça) — por isso, ao contrário do combustível (só litros) ou do tabaco (nº de cigarros + preço), esta app ainda não pede ao utilizador dados suficientes para escolher o escalão certo com confiança. Tabela completa documentada aqui para referência futura; a UI de Gastos continua a mostrar só o IVA para a categoria de álcool, não o IABA da cerveja.",
      escaloes: [
        { min: 0.5, max: 3.5, unidade: "% vol. de álcool adquirido", taxa: 9.64 },
        { descricao: "> 3,5% vol. e ≤ 7° Plato", taxa: 12.06 },
        { descricao: "> 3,5% vol. e > 7° e ≤ 11° Plato", taxa: 19.29 },
        { descricao: "> 3,5% vol. e > 11° e ≤ 13° Plato", taxa: 24.13 },
        { descricao: "> 3,5% vol. e > 13° e ≤ 15° Plato", taxa: 28.95 },
        { descricao: "> 3,5% vol. e > 15° Plato", taxa: 33.85 },
      ],
    },
    reducaoMedronho: {
      percentagemPago: 0.25,
      aplicavelA: "Licores e 'crème de', aguardentes destiladas e aguardente de frutos do medronheiro, produzidos e destilados em concelhos elegíveis",
      prorrogadoAte: "2026-12-31",
    },
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
