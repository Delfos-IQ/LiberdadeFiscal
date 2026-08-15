// Liberdade Fiscal — Parâmetros de Segurança Social, ano fiscal 2026
//
// Fonte: Código dos Regimes Contributivos (Lei n.º 110/2009), taxas do
// regime geral confirmadas via PwC Guia Fiscal 2026 e HVR Business
// Consulting. IAS (Indexante de Apoios Sociais) 2026 via Doutor
// Finanças. Não foi possível aceder diretamente ao portal da
// Segurança Social a partir deste ambiente — confirmar antes de
// publicar em produção.

export const SEGURANCA_SOCIAL_2026 = {
  year: 2026,
  source: "Código dos Regimes Contributivos (Lei n.º 110/2009) — regime geral",
  sourceUrl: "https://www.seg-social.pt",
  retrievedNote:
    "Dados obtidos via pesquisa web em 15/08/2026. Confirmar contra www.seg-social.pt antes de publicar em produção.",

  /** Indexante de Apoios Sociais 2026 — base de cálculo de várias prestações. */
  ias: { value: 537.13, unit: "EUR/mês" },

  /**
   * Taxa Social Única (TSU) — regime geral, trabalhadores por conta de
   * outrem. A soma (34,75%) reparte-se entre trabalhador e entidade
   * patronal; a entidade paga a sua parte ADICIONALMENTE ao salário
   * bruto (não é retida do trabalhador).
   */
  tsu: {
    regimeGeral: {
      total: 0.3475,
      trabalhador: 0.11,
      entidadePatronal: 0.2375,
    },
  },

  /**
   * Trabalhadores independentes (regime simplificado) — base de
   * incidência contributiva calculada sobre o rendimento relevante
   * (70% dos serviços prestados, 20% da produção/venda de bens),
   * aplicando depois a taxa contributiva.
   * ESTIMATE: taxa-regra confirmada (~21,4%); mecanismo de apuramento
   * trimestral da base de incidência não verificado em detalhe nesta
   * pesquisa.
   */
  trabalhadorIndependente: {
    taxaContributiva: 0.214,
    status: "ESTIMATE",
    notes:
      "Taxa-regra do regime simplificado de trabalhadores independentes. O apuramento trimestral da base de incidência contributiva (70%/20% consoante o tipo de rendimento) não foi verificado em detalhe — confirmar contra www.seg-social.pt.",
  },
};
