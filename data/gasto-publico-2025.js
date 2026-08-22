// Liberdade Fiscal — "Para onde vão os impostos" (grandes rúbricas do
// gasto público, 2025)
//
// Ideia (conversa com o autor, agosto de 2026): depois de calcular
// quanto cada pessoa paga, mostrar — em valores absolutos, sem opinar
// — para onde vai o gasto público em Portugal, com destaque para
// rúbricas que raramente se veem juntas: juros da dívida pública,
// pensões, saúde e educação. Mostra os números, explica o método,
// deixa o utilizador tirar as suas conclusões (CLAUDE.md §1).
//
// ÂMBITO E DECISÃO DE FORMATO (22/08/2026, a pedido do autor): esta
// secção mostra APENAS valores absolutos em euros, sem percentagem
// sobre o total da despesa pública. Não foi possível extrair de forma
// fiável, dentro desta investigação, o total consolidado exato da
// despesa de TODAS as administrações públicas (Central + Regional +
// Local + Segurança Social) — está disperso por várias dezenas de
// quadros de um relatório de +390 páginas. Em vez de calcular uma
// percentagem sobre um denominador aproximado (o que violaria a
// disciplina de rigor do projeto — nunca apresentar uma estimativa
// como se fosse precisa), optámos por mostrar cada rúbrica em euros,
// que já é um número "impossível de ignorar" por si só, e deixar a
// percentagem para uma futura iteração, se/quando se conseguir o
// denominador exato.
//
// FONTES (fonte primária ou imprensa que cita diretamente a fonte
// primária, consultadas em 22/08/2026):
//
// 1) Juros e outros encargos da dívida direta do Estado — 6.998,2
//    milhões €, execução real 2025 (+2,2% face a 2024).
//    Fonte primária: Conta Geral do Estado 2025, Ministério das
//    Finanças (Quadro 3.53 "Juros e outros encargos da dívida direta
//    do Estado por instrumento").
//    https://www.eo.gov.pt/politicaorcamental/ContaGeraldoEstado/01_CGE2025_Relatorio_AnaliseGlobal_ContaSS.pdf
//    Valor confirmado também por imprensa especializada citando a
//    mesma fonte (Jornal de Negócios).
//
// 2) Pensões (sistema total — Segurança Social + Caixa Geral de
//    Aposentações) — 37.589 milhões €, execução real 2025 (+47,6%
//    face a há dez anos).
//    Fonte: Conselho das Finanças Públicas, "Relatório n.º 04/2026 —
//    Evolução Orçamental da Segurança Social e da CGA em 2025",
//    https://www.cfp.pt/uploads/publicacoes_ficheiros/cfp-rel-04-2026.pdf
//
// 3) Saúde (Serviço Nacional de Saúde) — 16.962 milhões €, execução
//    real 2025 (+4,4%/+1.014 milhões face a 2024).
//    Fonte: Conselho das Finanças Públicas, "Relatório n.º 05/2025 —
//    Evolução do Desempenho do Serviço Nacional de Saúde em 2025",
//    https://www.cfp.pt/uploads/publicacoes_ficheiros/cfp-rel-05-2025.pdf
//
// 4) Educação (Programa Orçamental Educação) — 7.470,6 milhões €.
//    🟡 ESTIMATE: este valor é o orçamentado para 2025 (OE2025,
//    +6,8%/+477,3 milhões face à estimativa de execução de 2024), NÃO
//    a execução final confirmada — não foi possível, dentro desta
//    investigação, confirmar o valor exato de execução real 2025 para
//    esta rúbrica especificamente (ao contrário das três anteriores).
//    Fonte: Jornal Económico, citando o Orçamento do Estado para 2025.
//
// O que fica de propósito fora desta primeira versão: Defesa Nacional
// — os números disponíveis para 2025 são contraditórios consoante a
// fonte (estimativa do Governo: 3.284,9 milhões €; execução apurada
// pelo INE em contabilidade nacional: 2.515,6 milhões €, uma diferença
// de mais de 850 milhões € que está a ser publicamente questionada no
// parlamento à data desta investigação) — em vez de escolher um dos
// dois valores, preferimos deixar esta rúbrica de fora até a
// discrepância se resolver, seguindo a mesma disciplina de "o que não
// se consegue confirmar com rigor vai para o glossário, não entra no
// simulador" (CLAUDE.md §1).

export const GASTO_PUBLICO_2025 = {
  ano: 2025,
  retrievedNote: "Investigado e verificado em fonte primária (Conta Geral do Estado 2025, CFP) e por pesquisa web em 22/08/2026.",
  rubricas: [
    {
      id: "juros-divida",
      label: "Juros da dívida pública",
      valorMilhoesEuros: 6998.2,
      status: "verified",
      variacaoNota: "+2,2% face a 2024",
      source: "Conta Geral do Estado 2025 — Ministério das Finanças, Quadro 3.53",
      sourceUrl:
        "https://www.eo.gov.pt/politicaorcamental/ContaGeraldoEstado/01_CGE2025_Relatorio_AnaliseGlobal_ContaSS.pdf",
    },
    {
      id: "pensoes",
      label: "Pensões (Segurança Social + CGA)",
      valorMilhoesEuros: 37589,
      status: "verified",
      variacaoNota: "+47,6% face a há dez anos",
      source: "Conselho das Finanças Públicas, Relatório n.º 04/2026",
      sourceUrl: "https://www.cfp.pt/uploads/publicacoes_ficheiros/cfp-rel-04-2026.pdf",
    },
    {
      id: "saude",
      label: "Saúde (Serviço Nacional de Saúde)",
      valorMilhoesEuros: 16962,
      status: "verified",
      variacaoNota: "+4,4% face a 2024",
      source: "Conselho das Finanças Públicas, Relatório n.º 05/2025",
      sourceUrl: "https://www.cfp.pt/uploads/publicacoes_ficheiros/cfp-rel-05-2025.pdf",
    },
    {
      id: "educacao",
      label: "Educação",
      valorMilhoesEuros: 7470.6,
      status: "estimate",
      variacaoNota: "+6,8% face à estimativa de execução de 2024",
      source: "Orçamento do Estado para 2025 (valor orçamentado, não execução final confirmada)",
      sourceUrl: "https://oe2025.gov.pt/pt/Indicadores/Receita-e-Despesa",
    },
  ],
};
