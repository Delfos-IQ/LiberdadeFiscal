// Liberdade Fiscal — Testes do IRS avançado (Fase 4)
// Cociente familiar, dedução por dependentes, diferencial regional.
// Executar: node --test tests/

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { calculateIRS, calcularDeducaoDependentes, calcularCadeiaSalarial } from "../data/tax-engine.js";

describe("calculateIRS — quociente familiar", () => {
  test("declaração conjunta (quociente 2) nunca produz mais imposto que a soma de duas declarações individuais iguais", () => {
    // Casal com rendimento assimétrico: um ganha tudo, outro nada.
    // Tributação conjunta deve ser vantajosa ou neutra face à soma de
    // duas declarações individuais separadas com o mesmo total.
    const rendimentoTotal = 60000;
    const conjunta = calculateIRS(rendimentoTotal, { quocienteFamiliar: 2 });
    const individualMetadeCadaUm = calculateIRS(rendimentoTotal / 2, { quocienteFamiliar: 1 });
    // Imposto da conjunta == 2x o imposto de metade do rendimento
    // individualmente (é exatamente o mecanismo do quociente familiar).
    assert.equal(conjunta.imposto, round2(individualMetadeCadaUm.imposto * 2));
  });

  test("quociente familiar 2 reduz a taxa efetiva face a quociente 1 sobre o mesmo rendimento total", () => {
    const semQuociente = calculateIRS(60000, { quocienteFamiliar: 1 });
    const comQuociente = calculateIRS(60000, { quocienteFamiliar: 2 });
    assert.ok(comQuociente.imposto < semQuociente.imposto);
  });

  test("rejeita quociente familiar inválido", () => {
    assert.throws(() => calculateIRS(30000, { quocienteFamiliar: 3 }), RangeError);
  });
});

describe("calculateIRS — diferencial regional (Açores/Madeira)", () => {
  test("Açores paga menos IRS que Continente sobre o mesmo rendimento coletável", () => {
    const continente = calculateIRS(30000, { regiao: "continente" });
    const acores = calculateIRS(30000, { regiao: "acores" });
    assert.ok(acores.imposto < continente.imposto);
    assert.equal(acores.diferencialRegionalAplicado, true);
    assert.equal(continente.diferencialRegionalAplicado, false);
  });

  test("Madeira paga menos IRS que Continente sobre o mesmo rendimento coletável", () => {
    const continente = calculateIRS(30000, { regiao: "continente" });
    const madeira = calculateIRS(30000, { regiao: "madeira" });
    assert.ok(madeira.imposto < continente.imposto);
  });

  test("redução regional é de 30% sobre cada taxa marginal (conforme ESTIMATE documentado)", () => {
    const r = calculateIRS(30000, { regiao: "acores" });
    const primeiroEscalao = r.decomposicaoPorEscalao[0];
    assert.equal(primeiroEscalao.taxa, round4(0.125 * 0.7));
  });

  test("rejeita região desconhecida", () => {
    assert.throws(() => calculateIRS(30000, { regiao: "espanha" }), RangeError);
  });
});

describe("calcularDeducaoDependentes", () => {
  test("sem dependentes, dedução é zero", () => {
    const r = calcularDeducaoDependentes([]);
    assert.equal(r.totalDeducao, 0);
  });

  test("um dependente com mais de 3 anos deduz 600€", () => {
    const r = calcularDeducaoDependentes([{ idade: 10 }]);
    assert.equal(r.totalDeducao, 600);
  });

  test("um único dependente com 2 anos deduz 726€ (não 900€ — a bonificação só é a partir do 2.º)", () => {
    const r = calcularDeducaoDependentes([{ idade: 2 }]);
    assert.equal(r.totalDeducao, 726);
  });

  test("dois dependentes com <= 3 anos: o 1.º deduz 726€, o 2.º deduz 900€", () => {
    const r = calcularDeducaoDependentes([{ idade: 1 }, { idade: 3 }]);
    assert.equal(r.totalDeducao, 726 + 900);
  });

  test("mistura de idades: um com 15 anos (600€) e um com 1 ano (726€, é o único <=3)", () => {
    const r = calcularDeducaoDependentes([{ idade: 15 }, { idade: 1 }]);
    assert.equal(r.totalDeducao, 600 + 726);
  });

  test("rejeita idade negativa", () => {
    assert.throws(() => calcularDeducaoDependentes([{ idade: -1 }]), RangeError);
  });

  test("rejeita input que não é array", () => {
    assert.throws(() => calcularDeducaoDependentes("nao-e-array"), TypeError);
  });
});

describe("calcularCadeiaSalarial — Modo Rápido/Avançado do Taxímetro", () => {
  test("trabalhador dependente vs independente produzem cadeias distintas para o mesmo bruto", () => {
    const dependente = calcularCadeiaSalarial(2000, { tipoTrabalhador: "dependente" });
    const independente = calcularCadeiaSalarial(2000, { tipoTrabalhador: "independente" });
    assert.notEqual(dependente.descontoSSMensal, independente.descontoSSMensal);
    // Independente não tem "entidade patronal" separada — custo total == bruto.
    assert.equal(independente.custoTotalEmpregadorMensal, 2000);
  });

  test("dependentes reduzem o IRS mensal e aumentam o líquido", () => {
    const semDependentes = calcularCadeiaSalarial(2500);
    const comDependentes = calcularCadeiaSalarial(2500, { dependentes: [{ idade: 8 }] });
    assert.ok(comDependentes.salarioLiquidoMensal > semDependentes.salarioLiquidoMensal);
    assert.equal(comDependentes.deducaoAnualPorDependentes, 600);
  });

  test("a dedução por dependentes nunca faz o IRS ficar negativo", () => {
    // Salário baixo com muitos dependentes — a dedução pode exceder o
    // imposto calculado; o resultado nunca deve ser negativo.
    const r = calcularCadeiaSalarial(950, {
      dependentes: [{ idade: 1 }, { idade: 2 }, { idade: 3 }, { idade: 4 }],
    });
    assert.ok(r.irsEstimadoMensal >= 0);
  });

  test("estado civil conjunta reduz o IRS mensal face a individual, para o mesmo bruto", () => {
    const individual = calcularCadeiaSalarial(4000, { estadoCivil: "individual" });
    const conjunta = calcularCadeiaSalarial(4000, { estadoCivil: "conjunta" });
    assert.ok(conjunta.irsEstimadoMensal < individual.irsEstimadoMensal);
  });

  test("rejeita tipoTrabalhador inválido", () => {
    assert.throws(() => calcularCadeiaSalarial(2000, { tipoTrabalhador: "estagiario" }), RangeError);
  });

  test("cada elo da cadeia continua consistente com as novas opções (spec §6.2)", () => {
    const c = calcularCadeiaSalarial(3000, {
      tipoTrabalhador: "dependente",
      estadoCivil: "conjunta",
      dependentes: [{ idade: 5 }],
      regiao: "acores",
    });
    assert.ok(c.custoTotalEmpregadorMensal > c.salarioBrutoMensal);
    assert.ok(c.salarioLiquidoMensal < c.salarioBrutoMensal);
    assert.ok(c.salarioLiquidoMensal > 0);
  });
});

function round2(value) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}
function round4(value) {
  return Math.round((value + Number.EPSILON) * 10000) / 10000;
}
