// Liberdade Fiscal — Testes de integridade dos dados e das funções de
// cálculo do "Dragão Fiscal" (22/08/2026)
// Executar: node --test tests/

import { test, describe } from "node:test";
import assert from "node:assert/strict";

import {
  DRAGAO_FISCAL_2021_2026,
  calcularInflacaoAcumulada,
  calcularCrescimentoNominalEscalao,
} from "../data/dragao-fiscal-2026.js";

describe("data/dragao-fiscal-2026.js — integridade dos dados", () => {
  test("escaloesIRS cobre 2021-2026 sem lacunas", () => {
    const anos = DRAGAO_FISCAL_2021_2026.escaloesIRS.map((e) => e.ano);
    assert.deepEqual(anos, [2021, 2022, 2023, 2024, 2025, 2026]);
  });

  test("inflacaoIPC cobre 2021-2026 sem lacunas", () => {
    const anos = DRAGAO_FISCAL_2021_2026.inflacaoIPC.map((i) => i.ano);
    assert.deepEqual(anos, [2021, 2022, 2023, 2024, 2025, 2026]);
  });

  test("todos os anos de escaloesIRS têm limite, taxa, lei e sourceUrl válidos", () => {
    for (const escalao of DRAGAO_FISCAL_2021_2026.escaloesIRS) {
      assert.ok(escalao.limite1Escalao > 0, `limite inválido em ${escalao.ano}`);
      assert.ok(escalao.taxaNormalPercent > 0, `taxa inválida em ${escalao.ano}`);
      assert.ok(typeof escalao.lei === "string" && escalao.lei.length > 0, `lei em falta em ${escalao.ano}`);
      assert.ok(escalao.sourceUrl.startsWith("https://"), `sourceUrl inválido em ${escalao.ano}`);
    }
  });

  test("o limite do 1.º escalão nunca desce de um ano para o outro (2021-2026)", () => {
    const escaloes = DRAGAO_FISCAL_2021_2026.escaloesIRS;
    for (let i = 1; i < escaloes.length; i++) {
      assert.ok(
        escaloes[i].limite1Escalao >= escaloes[i - 1].limite1Escalao,
        `o limite desceu entre ${escaloes[i - 1].ano} e ${escaloes[i].ano}`
      );
    }
  });

  test("2026 está marcado como ano não fechado na inflação (nunca inventar o valor)", () => {
    const entrada2026 = DRAGAO_FISCAL_2021_2026.inflacaoIPC.find((i) => i.ano === 2026);
    assert.equal(entrada2026.fechado, false);
    assert.equal(entrada2026.taxaVariacaoMediaAnualPercent, null);
  });

  test("todos os anos fechados (2021-2025) têm uma taxa de inflação numérica", () => {
    for (const entrada of DRAGAO_FISCAL_2021_2026.inflacaoIPC) {
      if (entrada.ano === 2026) continue;
      assert.equal(entrada.fechado, true);
      assert.equal(typeof entrada.taxaVariacaoMediaAnualPercent, "number");
    }
  });
});

describe("calcularInflacaoAcumulada", () => {
  test("acumula corretamente entre 2021 e 2025 (todos os anos fechados)", () => {
    const resultado = calcularInflacaoAcumulada(2021, 2026);
    // (1.013 * 1.078 * 1.043 * 1.024 * 1.023) - 1 ≈ 19.3%
    assert.equal(resultado.anoFimReal, 2025);
    assert.equal(resultado.incompleto, true);
    assert.ok(resultado.percent > 18 && resultado.percent < 21, `percent inesperado: ${resultado.percent}`);
  });

  test("para exatamente no último ano fechado quando o intervalo inclui 2026", () => {
    const resultado = calcularInflacaoAcumulada(2021, 2026);
    assert.equal(resultado.anoFimReal, 2025);
  });

  test("intervalo de um único ano de início (sem avançar) devolve só a taxa desse ano", () => {
    const resultado = calcularInflacaoAcumulada(2021, 2021);
    assert.equal(resultado.anoFimReal, 2021);
    assert.equal(resultado.incompleto, false);
    assert.equal(resultado.percent, 1.3);
  });

  test("acumula dois anos fechados (2021 e 2022)", () => {
    const resultado = calcularInflacaoAcumulada(2021, 2022);
    assert.equal(resultado.anoFimReal, 2022);
    assert.equal(resultado.incompleto, false);
    // (1.013 * 1.078) - 1 ≈ 9.2%
    assert.ok(resultado.percent > 9 && resultado.percent < 9.5, `percent inesperado: ${resultado.percent}`);
  });
});

describe("calcularCrescimentoNominalEscalao", () => {
  test("calcula o crescimento nominal entre 2021 e 2025", () => {
    const resultado = calcularCrescimentoNominalEscalao(2021, 2025);
    assert.equal(resultado.valorInicio, 7112);
    assert.equal(resultado.valorFim, 8059);
    // 8059 / 7112 - 1 ≈ 13.3%
    assert.ok(resultado.percent > 12 && resultado.percent < 14, `percent inesperado: ${resultado.percent}`);
  });

  test("devolve null para um ano fora dos dados", () => {
    assert.equal(calcularCrescimentoNominalEscalao(2019, 2025), null);
  });

  test("crescimento nominal ficou abaixo da inflação acumulada 2021-2025 (o próprio fenómeno do dragão fiscal)", () => {
    const nominal = calcularCrescimentoNominalEscalao(2021, 2025);
    const inflacao = calcularInflacaoAcumulada(2021, 2026);
    assert.ok(
      nominal.percent < inflacao.percent,
      `esperava-se que o crescimento nominal (${nominal.percent}%) ficasse abaixo da inflação acumulada (${inflacao.percent}%)`
    );
  });
});
