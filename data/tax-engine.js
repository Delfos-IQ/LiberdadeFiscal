// Liberdade Fiscal — Motor fiscal (Fase 2)
//
// Funções PURAS de cálculo. Nenhuma delas toca o DOM, IndexedDB, nem
// qualquer estado global — recebem parâmetros, devolvem números e a
// decomposição do cálculo (para o "Como chegámos a este número?" do
// spec, secção 6.5). Isto torna-as triviais de testar (ver
// tests/tax-engine.test.js) e reutilizáveis por qualquer módulo de UI
// futuro sem duplicar lógica.
//
// Princípio inegociável (CLAUDE.md secção 10): esta camada NUNCA
// inventa um valor. Onde o parâmetro subjacente está marcado UNKNOWN
// em data/tax-rules/2026/, a função correspondente devolve
// { status: "UNKNOWN", reason } em vez de um número — mesmo que isso
// signifique que uma funcionalidade fica incompleta até a Fase 6.

import { IRS_2026 } from "./tax-rules/2026/irs.js";
import { SEGURANCA_SOCIAL_2026 } from "./tax-rules/2026/seguranca-social.js";
import { IVA_2026 } from "./tax-rules/2026/iva.js";
import { IMPOSTOS_ESPECIAIS_2026 } from "./tax-rules/2026/impostos-especiais.js";
import { PATRIMONIAIS_2026 } from "./tax-rules/2026/patrimoniais.js";

/* ============================================================
   1. IRS
   ============================================================ */

/**
 * Calcula o IRS por escalões (Art. 68.º CIRS) sobre um rendimento
 * coletável anual. Cálculo "por fatias": cada euro é tributado apenas
 * à taxa do seu próprio escalão — nunca a taxa marginal mais alta
 * sobre a totalidade do rendimento.
 *
 * @param {number} rendimentoColetavel — em EUR/ano, já líquido de
 *   deduções específicas. Deve ser >= 0.
 * @returns {{
 *   rendimentoColetavel: number,
 *   isentoPorMinimoExistencia: boolean,
 *   imposto: number,
 *   taxaEfetiva: number,
 *   decomposicaoPorEscalao: Array<{escalao: number, min: number, max: number, taxa: number, valorTributado: number, imposto: number}>,
 *   ano: number,
 *   fonte: string
 * }}
 */
export function calculateIRS(rendimentoColetavel) {
  if (typeof rendimentoColetavel !== "number" || !Number.isFinite(rendimentoColetavel)) {
    throw new TypeError("rendimentoColetavel deve ser um número finito.");
  }
  if (rendimentoColetavel < 0) {
    throw new RangeError("rendimentoColetavel não pode ser negativo.");
  }

  const isento = rendimentoColetavel <= IRS_2026.minimoExistencia.value;

  const decomposicaoPorEscalao = [];
  let impostoTotal = 0;

  if (!isento) {
    // Arredondamento por escalão (a cêntimo), não só no total final. É
    // assim que o exemplo oficial documentado em TAX-METHODOLOGY.md
    // (30.000€ → 6.260,16€) foi calculado — arredondar só no fim dá
    // 6.260,15€, um cêntimo a menos. Os tests/tax-engine.test.js
    // apanharam esta diferença ao comparar contra o exemplo da fonte.
    IRS_2026.escaloes.forEach((escalao, index) => {
      if (rendimentoColetavel <= escalao.min) return;

      const tetoEscalao = Math.min(rendimentoColetavel, escalao.max);
      const valorTributado = tetoEscalao - escalao.min;
      if (valorTributado <= 0) return;

      const impostoEscalao = round2(valorTributado * escalao.taxaMarginal);
      impostoTotal += impostoEscalao;

      decomposicaoPorEscalao.push({
        escalao: index + 1,
        min: escalao.min,
        max: escalao.max,
        taxa: escalao.taxaMarginal,
        valorTributado: round2(valorTributado),
        imposto: impostoEscalao,
      });
    });
  }

  const taxaEfetiva = rendimentoColetavel > 0 ? impostoTotal / rendimentoColetavel : 0;

  return {
    rendimentoColetavel: round2(rendimentoColetavel),
    isentoPorMinimoExistencia: isento,
    imposto: round2(impostoTotal),
    taxaEfetiva: round4(taxaEfetiva),
    decomposicaoPorEscalao,
    ano: IRS_2026.year,
    fonte: IRS_2026.source,
  };
}

