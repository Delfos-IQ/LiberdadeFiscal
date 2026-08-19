// Liberdade Fiscal — Testes do motor fiscal (Fase 2)
// Executar: node --test tests/
//
// Cobre: isenção por mínimo de existência, cálculo por escalões em
// salários baixo/médio/alto, taxa de solidariedade, cadeia salarial
// completa (empregador → líquido), IVA nas três regiões (ida e volta),
// impostos especiais com dados verificados, validação de erros, e que
// as figuras UNKNOWN devolvem UNKNOWN em vez de inventar números.

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  calculateIRS,
  calculateTaxaSolidariedade,
  calcularRendimentoColetavelCategoriaA,
  calculateTSU,
  calcularCadeiaSalarial,
  calcularCadeiaSalarialConjunta,
  calculateIVA,
  decomporIVADeTotal,
  decomporCombustivel,
  decomporIABA,
  calcularITCigarros,
  calcularIMI,
  calcularISV,
  calcularIUC,
  calcularImpostoSelo,
} from "../data/tax-engine.js";

describe("calculateIRS", () => {
  test("rendimento abaixo do mínimo de existência fica isento", () => {
    const r = calculateIRS(10000);
    assert.equal(r.isentoPorMinimoExistencia, true);
    assert.equal(r.imposto, 0);
  });

  test("rendimento exatamente no mínimo de existência fica isento", () => {
    const r = calculateIRS(12880);
    assert.equal(r.isentoPorMinimoExistencia, true);
  });

  test("rendimento de 1 cêntimo acima do mínimo já não está isento", () => {
    const r = calculateIRS(12880.01);
    assert.equal(r.isentoPorMinimoExistencia, false);
  });

  test("salário baixo (15.000€) soma exatamente a decomposição por escalão (verificado com cálculo independente em Python)", () => {
    const r = calculateIRS(15000);
    const somaDecomposicao = r.decomposicaoPorEscalao.reduce((s, e) => s + e.imposto, 0);
    assert.equal(round2(somaDecomposicao), r.imposto);
    assert.equal(r.imposto, 2220.78);
  });

  test("rendimento médio (30.000€) coincide com o exemplo oficial documentado (~6.260,16€)", () => {
    // Exemplo verificado na pesquisa: rendimento coletável de 30.000€
    // produz imposto de 6.260,16€ segundo a fonte consultada.
    const r = calculateIRS(30000);
    assert.equal(r.imposto, 6260.16);
  });

  test("cálculo por fatias nunca aplica a taxa mais alta a todo o rendimento", () => {
    const r = calculateIRS(30000);
    const taxaMarginalMaxima = 0.349; // 6º escalão, onde 30000 cai
    const impostoSeFosseTudoTaxaMaxima = 30000 * taxaMarginalMaxima;
    assert.ok(r.imposto < impostoSeFosseTudoTaxaMaxima);
  });

  test("taxa efetiva é sempre inferior à taxa marginal do último escalão atingido", () => {
    const r = calculateIRS(50000);
    const ultimoEscalao = r.decomposicaoPorEscalao.at(-1);
    assert.ok(r.taxaEfetiva < ultimoEscalao.taxa);
  });

  test("rendimento muito alto (300.000€) atravessa todos os 9 escalões", () => {
    const r = calculateIRS(300000);
    assert.equal(r.decomposicaoPorEscalao.length, 9);
    assert.equal(r.decomposicaoPorEscalao.at(-1).taxa, 0.48);
  });

  test("rendimento zero não produz imposto nem erro", () => {
    const r = calculateIRS(0);
    assert.equal(r.imposto, 0);
  });

  test("rejeita rendimento negativo", () => {
    assert.throws(() => calculateIRS(-100), RangeError);
  });

  test("rejeita valores não numéricos", () => {
    assert.throws(() => calculateIRS("30000"), TypeError);
    assert.throws(() => calculateIRS(NaN), TypeError);
    assert.throws(() => calculateIRS(undefined), TypeError);
  });
});

