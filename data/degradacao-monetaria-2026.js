// Liberdade Fiscal — "Degradação Monetária" (fiscal drag / progressividade fria)
//
// Ideia (conversa com o autor, 22/08/2026): comparar a evolução NOMINAL
// do limite do 1.º escalão de IRS (Art. 68.º CIRS) com a inflação
// acumulada no mesmo período. Se o escalão sobe menos do que os preços,
// uma pessoa cujo salário só acompanhou a inflação passa a pagar, em
// termos reais, mais IRS do que pagava antes — mesmo sem nenhuma
// alteração de taxa. É o fenómeno conhecido como "fiscal drag" /
// "progressividade fria" / "degradação monetária": um aumento de carga fiscal
// que não resulta de nenhuma lei nova a subir taxas, só da inflação a
// não ser (ou ser insuficientemente) refletida nos escalões.
//
// Âmbito: 2021-2026 (5 anos fechados de inflação + o ano corrente),
// decisão explícita do autor. Fica FORA deste ficheiro qualquer
// julgamento sobre se a atualização dos escalões foi "suficiente" — a
// app mostra os dois números lado a lado (nominal vs. acumulado) e
// deixa o utilizador tirar as suas conclusões (CLAUDE.md §1).
//
// FONTES (todas fonte primária ou fonte secundária apoiada em fonte
// primária, consultadas em 22/08/2026):
//
// 1) Limite do 1.º escalão de IRS, ano a ano — Art. 68.º, n.º1 CIRS,
//    lido diretamente nas redações sucessivas publicadas pelo Portal
//    das Finanças (Autoridade Tributária e Aduaneira), que mantém o
//    texto consolidado de cada versão do artigo com a lei que a
//    introduziu:
//    - 2021: 7 112 € — Lei n.º 2/2020, de 31/03
//      https://info.portaldasfinancas.gov.pt/pt/informacao_fiscal/codigos_tributarios/cirs_rep/ra/Pages/irs68ra_202206.aspx
//    - 2022: 7 116 € — Lei n.º 12/2022, de 27/06
//      https://info.portaldasfinancas.gov.pt/pt/informacao_fiscal/codigos_tributarios/cirs_rep/ra/Pages/irs68ra_202212.aspx
//    - 2023: 7 479 € — Lei n.º 24-D/2022, de 30/12
//      https://info.portaldasfinancas.gov.pt/pt/informacao_fiscal/codigos_tributarios/cirs_rep/ra/Pages/irs68ra_202312.aspx
//    - 2024: 7 703 € — Lei n.º 82/2023, de 29/12
//      https://info.portaldasfinancas.gov.pt/pt/informacao_fiscal/codigos_tributarios/cirs_rep/ra/Pages/irs68ra_202412.aspx
//      (o limite de 7 703 € está confirmado em texto nesta página; a
//      tabela completa do artigo para este ano está publicada como
//      imagem, não como texto — por isso a taxa normal de 13% associada
//      a este ano vem de fonte secundária, não do texto literal do AT;
//      ver `notaTaxa` na entrada de 2024 abaixo)
//    - 2025: 8 059 € — Lei n.º 55-A/2025, de 22/07
//      https://info.portaldasfinancas.gov.pt/pt/informacao_fiscal/codigos_tributarios/cirs_rep/ra/Pages/irs68ra_202512.aspx
//    - 2026: 8 342 € — Lei n.º 73-A/2025, de 30/12
//      https://info.portaldasfinancas.gov.pt/pt/informacao_fiscal/codigos_tributarios/cirs_rep/Pages/irs68.aspx
//      (mesma fonte já usada para IRS_2026 em data/tax-rules/2026/irs.js)
//
// 2) Taxa de variação média anual do Índice de Preços no Consumidor
//    (IPC) — Instituto Nacional de Estatística (INE), destaques oficiais
//    de inflação anual (consultado via pesquisa web em 22/08/2026,
//    valores publicados pelo INE e replicados por imprensa/Pordata):
//    - 2021: 1,3%
//    - 2022: 7,8%
//    - 2023: 4,3%
//    - 2024: 2,4%
//    - 2025: 2,3% (confirmado pelo INE em 13/01/2026, ano fechado)
//    - 2026: ainda por fechar (ano corrente à data desta investigação)
//
// NOTA METODOLÓGICA: usamos o limite do 1.º escalão (não todos os 8/9
// escalões) porque é o ponto de comparação mais simples e mais estável
// ao longo do período — todos os anos têm um 1.º escalão com a mesma
// definição (rendimento coletável até X, taxa normal e média iguais
// nesse escalão). Não modelamos aqui o efeito completo do fiscal drag
// sobre um rendimento específico (isso exigiria recalcular o IRS de um
// salário fixo com a tabela de cada ano, o que fica fora do âmbito
// desta primeira versão) — mostramos apenas a comparação entre a
// evolução nominal do limiar e a inflação acumulada no mesmo período,
// que já é suficiente para ilustrar o fenómeno.