/**
 * Taxa adicional de solidariedade (Art. 68.º-A CIRS) — cumulativa com
 * o IRS normal, incide só sobre a fração acima de cada limiar.
 *
 * @param {number} rendimentoColetavel
 * @returns {{ imposto: number, decomposicao: Array<object> }}
 */
export function calculateTaxaSolidariedade(rendimentoColetavel) {
  if (typeof rendimentoColetavel !== "number" || rendimentoColetavel < 0) {
    throw new RangeError("rendimentoColetavel deve ser um número >= 0.");
  }

  const decomposicao = [];
  let total = 0;

  for (const tramo of IRS_2026.taxaSolidariedade) {
    if (rendimentoColetavel <= tramo.min) continue;
    const tetoTramo = Math.min(rendimentoColetavel, tramo.max);
    const valorTributado = tetoTramo - tramo.min;
    if (valorTributado <= 0) continue;

    const imposto = valorTributado * tramo.taxa;
    total += imposto;
    decomposicao.push({
      min: tramo.min,
      max: tramo.max,
      taxa: tramo.taxa,
      valorTributado: round2(valorTributado),
      imposto: round2(imposto),
    });
  }

  return { imposto: round2(total), decomposicao };
}

/**
 * Aplica a dedução específica da Categoria A (trabalho dependente) a
 * um rendimento bruto anual, para obter o rendimento coletável.
 * Usa o maior entre o valor fixo e as contribuições efetivas de SS,
 * conforme Art. 25.º CIRS.
 *
 * @param {number} rendimentoBrutoAnual
 * @param {number} contribuicoesSSAnual
 */
export function calcularRendimentoColetavelCategoriaA(rendimentoBrutoAnual, contribuicoesSSAnual) {
  const deducao = Math.max(IRS_2026.deducaoEspecificaCategoriaA.value, contribuicoesSSAnual);
  return round2(Math.max(0, rendimentoBrutoAnual - deducao));
}

/* ============================================================
   2. Segurança Social
   ============================================================ */

/**
 * Calcula a Taxa Social Única para um trabalhador por conta de
 * outrem (regime geral). A parte da entidade patronal é um custo
 * ADICIONAL ao salário bruto — nunca somar às deduções do trabalhador.
 *
 * @param {number} salarioBrutoMensal
 * @returns {{
 *   salarioBrutoMensal: number,
 *   descontoTrabalhador: number,
 *   custoEntidadePatronal: number,
 *   custoTotalEmpregador: number,
 *   salarioLiquidoAposSS: number,
 *   ano: number, fonte: string
 * }}
 */
export function calculateTSU(salarioBrutoMensal) {
  if (typeof salarioBrutoMensal !== "number" || salarioBrutoMensal < 0) {
    throw new RangeError("salarioBrutoMensal deve ser um número >= 0.");
  }

  const { trabalhador, entidadePatronal } = SEGURANCA_SOCIAL_2026.tsu.regimeGeral;
  const descontoTrabalhador = salarioBrutoMensal * trabalhador;
  const custoEntidadePatronal = salarioBrutoMensal * entidadePatronal;

  return {
    salarioBrutoMensal: round2(salarioBrutoMensal),
    descontoTrabalhador: round2(descontoTrabalhador),
    custoEntidadePatronal: round2(custoEntidadePatronal),
    custoTotalEmpregador: round2(salarioBrutoMensal + custoEntidadePatronal),
    salarioLiquidoAposSS: round2(salarioBrutoMensal - descontoTrabalhador),
    ano: SEGURANCA_SOCIAL_2026.year,
    fonte: SEGURANCA_SOCIAL_2026.source,
  };
}

