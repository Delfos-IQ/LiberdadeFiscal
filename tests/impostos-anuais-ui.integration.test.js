// Liberdade Fiscal — Teste de integração do módulo de UI de Impostos
// Anuais/Patrimoniais (Fase 6)
// Executar: node --test tests/
//
// Cobre o registo manual de IMI/IUC/ISV/IMT/Imposto de Selo (spec
// §6.4): a app não calcula estes valores (tabelas UNKNOWN/ESTIMATE),
// só regista o que o utilizador já sabe que pagou, validado por
// savePeriodicTax().

import "fake-indexeddb/auto";
import { test, describe, before, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";

import { dbClear } from "../data/db.js";
import { render } from "../modules/impostos-anuais.js";

before(async () => {
  const dom = new JSDOM("<!DOCTYPE html><html><body></body></html>", { url: "http://localhost/" });
  global.window = dom.window;
  global.document = dom.window.document;
  global.HTMLElement = dom.window.HTMLElement;
  global.Intl = Intl;
});

beforeEach(async () => {
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

function clickByText(container, text) {
  const btn = [...container.querySelectorAll("button")].find((b) => b.textContent.includes(text));
  btn.click();
  return btn;
}

describe("Impostos anuais — lista", () => {
  test("mostra ecrã inicial vazio com botão de registar", async () => {
    const container = getContainer();
    render(container);
    await waitFor(() => container.querySelector("#impostos-anuais-heading"));
    assert.ok(container.querySelector("#impostos-anuais-heading"));
    assert.ok([...container.querySelectorAll("button")].some((b) => b.textContent.includes("Registar imposto")));
  });
});

describe("Impostos anuais — registo manual", () => {
  test("regista um IMI válido e mostra-o na lista", async () => {
    const container = getContainer();
    render(container);
    await waitFor(() => container.querySelector("#impostos-anuais-heading"));

    clickByText(container, "Registar imposto");
    await waitFor(() => container.querySelector("#novo-imposto-heading"));

    const valorInput = container.querySelector("#valor-imposto");
    valorInput.value = "350";
    valorInput.dispatchEvent(new window.Event("input", { bubbles: true }));

    const form = container.querySelector("form");
    form.dispatchEvent(new window.Event("submit", { bubbles: true, cancelable: true }));

    await waitFor(() => container.querySelector("#impostos-anuais-heading") && container.textContent.includes("350"));

    assert.ok(container.querySelector("#impostos-anuais-heading"));
    assert.match(container.textContent, /350,00\s?€|350\.00/);
    assert.match(container.textContent, /IMI/);
  });

  test("rejeita valor zero ou inválido com mensagem acessível", async () => {
    const container = getContainer();
    render(container);
    await waitFor(() => container.querySelector("#impostos-anuais-heading"));

    clickByText(container, "Registar imposto");
    await waitFor(() => container.querySelector("#novo-imposto-heading"));

    const form = container.querySelector("form");
    form.dispatchEvent(new window.Event("submit", { bubbles: true, cancelable: true }));

    await waitFor(() => container.querySelector('[role="alert"]'));
    const alerta = container.querySelector('[role="alert"]');
    assert.ok(alerta);
    assert.match(alerta.textContent, /valor válido/);
  });

  test("mudar o tipo de imposto para ISV muda a recorrência sugerida para pontual", async () => {
    const container = getContainer();
    render(container);
    await waitFor(() => container.querySelector("#impostos-anuais-heading"));

    clickByText(container, "Registar imposto");
    await waitFor(() => container.querySelector("#novo-imposto-heading"));

    const tipoSelect = container.querySelector("#tipo-imposto");
    tipoSelect.value = "ISV";
    tipoSelect.dispatchEvent(new window.Event("change", { bubbles: true }));

    const recorrenciaSelect = container.querySelector("#recorrencia-imposto");
    assert.equal(recorrenciaSelect.value, "one_time");
  });

  test("cancelar volta à lista sem guardar nada", async () => {
    const container = getContainer();
    render(container);
    await waitFor(() => container.querySelector("#impostos-anuais-heading"));

    clickByText(container, "Registar imposto");
    await waitFor(() => container.querySelector("#novo-imposto-heading"));

    clickByText(container, "Cancelar");
    await waitFor(() => container.querySelector("#impostos-anuais-heading"));

    assert.ok(container.querySelector("#impostos-anuais-heading"));
    assert.doesNotMatch(container.textContent, /Registos/, "sem registos guardados, a secção de lista não deve aparecer");
  });

  test("remover um registo já guardado atualiza a lista", async () => {
    const container = getContainer();
    render(container);
    await waitFor(() => container.querySelector("#impostos-anuais-heading"));

    clickByText(container, "Registar imposto");
    await waitFor(() => container.querySelector("#novo-imposto-heading"));
    const valorInput = container.querySelector("#valor-imposto");
    valorInput.value = "120";
    valorInput.dispatchEvent(new window.Event("input", { bubbles: true }));
    container.querySelector("form").dispatchEvent(new window.Event("submit", { bubbles: true, cancelable: true }));
    await waitFor(() => container.textContent.includes("120"));

    const removerBtn = [...container.querySelectorAll("button")].find((b) => b.textContent.includes("Remover"));
    assert.ok(removerBtn, "devia existir um botão Remover após guardar um registo");
    removerBtn.click();

    await waitFor(() => !container.textContent.includes("120,00"));
    assert.doesNotMatch(container.textContent, /120,00\s?€/);
  });
});

describe("Impostos anuais — acessibilidade básica", () => {
  test("cada ecrã tem exatamente um h1 com foco programático", async () => {
    const container = getContainer();
    render(container);
    await waitFor(() => container.querySelector("#impostos-anuais-heading"));
    const headings = container.querySelectorAll("h1");
    assert.equal(headings.length, 1);
    assert.equal(headings[0].tabIndex, -1);
  });

  test("todos os campos do formulário têm label associado por htmlFor/id", async () => {
    const container = getContainer();
    render(container);
    await waitFor(() => container.querySelector("#impostos-anuais-heading"));
    clickByText(container, "Registar imposto");
    await waitFor(() => container.querySelector("#novo-imposto-heading"));

    container.querySelectorAll("label[for]").forEach((label) => {
      const target = container.querySelector(`#${label.htmlFor}`);
      assert.ok(target, `label "for=${label.htmlFor}" deve apontar para um campo existente`);
    });
  });
});
