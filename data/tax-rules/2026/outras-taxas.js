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
  // público de rádio e televisão (RTP).
  //
  // ✅ Verified (19/08/2026, ronda "verificar o glossário contra a
  // fonte"): texto do Art. 4.º da Lei n.º 30/2003 lido DIRETAMENTE na
  // versão consolidada do Diário da República (diariodarepublica.pt),
  // "Em vigor", data de referência 2026-08-20, última alteração
  // 2017-12-29 — já não depende de imprensa/comercializadoras de
  // energia como fonte primária. Confirma exatamente os valores já
  // guardados (2,85€ base, 1€ reduzido, isenção <400 kWh) e acrescenta
  // detalhe novo: a lista exata de quem tem direito à tarifa reduzida
  // (n.º 2 do Art. 4.º) — beneficiários do complemento solidário para
  // idosos, do rendimento social de inserção, do subsídio social de
  // desemprego, do 1.º escalão do abono de família, ou da pensão
  // social de invalidez — mais específico do que "tarifa social de
  // energia" (a fonte da DGEG, mantida como referência secundária).
  cav: {
    status: "verified",
    source: "Lei n.º 30/2003, de 22 de agosto, Art. 4.º — texto consolidado lido diretamente via Diário da República em 19/08/2026",
    sourceUrl: "https://diariodarepublica.pt/dr/legislacao-consolidada/lei/2003-105700797-105720191",
    ivaTaxa: 0.06,
    valorMensalNormal: 2.85, // antes de IVA — Art. 4.º, n.º 1
    valorMensalNormalComIva: 3.02, // 2,85 × 1,06, arredondado — valor efetivamente cobrado na fatura
    valorMensalReduzida: 1.0, // antes de IVA — Art. 4.º, n.º 2
    valorMensalReduzidaComIva: 1.06,
    isencaoConsumoAnualKwh: 400, // consumo anual < 400 kWh: isento — Art. 4.º, n.º 4
    elegibilidadeTarifaReduzida:
      "Beneficiários do complemento solidário para idosos, do rendimento social de inserção, do subsídio social de desemprego, do 1.º escalão do abono de família, ou da pensão social de invalidez (Art. 4.º, n.º 2 da Lei n.º 30/2003).",
    notes:
      "Cobrada mensalmente na fatura da eletricidade. O Orçamento do Estado 2026 não atualizou o valor (mantém-se face a anos anteriores — última alteração ao Art. 4.º foi em 2017). Não se aplica às Regiões Autónomas dos Açores e da Madeira nos mesmos termos — este dado não foi verificado nesta ronda, a app assume aplicação em Portugal Continental.",
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
