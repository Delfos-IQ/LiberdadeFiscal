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
 * @param {object} [opcoes]
 * @param {"continente"|"acores"|"madeira"} [opcoes.regiao] — aplica o
 *   diferencial regional (ESTIMATE, ver TAX-METHODOLOGY.md).
 * @param {1|2} [opcoes.quocienteFamiliar] — 2 para declaração conjunta
 *   de casados/unidos de facto, 1 para individual (Art. 69.º CIRS).
 * @returns {{
 *   rendimentoColetavel: number,
 *   isentoPorMinimoExistencia: boolean,
 *   imposto: number,
 *   taxaEfetiva: number,
 *   decomposicaoPorEscalao: Array<{escalao: number, min: number, max: number, taxa: number, valorTributado: number, imposto: number}>,
 *   regiao: string,
 *   diferencialRegionalAplicado: boolean,
 *   quocienteFamiliar: number,
 *   ano: number,
 *   fonte: string
 * }}
 */
export function calculateIRS(rendimentoColetavel, opcoes = {}) {
  const { regiao = "continente", quocienteFamiliar = 1 } = opcoes;

  if (typeof rendimentoColetavel !== "number" || !Number.isFinite(rendimentoColetavel)) {
    throw new TypeError("rendimentoColetavel deve ser um número finito.");
  }
  if (rendimentoColetavel < 0) {
    throw new RangeError("rendimentoColetavel não pode ser negativo.");
  }
  if (quocienteFamiliar !== 1 && quocienteFamiliar !== 2) {
    throw new RangeError("quocienteFamiliar deve ser 1 (individual) ou 2 (conjunta).");
  }
  const diferencialInfo = IRS_2026.diferencialRegional[regiao];
  if (!diferencialInfo) {
    throw new RangeError(`Região desconhecida: ${regiao}. Use continente, acores ou madeira.`);
  }

  const isento = rendimentoColetavel <= IRS_2026.minimoExistencia.value;

  // Quociente familiar (Art. 69.º CIRS): divide o rendimento antes de
  // aplicar os escalões, multiplica o imposto de volta no fim. Isto
  // reduz a taxa marginal efetiva de casais com rendimento assimétrico
  // porque "espalha" o rendimento por duas pessoas fictícias.
  const rendimentoParaEscaloes = rendimentoColetavel / quocienteFamiliar;

  const decomposicaoPorEscalao = [];
  let impostoPorQuociente = 0;

  if (!isento) {
    const reducaoRegional = diferencialInfo.reducaoSobreTaxaMarginal ?? 0;

    IRS_2026.escaloes.forEach((escalao, index) => {
      if (rendimentoParaEscaloes <= escalao.min) return;

      const tetoEscalao = Math.min(rendimentoParaEscaloes, escalao.max);
      const valorTributado = tetoEscalao - escalao.min;
      if (valorTributado <= 0) return;

      // Taxa efetivamente aplicada, já com o diferencial regional
      // (ESTIMATE) descontado quando aplicável.
      const taxaAplicada = escalao.taxaMarginal * (1 - reducaoRegional);

      // Arredondamento por escalão (a cêntimo), não só no total final
      // — ver nota em TAX-METHODOLOGY.md sobre o exemplo oficial
      // (30.000€ → 6.260,16€) que só bate certo assim.
      const impostoEscalao = round2(valorTributado * taxaAplicada);
      impostoPorQuociente += impostoEscalao;

      decomposicaoPorEscalao.push({
        escalao: index + 1,
        min: escalao.min,
        max: escalao.max,
        taxa: round4(taxaAplicada),
        valorTributado: round2(valorTributado),
        imposto: impostoEscalao,
      });
    });
  }

  const impostoTotal = impostoPorQuociente * quocienteFamiliar;
  const taxaEfetiva = rendimentoColetavel > 0 ? impostoTotal / rendimentoColetavel : 0;

  return {
    rendimentoColetavel: round2(rendimentoColetavel),
    isentoPorMinimoExistencia: isento,
    imposto: round2(impostoTotal),
    taxaEfetiva: round4(taxaEfetiva),
    decomposicaoPorEscalao,
    regiao,
    diferencialRegionalAplicado: (diferencialInfo.reducaoSobreTaxaMarginal ?? 0) > 0,
    quocienteFamiliar,
    ano: IRS_2026.year,
    fonte: IRS_2026.source,
  };
}

/**
 * Dedução à coleta por dependentes (Art. 78.º-A CIRS) — subtrai-se
 * DIRETAMENTE ao imposto já calculado, nunca ao rendimento coletável.
 *
 * @param {Array<{idade: number}>} dependentes
 */
