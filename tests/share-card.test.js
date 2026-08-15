// Liberdade Fiscal — Testes de buildShareText (Fase 8)
// Executar: node --test tests/
//
// desenharCartaoCanvas() não é testado aqui — depende da Canvas API do
// browser, indisponível em Node/jsdom. buildShareText() é a parte pura
// e testável.

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { buildShareText } from "../data/share-card.js";

describe("buildShareText", () => {
  test("inclui nome da app, ano, data e percentagem", () => {
    const texto = buildShareText({ ano: 2026, date: "2026-04-06", dayOfYear: 96, percentage: 0.2642 });
    assert.match(texto, /Liberdade Fiscal/);
    assert.match(texto, /2026/);
    assert.match(texto, /96 dias/);
    assert.match(texto, /26,4%|26\.4%/);
  });

  test("nunca inclui valores monetários nem dados pessoais (spec §6.7)", () => {
    const texto = buildShareText({ ano: 2026, date: "2026-04-06", dayOfYear: 96, percentage: 0.2642 });
    assert.doesNotMatch(texto, /€/);
  });

  test("menciona que é uma estimativa, não aconselhamento fiscal", () => {
    const texto = buildShareText({ ano: 2026, date: "2026-01-01", dayOfYear: 1, percentage: 0 });
    assert.match(texto, /estimativa/);
    assert.match(texto, /não é aconselhamento fiscal/);
  });
});
