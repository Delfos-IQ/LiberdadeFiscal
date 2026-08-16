// Liberdade Fiscal — Impostos Patrimoniais e de Veículo, ano fiscal 2026
// IMI, IUC, ISV, Imposto de Selo
//
// Atualizado após ronda de investigação adicional (15/08/2026, sessão
// "Vamos a buscar datos fiscales para verificarlos"): ISV e IUC deixam
// de estar completamente UNKNOWN — passam a ter tabelas numéricas
// completas, mas continuam classificados como ESTIMATE porque a fonte
// primária usada foi um agregador especializado (não o texto do
// Código do ISV/IUC diretamente, que devolveu conteúdo vazio/paywalled
// nesta pesquisa) e foram apenas verificadas por reprodução aritmética
// dos exemplos fornecidos pela fonte, não por confirmação cruzada
// direta com o Portal das Finanças. O Imposto de Selo passa a ✅
// Verified: fonte primária direta (Autoridade Tributária e Aduaneira,
// info.portaldasfinancas.gov.pt), Tabela Geral completa.

export const PATRIMONIAIS_2026 = {
  year: 2026,
  source: "Código do IMI, Código do ISV, Código do IUC, Código do Imposto de Selo",
  sourceUrl: "https://www.portaldasfinancas.gov.pt",
  retrievedNote:
    "Estrutura e fórmulas confirmadas via pesquisa web em 15/08/2026. Tabelas numéricas de ISV/IUC/Imposto de Selo atualizadas em ronda de verificação adicional na mesma data — ver notas de fonte por figura abaixo.",

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
      status: "ESTIMATE",
      source: "Doutor Finanças, \"31 municípios descem IMI a pagar em 2026. Apenas 6 sobem.\" (06/01/2026), consultado 16/08/2026",
      sourceUrl: "https://www.doutorfinancas.pt/impostos/imi/31-municipios-descem-imi-a-pagar-em-2026-apenas-6-sobem/",
      notes:
        "Tabela completa dos 308 municípios continua por embutir na app (demasiado volumosa e volátil — cada câmara pode mudar a taxa todos os anos até final do ano anterior). Mas já não é totalmente UNKNOWN: confirmado que mais de 200 dos 308 municípios (a esmagadora maioria) aplicam a taxa mínima de 0,3% em 2026, e que só 3 aplicam a taxa máxima de 0,45% — Vila Real de Santo António, Oeiras e Cartaxo. 31 municípios desceram a taxa e 6 subiram-na face a 2025 (incluindo Cascais, de 0,33% para 0,35%, e Oeiras, de 0,3% para 0,45%). A app usa 0,3% como valor sugerido por omissão (o mais comum, não necessariamente o correto para o concelho do utilizador) e pede sempre para confirmar/corrigir contra o Portal das Finanças ou a Câmara Municipal — nunca assume silenciosamente.",
      taxaSugeridaPorOmissao: 0.003,
      excecoesConhecidas: {
        taxaMaxima045: ["Vila Real de Santo António", "Oeiras", "Cartaxo"],
      },
    },
  },

  // ---------------------------------------------------------------
  // ISV — Imposto sobre Veículos (pago uma única vez, na matrícula)
  // ---------------------------------------------------------------
  // Fonte: EcoImport, "ISV 2026: Novas Regras, Tabelas Oficiais e o Que
  // Realmente Mudou" (https://ecoimport.pt/isv-2026-novas-regras/),
  // artigo publicado 17/02/2026, atualizado 21/04/2026, consultado
  // 15/08/2026. O artigo confirma explicitamente que "o Orçamento do
  // Estado para 2026 não aumentou as taxas do ISV" e que "as tabelas
  // de cilindrada e CO2 mantêm-se iguais às de 2025" — corroborado
  // independentemente pela PwC (pwc.pt/pt/pwcinforfisco/orcamentoestado/
  // impostos-indiretos.html), que só regista uma alteração à regra dos
  // híbridos plug-in (norma Euro 6e-bis) para 2026, sem mexer nas
  // tabelas de cilindrada/CO2. Os dois exemplos numéricos do artigo
  // EcoImport foram reproduzidos manualmente e batem certo com a
  // fórmula (cilindrada×taxa−parcela) + (CO2×taxa−parcela), o que dá
  // confiança adicional — mas o valor não foi confirmado diretamente
  // contra o texto do Código do ISV (que devolveu uma página vazia/
  // sem conteúdo acessível nesta pesquisa), por isso mantém-se
  // ESTIMATE, não ✅ Verified.
  isv: {
    status: "ESTIMATE",
    source: "EcoImport (ecoimport.pt/isv-2026-novas-regras/), consultado 15/08/2026",
    sourceUrl: "https://ecoimport.pt/isv-2026-novas-regras/",
    formula:
      "ISV = componente cilindrada + componente ambiental (CO2, tabela WLTP) [+ 500€ se gasóleo] [× 0,25 se PHEV elegível] × (1 - desconto por idade, se usado importado). Só as tabelas WLTP foram recolhidas — veículos homologados em NEDC (normalmente pré-2018) continuam UNKNOWN nesta app.",
    // Componente cilindrada — igual para gasolina/GPL/GN, aplicável à generalidade
    // dos automóveis de passageiros (Tabela A).
    componenteCilindrada: [
      { max: 1000, taxaPorCC: 1.09, parcelaAAbater: 849.03 },
      { min: 1001, max: 1250, taxaPorCC: 1.18, parcelaAAbater: 850.69 },
      { min: 1251, max: Infinity, taxaPorCC: 5.61, parcelaAAbater: 6194.88 },
    ],
    // Componente ambiental (CO2), protocolo WLTP — tabelas distintas por combustível.
    componenteCO2Wltp: {
      gasolina: [
        { max: 110, taxaPorGrama: 0.44, parcelaAAbater: 43.02 },
        { min: 111, max: 115, taxaPorGrama: 1.1, parcelaAAbater: 115.8 },
        { min: 116, max: 120, taxaPorGrama: 1.38, parcelaAAbater: 147.79 },
        { min: 121, max: 130, taxaPorGrama: 5.27, parcelaAAbater: 619.17 },
        { min: 131, max: 145, taxaPorGrama: 6.38, parcelaAAbater: 762.73 },
        { min: 146, max: 175, taxaPorGrama: 41.54, parcelaAAbater: 5819.56 },
        { min: 176, max: 195, taxaPorGrama: 51.38, parcelaAAbater: 7247.39 },
        { min: 196, max: 235, taxaPorGrama: 193.01, parcelaAAbater: 34190.52 },
        { min: 236, max: Infinity, taxaPorGrama: 233.81, parcelaAAbater: 41910.96 },
      ],
      gasoleo: [
        { max: 110, taxaPorGrama: 1.72, parcelaAAbater: 11.5 },
        { min: 111, max: 120, taxaPorGrama: 18.96, parcelaAAbater: 1906.19 },
        { min: 121, max: 140, taxaPorGrama: 65.04, parcelaAAbater: 7360.85 },
        { min: 141, max: 150, taxaPorGrama: 127.4, parcelaAAbater: 16080.57 },
        { min: 151, max: 160, taxaPorGrama: 160.81, parcelaAAbater: 21176.06 },
        { min: 161, max: 170, taxaPorGrama: 221.69, parcelaAAbater: 29227.38 },
        { min: 171, max: 190, taxaPorGrama: 274.08, parcelaAAbater: 36987.98 },
        { min: 191, max: Infinity, taxaPorGrama: 282.35, parcelaAAbater: 38271.32 },
      ],
    },
    taxaAdicionalGasoleo: {
      ligeiroPassageiros: 500,
      ligeiroMercadorias: 250,
      notes: "Aplica-se a veículos a gasóleo com emissões de partículas acima de 0,001 g/km — simplificação: esta app assume que todo o gasóleo paga o adicional.",
    },
    descontoPHEV: {
      percentagemPago: 0.25,
      notes:
        "Híbridos plug-in com bateria recarregável, autonomia elétrica mínima de 50 km (ou 25 km para matrículas UE 2015-2020), e emissões ≤ 50 g/km (Euro 6 ou anterior) ou ≤ 80 g/km (Euro 6e-bis, novo em 2026) pagam só 25% do ISV calculado. O utilizador tem de autodeclarar a elegibilidade — a app não valida homologação.",
    },
    isencaoEletricos: true,
    descontoPorIdade: [
      { min: 0, max: 1, desconto: 0.1 },
      { min: 1, max: 2, desconto: 0.2 },
      { min: 2, max: 3, desconto: 0.28 },
      { min: 3, max: 4, desconto: 0.35 },
      { min: 4, max: 5, desconto: 0.43 },
      { min: 5, max: 6, desconto: 0.52 },
      { min: 6, max: 7, desconto: 0.6 },
      { min: 7, max: 8, desconto: 0.65 },
      { min: 8, max: 9, desconto: 0.7 },
      { min: 9, max: 10, desconto: 0.75 },
      { min: 10, max: Infinity, desconto: 0.8 },
    ],
  },

  // ---------------------------------------------------------------
  // IUC — Imposto Único de Circulação (pago anualmente)
  // ---------------------------------------------------------------
  // Fonte: DECO PROteste, "Tabelas IUC 2026: quanto paga e até quando"
  // (deco.proteste.pt/dinheiro/impostos/noticias/tabelas-iuc-quanto-paga),
  // publicado 06/01/2026, consultado 15/08/2026. Associação de defesa
  // do consumidor (não é a AT, por isso ESTIMATE e não ✅ Verified),
  // mas os dois exemplos numéricos do artigo foram reproduzidos
  // manualmente e batem certo com a fórmula documentada, o que dá
  // confiança adicional à tabela.
  iuc: {
    status: "ESTIMATE",
    source: "DECO PROteste, consultado 15/08/2026",
    sourceUrl: "https://www.deco.proteste.pt/dinheiro/impostos/noticias/tabelas-iuc-quanto-paga",
    notes:
      "Estrutura de 6 categorias (A-F) mencionada no spec original; esta atualização cobre em detalhe a categoria B (ligeiros de passageiros/mistos, 1ª matrícula desde 1/7/2007 — a mais comum), os automóveis matriculados até 30/6/2007 (categoria A) e os motociclos/triciclos/quadriciclos (categoria E). Categorias C/D (mercadorias, por peso bruto) e F (potência em kW) continuam sem tabela numérica recolhida.",
    isencaoVeiculosEletricos: true,
    isencaoDeficiencia60PorCento: true,
    limiarDispensaCobranca: 10, // se o imposto calculado for < 10€, não é cobrado
    categoriaB: {
      aplicavelA: "Automóveis ligeiros de passageiros e mistos, 1.ª matrícula a partir de 1 de julho de 2007",
      componenteCilindrada: [
        { max: 1250, taxa: 31.77 },
        { min: 1251, max: 1750, taxa: 63.74 },
        { min: 1751, max: 2500, taxa: 127.35 },
        { min: 2501, max: Infinity, taxa: 435.84 },
      ],
      componenteCO2: {
        nedc: [
          { max: 120, taxa: 65.15 },
          { min: 121, max: 180, taxa: 97.63 },
          { min: 181, max: 250, taxa: 212.04 },
          { min: 251, max: Infinity, taxa: 363.25 },
        ],
        wltp: [
          { max: 140, taxa: 65.15 },
          { min: 141, max: 205, taxa: 97.63 },
          { min: 206, max: 260, taxa: 212.04 },
          { min: 261, max: Infinity, taxa: 363.25 },
        ],
      },
      coeficienteAnoMatricula: [
        { ano: 2007, coeficiente: 1 },
        { ano: 2008, coeficiente: 1.05 },
        { ano: 2009, coeficiente: 1.1 },
        { anoMin: 2010, coeficiente: 1.15 },
      ],
      adicionalGasoleo: [
        { max: 1250, valor: 5.02 },
        { min: 1251, max: 1750, valor: 10.07 },
        { min: 1751, max: 2500, valor: 20.12 },
        { min: 2501, max: Infinity, valor: 68.85 },
      ],
      formula: "IUC = (taxa cilindrada + taxa CO2) × coeficiente do ano de matrícula [+ adicional gasóleo, por cilindrada]",
    },
    categoriaAPre2007: {
      aplicavelA: "Veículos com 1.ª matrícula até 30 de junho de 2007",
      gasoleo: {
        "1996a2007": [
          { max: 1500, taxa: 19.9, adicional: 3.14 },
          { min: 1501, max: 2000, taxa: 39.95, adicional: 6.31 },
          { min: 2001, max: 3000, taxa: 62.4, adicional: 9.86 },
          { min: 3001, max: Infinity, taxa: 158.31, adicional: 25.01 },
        ],
        "1990a1995": [
          { max: 1500, taxa: 12.55, adicional: 1.98 },
          { min: 1501, max: 2000, taxa: 22.45, adicional: 3.55 },
          { min: 2001, max: 3000, taxa: 34.87, adicional: 5.51 },
          { min: 3001, max: Infinity, taxa: 83.49, adicional: 13.19 },
        ],
        "1981a1989": [
          { max: 1500, taxa: 8.8, adicional: 1.39 },
          { min: 1501, max: 2000, taxa: 12.55, adicional: 1.98 },
          { min: 2001, max: 3000, taxa: 17.49, adicional: 2.76 },
          { min: 3001, max: Infinity, taxa: 36.09, adicional: 5.7 },
        ],
      },
      gasolinaGplEletrico: {
        notes: "Sem adicional. Escalões de cilindrada diferem por tipo de combustível — ver tabela completa na fonte.",
        "1996a2007": [
          { max: 1000, taxa: 19.9 },
          { min: 1001, max: 1300, taxa: 39.95 },
          { min: 1301, max: 1750, taxa: 62.4 },
          { min: 1751, max: 2600, taxa: 158.31 },
          { min: 2601, max: 3500, taxa: 287.49 },
          { min: 3501, max: Infinity, taxa: 512.23 },
        ],
      },
    },
    categoriaEMotociclos: {
      aplicavelA: "Motociclos, triciclos e quadriciclos",
      "aPartirDe1996": [
        { min: 120, max: 250, taxa: 6.19 },
        { min: 251, max: 350, taxa: 8.76 },
        { min: 351, max: 500, taxa: 21.18 },
        { min: 501, max: 750, taxa: 63.62 },
        { min: 751, max: Infinity, taxa: 138.15 },
      ],
    },
  },

  // ---------------------------------------------------------------
  // Imposto de Selo — ✅ Verified (fonte primária direta)
  // ---------------------------------------------------------------
  // Fonte: Autoridade Tributária e Aduaneira, "Tabela Geral do Imposto
  // do Selo" (info.portaldasfinancas.gov.pt/pt/informacao_fiscal/
  // codigos_tributarios/selo/Pages/ccod-selo-tabgiselo.aspx),
  // consultado diretamente 15/08/2026 — versão em vigor nessa data,
  // sem alterações assinaladas pelo Orçamento do Estado 2026.
  impostoSelo: {
    status: "verified",
    source: "Autoridade Tributária e Aduaneira — Tabela Geral do Imposto do Selo",
    sourceUrl:
      "https://info.portaldasfinancas.gov.pt/pt/informacao_fiscal/codigos_tributarios/selo/Pages/ccod-selo-tabgiselo.aspx",
    notes:
      "Só as verbas mais relevantes para um utilizador particular estão modeladas nesta app (aquisição de imóveis, transmissões gratuitas, arrendamento, crédito ao consumo, garantias, seguros). A Tabela Geral completa tem 30 números — o resto fica documentado aqui mas sem função de cálculo dedicada. Nota editorial do spec (§6.3): o Imposto de Selo e o IVA são mutuamente exclusivos, nunca acumulados sobre o mesmo ato.",
    verba1_1_aquisicaoOnerosaImoveis: { taxa: 0.008, descricao: "Aquisição onerosa de imóveis — sobre o maior valor entre preço e VPT. Pago em simultâneo com o IMT, nunca em vez dele." },
    verba1_2_transmissaoGratuita: {
      taxa: 0.1,
      descricao: "Heranças e doações. Isento entre cônjuges/unidos de facto, descendentes e ascendentes (linha reta) — aplica-se a outros graus de parentesco e a terceiros.",
    },
    verba2_arrendamento: { taxa: 0.1, descricao: "Sobre o valor de 1 mês de renda, no início do contrato ou em cada aumento." },
    verba10_garantias: {
      prazoInferior1Ano: { taxa: 0.0004, unidade: "por mês ou fração" },
      prazoIgualOuSuperior1Ano: { taxa: 0.005 },
      semPrazoOuIgualOuSuperior5Anos: { taxa: 0.006 },
    },
    verba17_1_creditoGeral: {
      prazoInferior1Ano: { taxa: 0.0004, unidade: "por mês ou fração" },
      prazoIgualOuSuperior1Ano: { taxa: 0.005 },
      prazoIgualOuSuperior5Anos: { taxa: 0.006 },
    },
    verba17_2_creditoConsumo: {
      descricao: "Crédito a consumidores (DL 133/2009) — cartões de crédito, crédito pessoal, etc.",
      prazoInferior1Ano: { taxa: 0.00141, unidade: "por mês ou fração" },
      prazoIgualOuSuperior1Ano: { taxa: 0.0176 },
    },
    verba17_3_operacoesFinanceiras: {
      jurosEComissoesFinanciamento: { taxa: 0.04 },
      comissoesGarantiasPrestadas: { taxa: 0.03 },
      outrasComissoesServicosFinanceiros: { taxa: 0.04 },
    },
    verba22_seguros: {
      caucao: { taxa: 0.03 },
      acidentesDoencasCreditoAgricola: { taxa: 0.05 },
      mercadoriasTransportadas: { taxa: 0.05 },
      embarcacoesAeronaves: { taxa: 0.05 },
      outrosRamos: { taxa: 0.09 },
    },
  },
};