export const DEGRADACAO_MONETARIA_2021_2026 = {
  periodo: { inicio: 2021, fim: 2026 },
  fonteIRS: "Art. 68.º, n.º1 CIRS — Portal das Finanças (AT), redações sucessivas por ano",
  fonteIPC: "INE — Índice de Preços no Consumidor, taxa de variação média anual",
  retrievedNote: "Investigado e verificado diretamente em fonte primária (AT) e por pesquisa web (INE) em 22/08/2026.",

  escaloesIRS: [
    {
      ano: 2021,
      limite1Escalao: 7112,
      taxaNormalPercent: 14.5,
      lei: "Lei n.º 2/2020, de 31/03",
      sourceUrl:
        "https://info.portaldasfinancas.gov.pt/pt/informacao_fiscal/codigos_tributarios/cirs_rep/ra/Pages/irs68ra_202206.aspx",
    },
    {
      ano: 2022,
      limite1Escalao: 7116,
      taxaNormalPercent: 14.5,
      lei: "Lei n.º 12/2022, de 27/06",
      sourceUrl:
        "https://info.portaldasfinancas.gov.pt/pt/informacao_fiscal/codigos_tributarios/cirs_rep/ra/Pages/irs68ra_202212.aspx",
    },
    {
      ano: 2023,
      limite1Escalao: 7479,
      taxaNormalPercent: 14.5,
      lei: "Lei n.º 24-D/2022, de 30/12",
      sourceUrl:
        "https://info.portaldasfinancas.gov.pt/pt/informacao_fiscal/codigos_tributarios/cirs_rep/ra/Pages/irs68ra_202312.aspx",
    },
    {
      ano: 2024,
      limite1Escalao: 7703,
      taxaNormalPercent: 13,
      lei: "Lei n.º 82/2023, de 29/12",
      sourceUrl:
        "https://info.portaldasfinancas.gov.pt/pt/informacao_fiscal/codigos_tributarios/cirs_rep/ra/Pages/irs68ra_202412.aspx",
      notaTaxa:
        "O limite (7 703 €) está confirmado em texto nesta página do AT. A tabela completa do artigo para 2024 está publicada pelo AT como imagem, não como texto — a taxa normal de 13% vem por isso de fonte secundária (imprensa especializada), não do texto literal do AT.",
    },
    {
      ano: 2025,
      limite1Escalao: 8059,
      taxaNormalPercent: 12.5,
      lei: "Lei n.º 55-A/2025, de 22/07",
      sourceUrl:
        "https://info.portaldasfinancas.gov.pt/pt/informacao_fiscal/codigos_tributarios/cirs_rep/ra/Pages/irs68ra_202512.aspx",
    },
    {
      ano: 2026,
      limite1Escalao: 8342,
      taxaNormalPercent: 12.5,
      lei: "Lei n.º 73-A/2025, de 30/12",
      sourceUrl: "https://info.portaldasfinancas.gov.pt/pt/informacao_fiscal/codigos_tributarios/cirs_rep/Pages/irs68.aspx",
    },
  ],

  // taxaVariacaoMediaAnualPercent === null significa "ano ainda não
  // fechado" — nunca inventar um valor para 2026 enquanto o INE não o
  // publicar.
  inflacaoIPC: [
    { ano: 2021, taxaVariacaoMediaAnualPercent: 1.3, fechado: true },
    { ano: 2022, taxaVariacaoMediaAnualPercent: 7.8, fechado: true },
    { ano: 2023, taxaVariacaoMediaAnualPercent: 4.3, fechado: true },
    { ano: 2024, taxaVariacaoMediaAnualPercent: 2.4, fechado: true },
    { ano: 2025, taxaVariacaoMediaAnualPercent: 2.3, fechado: true },
    { ano: 2026, taxaVariacaoMediaAnualPercent: null, fechado: false },
  ],
};

/**
 * Calcula a inflação acumulada (encadeada) entre o INÍCIO do ano
 * `anoInicio` e o FIM do ano `anoFim` (ambos inclusive), a partir das
 * taxas de variação média anual do IPC em DEGRADACAO_MONETARIA_2021_2026 —
 * cada taxa anual representa a variação de preços ocorrida durante
 * esse próprio ano, por isso o ano `anoInicio` também entra na
 * acumulação (é o primeiro ano cuja inflação já aconteceu dentro do
 * período). Ignora anos com `fechado: false` (ex.: 2026 antes de o INE
 * fechar o ano) e para o cálculo nesse ponto — nunca extrapola.
 *
 * @param {number} anoInicio
 * @param {number} anoFim
 * @returns {{ percent: number, anoFimReal: number, incompleto: boolean }}
 */
export function calcularInflacaoAcumulada(anoInicio, anoFim) {
  let fator = 1;
  let anoFimReal = anoInicio;
  let incompleto = false;

  for (const { ano, taxaVariacaoMediaAnualPercent, fechado } of DEGRADACAO_MONETARIA_2021_2026.inflacaoIPC) {
    if (ano < anoInicio || ano > anoFim) continue;
    if (!fechado || taxaVariacaoMediaAnualPercent === null) {
      incompleto = true;
      break;
    }
    fator *= 1 + taxaVariacaoMediaAnualPercent / 100;
    anoFimReal = ano;
  }

  return {
    percent: Math.round((fator - 1) * 1000) / 10,
    anoFimReal,
    incompleto,
  };
}

/**
 * Calcula o crescimento nominal do limite do 1.º escalão de IRS entre
 * `anoInicio` e `anoFim` (ambos inclusive, usando os valores de
 * `escaloesIRS`).
 *
 * @param {number} anoInicio
 * @param {number} anoFim
 * @returns {{ percent: number, valorInicio: number, valorFim: number } | null}
 */
export function calcularCrescimentoNominalEscalao(anoInicio, anoFim) {
  const inicio = DEGRADACAO_MONETARIA_2021_2026.escaloesIRS.find((e) => e.ano === anoInicio);
  const fim = DEGRADACAO_MONETARIA_2021_2026.escaloesIRS.find((e) => e.ano === anoFim);
  if (!inicio || !fim) return null;

  return {
    percent: Math.round(((fim.limite1Escalao / inicio.limite1Escalao - 1) * 1000)) / 10,
    valorInicio: inicio.limite1Escalao,
    valorFim: fim.limite1Escalao,
  };
}
