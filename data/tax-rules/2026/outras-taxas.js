// Liberdade Fiscal — Outras contribuições e taxas, ano fiscal 2026
// Contribuição Audiovisual (CAV) e Taxa Municipal Turística.
//
// Adicionadas em 18/08/2026, a pedido do autor: "piensa en otros
// impuestos que podamos incluir, por ejemplo el impuesto de
// audiovisuales, el impuesto sobre el tratamiento de residuos".
// Nessa mesma investigação foram avaliadas e deliberadamente
// deixadas de fora: Taxa de Gestão de Resíduos (TGR) e Taxa de
// Recursos Hídricos (TRH) — ambas cobradas em cêntimos por m³ na
// fatura da água, praticamente invisíveis ao utilizador médio sem
// ler a fatura em detalhe, e a Taxa Municipal de Direitos de Passagem
// (TMDP) — no máximo 0,25% da fatura de telecomunicações, nem sequer
// cobrada em todos os municípios. O esforço de modelar estas três não
// compensa o impacto no resultado final; são mencionadas como
// limitação explícita no ecrã do Dia da Liberdade Fiscal, não
// modeladas.

export const OUTRAS_TAXAS_2026 = {
  year: 2026,

  // ---------------------------------------------------------------
  // Contribuição Audiovisual (CAV) — Lei n.º 30/2003, de 22 de agosto
  // ---------------------------------------------------------------
  // Cobrada mensalmente na fatura de eletricidade de (quase) todos os
  // consumidores em Portugal Continental, para financiar o serviço
  // público de rádio e televisão (RTP). 🟡 ESTIMATE: o valor base
  // (2,85€) e a não atualização no OE2026 estão confirmados por
  // múltiplas fontes secundárias convergentes (imprensa citando a Lei
  // 30/2003; comercializadoras de energia EDP/Repsol/Goldenergy) e o
  // critério de isenção/tarifa reduzida está confirmado pela DGEG
  // (Direção-Geral de Energia e Geologia, fonte institucional) — mas
  // esta app não leu o texto integral da Lei n.º 30/2003 diretamente.
  cav: {
    status: "ESTIMATE",
    source:
      "Lei n.º 30/2003 (valor base, via imprensa e comercializadoras de energia — EDP, Repsol, Goldenergy, Doutor Finanças); DGEG (critério de isenção e tarifa reduzida), consultado 18/08/2026",
    sourceUrl: "https://www.dgeg.gov.pt/pt/areas-transversais/politicas-de-protecao-ao-consumidor-de-energia/tarifa-social-de-energia/contribuicao-audiovisual-cav-reduzida/",
    ivaTaxa: 0.06,
    valorMensalNormal: 2.85, // antes de IVA
    valorMensalNormalComIva: 3.02, // 2,85 × 1,06, arredondado — valor efetivamente cobrado na fatura
    valorMensalReduzida: 1.0, // antes de IVA — para clientes elegíveis (tarifa social de energia)
    valorMensalReduzidaComIva: 1.06,
    isencaoConsumoAnualKwh: 400, // consumo anual < 400 kWh: isento
    notes:
      "Cobrada mensalmente na fatura da eletricidade. O Orçamento do Estado 2026 não atualizou o valor (mantém-se face a anos anteriores). Não se aplica às Regiões Autónomas dos Açores e da Madeira nos mesmos termos — este dado não foi verificado nesta ronda, a app assume aplicação em Portugal Continental.",
  },

  // ---------------------------------------------------------------
  // Taxa Municipal Turística — cada município decide se cobra, e
  // quanto, dentro da sua autonomia regulamentar (Regime Jurídico das
  // Autarquias Locais). Não existe uma taxa nacional única — ao
  // contrário do IMI, esta app NÃO tenta embutir uma tabela completa
  // por concelho (dezenas de municípios cobram, com valores e regras
  // de isenção distintos, e a lista muda com frequência). O
  // utilizador regista o que pagou, lido da fatura do alojamento.
  // ---------------------------------------------------------------
  taxaTuristica: {
    status: "ESTIMATE",
    source:
      "Host Wise, \"Taxa Turística em Portugal: guia completo para alojamento local\"; Doutor Finanças/DECO PROteste, \"Taxa municipal turística: quanto paga em cada município?\"; Lisboa.pt (Câmara Municipal de Lisboa); Câmara Municipal do Porto — consultado 18/08/2026",
    sourceUrl: "https://www.hostwise.pt/blog/taxa-turistica-alojamento-local-portugal",
    exemplos: [
      { concelho: "Lisboa", valorPorNoite: 4, noitesMaximasTributadas: 7 },
      { concelho: "Porto", valorPorNoite: 3, noitesMaximasTributadas: 7 },
    ],
    notes:
      "Cobrada por pessoa, por noite, normalmente só nas primeiras 7 noites consecutivas de estadia (as seguintes ficam isentas) — mas o número exato de noites tributadas e os critérios de isenção (idade, tipo de alojamento) variam por município. Só uma parte dos 308 municípios de Portugal cobra esta taxa. A app não calcula o valor — mostra os exemplos de Lisboa e Porto como referência e pede ao utilizador para registar o que pagou, lido da fatura do alojamento.",
  },
};
