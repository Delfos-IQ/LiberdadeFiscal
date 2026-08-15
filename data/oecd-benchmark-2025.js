// Liberdade Fiscal — Benchmark internacional OCDE (Fase 8)
//
// Fonte primária (dado estático, atualização manual anual — spec
// §6.6, sem API nem scraping): OCDE, "Taxing Wages 2026" (que reporta
// o ano fiscal 2025), Tabela 1.1 "Tax wedge, single person, no
// children, 100% of average wage, 2025".
// https://www.oecd.org/en/publications/2026/04/taxing-wages-2026_d1f39986/full-report/overview_d93131c3.html
// (consultado em 15/08/2026)
//
// O QUE É O "TAX WEDGE" DA OCDE: a diferença entre o custo total do
// trabalho para o empregador e o rendimento líquido que fica para o
// trabalhador, expressa em percentagem do custo total — ou seja, IRS +
// contribuições de segurança social (trabalhador + entidade patronal),
// para uma pessoa solteira sem filhos a ganhar o salário médio
// nacional. NÃO inclui IVA, impostos especiais de consumo, nem
// impostos patrimoniais.
//
// AVISO OBRIGATÓRIO (spec §6.6): o resultado do "Dia da Liberdade
// Fiscal" desta app inclui IVA, impostos especiais e patrimoniais
// registados, além de IRS e Segurança Social do trabalhador — é uma
// medida mais completa da carga fiscal individual do que o tax wedge
// da OCDE, mas por isso mesmo NÃO é diretamente comparável ao valor
// que se segue sem esta ressalva. A app deve mostrar este aviso
// sempre que exibir este benchmark (ver modules/benchmark-ocde.js).

export const OECD_BENCHMARK_2025 = {
  year: 2025,
  source: "OCDE, Taxing Wages 2026, Tabela 1.1 — Tax wedge, single person, no children, 100% of average wage, 2025",
  sourceUrl: "https://www.oecd.org/en/publications/2026/04/taxing-wages-2026_d1f39986/full-report/overview_d93131c3.html",
  retrievedNote: "Consultado via pesquisa web em 15/08/2026.",
  methodologyNote:
    "Tax wedge = (IRS + contribuições de segurança social do trabalhador e da entidade patronal) ÷ custo total do trabalho para o empregador, para uma pessoa solteira sem filhos a ganhar o salário médio nacional. Não inclui IVA, impostos especiais nem impostos patrimoniais — ao contrário do Dia da Liberdade Fiscal desta app, que inclui essas figuras quando registadas pelo utilizador. Os dois números não são diretamente comparáveis sem esta ressalva.",
  oecdAverage: 35.1,
  countries: [
    { code: "PT", name_pt: "Portugal", taxWedgePercent: 39.3 },
    { code: "ES", name_pt: "Espanha", taxWedgePercent: 41.4 },
    { code: "FR", name_pt: "França", taxWedgePercent: 47.2 },
    { code: "DE", name_pt: "Alemanha", taxWedgePercent: 49.3 },
    { code: "IE", name_pt: "Irlanda", taxWedgePercent: 32.6 },
    { code: "NL", name_pt: "Países Baixos", taxWedgePercent: 35.9 },
    { code: "CH", name_pt: "Suíça", taxWedgePercent: 23.0 },
  ],
};
