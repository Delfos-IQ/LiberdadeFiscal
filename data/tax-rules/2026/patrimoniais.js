// Liberdade Fiscal — Impostos Patrimoniais e de Veículo, ano fiscal 2026
// IMI, IUC, ISV, Imposto de Selo
//
// Nota geral: estas quatro figuras têm as tabelas oficiais mais
// extensas de todo o projeto (IMI varia por cada um dos 308
// municípios; ISV e IUC cruzam cilindrada × emissões CO₂ × ano de
// matrícula em várias tabelas). Esta pesquisa confirmou a ESTRUTURA e
// as fórmulas de cada imposto, mas não as tabelas numéricas completas
// — que precisam de vir diretamente do Portal das Finanças antes da
// Fase 6. Isto é uma aplicação deliberada da secção 8 do CLAUDE.md:
// "Se houver incerteza sobre um dado, marcá-lo como UNKNOWN ou
// ESTIMATE explicitamente — nunca inventar."

export const PATRIMONIAIS_2026 = {
  year: 2026,
  source: "Código do IMI, Código do ISV, Código do IUC, Código do Imposto de Selo",
  sourceUrl: "https://www.portaldasfinancas.gov.pt",
  retrievedNote: "Estrutura e fórmulas confirmadas via pesquisa web em 15/08/2026.",

  imi: {
    prediosUrbanos: {
      min: 0.003,
      max: 0.0045,
      unit: "fração do VPT/ano",
      notes:
        "Intervalo legal nacional. A taxa concreta é fixada por cada município (308 municípios) dentro deste intervalo, podendo chegar a 0,5% em circunstâncias específicas (prédios devolutos, degradados). A maioria aplica a taxa mínima (0,3%) em 2026. A app deve pedir o concelho ao utilizador — nunca assumir a taxa mínima silenciosamente.",
    },
    prediosRusticos: { value: 0.008, unit: "fração do VPT/ano" },
    tabelaPorConcelho: {
      status: "UNKNOWN",
      notes:
        "Tabela dos 308 municípios com a taxa exata de 2026 não recolhida nesta pesquisa. Necessária antes da Fase 6 para que o utilizador simplesmente selecione o seu concelho em vez de saber a taxa de cor.",
    },
  },

  isv: {
    status: "ESTIMATE",
    formula:
      "ISV = componente_cilindrada + componente_ambiental (CO2) + agravamentos - reduções, com redução adicional por anos de uso em veículos usados.",
    notes:
      "Estrutura confirmada (Tabela A: automóveis de passageiros — cilindrada + CO2; Tabela B: motociclos/triciclos/quadriciclos — apenas cilindrada). Tabelas 2026 = tabelas 2025 (sem alteração no Orçamento do Estado), mas os valores numéricos exatos de cada escalão não foram recolhidos. Pendente de consulta ao Código do ISV antes da Fase 6.",
    tabelas: null,
  },

  iuc: {
    status: "ESTIMATE",
    categorias: {
      A: {
        aplicavelA: "1.ª matrícula até 30/06/2007",
        formula: "cálculo apenas por cilindrada",
      },
      B: {
        aplicavelA: "1.ª matrícula a partir de 01/07/2007",
        formula: "cilindrada × coeficiente do ano de matrícula + componente CO2",
        coeficientesAno: {
          notes:
            "Coeficientes crescentes por ano de matrícula (ex.: 1,00 em 2007, 1,05 em 2008, 1,10 em 2009, 1,15 a partir de 2010) — série completa até ao presente não verificada.",
        },
      },
      C: { formula: "peso bruto (veículos de mercadorias)" },
      D: { formula: "peso bruto (veículos de mercadorias, outra subcategoria)" },
      E: { formula: "cilindrada × ano (motociclos)" },
      F: { formula: "potência em kW" },
      isencaoVeiculosEletricos: true,
    },
    notes:
      "Estrutura de 6 categorias (A-F) confirmada, taxas-base 2026 iguais a 2024/2025 (sem alteração legislativa). Valores numéricos exatos por escalão de cilindrada/peso/potência não recolhidos. Pendente de consulta ao Código do IUC antes da Fase 6.",
    tabelas: null,
  },

  impostoSelo: {
    status: "UNKNOWN",
    notes:
      "Não pesquisado nesta ronda. Recordar a nota editorial do spec (secção 6.3): o Imposto de Selo e o IVA são mutuamente exclusivos, nunca acumulativos sobre o mesmo ato — relevante sobretudo para transmissões de imóveis (onde substitui o IVA) e operações financeiras/de crédito.",
    tabelas: null,
  },
};
