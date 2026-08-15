// Liberdade Fiscal — Parâmetros de IRS, ano fiscal 2026
//
// Fonte primária: Lei n.º 73-A/2025 (Orçamento do Estado 2026),
// artigos 68.º e 68.º-A do Código do IRS (CIRS).
// Verificado via múltiplas fontes secundárias (Doutor Finanças,
// Especialista do IRS, CGD Saldo Positivo) que citam a mesma lei —
// não foi possível aceder diretamente ao Portal das Finanças a partir
// deste ambiente de construção. Recomenda-se confirmar contra
// https://www.portaldasfinancas.gov.pt antes de publicar.
//
// @typedef {import('../../db.js').TaxParameter} TaxParameter

export const IRS_2026 = {
  year: 2026,
  source: "Lei n.º 73-A/2025 (Orçamento do Estado 2026), Art. 68.º e 68.º-A do CIRS",
  sourceUrl: "https://www.portaldasfinancas.gov.pt",
  retrievedNote:
    "Dados obtidos via pesquisa web em 15/08/2026 a partir de fontes secundárias que citam a Lei 73-A/2025. Confirmar contra o Portal das Finanças antes de publicar em produção.",

  /**
   * Escalões de IRS — Art. 68.º CIRS. Sistema progressivo: cada fatia do
   * rendimento coletável paga a taxa marginal do seu escalão.
   * `taxaMedia` é usada no método de cálculo simplificado oficial
   * (rendimento até ao limite do escalão anterior × taxa média do
   * escalão atual, mais o excedente à taxa marginal).
   */
  escaloes: [
    { min: 0, max: 8342, taxaMarginal: 0.125, taxaMedia: 0.125 },
    { min: 8342, max: 12587, taxaMarginal: 0.157, taxaMedia: 0.13579 },
    { min: 12587, max: 17838, taxaMarginal: 0.212, taxaMedia: 0.15823 },
    { min: 17838, max: 23089, taxaMarginal: 0.241, taxaMedia: 0.17705 },
    { min: 23089, max: 29397, taxaMarginal: 0.311, taxaMedia: 0.20579 },
    { min: 29397, max: 43090, taxaMarginal: 0.349, taxaMedia: 0.2513 },
    { min: 43090, max: 46566, taxaMarginal: 0.431, taxaMedia: 0.26472 },
    { min: 46566, max: 86634, taxaMarginal: 0.446, taxaMedia: 0.34856 },
    { min: 86634, max: Infinity, taxaMarginal: 0.48, taxaMedia: null },
  ],

  /**
   * Taxa adicional de solidariedade — Art. 68.º-A CIRS. Incide apenas
   * sobre a parte do rendimento coletável que excede cada limiar,
   * cumulativa com o IRS normal.
   */
  taxaSolidariedade: [
    { min: 80000, max: 250000, taxa: 0.025 },
    { min: 250000, max: Infinity, taxa: 0.05 },
  ],

  /** Mínimo de existência 2026 — abaixo deste valor não há IRS a pagar. */
  minimoExistencia: { value: 12880, unit: "EUR/ano", notes: "Atualizado para 2026." },

  /**
   * Dedução específica da Categoria A (trabalho dependente) — Art. 25.º
   * CIRS. Aplica-se o maior entre este valor fixo e as contribuições
   * efetivas para a Segurança Social, quando superiores.
   */
  deducaoEspecificaCategoriaA: { value: 4104, unit: "EUR/ano" },

  /**
   * Coeficiente do regime simplificado para trabalhadores independentes
   * (Categoria B, Art. 31.º CIRS) — percentagem do rendimento bruto que
   * constitui rendimento coletável. Varia por atividade; 0.75 é o valor
   * mais comum (prestação de serviços do Art. 151.º).
   * ESTIMATE: apenas o coeficiente-regra foi verificado; a tabela
   * completa por atividade (0.75 / 0.35 / 0.10 / 0.95 consoante o CAE)
   * não foi confirmada nesta pesquisa.
   */
  coeficienteRegimeSimplificado: {
    value: 0.75,
    unit: "fração",
    status: "ESTIMATE",
    notes:
      "Coeficiente-regra para prestação de serviços (Art. 151.º CIRS). Outras atividades têm coeficientes distintos — verificar tabela completa do Art. 31.º CIRS antes de publicar.",
  },

  /**
   * Patamares mensais a partir dos quais começa a retenção na fonte
   * (rendimentos de trabalho dependente), por situação familiar.
   * Fonte: tabelas de retenção na fonte 2026, com efeitos a partir de
   * 1 de janeiro de 2026. Abaixo de 920€/mês não há retenção
   * (acompanha a atualização do salário mínimo nacional).
   */
  isencaoRetencaoAte: { value: 920, unit: "EUR/mês" },
  patamaresRetencao: [
    { situacao: "nao_casado_sem_dependentes", desde: 1695, unit: "EUR/mês" },
    { situacao: "casado_dois_titulares_sem_dependentes", desde: 1695, unit: "EUR/mês" },
    { situacao: "nao_casado_com_dependentes", desde: 1939, unit: "EUR/mês" },
    { situacao: "casado_dois_titulares_com_dependentes", desde: 1669, unit: "EUR/mês" },
    { situacao: "casado_titular_unico", desde: 2326, unit: "EUR/mês" },
  ],
};
