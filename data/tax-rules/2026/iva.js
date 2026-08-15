// Liberdade Fiscal — Parâmetros de IVA, ano fiscal 2026
//
// Fonte: Código do IVA (CIVA), Listas I e II anexas. Taxas por região
// confirmadas via múltiplas fontes secundárias (OCC, InvoiceXpress,
// CalcularIVA.pt). Não foi possível aceder diretamente às Listas I/II
// do Portal das Finanças a partir deste ambiente — a classificação de
// cada bem/serviço concreto (data/goods-services-pt.js, Fase 5)
// precisa de ser verificada individualmente contra essas listas.

export const IVA_2026 = {
  year: 2026,
  source: "Código do IVA (CIVA) — taxas gerais, Art. 18.º e Listas I/II anexas",
  sourceUrl: "https://www.portaldasfinancas.gov.pt",
  retrievedNote:
    "Taxas gerais confirmadas via múltiplas fontes secundárias em 15/08/2026. A classificação de bens/serviços concretos nas Listas I/II do CIVA (reduzida vs. intermédia vs. normal) precisa de verificação individual na Fase 5 — não assumir aqui.",

  taxas: {
    continente: { reduzida: 0.06, intermedia: 0.13, normal: 0.23 },
    acores: { reduzida: 0.04, intermedia: 0.09, normal: 0.16 },
    madeira: { reduzida: 0.04, intermedia: 0.12, normal: 0.22 },
  },
};
