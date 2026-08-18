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
   * incidência contributiva calculada sobre o "rendimento relevante"
   * (70% dos serviços prestados, 20% da produção/venda de bens),
   * aplicando só depois a taxa contributiva.
   *
   * ✅ Verified (18/08/2026, ronda "vamos a por los estimates"): taxa
   * de 21,4% e o fator de 70% para prestação de serviços confirmados
   * contra o Art. 168.º do Código dos Regimes Contributivos (CRCSPSS),
   * citado por simuladorneto.pt/seguranca-social-trabalhadores-
   * independentes (fórmula explícita: "Faturação trimestral × 70% ÷ 3
   * × 21,4%", com exemplos numéricos reproduzidos e batidos à mão),
   * consistente com o IAS 2026 (537,13€) já verificado nesta app.
   * IMPORTANTE — bug corrigido nesta ronda: `data/tax-engine.js`
   * aplicava os 21,4% diretamente sobre a faturação bruta, sem passar
   * pelo fator de 70% do "rendimento relevante" — isto sobrestimava a
   * contribuição de SS de um trabalhador independente em cerca de 43%
   * (21,4% do bruto em vez de 21,4% de 70% do bruto = 14,98% efetivo).
   * Corrigido para aplicar `percentagemRendimentoRelevante` antes da
   * taxa contributiva. O fator de 20% para produção/venda de bens
   * continua por modelar (a app só cobre prestação de serviços).
   * Limites não modelados: contribuição mínima 20€/mês (com
   * rendimento declarado) ou 148,36€/mês (sem rendimento declarado,
   * atividade aberta), máxima 1.379,35€/mês (base = 12× IAS).
   */
  trabalhadorIndependente: {
    taxaContributiva: 0.214,
    percentagemRendimentoRelevante: {
      prestacaoServicos: 0.7,
      producaoVendaBens: 0.2,
    },
    status: "verified",
    source: "Art. 168.º do Código dos Regimes Contributivos (CRCSPSS), via simuladorneto.pt/seguranca-social-trabalhadores-independentes, consultado 18/08/2026",
    sourceUrl: "https://simuladorneto.pt/seguranca-social-trabalhadores-independentes",
    notes:
      "Taxa-regra de 21,4% aplicada sobre o rendimento relevante (70% da faturação de serviços prestados, 20% de produção/venda de bens — esta app só modela prestação de serviços). Limites de contribuição mensal (mínimo 20€ ou 148,36€ sem rendimento declarado; máximo 1.379,35€ = 12× IAS × 21,4%) não modelados nesta app — o motor calcula sempre a proporção exata, sem aplicar pisos/tetos.",
  },
};
