// Liberdade Fiscal — Testes de integridade dos dados de "Para onde vão
// os impostos" (Gasto Público, 22/08/2026)
// Executar: node --test tests/

import { test, describe } from "node:test";
import assert from "node:assert/strict";

import { GASTO_PUBLICO_2025 } from "../data/gasto-publico-2025.js";

describe("data/gasto-publico-2025.js — integridade dos dados", () => {
  test("tem ano e pelo menos 4 rúbricas", () => {
    assert.equal(GASTO_PUBLICO_2025.ano, 2025);
    assert.ok(Array.isArray(GASTO_PUBLICO_2025.rubricas));
    assert.ok(GASTO_PUBLICO_2025.rubricas.length >= 4);
  });

  test("todas as rúbricas têm id, label, valor positivo, status válido, source e sourceUrl", () => {
    for (const r of GASTO_PUBLICO_2025.rubricas) {
      assert.ok(typeof r.id === "string" && r.id.length > 0, "id em falta");
      assert.ok(typeof r.label === "string" && r.label.length > 0, `label em falta em ${r.id}`);
      assert.ok(
        typeof r.valorMilhoesEuros === "number" && r.valorMilhoesEuros > 0,
        `valorMilhoesEuros inválido em ${r.id}`
      );
      assert.ok(
        r.status === "verified" || r.status === "estimate",
        `status inválido em ${r.id}: ${r.status}`
      );
      assert.ok(typeof r.source === "string" && r.source.length > 0, `source em falta em ${r.id}`);
      assert.ok(r.sourceUrl.startsWith("https://"), `sourceUrl inválido em ${r.id}`);
    }
  });

  test("todos os ids são únicos", () => {
    const ids = GASTO_PUBLICO_2025.rubricas.map((r) => r.id);
    assert.equal(new Set(ids).size, ids.length);
  });

  test("inclui as quatro rúbricas esperadas: juros da dívida, pensões, saúde, educação", () => {
    const ids = GASTO_PUBLICO_2025.rubricas.map((r) => r.id);
    assert.ok(ids.includes("juros-divida"));
    assert.ok(ids.includes("pensoes"));
    assert.ok(ids.includes("saude"));
    assert.ok(ids.includes("educacao"));
  });

  test("Defesa Nacional fica de fora de propósito (discrepância de fonte não resolvida)", () => {
    const ids = GASTO_PUBLICO_2025.rubricas.map((r) => r.id);
    assert.ok(!ids.includes("defesa"));
  });

  test("educação está marcada como estimate (valor orçamentado, não execução confirmada)", () => {
    const educacao = GASTO_PUBLICO_2025.rubricas.find((r) => r.id === "educacao");
    assert.equal(educacao.status, "estimate");
  });

  test("juros da dívida, pensões e saúde estão marcados como verified (execução real)", () => {
    for (const id of ["juros-divida", "pensoes", "saude"]) {
      const r = GASTO_PUBLICO_2025.rubricas.find((x) => x.id === id);
      assert.equal(r.status, "verified", `esperava-se verified em ${id}`);
    }
  });

  test("pensões é a maior rúbrica em valor absoluto entre as quatro", () => {
    const maior = [...GASTO_PUBLICO_2025.rubricas].sort(
      (a, b) => b.valorMilhoesEuros - a.valorMilhoesEuros
    )[0];
    assert.equal(maior.id, "pensoes");
  });
});
