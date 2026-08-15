// Liberdade Fiscal — Testes de calculateFiscalFreedomDay (Fase 7)
// Executar: node --test tests/

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { calculateFiscalFreedomDay } from "../data/tax-engine.js";

function inputBase(overrides = {}) {
  return {
    ano: 2026,
    rendimentoBrutoAnual: 24000,
    irsAnual: 2500,
    ssTrabalhadorAnual: 2640,
    ivaEEspeciaisRegistado: 800,
    patrimoniaisRegistado: 400,
    ...overrides,
  };
}

describe("calculateFiscalFreedomDay", () => {
  test("calcula a percentagem correta a partir dos totais fornecidos", () => {
    const r = calculateFiscalFreedomDay(inputBase());
    // (2500+2640+800+400)/24000 = 6340/24000 = 0.264166...
    assert.equal(r.totalImpostos, 6340);
    assert.equal(r.percentage, 0.2642);
  });

  test("dayOfYear e date são coerentes com a percentagem (ano não bissexto)", () => {
    const r = calculateFiscalFreedomDay(inputBase());
    // 0.264166... * 365 ≈ 96.4 -> arredonda para 96
    assert.equal(r.dayOfYear, 96);
    assert.equal(r.date, "2026-04-06");
  });

  test("ano bissexto usa 366 dias", () => {
    const r = calculateFiscalFreedomDay(inputBase({ ano: 2028, rendimentoBrutoAnual: 24000, irsAnual: 6000, ssTrabalhadorAnual: 0, ivaEEspeciaisRegistado: 0, patrimoniaisRegistado: 0 }));
    // 6000/24000 = 0.25 * 366 = 91.5 -> 92
    assert.equal(r.dayOfYear, 92);
  });

  test("percentagem satura em 100% quando impostos excedem o rendimento", () => {
    const r = calculateFiscalFreedomDay(
      inputBase({ irsAnual: 30000, ssTrabalhadorAnual: 0, ivaEEspeciaisRegistado: 0, patrimoniaisRegistado: 0 })
    );
    assert.equal(r.percentage, 1);
    assert.equal(r.dayOfYear, 365);
    assert.equal(r.date, "2026-12-31");
  });

  test("com zero impostos, cai no dia 1 do ano (mínimo, nunca dia 0)", () => {
    const r = calculateFiscalFreedomDay(
      inputBase({ irsAnual: 0, ssTrabalhadorAnual: 0, ivaEEspeciaisRegistado: 0, patrimoniaisRegistado: 0 })
    );
    assert.equal(r.dayOfYear, 1);
    assert.equal(r.date, "2026-01-01");
  });

  test("breakdown reflete cada figura tributária separadamente", () => {
    const r = calculateFiscalFreedomDay(inputBase());
    assert.deepEqual(r.breakdown, { irs: 2500, segurancaSocial: 2640, ivaEEspeciais: 800, patrimoniais: 400 });
  });

  test("methodology nunca afirma 'deixas de pagar impostos' e menciona as hipóteses", () => {
    const r = calculateFiscalFreedomDay(inputBase());
    assert.doesNotMatch(r.methodology.toLowerCase(), /deixas de pagar impostos a partir/);
    assert.match(r.methodology, /TSU patronal/);
    assert.match(r.methodology, /registado/);
  });

  test("rejeita rendimentoBrutoAnual igual a zero", () => {
    assert.throws(() => calculateFiscalFreedomDay(inputBase({ rendimentoBrutoAnual: 0 })), /rendimentoBrutoAnual/);
  });

  test("rejeita valores negativos em qualquer campo", () => {
    assert.throws(() => calculateFiscalFreedomDay(inputBase({ irsAnual: -1 })), RangeError);
    assert.throws(() => calculateFiscalFreedomDay(inputBase({ patrimoniaisRegistado: -1 })), RangeError);
  });

  test("rejeita ano inválido", () => {
    assert.throws(() => calculateFiscalFreedomDay(inputBase({ ano: 1.5 })), RangeError);
  });

  test("rejeita input não-numérico", () => {
    assert.throws(() => calculateFiscalFreedomDay(inputBase({ irsAnual: "muito" })), RangeError);
  });
});