describe("calculateTaxaSolidariedade", () => {
  test("rendimento abaixo de 80.000€ não paga solidariedade", () => {
    const r = calculateTaxaSolidariedade(79999);
    assert.equal(r.imposto, 0);
  });

  test("100.000€ paga exatamente 500€ (exemplo oficial documentado)", () => {
    const r = calculateTaxaSolidariedade(100000);
    assert.equal(r.imposto, 500);
  });

  test("300.000€ paga exatamente 6.750€ (exemplo oficial documentado)", () => {
    const r = calculateTaxaSolidariedade(300000);
    assert.equal(r.imposto, 6750);
  });

  test("Açores: redução de 30% sobre a taxa (🟡 ESTIMATE, confirmada apenas para a tabela de solidariedade)", () => {
    const continente = calculateTaxaSolidariedade(100000, { regiao: "continente" });
    const acores = calculateTaxaSolidariedade(100000, { regiao: "acores" });
    assert.equal(continente.imposto, 500);
    assert.equal(acores.imposto, Math.round(500 * 0.7 * 100) / 100);
  });

  test("Madeira: sem redução (diferente do mecanismo principal do IRS, que reduz nas duas regiões)", () => {
    const continente = calculateTaxaSolidariedade(100000, { regiao: "madeira" });
    assert.equal(continente.imposto, 500);
  });

  test("quociente familiar: tributação conjunta divide por 2 antes de aplicar os tramos", () => {
    // 160.000€ ÷ 2 = 80.000€ por sujeito — abaixo do primeiro tramo, logo 0€.
    const conjunta = calculateTaxaSolidariedade(160000, { quocienteFamiliar: 2 });
    assert.equal(conjunta.imposto, 0);

    // 200.000€ ÷ 2 = 100.000€ por sujeito → 500€ cada, × 2 = 1.000€.
    const conjunta2 = calculateTaxaSolidariedade(200000, { quocienteFamiliar: 2 });
    assert.equal(conjunta2.imposto, 1000);
  });

  test("rejeita região desconhecida", () => {
    assert.throws(() => calculateTaxaSolidariedade(100000, { regiao: "espanha" }), RangeError);
  });

  test("rejeita quociente familiar inválido", () => {
    assert.throws(() => calculateTaxaSolidariedade(100000, { quocienteFamiliar: 3 }), RangeError);
  });

  test("rejeita rendimento coletável negativo ou não numérico", () => {
    assert.throws(() => calculateTaxaSolidariedade(-1), RangeError);
    assert.throws(() => calculateTaxaSolidariedade("100000"), RangeError);
  });
});

describe("calcularRendimentoColetavelCategoriaA", () => {
  test("usa a dedução fixa quando as contribuições de SS são menores", () => {
    const r = calcularRendimentoColetavelCategoriaA(20000, 1000);
    // 4.587,09€ (corrigido 19/08/2026 de 4.104€, fonte: PwC Guia Fiscal 2026).
    assert.equal(r, 20000 - 4587.09);
  });

  test("usa as contribuições de SS quando são maiores que a dedução fixa", () => {
    const r = calcularRendimentoColetavelCategoriaA(20000, 5000);
    assert.equal(r, 20000 - 5000);
  });

  test("nunca produz rendimento coletável negativo", () => {
    const r = calcularRendimentoColetavelCategoriaA(1000, 5000);
    assert.equal(r, 0);
  });
});

describe("calculateTSU", () => {
  test("reparte corretamente 11% trabalhador / 23,75% entidade patronal", () => {
    const r = calculateTSU(1000);
    assert.equal(r.descontoTrabalhador, 110);
    assert.equal(r.custoEntidadePatronal, 237.5);
    assert.equal(r.custoTotalEmpregador, 1237.5);
  });

  test("o líquido após SS nunca inclui a parte da entidade patronal", () => {
    const r = calculateTSU(1000);
    assert.equal(r.salarioLiquidoAposSS, 890);
    assert.notEqual(r.salarioLiquidoAposSS, r.custoTotalEmpregador - r.descontoTrabalhador);
  });

  test("rejeita salário negativo", () => {
    assert.throws(() => calculateTSU(-500), RangeError);
  });
});

