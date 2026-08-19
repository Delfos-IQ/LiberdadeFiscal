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

  test("Madeira: redução uniforme de 30% sobre cada taxa marginal, em todos os escalões (✅ verificado)", () => {
    const r = calculateIRS(60000, { regiao: "madeira" });
    r.decomposicaoPorEscalao.forEach((escalao, index) => {
      const taxaNacional = [0.125, 0.157, 0.212, 0.241, 0.311, 0.349, 0.431, 0.446, 0.48][index];
      assert.equal(escalao.taxa, round4(taxaNacional * 0.7));
    });
  });

  test("Açores: redução uniforme de 30% sobre cada taxa marginal, em todos os escalões (✅ verificado 18/08/2026)", () => {
    // Correção (18/08/2026, ronda "vamos a por los estimates"): uma
    // ronda anterior (16/08/2026) tinha codificado um mecanismo
    // diferenciado por escalão (30% no 1.º, 20% nos restantes) baseado
    // em fontes secundárias nunca confirmadas numericamente. Esta ronda
    // encontrou a tabela numérica oficial da PwC Guia Fiscal 2026 (que
    // bate exatamente com taxa nacional × 0,7 em todos os 9 escalões)
    // e o texto do Art. 4.º do DLR 2/99/A ("redução de 30%", sem
    // qualificação por escalão) — o mecanismo real é uniforme, igual
    // ao da Madeira. Ver notas em irs.js#diferencialRegional.
    const r = calculateIRS(60000, { regiao: "acores" });
    r.decomposicaoPorEscalao.forEach((escalao, index) => {
      const taxaNacional = [0.125, 0.157, 0.212, 0.241, 0.311, 0.349, 0.431, 0.446, 0.48][index];
      assert.equal(escalao.taxa, round4(taxaNacional * 0.7));
    });

    // Consequência direta: com o mesmo mecanismo (30% uniforme), Açores
    // e Madeira produzem exatamente o mesmo imposto sobre o mesmo
    // rendimento coletável.
    const madeira = calculateIRS(60000, { regiao: "madeira" });
    assert.equal(r.imposto, madeira.imposto);
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

  test("2.º dependente com idade entre 4 e 6 anos deduz 900€, não 600€ (corrigido 19/08/2026, fonte: PwC Guia Fiscal 2026)", () => {
    // Antes da correção, um dependente com 5 anos que não fosse o mais
    // novo do agregado recebia 600€ (regra "> 3 anos"). A tabela oficial
    // aplica os 900€ a qualquer 2.º dependente (ou seguinte) com <= 6
    // anos, independentemente da idade do primeiro.
    const r = calcularDeducaoDependentes([{ idade: 2 }, { idade: 5 }]);
    assert.equal(r.totalDeducao, 726 + 900);
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

  test("independente: SS incide sobre 70% do bruto (rendimento relevante), não sobre o bruto inteiro (bug corrigido 18/08/2026)", () => {
    // Regressão: uma versão anterior aplicava 21,4% diretamente sobre a
    // faturação bruta (350€ neste exemplo), sobrestimando a
    // contribuição em ~43%. Fórmula correta (Art. 168.º CRCSPSS):
    // SS = bruto × 0,7 (rendimento relevante) × 0,214 (taxa).
    const r = calcularCadeiaSalarial(1000, { tipoTrabalhador: "independente" });
    assert.equal(r.descontoSSMensal, round2(1000 * 0.7 * 0.214));
    assert.notEqual(r.descontoSSMensal, round2(1000 * 0.214), "não deve aplicar a taxa sobre o bruto inteiro");
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
