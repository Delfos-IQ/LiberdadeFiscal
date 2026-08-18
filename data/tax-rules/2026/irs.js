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
   * Quociente familiar (Art. 69.º CIRS) — divide o rendimento coletável
   * antes de aplicar os escalões, depois multiplica o imposto de volta.
   * Reduz a taxa marginal efetiva para casais com rendimentos
   * assimétricos.
   */
  quocienteFamiliar: {
    declaracaoIndividual: 1,
    declaracaoConjuntaCasadosOuUnidoFacto: 2,
  },

  /**
   * Dedução à coleta por dependente (Art. 78.º-A CIRS) — subtrai-se
   * diretamente ao imposto já calculado (nunca ao rendimento
   * coletável). Valores verificados via pesquisa web em 15/08/2026.
   */
  deducaoPorDependente: {
    maisDe3Anos: { value: 600, unit: "EUR/ano/dependente" },
    ate3AnosInclusive: { value: 726, unit: "EUR/ano/dependente" },
    segundoDependenteOuSeguinteAte3Anos: {
      value: 900,
      unit: "EUR/ano",
      notes: "Substitui os 726€ a partir do 2.º dependente com idade <= 3 anos.",
    },
    guardaConjuntaResidenciaAlternada: {
      value: 300,
      unit: "EUR/ano/progenitor",
      notes: "Cada progenitor pode deduzir metade do valor quando há guarda conjunta com residência alternada comunicada à AT.",
    },
  },

  /**
   * Diferencial regional de IRS — Açores e Madeira.
   *
   * ✅ Verified (18/08/2026, ronda "vamos a por los estimates"): a
   * versão anterior desta app assumia um mecanismo diferenciado por
   * escalão para os Açores (30% no 1.º escalão, 20% nos restantes),
   * baseado em fontes secundárias convergentes mas nunca confirmado
   * contra o texto legal. Esta ronda encontrou dois elementos que
   * CORRIGEM essa hipótese:
   * (1) PwC Portugal, "Guia Fiscal 2026 — IRS" (pwc.pt/pt/pwcinforfisco/
   *     guia-fiscal/2026/irs.html), consultado 18/08/2026 — tabela
   *     numérica completa dos 9 escalões para os Açores, idêntica à da
   *     Madeira, com cada taxa marginal a corresponder exatamente à
   *     taxa nacional × 0,7 (ex.: 12,5% → 8,75%; 48% → 33,60%) — ou
   *     seja, uma redução UNIFORME de 30% em todos os escalões, tal
   *     como a Madeira, não um mecanismo diferenciado por escalão.
   * (2) O texto do Art. 4.º, n.º 1 do Decreto Legislativo Regional
   *     n.º 2/99/A, de 20 de janeiro (na redação do Art. 47.º da DLR
   *     n.º 15-A/2021/A, de 31 de maio), citado através de resultados
   *     de pesquisa e corroborado pela Circular n.º 6/2025 da
   *     Autoridade Tributária (info.portaldasfinancas.gov.pt/.../
   *     Circular_6_2025_RF_RAA.pdf, que cita a mesma base legal para as
   *     tabelas de retenção): "Às taxas nacionais do imposto sobre o
   *     rendimento das pessoas singulares, em vigor em cada ano, é
   *     aplicada uma redução de 30%." Sem qualificação por escalão.
   * Não foi possível ler a publicação original em Série I do Diário da
   * República diretamente (página exige JavaScript, não acessível a
   * partir deste ambiente) — a confirmação assenta em duas fontes
   * independentes e convergentes (tabela numérica da PwC + citação
   * textual do artigo via pesquisa), não no diploma em bruto. Ainda
   * assim, é uma base mais forte do que a hipótese anterior (que não
   * tinha nenhuma tabela numérica a confirmá-la) — por isso mudamos de
   * ESTIMATE para verified, com esta ressalva documentada.
   *
   * A Madeira tem ainda uma redução adicional não quantificada para
   * rendimentos imediatamente acima do salário mínimo regional, não
   * modelada aqui.
   *
   * Achado relacionado, não corrigido nesta ronda: a tabela da PwC
   * mostra a Taxa Adicional de Solidariedade (Art. 68.º-A CIRS) também
   * reduzida em 30% nos Açores (2,5%→1,75%; 5%→3,5%) — mas
   * `calculateTaxaSolidariedade()` em tax-engine.js nunca é chamada
   * por `calcularCadeiaSalarial`/`calcularCadeiaSalarialConjunta`, e
   * quando chamada não recebe região. Afeta só rendimentos coletáveis
   * acima de 80.000€/ano — documentado para decisão do autor, não
   * corrigido nesta ronda para não alargar o âmbito sem confirmação.
   */
  diferencialRegional: {
    status: "verified",
    acores: {
      reducaoSobreTaxaMarginal: 0.3,
      status: "verified",
      source:
        "PwC Portugal, \"Guia Fiscal 2026 — IRS\" (tabela numérica dos 9 escalões, consultada diretamente 18/08/2026) + Art. 4.º, n.º 1 do Decreto Legislativo Regional n.º 2/99/A, de 20 de janeiro, na redação da DLR n.º 15-A/2021/A, de 31 de maio (citado via pesquisa, corroborado pela Circular n.º 6/2025 da AT)",
      sourceUrl: "https://www.pwc.pt/pt/pwcinforfisco/guia-fiscal/2026/irs.html",
      notes:
        "Ronda de correção (18/08/2026): substitui o mecanismo diferenciado por escalão (30%/20%) de uma ronda anterior, que nunca teve confirmação numérica — a tabela oficial da PwC mostra uma redução uniforme de 30% em todos os 9 escalões, igual à Madeira. Não foi possível ler o Diário da República Série I em bruto (página exige JavaScript nesta pesquisa); a confirmação assenta em duas fontes convergentes (tabela numérica + citação textual do artigo). A Taxa Adicional de Solidariedade também parece reduzida em 30% nos Açores segundo a mesma tabela da PwC, mas isso não está modelado no motor de cálculo — ver aviso na nota geral acima.",
    },
    madeira: {
      reducaoSobreTaxaMarginal: 0.3,
      status: "verified",
      source: "Autoridade Tributária e Aduaneira da RAM — Agenda Fiscal, janeiro de 2026",
      sourceUrl: "https://at.madeira.gov.pt/Ficheiros/NL/AFJaneiro2026.pdf",
      notes:
        "Confirmado (15/08/2026): em 2026 a Madeira aplica o diferencial fiscal máximo de 30% face às taxas de IRS do continente a todos os nove escalões (antes só se aplicava aos escalões mais baixos). NÃO modelado: os limites dos escalões estão também atualizados em +3,51% face a 2025 na RAM (patamares de rendimento diferentes dos do continente) — este motor aplica a redução de 30% sobre os escalões nacionais sem ajustar os seus limites, o que subestima ligeiramente o benefício fiscal real para a Madeira. Também não modelado: reforço do mínimo de existência para isenção total a quem aufere o salário mínimo regional.",
    },
    continente: { reducaoSobreTaxaMarginal: 0 },
    notes:
      "Açores e Madeira confirmados (18/08/2026) com o mesmo mecanismo: redução uniforme de 30% sobre a taxa marginal de cada escalão nacional. Ver notas de fonte por região para as simplificações conhecidas de cada uma.",
  },

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