describe("calcularCadeiaSalarial", () => {
  test("cada elo da cadeia é consistente com os outros (spec §6.2)", () => {
    const c = calcularCadeiaSalarial(2000);
    assert.ok(c.custoTotalEmpregadorMensal > c.salarioBrutoMensal);
    assert.ok(c.salarioBrutoMensal > c.salarioBrutoMensal - c.descontoSSMensal);
    assert.ok(c.salarioLiquidoMensal < c.salarioBrutoMensal);
    assert.ok(c.salarioLiquidoMensal > 0);
  });

  test("salário líquido = bruto - SS - IRS mensal (sem misturar custo empregador)", () => {
    const c = calcularCadeiaSalarial(2500);
    const esperado = round2(c.salarioBrutoMensal - c.descontoSSMensal - c.irsEstimadoMensal);
    assert.equal(c.salarioLiquidoMensal, esperado);
  });

  test("rendimentos baixos/médios não pagam taxa adicional de solidariedade", () => {
    const c = calcularCadeiaSalarial(2500);
    assert.equal(c.taxaSolidariedadeAnual, 0);
  });

  test("rendimento muito elevado (🟡 ESTIMATE: cablado 18/08/2026) paga taxa adicional de solidariedade, incluída no IRS mensal", () => {
    // Salário bruto mensual suficientemente alto para gerar rendimento
    // coletável anual > 80.000€ mesmo após a dedução específica.
    const c = calcularCadeiaSalarial(15000);
    assert.ok(c.taxaSolidariedadeAnual > 0);
    assert.equal(c.detalheAnual.solidariedade.imposto, c.taxaSolidariedadeAnual);

    const irsAnualEsperado = round2(
      Math.max(0, c.irsAnualAntesDeDeducoes - c.deducaoAnualPorDependentes) + c.taxaSolidariedadeAnual
    );
    // Tolerância de poucos cêntimos: irsEstimadoMensal já vem arredondado
    // a 2 casas antes de multiplicar por 12, o que acumula um desvio
    // residual face ao valor anual "puro".
    assert.ok(
      Math.abs(round2(c.irsEstimadoMensal * 12) - irsAnualEsperado) < 0.1,
      `esperado ~${irsAnualEsperado}, obtido ${round2(c.irsEstimadoMensal * 12)}`
    );
  });
});