/* ============================================================
   3. Cadeia completa: custo empregador → líquido (spec §6.2)
   ============================================================ */

/**
 * Materializa a cadeia exigida pelo spec (secção 6.2): valor bruto do
 * trabalho → coste total empregador → rendimento bruto → Segurança
 * Social → IRS → rendimento líquido. Cada elo fica explícito — nunca
 * colapsar isto num único número sem dizer o que representa.
 *
 * @param {number} salarioBrutoMensal
 * @param {{ dependentes?: number }} [opcoes]
 */
export function calcularCadeiaSalarial(salarioBrutoMensal, opcoes = {}) {
  const tsu = calculateTSU(salarioBrutoMensal);

  const rendimentoBrutoAnual = salarioBrutoMensal * 12; // simplificação v1: sem 13º/14º
  const contribuicoesSSAnual = tsu.descontoTrabalhador * 12;
  const rendimentoColetavelAnual = calcularRendimentoColetavelCategoriaA(
    rendimentoBrutoAnual,
    contribuicoesSSAnual
  );

  const irs = calculateIRS(rendimentoColetavelAnual);
  const irsMensal = irs.imposto / 12;

  const liquidoMensal = salarioBrutoMensal - tsu.descontoTrabalhador - irsMensal;

  return {
    custoTotalEmpregadorMensal: tsu.custoTotalEmpregador,
    salarioBrutoMensal: round2(salarioBrutoMensal),
    descontoSSMensal: tsu.descontoTrabalhador,
    irsEstimadoMensal: round2(irsMensal),
    salarioLiquidoMensal: round2(liquidoMensal),
    detalheAnual: { rendimentoBrutoAnual, rendimentoColetavelAnual, irs },
    metodologia:
      "Simplificação v1: assume 12 pagamentos mensais iguais, sem subsídios de férias/Natal nem deduções à coleta. Ver TAX-METHODOLOGY.md secção 6.",
  };
}

/* ============================================================
   4. IVA
   ============================================================ */

/**
 * Calcula o IVA sobre uma base tributável, dada a região e o nível de
 * taxa (reduzida/intermedia/normal) — a classificação de QUAL nível se
 * aplica a um bem/serviço concreto vive no catálogo da Fase 5, não
 * aqui.
 *
 * @param {number} baseTributavel
 * @param {"continente"|"acores"|"madeira"} regiao
 * @param {"reduzida"|"intermedia"|"normal"} nivel
 */
export function calculateIVA(baseTributavel, regiao, nivel) {
  if (typeof baseTributavel !== "number" || baseTributavel < 0) {
    throw new RangeError("baseTributavel deve ser um número >= 0.");
  }
  const taxasRegiao = IVA_2026.taxas[regiao];
  if (!taxasRegiao) {
    throw new RangeError(`Região desconhecida: ${regiao}. Use continente, acores ou madeira.`);
  }
  const taxa = taxasRegiao[nivel];
  if (taxa === undefined) {
    throw new RangeError(`Nível de IVA desconhecido: ${nivel}. Use reduzida, intermedia ou normal.`);
  }

  const imposto = baseTributavel * taxa;

  return {
    baseTributavel: round2(baseTributavel),
    regiao,
    nivel,
    taxa,
    imposto: round2(imposto),
    total: round2(baseTributavel + imposto),
    ano: IVA_2026.year,
    fonte: IVA_2026.source,
  };
}

/**
 * Decompõe um valor TOTAL já pago (IVA incluído) na sua base e IVA —
 * necessário no fluxo manual de faturas (spec §6.3), onde o utilizador
 * introduz o que pagou, não a base.
 *
 * @param {number} valorTotal
 * @param {"continente"|"acores"|"madeira"} regiao
 * @param {"reduzida"|"intermedia"|"normal"} nivel
 */
