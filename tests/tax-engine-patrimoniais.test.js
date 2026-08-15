// Liberdade Fiscal — Testes de calcularISV, calcularIUC e
// calcularImpostoSelo (ronda de verificação de dados fiscais, Fase 6+)
// Executar: node --test tests/
//
// Os casos de calcularISV/calcularIUC reproduzem os exemplos numéricos
// publicados pelas fontes (EcoImport para ISV, DECO PROteste para IUC)
// — ver data/tax-rules/2026/patrimoniais.js para as referências
// completas. Um dos exemplos de ISV (BMW 520d) tem uma inconsistência
// aritmética de 1€ na fonte original entre os componentes reportados
// e o total reportado; o teste usa o resultado correto recalculado a
// partir das tabelas (não o total com erro da fonte) — documentado no
// próprio teste.

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { calcularISV, calcularIUC, calcularImpostoSelo } from "../data/tax-engine.js";

describe("calcularISV", () => {
  test("veículo elétrico está isento", () => {
    const r = calcularISV({ eletrico: true });
    assert.equal(r.imposto, 0);
  });

  test("protocolo NEDC devolve UNKNOWN (só WLTP foi verificado)", () => {
    const r = calcularISV({ cilindrada: 1500, co2: 120, combustivel: "gasolina", protocolo: "NEDC" });
    assert.equal(r.status, "UNKNOWN");
  });

  test("VW Golf 1.5 TSI gasolina 2022, 1498cc, 128g/km WLTP, 4 anos — recalculado a partir das tabelas", () => {
    // A fonte (EcoImport) reporta 2.209,90€ para a componente cilindrada
    // e 1.291,22€ como final, mas 1498×5,61−6194,88 = 2.208,90€ (a fonte
    // tem um erro de 1€ na sua própria conta, que se propaga ao total).
    // Verificado de forma independente: 1498×5,61 = 8.403,78;
    // 8.403,78−6.194,88 = 2.208,90. Usamos o valor recalculado.
    const r = calcularISV({ cilindrada: 1498, co2: 128, combustivel: "gasolina", idadeAnos: 4 });
    assert.equal(r.componenteCilindrada, 2208.9);
    assert.equal(r.componenteCO2, 55.39);
    assert.equal(r.isvNovo, 2264.29);
    assert.equal(r.descontoIdade, 0.43);
    assert.equal(r.isvFinal, 1290.65);
  });

  test("BMW 520d gasóleo 2021, 1995cc, 132g/km WLTP, 5 anos — recalculado a partir das tabelas", () => {
    // Mesma inconsistência da fonte: reporta 4.996,07€ para a componente
    // cilindrada, mas 1995×5,61−6194,88 = 4.997,07€. Usamos o valor
    // recalculado. Confirma-se, no entanto, que aos 5 anos se aplica o
    // desconto de 52% (bracket "5 a 6 anos"), não o de 43% — testado em
    // separado no bracket de idade abaixo.
    const r = calcularISV({ cilindrada: 1995, co2: 132, combustivel: "gasoleo", idadeAnos: 5 });
    assert.equal(r.componenteCilindrada, 4997.07);
    assert.equal(r.componenteCO2, 1224.43);
    assert.equal(r.adicionalGasoleo, 500);
    assert.equal(r.isvNovo, 6721.5);
    assert.equal(r.descontoIdade, 0.52);
    assert.equal(r.isvFinal, 3226.32);
  });

  test("desconto PHEV aplica-se antes do desconto por idade", () => {
    const semPhev = calcularISV({ cilindrada: 1998, co2: 65, combustivel: "gasolina" });
    const comPhev = calcularISV({ cilindrada: 1998, co2: 65, combustivel: "gasolina", phevElegivel: true });
    assert.equal(comPhev.phevAplicado, true);
    assert.equal(comPhev.isvNovo, Math.round(semPhev.isvNovo * 0.25 * 100) / 100);
  });

  test("rejeita cilindrada inválida", () => {
    assert.throws(() => calcularISV({ cilindrada: 0, co2: 100, combustivel: "gasolina" }), RangeError);
  });

  test("rejeita combustível desconhecido", () => {
    assert.throws(() => calcularISV({ cilindrada: 1500, co2: 100, combustivel: "gpl" }), RangeError);
  });
});

