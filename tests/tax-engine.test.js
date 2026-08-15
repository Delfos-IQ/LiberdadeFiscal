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
});

describe("calcularRendimentoColetavelCategoriaA", () => {
  test("usa a dedução fixa quando as contribuições de SS são menores", () => {
    const r = calcularRendimentoColetavelCategoriaA(20000, 1000);
    assert.equal(r, 20000 - 4104);
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

  test("ISV, IUC e Imposto de Selo devolvem UNKNOWN — nunca um número inventado", () => {
    assert.equal(calcularISV().status, "UNKNOWN");
    assert.equal(calcularIUC().status, "UNKNOWN");
    assert.equal(calcularImpostoSelo().status, "UNKNOWN");
  });
});

function round2(value) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}