describe("calcularCadeiaSalarialConjunta (roadmap P3-15 — agregado familiar)", () => {
  test("rejeita salários negativos", () => {
    assert.throws(() => calcularCadeiaSalarialConjunta(-1, 2000), RangeError);
    assert.throws(() => calcularCadeiaSalarialConjunta(2000, -1), RangeError);
  });

  test("soma os rendimentos brutos e os custos de ambas as pessoas", () => {
    const c = calcularCadeiaSalarialConjunta(2000, 1500);
    assert.equal(c.salarioBrutoMensal, 3500);
    assert.equal(c.pessoaA.salarioBrutoMensal, 2000);
    assert.equal(c.pessoaB.salarioBrutoMensal, 1500);
    assert.equal(
      round2(c.custoTotalEmpregadorMensal),
      round2(c.pessoaA.custoTotalEmpregadorMensal + c.pessoaB.custoTotalEmpregadorMensal)
    );
  });

  test("a Segurança Social é a soma simples dos dois descontos individuais (não passa pelo quociente familiar)", () => {
    const c = calcularCadeiaSalarialConjunta(2000, 1500);
    const individualA = calcularCadeiaSalarial(2000);
    const individualB = calcularCadeiaSalarial(1500);
    assert.equal(c.descontoSSMensal, round2(individualA.descontoSSMensal + individualB.descontoSSMensal));
  });

  test("um casal com rendimentos muito assimétricos paga MENOS IRS conjunto do que a soma dos IRS individuais (efeito do quociente familiar)", () => {
    // Este é precisamente o cenário que calcularCadeiaSalarial(x, {estadoCivil: "conjunta"})
    // não conseguia capturar bem: com um só rendimento alto e outro
    // baixo/zero, dividir a SOMA por 2 (quociente familiar real) dá
    // uma taxa marginal mais baixa do que somar dois cálculos
    // individuais separados.
    const salarioAltoA = 4000;
    const salarioBaixoB = 900;

    const conjunto = calcularCadeiaSalarialConjunta(salarioAltoA, salarioBaixoB);
    const individualA = calcularCadeiaSalarial(salarioAltoA);
    const individualB = calcularCadeiaSalarial(salarioBaixoB);
    const somaIndividuais = round2(individualA.irsAnualAntesDeDeducoes + individualB.irsAnualAntesDeDeducoes);

    assert.ok(
      conjunto.irsAnualAntesDeDeducoes < somaIndividuais,
      "o IRS conjunto (quociente sobre a soma) devia ser menor que a soma dos IRS individuais quando os rendimentos são assimétricos"
    );
  });

  test("com dois rendimentos iguais, o IRS conjunto é igual ao dobro do IRS de cada um individualmente (quociente neutro)", () => {
    const conjunto = calcularCadeiaSalarialConjunta(2000, 2000);
    const individual = calcularCadeiaSalarial(2000);
    assert.equal(conjunto.irsAnualAntesDeDeducoes, round2(individual.irsAnualAntesDeDeducoes * 2));
  });

  test("líquido mensal = bruto combinado - SS combinado - IRS mensal conjunto", () => {
    const c = calcularCadeiaSalarialConjunta(2200, 1700);
    const esperado = round2(c.salarioBrutoMensal - c.descontoSSMensal - c.irsEstimadoMensal);
    assert.equal(c.salarioLiquidoMensal, esperado);
  });

  test("agregado com rendimento coletável combinado muito elevado paga taxa adicional de solidariedade (🟡 ESTIMATE)", () => {
    const c = calcularCadeiaSalarialConjunta(15000, 15000);
    assert.ok(c.taxaSolidariedadeAnual > 0);
    assert.equal(c.detalheAnual.solidariedade.imposto, c.taxaSolidariedadeAnual);
  });

  test("aplica a dedução por dependentes ao IRS conjunto", () => {
    const semDependentes = calcularCadeiaSalarialConjunta(2200, 1700);
    const comDependentes = calcularCadeiaSalarialConjunta(2200, 1700, { dependentes: [{ idade: 8 }] });
    assert.ok(comDependentes.deducaoAnualPorDependentes > 0);
    assert.ok(comDependentes.irsEstimadoMensal < semDependentes.irsEstimadoMensal);
  });
});

describe("calculateIVA", () => {
  test("Continente normal (23%) sobre 100€ dá 23€ de imposto", () => {
    const r = calculateIVA(100, "continente", "normal");
    assert.equal(r.imposto, 23);
    assert.equal(r.total, 123);
  });

  test("Açores e Madeira reduzida (4%) empatam como as mais baixas; Continente (6%) é mais alta", () => {
    // Dado verificado: Açores 4/9/16%, Madeira 4/12/22% — a taxa
    // reduzida é igual nas duas regiões insulares, ambas abaixo do
    // Continente (6%). Não assumir que Açores é sempre estritamente a
    // mais baixa em todos os níveis.
    const acores = calculateIVA(100, "acores", "reduzida").imposto;
    const continente = calculateIVA(100, "continente", "reduzida").imposto;
    const madeira = calculateIVA(100, "madeira", "reduzida").imposto;
    assert.equal(acores, madeira);
    assert.ok(acores < continente);
  });

  test("Madeira normal é 22%, distinto de Continente (23%) e Açores (16%)", () => {
    assert.equal(calculateIVA(100, "madeira", "normal").taxa, 0.22);
  });

  test("rejeita região desconhecida", () => {
    assert.throws(() => calculateIVA(100, "espanha", "normal"), RangeError);
  });

  test("rejeita nível de taxa desconhecido", () => {
    assert.throws(() => calculateIVA(100, "continente", "super-reduzida"), RangeError);
  });
});