export function decomporIVADeTotal(valorTotal, regiao, nivel) {
  if (typeof valorTotal !== "number" || valorTotal < 0) {
    throw new RangeError("valorTotal deve ser um número >= 0.");
  }
  const taxasRegiao = IVA_2026.taxas[regiao];
  if (!taxasRegiao) {
    throw new RangeError(`Região desconhecida: ${regiao}.`);
  }
  const taxa = taxasRegiao[nivel];
  if (taxa === undefined) {
    throw new RangeError(`Nível de IVA desconhecido: ${nivel}.`);
  }

  const base = valorTotal / (1 + taxa);
  const imposto = valorTotal - base;

  return {
    valorTotal: round2(valorTotal),
    baseTributavel: round2(base),
    imposto: round2(imposto),
    regiao,
    nivel,
    taxa,
  };
}

/* ============================================================
   5. Impostos especiais de consumo — apenas onde há dados verificados
   ============================================================ */

/**
 * Desglose educativo de ISP + IVA sobre combustível (spec §6.3): o
 * utilizador introduz o total pago; devolvemos o ISP (unitário ×
 * litros implícitos, aproximado) e o IVA calculado sobre o preço já
 * com ISP incluído. AVISO: usa o ISP fotografado em impostos-
 * especiais.js (ver TAX-METHODOLOGY.md) — é o parâmetro mais volátil
 * do projeto, revalidar antes de publicar.
 *
 * @param {number} valorTotalPago
 * @param {"gasolina"|"gasoleoRodoviario"} tipoCombustivel
 * @param {"continente"|"acores"|"madeira"} regiao
 */
export function decomporCombustivel(valorTotalPago, tipoCombustivel, regiao) {
  const ispInfo = IMPOSTOS_ESPECIAIS_2026.isp[tipoCombustivel];
  if (!ispInfo) {
    return { status: "UNKNOWN", reason: `Tipo de combustível desconhecido: ${tipoCombustivel}` };
  }

  // O IVA incide sobre o preço final, que já inclui o ISP — por isso
  // decompomos o total como se fosse tudo "base + IVA" primeiro, e só
  // depois isolamos o ISP dentro dessa base.
  const { baseTributavel, imposto: iva } = decomporIVADeTotal(valorTotalPago, regiao, "normal");
  const litrosImplicitos = baseTributavel > 0 ? null : 0; // não temos preço sem impostos por litro fiável aqui

  return {
    status: "ESTIMATE",
    valorTotalPago: round2(valorTotalPago),
    ivaEstimado: round2(iva),
    ispUnitario: ispInfo.value,
    ispUnidade: ispInfo.unit,
    notes:
      "Decomposição aproximada: isola o IVA sobre o total pago. Não calcula os litros exatos nem o valor exato de ISP contido no total, porque isso exigiria o preço sem impostos por litro no momento da compra, que o utilizador não introduz. Ver TAX-METHODOLOGY.md — ISP é o parâmetro mais volátil do projeto.",
    fonte: IMPOSTOS_ESPECIAIS_2026.source,
    ispAsOfDate: IMPOSTOS_ESPECIAIS_2026.isp.asOfDate,
  };
}

/**
 * IABA — devolve UNKNOWN explícito. A tabela de taxas por bebida/grau
 * alcoólico não foi verificada (ver TAX-METHODOLOGY.md secção 4). Esta
 * função existe para que o código chamador tenha um ponto único e
 * óbvio a substituir quando o dado chegar — em vez de inventar um
 * número plausível.
 */
export function decomporIABA() {
  return {
    status: "UNKNOWN",
    reason:
      "Tabela de taxas IABA por tipo de bebida/grau alcoólico não verificada. Ver TAX-METHODOLOGY.md secção 4.",
  };
}

/**
 * IT (tabaco) — cigarros, únicos com dados verificados.
 * @param {number} numeroCigarros
 * @param {number} precoVendaPublico — preço de venda ao público do maço/lote
 */