describe("calcularIUC", () => {
  test("veículo elétrico está isento", () => {
    const r = calcularIUC({ combustivel: "eletrico" });
    assert.equal(r.imposto, 0);
  });

  test("categoria fora de 2007+ devolve UNKNOWN", () => {
    const r = calcularIUC({ cilindrada: 1500, co2: 150, anoMatricula: 2000, combustivel: "gasolina" });
    assert.equal(r.status, "UNKNOWN");
  });

  test("carro 2016 gasolina 898cc 86g/km NEDC — reproduz exemplo DECO PROteste (111,46€)", () => {
    const r = calcularIUC({ cilindrada: 898, co2: 86, anoMatricula: 2016, combustivel: "gasolina", protocolo: "NEDC" });
    assert.equal(r.coeficiente, 1.15);
    assert.equal(r.imposto, 111.46);
  });

  test("carro 2015 gasóleo 1461cc 119g/km WLTP — reproduz exemplo DECO PROteste (158,29€)", () => {
    const r = calcularIUC({ cilindrada: 1461, co2: 119, anoMatricula: 2015, combustivel: "gasoleo", protocolo: "WLTP" });
    assert.equal(r.adicionalGasoleo, 10.07);
    assert.equal(r.imposto, 158.29);
  });

  test("coeficiente de 2007 é exatamente 1 (sem agravamento)", () => {
    const r = calcularIUC({ cilindrada: 1000, co2: 100, anoMatricula: 2007, combustivel: "gasolina" });
    assert.equal(r.coeficiente, 1);
  });

  test("imposto abaixo do limiar de 10€ é dispensado", () => {
    // cilindrada muito baixa + CO2 muito baixo tende a dar um valor pequeno;
    // construímos um cenário sintético usando escalões mínimos.
    const r = calcularIUC({ cilindrada: 1, co2: 0, anoMatricula: 2007, combustivel: "gasolina" });
    if (r.imposto === 0) {
      assert.equal(r.dispensadoPorValorBaixo, true);
    } else {
      // Mesmo no escalão mínimo o IUC de categoria B pode não ser tão baixo
      // assim (as taxas de cilindrada/CO2 já são substanciais) — neste caso
      // o teste apenas confirma que a flag existe e é coerente com o valor.
      assert.equal(r.dispensadoPorValorBaixo, r.imposto < 10);
    }
  });

  test("rejeita cilindrada inválida", () => {
    assert.throws(() => calcularIUC({ cilindrada: -1, co2: 100, anoMatricula: 2015, combustivel: "gasolina" }), RangeError);
  });
});

describe("calcularImpostoSelo", () => {
  test("transmissão onerosa de imóveis (verba 1.1, 0,8%)", () => {
    const r = calcularImpostoSelo("transmissaoOnerosaImoveis", 200000);
    assert.equal(r.imposto, 1600);
    assert.equal(r.verba, "1.1");
  });

  test("transmissão gratuita / herança (verba 1.2, 10%)", () => {
    const r = calcularImpostoSelo("transmissaoGratuita", 50000);
    assert.equal(r.imposto, 5000);
  });

  test("arrendamento (verba 2, 10% sobre a renda de 1 mês)", () => {
    const r = calcularImpostoSelo("arrendamento", 800);
    assert.equal(r.imposto, 80);
  });

  test("garantia com prazo inferior a 1 ano acumula por mês (verba 10.1)", () => {
    const r = calcularImpostoSelo("garantia", 10000, { prazoMeses: 6 });
    // 0,04% × 6 meses = 0,24%
    assert.equal(r.imposto, round2(10000 * 0.0004 * 6));
    assert.equal(r.verba, "10.1");
  });

  test("garantia com prazo de 1 a 5 anos usa taxa fixa de 0,5% (verba 10.2)", () => {
    const r = calcularImpostoSelo("garantia", 10000, { prazoMeses: 24 });
    assert.equal(r.imposto, 50);
    assert.equal(r.verba, "10.2");
  });

  test("garantia com prazo >= 5 anos usa taxa de 0,6% (verba 10.3)", () => {
    const r = calcularImpostoSelo("garantia", 10000, { prazoMeses: 60 });
    assert.equal(r.imposto, 60);
    assert.equal(r.verba, "10.3");
  });

  test("crédito ao consumo < 1 ano acumula por mês (verba 17.2.1)", () => {
    const r = calcularImpostoSelo("creditoConsumo", 5000, { prazoMeses: 12 - 1 });
    assert.equal(r.imposto, round2(5000 * 0.00141 * 11));
  });

  test("crédito ao consumo >= 1 ano usa taxa fixa de 1,76% (verba 17.2.2)", () => {
    const r = calcularImpostoSelo("creditoConsumo", 5000, { prazoMeses: 36 });
    assert.equal(r.imposto, round2(5000 * 0.0176));
  });

  test("seguro do ramo 'outros' usa taxa de 9% (verba 22.1.5)", () => {
    const r = calcularImpostoSelo("seguro", 300, { ramoSeguro: "outros" });
    assert.equal(r.imposto, 27);
  });

  test("seguro de acidentes/doenças usa taxa de 5%", () => {
    const r = calcularImpostoSelo("seguro", 300, { ramoSeguro: "acidentesDoencasCreditoAgricola" });
    assert.equal(r.imposto, 15);
  });

  test("rejeita verba desconhecida", () => {
    assert.throws(() => calcularImpostoSelo("verbaInexistente", 100), RangeError);
  });

  test("rejeita garantia sem prazoMeses", () => {
    assert.throws(() => calcularImpostoSelo("garantia", 100), RangeError);
  });

  test("rejeita seguro sem ramoSeguro válido", () => {
    assert.throws(() => calcularImpostoSelo("seguro", 100, { ramoSeguro: "inexistente" }), RangeError);
  });

  test("rejeita valor negativo", () => {
    assert.throws(() => calcularImpostoSelo("arrendamento", -1), RangeError);
  });
});

function round2(value) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}