export function calcularDeducaoDependentes(dependentes) {
  if (!Array.isArray(dependentes)) {
    throw new TypeError("dependentes deve ser um array de { idade }.");
  }

  const regras = IRS_2026.deducaoPorDependente;
  let total = 0;
  let contadorAte3Anos = 0;

  // Ordena para que a regra "a partir do 2.º dependente ≤3 anos" seja
  // aplicada de forma determinística, independentemente da ordem de
  // entrada do utilizador.
  const ordenados = dependentes.slice().sort((a, b) => a.idade - b.idade);

  for (const dep of ordenados) {
    if (typeof dep.idade !== "number" || dep.idade < 0) {
      throw new RangeError("Cada dependente precisa de uma idade numérica >= 0.");
    }

    if (dep.idade <= 3) {
      contadorAte3Anos += 1;
      const valor =
        contadorAte3Anos >= 2
          ? regras.segundoDependenteOuSeguinteAte3Anos.value
          : regras.ate3AnosInclusive.value;
      total += valor;
    } else {
      total += regras.maisDe3Anos.value;
    }
  }

  return { totalDeducao: round2(total), numeroDependentes: dependentes.length };
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
 * Materializa a cadeia exigida pelo spec (secção 6.2 e 6.4): valor
 * bruto do trabalho → coste total empregador → rendimento bruto →
 * Segurança Social → IRS → rendimento líquido. Cada elo fica
 * explícito — nunca colapsar isto num único número sem dizer o que
 * representa. Suporta Modo Rápido (valores por defeito) e Modo
 * Avançado (subsídios, tipo de trabalhador) do Taxímetro.
 *
 * @param {number} salarioBrutoMensal
 * @param {object} [opcoes]
 * @param {"dependente"|"independente"} [opcoes.tipoTrabalhador]
 * @param {"individual"|"conjunta"} [opcoes.estadoCivil] — "conjunta" só
 *   faz sentido para casados/unidos de facto que optem por declaração
 *   conjunta.
 * @param {Array<{idade: number}>} [opcoes.dependentes]
 * @param {"continente"|"acores"|"madeira"} [opcoes.regiao]
 * @param {boolean} [opcoes.subsidiosDuodecimos] — Modo Avançado: se
 *   true, assume que os subsídios de férias e Natal são pagos por
 *   duodécimos (incluídos nos 12 pagamentos mensais) em vez de dois
 *   pagamentos extra em junho/dezembro. Modo Rápido assume sempre
 *   duodécimos para manter o resultado num único número mensal
 *   simples — ver `metodologia` na resposta.
 */
export function calcularCadeiaSalarial(salarioBrutoMensal, opcoes = {}) {
  const {
    tipoTrabalhador = "dependente",
    estadoCivil = "individual",
    dependentes = [],
    regiao = "continente",
  } = opcoes;

  if (tipoTrabalhador !== "dependente" && tipoTrabalhador !== "independente") {
    throw new RangeError('tipoTrabalhador deve ser "dependente" ou "independente".');
  }

  const quocienteFamiliar =
    estadoCivil === "conjunta"
      ? IRS_2026.quocienteFamiliar.declaracaoConjuntaCasadosOuUnidoFacto
      : IRS_2026.quocienteFamiliar.declaracaoIndividual;

  const rendimentoBrutoAnual = salarioBrutoMensal * 12; // simplificação v1: sem 13º/14º em pagamentos separados — ver metodologia

  let descontoSSMensal;
  let custoTotalEmpregadorMensal;
  let rendimentoColetavelAnual;

  if (tipoTrabalhador === "dependente") {
    const tsu = calculateTSU(salarioBrutoMensal);
    descontoSSMensal = tsu.descontoTrabalhador;
    custoTotalEmpregadorMensal = tsu.custoTotalEmpregador;
    rendimentoColetavelAnual = calcularRendimentoColetavelCategoriaA(
      rendimentoBrutoAnual,
      descontoSSMensal * 12
    );
  } else {
    // Trabalhador independente, regime simplificado — ver ESTIMATE em
    // seguranca-social.js e irs.js (coeficiente 0.75 para prestação de
    // serviços). Não há "entidade patronal": o custo total é o próprio
    // rendimento bruto.
    const taxaSS = SEGURANCA_SOCIAL_2026.trabalhadorIndependente.taxaContributiva;
    descontoSSMensal = round2(salarioBrutoMensal * taxaSS);
    custoTotalEmpregadorMensal = round2(salarioBrutoMensal);
    const coeficiente = IRS_2026.coeficienteRegimeSimplificado.value;
    rendimentoColetavelAnual = round2(rendimentoBrutoAnual * coeficiente);
  }

  const irs = calculateIRS(rendimentoColetavelAnual, { regiao, quocienteFamiliar });

  const deducaoDependentes =
    dependentes.length > 0 ? calcularDeducaoDependentes(dependentes) : { totalDeducao: 0 };
  const irsAnualAposDeducoes = Math.max(0, irs.imposto - deducaoDependentes.totalDeducao);
  const irsMensal = irsAnualAposDeducoes / 12;

  const liquidoMensal = salarioBrutoMensal - descontoSSMensal - irsMensal;

  return {
    tipoTrabalhador,
    custoTotalEmpregadorMensal,
    salarioBrutoMensal: round2(salarioBrutoMensal),
    descontoSSMensal,
    irsAnualAntesDeDeducoes: irs.imposto,
    deducaoAnualPorDependentes: deducaoDependentes.totalDeducao,
    irsEstimadoMensal: round2(irsMensal),
    salarioLiquidoMensal: round2(liquidoMensal),
    detalheAnual: { rendimentoBrutoAnual, rendimentoColetavelAnual, irs },
    metodologia:
      "Simplificação v1: assume 12 pagamentos mensais iguais (subsídios de férias/Natal em duodécimos), sem outras deduções à coleta além de dependentes. Diferencial regional de IRS em Açores/Madeira é ESTIMATE — ver TAX-METHODOLOGY.md.",
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
   7. Dia da Liberdade Fiscal
   ============================================================ */

/**
 * Consolida os totais anuais de cada figura tributária num único
 * resultado explicável (spec §6.5). NUNCA soma o custo total para o
 * empregador (TSU patronal) ao numerador nem ao denominador desta
 * proporção — essa cifra é informativa à parte (mostrada no
 * Taxímetro), porque misturá-la aqui inflacionaria a percentagem sem
 * ser o que a pessoa reconhece como "o meu rendimento". Ver o campo
 * `methodology` devolvido para o texto exato das hipóteses assumidas.
 *
 * @param {{
 *   ano: number,
 *   rendimentoBrutoAnual: number,
 *   irsAnual: number,
 *   ssTrabalhadorAnual: number,
 *   ivaEEspeciaisRegistado: number,
 *   patrimoniaisRegistado: number,
 * }} input
 */
export function calculateFiscalFreedomDay(input) {
  const {
    ano,
    rendimentoBrutoAnual,
    irsAnual,
    ssTrabalhadorAnual,
    ivaEEspeciaisRegistado,
    patrimoniaisRegistado,
  } = input || {};

  for (const [nome, valor] of Object.entries({
    rendimentoBrutoAnual,
    irsAnual,
    ssTrabalhadorAnual,
    ivaEEspeciaisRegistado,
    patrimoniaisRegistado,
  })) {
    if (typeof valor !== "number" || !Number.isFinite(valor) || valor < 0) {
      throw new RangeError(`${nome} deve ser um número >= 0.`);
    }
  }
  if (!Number.isInteger(ano) || ano < 2000) {
    throw new RangeError("ano deve ser um número inteiro válido.");
  }
  if (rendimentoBrutoAnual === 0) {
    throw new RangeError(
      "rendimentoBrutoAnual não pode ser 0 — sem rendimento de referência não é possível calcular uma proporção do ano."
    );
  }

  const totalImpostos = round2(irsAnual + ssTrabalhadorAnual + ivaEEspeciaisRegistado + patrimoniaisRegistado);

  // Denominador: rendimento bruto de trabalho do próprio utilizador. Se
  // o total de impostos exceder o rendimento bruto (possível quando o
  // consumo/patrimoniais registados são desproporcionalmente altos face
  // ao rendimento introduzido), a percentagem satura em 100% em vez de
  // produzir uma data inválida (dia > 365).
  const percentage = Math.min(1, totalImpostos / rendimentoBrutoAnual);

  const diasNoAno = isAnoBissexto(ano) ? 366 : 365;
  const dayOfYear = Math.max(1, Math.round(percentage * diasNoAno));
  const date = dayOfYearParaData(ano, dayOfYear);

  return {
    ano,
    dayOfYear,
    date,
    daysForTaxes: dayOfYear,
    percentage: round4(percentage),
    totalImpostos,
    rendimentoBase: round2(rendimentoBrutoAnual),
    breakdown: {
      irs: round2(irsAnual),
      segurancaSocial: round2(ssTrabalhadorAnual),
      ivaEEspeciais: round2(ivaEEspeciaisRegistado),
      patrimoniais: round2(patrimoniaisRegistado),
    },
    methodology:
      "Percentagem = (IRS anual + Segurança Social do trabalhador + IVA/impostos especiais registados nas Faturas + impostos patrimoniais/anuais registados) ÷ rendimento bruto anual de trabalho. " +
      "O custo total para o empregador (TSU patronal) NÃO está incluído nesta proporção — é uma cifra informativa à parte, mostrada no Taxímetro. " +
      "O IVA e os impostos especiais refletem apenas o que foi registado manualmente em Faturas, não uma projeção do consumo anual total — quanto mais despesas registares, mais preciso este número fica. " +
      "Segundo as hipóteses utilizadas nesta simulação, esta é a data correspondente à proporção anual do valor destinado a impostos e contribuições — não significa que deixes de pagar impostos a partir desta data.",
  };
}

/* ============================================================
   Utilitários internos
   ============================================================ */

function isAnoBissexto(ano) {
  return (ano % 4 === 0 && ano % 100 !== 0) || ano % 400 === 0;
}

function dayOfYearParaData(ano, dayOfYear) {
  const data = new Date(Date.UTC(ano, 0, 1));
  data.setUTCDate(data.getUTCDate() + (dayOfYear - 1));
  const mm = String(data.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(data.getUTCDate()).padStart(2, "0");
  return `${ano}-${mm}-${dd}`;
}

function round2(value) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function round4(value) {
  return Math.round((value + Number.EPSILON) * 10000) / 10000;
}
