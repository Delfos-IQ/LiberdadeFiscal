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
    // Diferencial regional (Açores e Madeira, ambos ✅ verified em
    // 18/08/2026): redução UNIFORME sobre a taxa marginal de cada
    // escalão nacional — ver notas em irs.js#diferencialRegional. Uma
    // versão anterior desta app tinha um mecanismo diferenciado por
    // escalão só para os Açores (reducaoPrimeiroEscalao/
    // reducaoRestantesEscaloes), baseado em fontes secundárias que uma
    // ronda de verificação posterior (tabela numérica da PwC + texto do
    // Art. 4.º do DLR 2/99/A) corrigiu — o mecanismo real é uniforme,
    // igual ao da Madeira. Simplificado para um único campo.
    const reducaoRegional = diferencialInfo.reducaoSobreTaxaMarginal ?? 0;

    IRS_2026.escaloes.forEach((escalao, index) => {
      if (rendimentoParaEscaloes <= escalao.min) return;

      const tetoEscalao = Math.min(rendimentoParaEscaloes, escalao.max);
      const valorTributado = tetoEscalao - escalao.min;
      if (valorTributado <= 0) return;

      // Taxa efetivamente aplicada, já com o diferencial regional
      // (verified) descontado quando aplicável.
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
 * ✅ Corrigido (19/08/2026, ronda "confirmar fuentes primarias"): a
 * tabela "Deduções à coleta de IRS" do PwC Guia Fiscal 2026 mostra que
 * o valor de 900€ se aplica ao 2.º dependente e seguintes com idade
 * <= 6 anos, "independentemente da idade do primeiro" — não <= 3 anos
 * como o motor assumia antes. Isto muda o resultado sempre que há 2+
 * dependentes e um deles (que não seja o 1.º, por ordem crescente de
 * idade) tem entre 4 e 6 anos inclusive: antes recebia 600€, agora
 * recebe corretamente 900€.
 * Simplificação conhecida, não resolvida: a lei fala em "1.º
 * dependente" por ordem de nascimento/registo civil, que esta app não
 * recolhe — usa-se a ordem crescente de idade (mais novo = "2.º
 * dependente e seguintes") como aproximação determinística.
 *
 * @param {Array<{idade: number}>} dependentes
 */
export function calcularDeducaoDependentes(dependentes) {
  if (!Array.isArray(dependentes)) {
    throw new TypeError("dependentes deve ser um array de { idade }.");
  }

  const regras = IRS_2026.deducaoPorDependente;
  let total = 0;

  // Ordena para que a regra "2.º dependente e seguintes" seja aplicada
  // de forma determinística, independentemente da ordem de entrada do
  // utilizador (ver nota acima sobre a aproximação por idade).
  const ordenados = dependentes.slice().sort((a, b) => a.idade - b.idade);

  ordenados.forEach((dep, index) => {
    if (typeof dep.idade !== "number" || dep.idade < 0) {
      throw new RangeError("Cada dependente precisa de uma idade numérica >= 0.");
    }

    if (index >= 1 && dep.idade <= 6) {
      total += regras.segundoDependenteOuSeguinteAte3Anos.value;
    } else if (dep.idade <= 3) {
      total += regras.ate3AnosInclusive.value;
    } else {
      total += regras.maisDe3Anos.value;
    }
  });

  return { totalDeducao: round2(total), numeroDependentes: dependentes.length };
}

/**
 * Taxa adicional de solidariedade (Art. 68.º-A CIRS) — cumulativa com
 * o IRS normal, incide só sobre a fração do rendimento coletável acima
 * de cada limiar (80.000€ e 250.000€/ano). 🟡 ESTIMATE — ver nota
 * completa em irs.js#taxaSolidariedade sobre o diferencial regional
 * (só Açores, segundo a única fonte que temos) e a interação incerta
 * com a dedução por dependentes.
 *
 * Aplica o mesmo padrão de quociente familiar do IRS normal (Art. 69.º
 * CIRS, tal como confirmado pela fonte para este artigo): divide o
 * rendimento antes de aplicar os tramos, multiplica o imposto de volta
 * no fim.
 *
 * @param {number} rendimentoColetavel
 * @param {object} [opcoes]
 * @param {"continente"|"acores"|"madeira"} [opcoes.regiao]
 * @param {1|2} [opcoes.quocienteFamiliar]
 * @returns {{ imposto: number, decomposicao: Array<object> }}
 */
export function calculateTaxaSolidariedade(rendimentoColetavel, opcoes = {}) {
  const { regiao = "continente", quocienteFamiliar = 1 } = opcoes;

  if (typeof rendimentoColetavel !== "number" || rendimentoColetavel < 0) {
    throw new RangeError("rendimentoColetavel deve ser um número >= 0.");
  }
  if (quocienteFamiliar !== 1 && quocienteFamiliar !== 2) {
    throw new RangeError("quocienteFamiliar deve ser 1 (individual) ou 2 (conjunta).");
  }

  const reducaoRegional = IRS_2026.taxaSolidariedade.reducaoRegional[regiao];
  if (reducaoRegional === undefined) {
    throw new RangeError(`Região desconhecida: ${regiao}. Use continente, acores ou madeira.`);
  }

  const rendimentoParaTramos = rendimentoColetavel / quocienteFamiliar;
  const decomposicao = [];
  let totalPorQuociente = 0;

  for (const tramo of IRS_2026.taxaSolidariedade.tramos) {
    if (rendimentoParaTramos <= tramo.min) continue;
    const tetoTramo = Math.min(rendimentoParaTramos, tramo.max);
    const valorTributado = tetoTramo - tramo.min;
    if (valorTributado <= 0) continue;

    const taxaAplicada = tramo.taxa * (1 - reducaoRegional);
    const imposto = valorTributado * taxaAplicada;
    totalPorQuociente += imposto;
    decomposicao.push({
      min: tramo.min,
      max: tramo.max,
      taxa: round4(taxaAplicada),
      valorTributado: round2(valorTributado),
      imposto: round2(imposto),
    });
  }

  return { imposto: round2(totalPorQuociente * quocienteFamiliar), decomposicao };
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
    // Trabalhador independente, regime simplificado — ver notas em
    // seguranca-social.js (coeficiente 0.75 do regime simplificado de
    // IRS em irs.js). Não há "entidade patronal": o custo total é o
    // próprio rendimento bruto.
    //
    // Correção (18/08/2026): a Segurança Social não incide sobre a
    // faturação bruta diretamente — incide sobre o "rendimento
    // relevante", que para prestação de serviços é 70% da faturação
    // (Art. 168.º CRCSPSS). Uma versão anterior desta app aplicava a
    // taxa contributiva (21,4%) sobre o bruto inteiro, sobrestimando a
    // contribuição em cerca de 43%. Ver nota completa em
    // seguranca-social.js#trabalhadorIndependente.
    const { taxaContributiva, percentagemRendimentoRelevante } = SEGURANCA_SOCIAL_2026.trabalhadorIndependente;
    const rendimentoRelevanteMensal = salarioBrutoMensal * percentagemRendimentoRelevante.prestacaoServicos;
    descontoSSMensal = round2(rendimentoRelevanteMensal * taxaContributiva);
    custoTotalEmpregadorMensal = round2(salarioBrutoMensal);
    const coeficiente = IRS_2026.coeficienteRegimeSimplificado.value;
    rendimentoColetavelAnual = round2(rendimentoBrutoAnual * coeficiente);
  }

  const irs = calculateIRS(rendimentoColetavelAnual, { regiao, quocienteFamiliar });

  // Taxa adicional de solidariedade (Art. 68.º-A CIRS, 🟡 ESTIMATE) —
  // cablada em 18/08/2026: só se aplica quando o rendimento coletável
  // ultrapassa 80.000€/ano, o que raramente acontece no Modo Rápido.
  // Somada DEPOIS da dedução por dependentes, nunca reduzida por ela —
  // ver a ressalva completa em irs.js#taxaSolidariedade sobre esta
  // decisão (o mecanismo de ajuste por dependentes do Art. 68.º-A foi
  // revogado em 2016, e não há confirmação de como a dedução do
  // Art. 78.º-A interage com o que resta do artigo).
  const solidariedade = calculateTaxaSolidariedade(rendimentoColetavelAnual, { regiao, quocienteFamiliar });

  const deducaoDependentes =
    dependentes.length > 0 ? calcularDeducaoDependentes(dependentes) : { totalDeducao: 0 };
  const irsAnualAposDeducoes = Math.max(0, irs.imposto - deducaoDependentes.totalDeducao) + solidariedade.imposto;
  const irsMensal = irsAnualAposDeducoes / 12;

  const liquidoMensal = salarioBrutoMensal - descontoSSMensal - irsMensal;

  return {
    tipoTrabalhador,
    custoTotalEmpregadorMensal,
    salarioBrutoMensal: round2(salarioBrutoMensal),
    descontoSSMensal,
    irsAnualAntesDeDeducoes: irs.imposto,
    deducaoAnualPorDependentes: deducaoDependentes.totalDeducao,
    taxaSolidariedadeAnual: solidariedade.imposto,
    irsEstimadoMensal: round2(irsMensal),
    salarioLiquidoMensal: round2(liquidoMensal),
    detalheAnual: { rendimentoBrutoAnual, rendimentoColetavelAnual, irs, solidariedade },
    metodologia:
      "Para simplificar (ainda estamos numa primeira versão), assumimos 12 pagamentos mensais iguais — ou seja, os subsídios de férias e de Natal já vêm distribuídos em duodécimos — e não aplicamos outras deduções à coleta além dos dependentes. Também vale a pena dizer-te: o diferencial regional de IRS que usamos para os Açores e a Madeira é uma estimativa nossa, não um valor que já confirmámos oficialmente. Se o rendimento coletável ultrapassar 80.000€/ano, soma-se ainda a taxa adicional de solidariedade (Art. 68.º-A CIRS) — também uma estimativa, ver metodologia completa.",
  };
}

/**
 * Cadeia salarial para declaração conjunta de IRS com DOIS rendimentos
 * distintos (roadmap P3-15, "agregado familiar") — cobre o caso que
 * `calcularCadeiaSalarial(..., { estadoCivil: "conjunta" })` não cobre
 * bem: quando há duas pessoas do agregado com salário próprio, o
 * quociente familiar (Art. 69.º CIRS) tem de dividir a SOMA dos dois
 * rendimentos coletáveis por 2, não o rendimento de uma pessoa só. Se
 * só há um rendimento no agregado, continua a fazer mais sentido usar
 * `calcularCadeiaSalarial` diretamente.
 *
 * A Segurança Social NÃO é conjunta — cada pessoa desconta sobre o seu
 * próprio salário, por isso esta função calcula a TSU de cada pessoa
 * separadamente e só junta os dois rendimentos coletáveis para o IRS.
 * Ambas as pessoas são assumidas como trabalhadoras por conta de
 * outrem (regime geral) — não cobre o caso de uma delas ser
 * independente, para não multiplicar a combinatória de casos numa
 * primeira versão (ver `notes` da resposta).
 *
 * @param {number} salarioBrutoMensalA
 * @param {number} salarioBrutoMensalB
 * @param {object} [opcoes]
 * @param {"continente"|"acores"|"madeira"} [opcoes.regiao]
 * @param {Array<{idade: number}>} [opcoes.dependentes]
 * @returns {{
 *   modo: "conjunta-dois-rendimentos",
 *   tipoTrabalhador: "dependente",
 *   custoTotalEmpregadorMensal: number,
 *   salarioBrutoMensal: number,
 *   descontoSSMensal: number,
 *   irsAnualAntesDeDeducoes: number,
 *   deducaoAnualPorDependentes: number,
 *   taxaSolidariedadeAnual: number,
 *   irsEstimadoMensal: number,
 *   salarioLiquidoMensal: number,
 *   detalheAnual: { rendimentoBrutoAnual: number, rendimentoColetavelAnual: number, irs: object, solidariedade: object },
 *   pessoaA: object, pessoaB: object,
 *   metodologia: string,
 * }}
 */
export function calcularCadeiaSalarialConjunta(salarioBrutoMensalA, salarioBrutoMensalB, opcoes = {}) {
  const { regiao = "continente", dependentes = [] } = opcoes;

  if (typeof salarioBrutoMensalA !== "number" || salarioBrutoMensalA < 0) {
    throw new RangeError("salarioBrutoMensalA deve ser um número >= 0.");
  }
  if (typeof salarioBrutoMensalB !== "number" || salarioBrutoMensalB < 0) {
    throw new RangeError("salarioBrutoMensalB deve ser um número >= 0.");
  }

  // Cada pessoa calcula a sua própria TSU/SS e dedução específica da
  // Categoria A (Art. 25.º CIRS é por sujeito passivo, não por
  // agregado) — chamamos a cadeia individual só até esse ponto,
  // "individual" aqui é só para não aplicar o quociente familiar duas
  // vezes (aplicamo-lo uma única vez, a seguir, sobre a soma).
  const cadeiaA = calcularCadeiaSalarial(salarioBrutoMensalA, {
    tipoTrabalhador: "dependente",
    estadoCivil: "individual",
    regiao,
  });
  const cadeiaB = calcularCadeiaSalarial(salarioBrutoMensalB, {
    tipoTrabalhador: "dependente",
    estadoCivil: "individual",
    regiao,
  });

  const rendimentoColetavelAnual = round2(
    cadeiaA.detalheAnual.rendimentoColetavelAnual + cadeiaB.detalheAnual.rendimentoColetavelAnual
  );
  const quocienteFamiliar = IRS_2026.quocienteFamiliar.declaracaoConjuntaCasadosOuUnidoFacto;
  const irs = calculateIRS(rendimentoColetavelAnual, { regiao, quocienteFamiliar });

  // Taxa adicional de solidariedade (Art. 68.º-A CIRS, 🟡 ESTIMATE) —
  // ver a mesma nota em calcularCadeiaSalarial(). Aplicada sobre o
  // rendimento coletável COMBINADO do casal, com o mesmo quociente
  // familiar (divisor 2) usado para o IRS normal.
  const solidariedade = calculateTaxaSolidariedade(rendimentoColetavelAnual, { regiao, quocienteFamiliar });

  const deducaoDependentes =
    dependentes.length > 0 ? calcularDeducaoDependentes(dependentes) : { totalDeducao: 0 };
  const irsAnualAposDeducoes = Math.max(0, irs.imposto - deducaoDependentes.totalDeducao) + solidariedade.imposto;
  const irsMensal = irsAnualAposDeducoes / 12;

  const rendimentoBrutoMensal = round2(salarioBrutoMensalA + salarioBrutoMensalB);
  const descontoSSMensal = round2(cadeiaA.descontoSSMensal + cadeiaB.descontoSSMensal);
  const custoTotalEmpregadorMensal = round2(cadeiaA.custoTotalEmpregadorMensal + cadeiaB.custoTotalEmpregadorMensal);
  const rendimentoBrutoAnual = round2(cadeiaA.detalheAnual.rendimentoBrutoAnual + cadeiaB.detalheAnual.rendimentoBrutoAnual);
  const liquidoMensal = round2(rendimentoBrutoMensal - descontoSSMensal - irsMensal);

  return {
    modo: "conjunta-dois-rendimentos",
    tipoTrabalhador: "dependente",
    custoTotalEmpregadorMensal,
    salarioBrutoMensal: rendimentoBrutoMensal,
    descontoSSMensal,
    irsAnualAntesDeDeducoes: irs.imposto,
    deducaoAnualPorDependentes: deducaoDependentes.totalDeducao,
    taxaSolidariedadeAnual: solidariedade.imposto,
    irsEstimadoMensal: round2(irsMensal),
    salarioLiquidoMensal: liquidoMensal,
    detalheAnual: { rendimentoBrutoAnual, rendimentoColetavelAnual, irs, solidariedade },
    pessoaA: {
      salarioBrutoMensal: cadeiaA.salarioBrutoMensal,
      descontoSSMensal: cadeiaA.descontoSSMensal,
      custoTotalEmpregadorMensal: cadeiaA.custoTotalEmpregadorMensal,
      rendimentoColetavelAnual: cadeiaA.detalheAnual.rendimentoColetavelAnual,
    },
    pessoaB: {
      salarioBrutoMensal: cadeiaB.salarioBrutoMensal,
      descontoSSMensal: cadeiaB.descontoSSMensal,
      custoTotalEmpregadorMensal: cadeiaB.custoTotalEmpregadorMensal,
      rendimentoColetavelAnual: cadeiaB.detalheAnual.rendimentoColetavelAnual,
    },
    metodologia:
      "Declaração conjunta com dois rendimentos: somámos o rendimento coletável de cada pessoa (cada uma com a sua própria dedução específica da Categoria A) e só depois aplicámos o quociente familiar (divisor 2, Art. 69.º CIRS) sobre o total — dividimos, aplicámos os escalões, e multiplicámos o imposto de volta por 2. A Segurança Social não é conjunta: cada pessoa desconta sobre o seu próprio salário, por isso somámos os dois descontos sem os passar pelo quociente familiar. Assumimos as duas pessoas como trabalhadoras por conta de outrem (regime geral) — não cobre ainda o caso de uma delas ser trabalhadora independente. Tal como no Modo Rápido individual, assumimos 12 pagamentos mensais iguais e só aplicamos a dedução dos dependentes, mais nenhuma outra dedução à coleta.",
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
      "Decomposição aproximada: isola o IVA sobre o total pago. Sem os litros exatos, não é possível calcular o valor exato de ISP contido no total. O ISP é o parâmetro fiscal mais volátil deste simulador — muda por portaria do Governo com frequência semanal ou mensal, ao contrário dos restantes impostos.",
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
      "Tabela de taxas IABA por tipo de bebida/grau alcoólico ainda não disponível neste simulador.",
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
        "A tabela completa por concelho não está disponível neste simulador."
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

/**
 * ISV — Imposto sobre Veículos (pago uma única vez, na matrícula).
 * Status ESTIMATE — ver nota de fonte em data/tax-rules/2026/patrimoniais.js.
 * Só cobre veículos homologados em WLTP (a generalidade dos veículos
 * recentes); NEDC devolve UNKNOWN.
 *
 * @param {{
 *   cilindrada: number,
 *   co2: number,
 *   combustivel: "gasolina"|"gasoleo",
 *   protocolo?: "WLTP"|"NEDC",
 *   eletrico?: boolean,
 *   phevElegivel?: boolean,
 *   idadeAnos?: number,
 * }} opcoes
 */
export function calcularISV(opcoes) {
  const { cilindrada, co2, combustivel, protocolo = "WLTP", eletrico = false, phevElegivel = false, idadeAnos = 0 } =
    opcoes || {};

  if (eletrico) {
    return {
      status: "ESTIMATE",
      imposto: 0,
      notes: "Veículos 100% elétricos estão isentos de ISV.",
      fonte: PATRIMONIAIS_2026.isv.sourceUrl,
    };
  }

  if (protocolo !== "WLTP" && protocolo !== "NEDC") {
    return {
      status: "UNKNOWN",
      reason: 'protocolo deve ser "WLTP" ou "NEDC".',
    };
  }
  if (typeof cilindrada !== "number" || cilindrada <= 0) {
    throw new RangeError("cilindrada deve ser um número > 0.");
  }
  if (typeof co2 !== "number" || co2 < 0) {
    throw new RangeError("co2 deve ser um número >= 0.");
  }
  if (!["gasolina", "gasoleo"].includes(combustivel)) {
    throw new RangeError('combustivel deve ser "gasolina" ou "gasoleo".');
  }
  if (typeof idadeAnos !== "number" || idadeAnos < 0) {
    throw new RangeError("idadeAnos deve ser um número >= 0.");
  }

  const isvData = PATRIMONIAIS_2026.isv;
  const escalaoCilindrada = escolherEscalao(isvData.componenteCilindrada, cilindrada);
  const tabelaCO2Isv = protocolo === "NEDC" ? isvData.componenteCO2Nedc[combustivel] : isvData.componenteCO2Wltp[combustivel];
  const escalaoCO2 = escolherEscalao(tabelaCO2Isv, co2);

  const componenteCilindrada = round2(cilindrada * escalaoCilindrada.taxaPorCC - escalaoCilindrada.parcelaAAbater);
  const componenteCO2 = round2(co2 * escalaoCO2.taxaPorGrama - escalaoCO2.parcelaAAbater);
  const adicionalGasoleo = combustivel === "gasoleo" ? isvData.taxaAdicionalGasoleo.ligeiroPassageiros : 0;

  let isvNovo = round2(componenteCilindrada + componenteCO2 + adicionalGasoleo);
  if (phevElegivel) {
    isvNovo = round2(isvNovo * isvData.descontoPHEV.percentagemPago);
  }

  const escalaoIdade = escolherEscalao(isvData.descontoPorIdade, idadeAnos, { maxExclusivo: true });
  const fatorIdade = 1 - (escalaoIdade ? escalaoIdade.desconto : 0);
  const isvFinal = round2(isvNovo * fatorIdade);

  return {
    status: "ESTIMATE",
    componenteCilindrada,
    componenteCO2,
    adicionalGasoleo,
    phevAplicado: Boolean(phevElegivel),
    isvNovo,
    descontoIdade: escalaoIdade ? escalaoIdade.desconto : 0,
    isvFinal,
    imposto: isvFinal,
    fonte: isvData.sourceUrl,
    notes:
      "Estimativa a partir de fonte secundária especializada, verificada aritmeticamente mas não confirmada diretamente contra o Código do ISV.",
  };
}

/**
 * IUC — Imposto Único de Circulação (pago anualmente). Cobre a
 * categoria B (ligeiros de passageiros/mistos, 1.ª matrícula desde
 * 1/7/2007), a mais comum. Status ESTIMATE.
 *
 * @param {{
 *   cilindrada: number,
 *   co2: number,
 *   anoMatricula: number,
 *   combustivel: "gasolina"|"gasoleo"|"eletrico"|"gpl",
 *   protocolo?: "WLTP"|"NEDC",
 * }} opcoes
 */
export function calcularIUC(opcoes) {
  const { cilindrada, co2, anoMatricula, combustivel, protocolo = "WLTP" } = opcoes || {};

  if (combustivel === "eletrico") {
    return {
      status: "ESTIMATE",
      imposto: 0,
      notes: "Veículos 100% elétricos estão isentos de IUC.",
      fonte: PATRIMONIAIS_2026.iuc.sourceUrl,
    };
  }
  if (typeof anoMatricula !== "number" || anoMatricula < 2007) {
    return {
      status: "UNKNOWN",
      reason: "Só a categoria B (1.ª matrícula desde 1/7/2007) tem tabela completa nesta app.",
    };
  }
  if (typeof cilindrada !== "number" || cilindrada <= 0) {
    throw new RangeError("cilindrada deve ser um número > 0.");
  }
  if (typeof co2 !== "number" || co2 < 0) {
    throw new RangeError("co2 deve ser um número >= 0.");
  }
  if (!["gasolina", "gasoleo", "gpl"].includes(combustivel)) {
    throw new RangeError('combustivel deve ser "gasolina", "gasoleo", "gpl" ou "eletrico".');
  }

  const iucData = PATRIMONIAIS_2026.iuc.categoriaB;
  const escalaoCilindrada = escolherEscalao(iucData.componenteCilindrada, cilindrada);
  const tabelaCO2 = protocolo === "NEDC" ? iucData.componenteCO2.nedc : iucData.componenteCO2.wltp;
  const escalaoCO2 = escolherEscalao(tabelaCO2, co2);

  const coeficiente =
    iucData.coeficienteAnoMatricula.find((c) => c.ano === anoMatricula)?.coeficiente ??
    iucData.coeficienteAnoMatricula.find((c) => c.anoMin && anoMatricula >= c.anoMin)?.coeficiente;

  if (coeficiente === undefined) {
    return { status: "UNKNOWN", reason: `Coeficiente do ano de matrícula ${anoMatricula} não encontrado.` };
  }

  const somaBase = escalaoCilindrada.taxa + escalaoCO2.taxa;
  const adicionalGasoleo = combustivel === "gasoleo" ? escolherEscalao(iucData.adicionalGasoleo, cilindrada).valor : 0;

  // Acrescentado 19/08/2026 (Art. 10.º, n.º2 do CIUC): veículos com 1.ª
  // matrícula a partir de 2017 pagam um adicional consoante o CO2, por
  // cima da taxa base — antes desta correção o motor não aplicava nada
  // disto, subestimando o imposto destes veículos.
  const adicionalAltas = iucData.adicionalAltasEmissoes;
  let adicionalAltasEmissoes = 0;
  if (adicionalAltas && anoMatricula >= adicionalAltas.aplicavelDesdeAno) {
    // Tabela cobre só os escalões de CO2 mais altos (não existe "0 a
    // 180" nela) — não usar escolherEscalao() aqui, que rejeita valores
    // fora de todos os escalões com RangeError; a maioria dos veículos
    // (CO2 baixo) simplesmente não paga este adicional.
    const tabelaAltas = protocolo === "NEDC" ? adicionalAltas.nedc : adicionalAltas.wltp;
    const escalaoAltas = tabelaAltas.find((e) => co2 >= e.min && co2 <= e.max);
    adicionalAltasEmissoes = escalaoAltas ? escalaoAltas.valor : 0;
  }

  const imposto = round2(somaBase * coeficiente + adicionalGasoleo + adicionalAltasEmissoes);

  const limiar = PATRIMONIAIS_2026.iuc.limiarDispensaCobranca;
  const dispensado = imposto < limiar;

  return {
    status: "ESTIMATE",
    somaBase: round2(somaBase),
    coeficiente,
    adicionalGasoleo,
    imposto: dispensado ? 0 : imposto,
    dispensadoPorValorBaixo: dispensado,
    fonte: PATRIMONIAIS_2026.iuc.sourceUrl,
    notes: dispensado
      ? `Imposto calculado (${imposto}€) é inferior ao limiar de dispensa de cobrança (${limiar}€) — não é devido.`
      : "Estimativa a partir de fonte secundária (associação de defesa do consumidor), verificada aritmeticamente mas não confirmada diretamente contra o Código do IUC.",
  };
}

/**
 * Imposto de Selo — cobre só as verbas mais relevantes para um
 * utilizador particular (Tabela Geral tem 30 números; ver ficheiro de
 * dados para a lista completa transcrita). Status ✅ Verified — fonte
 * primária direta (Autoridade Tributária e Aduaneira).
 *
 * @param {"transmissaoOnerosaImoveis"|"transmissaoGratuita"|"arrendamento"|"creditoConsumo"|"garantia"|"seguro"} verba
 * @param {number} valor — valor base sobre o qual incide o imposto (ex.: valor do imóvel, renda mensal, montante do crédito, prémio de seguro)
 * @param {{ prazoMeses?: number, ramoSeguro?: string }} opcoes
 */
export function calcularImpostoSelo(verba, valor, opcoes = {}) {
  if (typeof valor !== "number" || valor < 0) {
    throw new RangeError("valor deve ser um número >= 0.");
  }
  const seloData = PATRIMONIAIS_2026.impostoSelo;
  const { prazoMeses, ramoSeguro } = opcoes;

  switch (verba) {
    case "transmissaoOnerosaImoveis":
      return montarResultadoSelo("1.1", valor, seloData.verba1_1_aquisicaoOnerosaImoveis.taxa, seloData);
    case "transmissaoGratuita": {
      // Art. 6.º, al. e) do Código do Imposto do Selo: cônjuge/unido de
      // facto, descendentes e ascendentes estão isentos da verba 1.2
      // (nunca da 1.1, que é outro imposto). Investigado e confirmado
      // em 15/08/2026 — ver TAX-METHODOLOGY.md.
      const { parentesco } = opcoes;
      const isentoPorParentesco =
        parentesco === "conjugeOuUniaoFacto" || parentesco === "descendente" || parentesco === "ascendente";
      if (isentoPorParentesco) {
        return {
          status: "verified",
          verba: "1.2",
          valorBase: round2(valor),
          taxa: 0,
          imposto: 0,
          isentoPorParentesco: true,
          fonte: "Código do Imposto do Selo, Art. 6.º, al. e) (isenções subjetivas)",
          notes:
            "Isento: transmissões gratuitas a favor de cônjuge/unido de facto, descendentes ou ascendentes estão isentas da verba 1.2 da Tabela Geral (Art. 6.º, al. e) do CIS).",
        };
      }
      const resultado = montarResultadoSelo("1.2", valor, seloData.verba1_2_transmissaoGratuita.taxa, seloData);
      if (!parentesco) {
        resultado.notes +=
          " Nota: se o beneficiário for cônjuge/unido de facto, descendente ou ascendente, esta transmissão está isenta (Art. 6.º, al. e) do CIS) — indica o parentesco para veres o valor correto.";
      }
      return resultado;
    }
    case "arrendamento":
      return montarResultadoSelo("2", valor, seloData.verba2_arrendamento.taxa, seloData);
    case "garantia": {
      if (typeof prazoMeses !== "number" || prazoMeses <= 0) {
        throw new RangeError("prazoMeses deve ser um número > 0 para a verba 'garantia'.");
      }
      const g = seloData.verba10_garantias;
      if (prazoMeses < 12) {
        return montarResultadoSelo("10.1", valor, g.prazoInferior1Ano.taxa * prazoMeses, seloData, true);
      }
      if (prazoMeses >= 60) {
        return montarResultadoSelo("10.3", valor, g.semPrazoOuIgualOuSuperior5Anos.taxa, seloData);
      }
      return montarResultadoSelo("10.2", valor, g.prazoIgualOuSuperior1Ano.taxa, seloData);
    }
    case "creditoConsumo": {
      if (typeof prazoMeses !== "number" || prazoMeses <= 0) {
        throw new RangeError("prazoMeses deve ser um número > 0 para a verba 'creditoConsumo'.");
      }
      const c = seloData.verba17_2_creditoConsumo;
      if (prazoMeses < 12) {
        return montarResultadoSelo("17.2.1", valor, c.prazoInferior1Ano.taxa * prazoMeses, seloData, true);
      }
      return montarResultadoSelo("17.2.2", valor, c.prazoIgualOuSuperior1Ano.taxa, seloData);
    }
    case "seguro": {
      const ramos = seloData.verba22_seguros;
      const mapa = {
        caucao: ramos.caucao,
        acidentesDoencasCreditoAgricola: ramos.acidentesDoencasCreditoAgricola,
        mercadoriasTransportadas: ramos.mercadoriasTransportadas,
        embarcacoesAeronaves: ramos.embarcacoesAeronaves,
        outros: ramos.outrosRamos,
      };
      const ramoInfo = mapa[ramoSeguro];
      if (!ramoInfo) {
        throw new RangeError(
          `ramoSeguro inválido: "${ramoSeguro}". Use um de: ${Object.keys(mapa).join(", ")}.`
        );
      }
      return montarResultadoSelo("22.1", valor, ramoInfo.taxa, seloData);
    }
    default:
      throw new RangeError(
        `verba de Imposto de Selo desconhecida ou não modelada nesta app: "${verba}". ` +
          "Ver data/tax-rules/2026/patrimoniais.js para a lista completa da Tabela Geral (só algumas verbas têm função de cálculo)."
      );
  }
}

function montarResultadoSelo(verbaCodigo, valorBase, taxa, seloData, jaAcumuladaPorMeses = false) {
  return {
    status: "verified",
    verba: verbaCodigo,
    valorBase: round2(valorBase),
    taxa: jaAcumuladaPorMeses ? undefined : round4(taxa),
    imposto: round2(valorBase * taxa),
    fonte: seloData.sourceUrl,
    notes: "Fonte primária direta: Tabela Geral do Imposto do Selo, Autoridade Tributária e Aduaneira.",
  };
}

/**
 * Escolhe o escalão aplicável numa tabela de brackets.
 *
 * @param {Array<{min?: number, max?: number}>} tabela
 * @param {number} valor
 * @param {{ maxExclusivo?: boolean }} opcoes — a maioria das tabelas
 *   deste ficheiro (cilindrada, CO2, adicional gasóleo) já vem com os
 *   limites ajustados pela fonte para não haver ambiguidade em
 *   inclusive-inclusive (ex.: "até 1000" / "mais de 1000 a 1300" fica
 *   {max:1000} / {min:1001,...}). A tabela de desconto por idade do
 *   ISV usa rótulos como "4 a 5 anos" / "5 a 6 anos" sem esse ajuste —
 *   confirmado com o exemplo oficial da fonte (BMW 520d, 5 anos → cai
 *   no bracket "5 a 6 anos", não em "4 a 5") que a convenção correta
 *   aí é limite mínimo inclusivo e máximo exclusivo.
 */
function escolherEscalao(tabela, valor, { maxExclusivo = false } = {}) {
  const escalao = tabela.find((e) => {
    const min = e.min ?? -Infinity;
    const max = e.max ?? Infinity;
    return maxExclusivo ? valor >= min && valor < max : valor >= min && valor <= max;
  });
  if (!escalao) {
    throw new RangeError(`Nenhum escalão encontrado para o valor ${valor}.`);
  }
  return escalao;
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
      "A percentagem que usamos é: (IRS anual + Segurança Social do trabalhador + IVA/impostos especiais registados em Gastos + impostos patrimoniais/anuais registados em Taxas) ÷ o teu rendimento bruto anual. " +
      "Não incluímos nesta proporção o custo total para o empregador (a TSU patronal) — mostramo-lo à parte, como cifra informativa, em Rendimentos. " +
      "O IVA e os impostos especiais que usamos aqui refletem só o que registaste em Gastos, não uma projeção do teu consumo anual total — por isso, quanto mais despesas nos deres, mais precisos ficamos. " +
      "Com as hipóteses que usámos nesta simulação, chegámos a esta data como a proporção anual do valor destinado a impostos e contribuições — o que não significa que deixes de pagar impostos a partir de hoje.",
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
