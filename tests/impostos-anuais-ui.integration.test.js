// Liberdade Fiscal — Teste de integração do módulo de UI de "Taxas"
// (impostos anuais/patrimoniais, Fase 6)
// Executar: node --test tests/
//
// Cobre o registo manual de IMI/IUC/ISV/IMT/Imposto de Selo (spec
// §6.4): a app não calcula estes valores (tabelas UNKNOWN/ESTIMATE),
// só regista o que o utilizador já sabe que pagou, validado por
// savePeriodicTax(). Redesenho de agosto de 2026: formulário
// simplificado a tipo + valor (data/recorrência são inferidas
// silenciosamente); "Guardar e avançar" persiste o total no Período
// acumulado e navega para o Dia da Liberdade Fiscal.

import "fake-indexeddb/auto";
import { test, describe, before, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";

import { dbClear, getPeriodoAtual } from "../data/db.js";
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
  await dbClear("userSettings");
  window.location.hash = "";
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

describe("Taxas — lista", () => {
  test("mostra ecrã inicial vazio com botão de registar", async () => {
    const container = getContainer();
    render(container);
    await waitFor(() => container.querySelector("#taxas-heading"));
    assert.ok(container.querySelector("#taxas-heading"));
    assert.match(container.textContent, /Taxas/);
    assert.ok([...container.querySelectorAll("button")].some((b) => b.textContent.includes("Registar taxa")));
  });
});

describe("Taxas — registo manual", () => {
  test("regista um IMI válido (só tipo + valor) e mostra-o na lista", async () => {
    const container = getContainer();
    render(container);
    await waitFor(() => container.querySelector("#taxas-heading"));

    clickByText(container, "Registar taxa");
    await waitFor(() => container.querySelector("#nova-taxa-heading"));

    // O formulário simplificado (agosto 2026) já não tem campos de
    // data/recorrência/nota — só tipo + valor.
    assert.equal(container.querySelector("#data-imposto"), null);
    assert.equal(container.querySelector("#recorrencia-imposto"), null);
    assert.equal(container.querySelector("#nota-imposto"), null);

    const valorInput = container.querySelector("#valor-imposto");
    valorInput.value = "350";
    valorInput.dispatchEvent(new window.Event("input", { bubbles: true }));

    const form = container.querySelector("form");
    form.dispatchEvent(new window.Event("submit", { bubbles: true, cancelable: true }));

    await waitFor(() => container.querySelector("#taxas-heading") && container.textContent.includes("350"));

    assert.ok(container.querySelector("#taxas-heading"));
    assert.match(container.textContent, /350,00\s?€|350\.00/);
    assert.match(container.textContent, /IMI/);
  });

  test("rejeita valor zero ou inválido com mensagem acessível", async () => {
    const container = getContainer();
    render(container);
    await waitFor(() => container.querySelector("#taxas-heading"));

    clickByText(container, "Registar taxa");
    await waitFor(() => container.querySelector("#nova-taxa-heading"));

    const form = container.querySelector("form");
    form.dispatchEvent(new window.Event("submit", { bubbles: true, cancelable: true }));

    await waitFor(() => container.querySelector('[role="alert"]'));
    const alerta = container.querySelector('[role="alert"]');
    assert.ok(alerta);
    assert.match(alerta.textContent, /valor válido/);
  });

  test("cancelar volta à lista sem guardar nada", async () => {
    const container = getContainer();
    render(container);
    await waitFor(() => container.querySelector("#taxas-heading"));

    clickByText(container, "Registar taxa");
    await waitFor(() => container.querySelector("#nova-taxa-heading"));

    clickByText(container, "Cancelar");
    await waitFor(() => container.querySelector("#taxas-heading"));

    assert.ok(container.querySelector("#taxas-heading"));
    assert.doesNotMatch(container.textContent, /Registos/, "sem registos guardados, a secção de lista não deve aparecer");
  });

  test("remover um registo já guardado atualiza a lista", async () => {
    const container = getContainer();
    render(container);
    await waitFor(() => container.querySelector("#taxas-heading"));

    clickByText(container, "Registar taxa");
    await waitFor(() => container.querySelector("#nova-taxa-heading"));
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

  test('"Guardar e avançar" persiste o total no Período acumulado e navega para o Dia da Liberdade', async () => {
    const container = getContainer();
    render(container);
    await waitFor(() => container.querySelector("#taxas-heading"));

    clickByText(container, "Registar taxa");
    await waitFor(() => container.querySelector("#nova-taxa-heading"));
    const valorInput = container.querySelector("#valor-imposto");
    valorInput.value = "200";
    valorInput.dispatchEvent(new window.Event("input", { bubbles: true }));
    container.querySelector("form").dispatchEvent(new window.Event("submit", { bubbles: true, cancelable: true }));
    await waitFor(() => container.querySelector("#taxas-heading") && container.textContent.includes("200"));

    clickByText(container, "Guardar e avançar");
    await waitFor(() => window.location.hash === "#dia-liberdade");

    assert.equal(window.location.hash, "#dia-liberdade");
    const periodo = await getPeriodoAtual();
    assert.ok(periodo.taxasAnuais, "devia ter guardado taxasAnuais no período");
    assert.equal(periodo.taxasAnuais.total, 200);
  });
});

describe("Taxas — acessibilidade básica", () => {
  test("cada ecrã tem exatamente um h1 com foco programático", async () => {
    const container = getContainer();
    render(container);
    await waitFor(() => container.querySelector("#taxas-heading"));
    const headings = container.querySelectorAll("h1");
    assert.equal(headings.length, 1);
    assert.equal(headings[0].tabIndex, -1);
  });

  test("todos os campos do formulário têm label associado por htmlFor/id", async () => {
    const container = getContainer();
    render(container);
    await waitFor(() => container.querySelector("#taxas-heading"));
    clickByText(container, "Registar taxa");
    await waitFor(() => container.querySelector("#nova-taxa-heading"));

    container.querySelectorAll("label[for]").forEach((label) => {
      const target = container.querySelector(`#${label.htmlFor}`);
      assert.ok(target, `label "for=${label.htmlFor}" deve apontar para um campo existente`);
    });
  });
});
