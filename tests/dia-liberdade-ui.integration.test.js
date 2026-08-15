// Liberdade Fiscal — Teste de integração do módulo de UI do Dia da
// Liberdade Fiscal (Fase 7)
// Executar: node --test tests/

import "fake-indexeddb/auto";
import { test, describe, before, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";

import { dbClear, saveInvoice, savePeriodicTax } from "../data/db.js";
import { render } from "../modules/dia-liberdade.js";

before(async () => {
  const dom = new JSDOM("<!DOCTYPE html><html><body></body></html>", { url: "http://localhost/" });
  global.window = dom.window;
  global.document = dom.window.document;
  global.HTMLElement = dom.window.HTMLElement;
  global.Intl = Intl;
});

beforeEach(async () => {
  await dbClear("invoices");
  await dbClear("periodicTaxes");
});

function getContainer() {
  const container = document.createElement("div");
  document.body.appendChild(container);
  return container;
}

async function waitFor(predicate, { timeout = 1000, interval = 5 } = {}) {
  const inicio = Date.now();
  while (Date.now() - inicio < timeout) {
    if (predicate()) return true;
    await new Promise((resolve) => setTimeout(resolve, interval));
  }
  return predicate();
}

function setInput(container, id, value) {
  const input = container.querySelector(`#${id}`);
  input.value = String(value);
  input.dispatchEvent(new window.Event("input", { bubbles: true }));
}

function submitForm(container) {
  const form = container.querySelector("form");
  form.dispatchEvent(new window.Event("submit", { bubbles: true, cancelable: true }));
}

describe("Dia da Liberdade Fiscal — formulário", () => {
  test("mostra os campos principais e o disclaimer legal (spec §9)", async () => {
    const container = getContainer();
    render(container);
    assert.ok(container.querySelector("#dl-salario-bruto"));
    assert.ok(container.querySelector("#dl-tipo-trabalhador"));
    assert.ok(container.querySelector("#dl-estado-civil"));
    assert.ok(container.querySelector("#dl-regiao"));
    assert.ok(container.querySelector("#dl-dependentes"));
    assert.ok(container.querySelector(".disclaimer"));
  });

  test("rejeita salário inválido com mensagem acessível", async () => {
    const container = getContainer();
    render(container);
    submitForm(container);
    await waitFor(() => container.querySelector('[role="alert"]'));
    const alerta = container.querySelector('[role="alert"]');
    assert.ok(alerta);
    assert.match(alerta.textContent, /salário bruto mensal válido/);
  });
});

describe("Dia da Liberdade Fiscal — resultado", () => {
  test("calcula e mostra o resultado só com rendimento (sem faturas nem impostos registados)", async () => {
    const container = getContainer();
    render(container);
    setInput(container, "dl-salario-bruto", 2000);
    submitForm(container);
    await waitFor(() => container.querySelector("#resultado-dia-heading"));

    assert.ok(container.querySelector("#resultado-dia-heading"));
    assert.ok(container.querySelector(".stat-hero"));
    assert.match(container.textContent, /Baseado em 0 registo\(s\) de faturas e 0 registo\(s\)/);
  });

  test("inclui os totais de faturas e impostos anuais já registados no cálculo", async () => {
    await saveInvoice({
      id: "inv-1",
      date: "2026-06-01",
      source: "manual",
      goodServiceId: "pao",
      region: "continente",
      amount_total: 10,
      amount_base: 9.43,
      amount_tax: 0.57,
      confirmed_by_user: true,
    });
    await savePeriodicTax({
      id: "tax-1",
      type: "IMI",
      amount: 300,
      date: "2026-04-01",
      recurrence: "annual",
    });

    const container = getContainer();
    render(container);
    setInput(container, "dl-salario-bruto", 2000);
    submitForm(container);
    await waitFor(() => container.querySelector("#resultado-dia-heading"));

    assert.match(container.textContent, /0,57\s?€|0\.57/);
    assert.match(container.textContent, /300,00\s?€|300\.00/);
    assert.match(container.textContent, /Baseado em 1 registo\(s\) de faturas e 1 registo\(s\)/);
  });

  test("o ecrã de resultado nunca afirma que se deixa de pagar impostos a partir dessa data", async () => {
    const container = getContainer();
    render(container);
    setInput(container, "dl-salario-bruto", 2000);
    submitForm(container);
    await waitFor(() => container.querySelector("#resultado-dia-heading"));

    assert.doesNotMatch(container.textContent.toLowerCase(), /deixas de pagar impostos a partir de hoje\./);
    assert.match(container.textContent, /proporção anual/);
  });

  test("inclui o disclaimer legal no ecrã de resultado", async () => {
    const container = getContainer();
    render(container);
    setInput(container, "dl-salario-bruto", 2000);
    submitForm(container);
    await waitFor(() => container.querySelector("#resultado-dia-heading"));

    assert.ok(container.querySelector(".disclaimer"));
  });

  test("mostra o link 'Comparar com a OCDE' e o botão 'Partilhar resultado'", async () => {
    const container = getContainer();
    render(container);
    setInput(container, "dl-salario-bruto", 2000);
    submitForm(container);
    await waitFor(() => container.querySelector("#resultado-dia-heading"));

    const compararLink = container.querySelector('a[href="#benchmark-ocde"]');
    assert.ok(compararLink, "devia existir um link para o benchmark OCDE");

    const partilharBtn = [...container.querySelectorAll("button")].find((b) =>
      b.textContent.includes("Partilhar resultado")
    );
    assert.ok(partilharBtn, "devia existir um botão de partilha");
    // Clicar não deve lançar exceção síncrona mesmo sem Canvas/Web Share API reais (ambiente jsdom).
    assert.doesNotThrow(() => partilharBtn.click());
  });

  test("Recalcular volta ao formulário", async () => {
    const container = getContainer();
    render(container);
    setInput(container, "dl-salario-bruto", 2000);
    submitForm(container);
    await waitFor(() => container.querySelector("#resultado-dia-heading"));

    const recalcularBtn = [...container.querySelectorAll("button")].find((b) => b.textContent.includes("Recalcular"));
    recalcularBtn.click();
    await waitFor(() => container.querySelector("#dia-liberdade-heading"));

    assert.ok(container.querySelector("#dia-liberdade-heading"));
  });
});

describe("Dia da Liberdade Fiscal — acessibilidade básica", () => {
  test("cada ecrã tem exatamente um h1 com foco programático", async () => {
    const container = getContainer();
    render(container);
    const headings = container.querySelectorAll("h1");
    assert.equal(headings.length, 1);
    assert.equal(headings[0].tabIndex, -1);
  });

  test("todos os campos do formulário têm label associado por htmlFor/id", async () => {
    const container = getContainer();
    render(container);
    container.querySelectorAll("label[for]").forEach((label) => {
      const target = container.querySelector(`#${label.htmlFor}`);
      assert.ok(target, `label "for=${label.htmlFor}" deve apontar para um campo existente`);
    });
  });
});