export function calcularITCigarros(numeroCigarros, precoVendaPublico) {
  if (typeof numeroCigarros !== "number" || numeroCigarros < 0) {
    throw new RangeError("numeroCigarros deve ser um número >= 0.");
  }
  if (typeof precoVendaPublico !== "number" || precoVendaPublico < 0) {
    throw new RangeError("precoVendaPublico deve ser um número >= 0.");
  }

  const { elementoEspecifico, elementoAdValorem } = IMPOSTOS_ESPECIAIS_2026.it.cigarros;
  const especifico = (numeroCigarros / 1000) * elementoEspecifico.value;
  const adValorem = precoVendaPublico * elementoAdValorem.value;

  return {
    numeroCigarros,
    elementoEspecifico: round2(especifico),
    elementoAdValorem: round2(adValorem),
    itTotal: round2(especifico + adValorem),
    fonte: IMPOSTOS_ESPECIAIS_2026.source,
  };
}

/* ============================================================
   6. Impostos patrimoniais e de veículo
   ============================================================ */

/**
 * IMI — exige que o utilizador forneça a taxa do seu concelho (dentro
 * do intervalo legal), porque a tabela completa dos 308 municípios
 * não está disponível (ver TAX-METHODOLOGY.md). Nunca assumir a taxa
 * mínima silenciosamente.
 *
 * @param {number} valorPatrimonialTributario
 * @param {number} taxaConcelho — fração, ex. 0.003 para 0,3%
 * @param {"urbano"|"rustico"} tipo
 */
export function calcularIMI(valorPatrimonialTributario, taxaConcelho, tipo = "urbano") {
  if (typeof valorPatrimonialTributario !== "number" || valorPatrimonialTributario < 0) {
    throw new RangeError("valorPatrimonialTributario deve ser um número >= 0.");
  }

  if (tipo === "rustico") {
    const taxa = PATRIMONIAIS_2026.imi.prediosRusticos.value;
    return {
      valorPatrimonialTributario: round2(valorPatrimonialTributario),
      tipo,
      taxa,
      imposto: round2(valorPatrimonialTributario * taxa),
      fonte: PATRIMONIAIS_2026.source,
    };
  }

  const { min, max } = PATRIMONIAIS_2026.imi.prediosUrbanos;
  if (typeof taxaConcelho !== "number" || taxaConcelho < min || taxaConcelho > max) {
    throw new RangeError(
      `taxaConcelho deve estar entre ${min} e ${max} (intervalo legal para prédios urbanos). ` +
        "A tabela completa por concelho não está disponível — ver TAX-METHODOLOGY.md."
    );
  }

  return {
    valorPatrimonialTributario: round2(valorPatrimonialTributario),
    tipo,
    taxa: taxaConcelho,
    imposto: round2(valorPatrimonialTributario * taxaConcelho),
    fonte: PATRIMONIAIS_2026.source,
  };
}

/** ISV — UNKNOWN explícito. Ver TAX-METHODOLOGY.md secção 5. */
export function calcularISV() {
  return {
    status: "UNKNOWN",
    reason: "Tabelas numéricas de ISV (componente cilindrada + ambiental) não verificadas. Ver TAX-METHODOLOGY.md secção 5.",
  };
}

/** IUC — UNKNOWN explícito. Ver TAX-METHODOLOGY.md secção 5. */
export function calcularIUC() {
  return {
    status: "UNKNOWN",
    reason: "Tabelas numéricas de IUC por categoria (A-F) não verificadas. Ver TAX-METHODOLOGY.md secção 5.",
  };
}

/** Imposto de Selo — UNKNOWN explícito. Ver TAX-METHODOLOGY.md secção 5. */
export function calcularImpostoSelo() {
  return {
    status: "UNKNOWN",
    reason: "Não pesquisado nesta fase. Ver TAX-METHODOLOGY.md secção 5.",
  };
}

/* ============================================================
   Utilitários internos
   ============================================================ */

function round2(value) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function round4(value) {
  return Math.round((value + Number.EPSILON) * 10000) / 10000;
}