describe("decomporIVADeTotal — round-trip com calculateIVA", () => {
  test("decompor um total e recalcular o IVA a partir da base dá o mesmo total (ida e volta)", () => {
    const original = calculateIVA(200, "continente", "normal");
    const decomposto = decomporIVADeTotal(original.total, "continente", "normal");
    assert.equal(decomposto.baseTributavel, 200);
    assert.equal(round2(decomposto.baseTributavel + decomposto.imposto), original.total);
  });

  test("funciona nas três regiões e três níveis sem perder precisão relevante (< 1 cêntimo)", () => {
    const regioes = ["continente", "acores", "madeira"];
    const niveis = ["reduzida", "intermedia", "normal"];
    for (const regiao of regioes) {
      for (const nivel of niveis) {
        const original = calculateIVA(153.47, regiao, nivel);
        const decomposto = decomporIVADeTotal(original.total, regiao, nivel);
        const diff = Math.abs(decomposto.baseTributavel - 153.47);
        assert.ok(diff < 0.01, `diferença de ${diff} em ${regiao}/${nivel}`);
      }
    }
  });
});

describe("Impostos especiais — apenas dados verificados", () => {
  test("decomporCombustivel devolve ESTIMATE com aviso explícito, não um número apresentado como certo", () => {
    const r = decomporCombustivel(50, "gasolina", "continente");
    assert.equal(r.status, "ESTIMATE");
    assert.ok(r.notes.length > 0);
  });

  test("calcularITCigarros combina elemento específico e ad valorem", () => {
    const r = calcularITCigarros(1000, 6);
    assert.equal(r.elementoEspecifico, 151.88);
    assert.equal(r.elementoAdValorem, 0.06);
    assert.equal(r.itTotal, 151.94);
  });

  test("decomporIABA devolve UNKNOWN em vez de inventar uma taxa", () => {
    const r = decomporIABA();
    assert.equal(r.status, "UNKNOWN");
  });
});

describe("Impostos patrimoniais e de veículo", () => {
  test("calcularIMI urbano dentro do intervalo legal funciona", () => {
    const r = calcularIMI(150000, 0.003, "urbano");
    assert.equal(r.imposto, 450);
  });

  test("calcularIMI rejeita taxa fora do intervalo legal (protege contra erro de input)", () => {
    assert.throws(() => calcularIMI(150000, 0.9, "urbano"), RangeError);
  });

  test("calcularIMI rústico usa a taxa fixa de 0,8% sem pedir taxa ao utilizador", () => {
    const r = calcularIMI(100000, undefined, "rustico");
    assert.equal(r.imposto, 800);
  });

  // ISV, IUC e Imposto de Selo ganharam tabelas numéricas verificadas
  // numa ronda de investigação posterior (ver tests/tax-engine-
  // patrimoniais.test.js para a cobertura completa e as fontes). O
  // protocolo NEDC do ISV passou de UNKNOWN a calculado em 19/08/2026
  // (tabela encontrada na mesma fonte oficial da AT já usada para
  // WLTP) — ver tests/tax-engine-patrimoniais.test.js para a cobertura
  // desse caso. Este teste confirma que, para o que continua fora do
  // âmbito modelado (categoria pré-2007 no IUC; protocolo desconhecido
  // no ISV), a app continua a devolver UNKNOWN em vez de inventar um
  // número — o princípio central do spec (secção 8) mantém-se válido
  // mesmo com mais dados verificados.
  test("ISV e IUC continuam a devolver UNKNOWN fora do âmbito verificado — nunca um número inventado", () => {
    assert.equal(
      calcularISV({ cilindrada: 1500, co2: 120, combustivel: "gasolina", protocolo: "outro" }).status,
      "UNKNOWN"
    );
    assert.equal(
      calcularIUC({ cilindrada: 1500, co2: 120, anoMatricula: 2000, combustivel: "gasolina" }).status,
      "UNKNOWN"
    );
  });

  test("Imposto de Selo rejeita uma verba não modelada em vez de inventar uma taxa", () => {
    assert.throws(() => calcularImpostoSelo("verbaNaoModelada", 100), RangeError);
  });
});

function round2(value) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}
