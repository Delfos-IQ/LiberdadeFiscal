// Liberdade Fiscal — Teste de integração do módulo de UI "Os teus
// dados" (Auditoria 2026-08, hallazgo B-1: exportação/importação)
// Executar: node --test tests/

import "fake-indexeddb/auto";
import { test, describe, before, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";

import { dbClear, saveInvoice, getPeriodoAtual } from "../data/db.js";
import { render } from "../modules/dados.js";

before(async () => {
  const dom = new JSDOM("<!DOCTYPE html><html><body></body></html>", { url: "http://localhost/" });
  global.window = dom.window;
  global.document = dom.window.document;
  global.HTMLElement = dom.window.HTMLElement;
  global.Intl = Intl;
  // APIs de ficheiro/blob usadas por exportar()/lerFicheiro() —
  // expostas a partir do próprio jsdom, tal como document/window acima.
  global.Blob = dom.window.Blob;
  global.File = dom.window.File;
  global.FileReader = dom.window.FileReader;
  global.URL = dom.window.URL;
});

beforeEach(async () => {
  for (const store of ["invoices", "periodicTaxes", "userSettings"]) {
    await dbClear(store);
  }
});

function getContainer() {
  const container = document.createElement("div");
  document.body.appendChild(container);
  return container;
}

function invoiceValida(overrides = {}) {
  return {
    id: "inv-1",
    date: "2026-08-15",
    source: "manual",
    goodServiceId: "pao",
    region: "continente",
    amount_total: 2.5,
    confirmed_by_user: true,
    ...overrides,
  };
}

async function waitFor(predicate, { timeout = 1000, interval = 5 } = {}) {
  const inicio = Date.now();
  while (Date.now() - inicio < timeout) {
    if (predicate()) return true;
    await new Promise((resolve) => setTimeout(resolve, interval));
  }
  return predicate();
}

describe("Os teus dados — estrutura do ecrã", () => {
  test("mostra as três secções: exportar, importar, apagar", () => {
    const container = getContainer();
    render(container);
    const headings = [...container.querySelectorAll("h2")].map((h) => h.textContent);
    assert.ok(headings.includes("Exportar"));
    assert.ok(headings.includes("Importar"));
    assert.ok(headings.includes("Apagar tudo"));
  });

  test("tem exatamente um h1 com foco programático", () => {
    const container = getContainer();
    render(container);
    const headings = container.querySelectorAll("h1");
    assert.equal(headings.length, 1);
    assert.equal(headings[0].tabIndex, -1);
  });
});

describe("Os teus dados — importação", () => {
  test("ficheiro inválido mostra erro sem escrever nada", async () => {
    await saveInvoice(invoiceValida());
    const container = getContainer();
    render(container);

    const input = container.querySelector('input[type="file"]');
    const file = new window.File(["isto não é json"], "ficheiro.json", { type: "application/json" });
    Object.defineProperty(input, "files", { value: [file], configurable: true });
    input.dispatchEvent(new window.Event("change", { bubbles: true }));

    await waitFor(() => container.querySelector('[role="alert"]'));
    assert.match(container.querySelector('[role="alert"]').textContent, /Não foi possível ler/);

    const { dbGetAll } = await import(`../data/db.js?t=${Date.now()}`);
    assert.equal((await dbGetAll("invoices")).length, 1, "os dados originais não deviam ter sido tocados");
  });

  test("ficheiro válido mostra resumo e, ao confirmar, substitui os dados", async () => {
    // Prepara um ficheiro de exportação válido a partir de um estado
    // conhecido, depois limpa e confirma o round-trip via a UI.
    await saveInvoice(invoiceValida({ id: "a-restaurar" }));
    const { exportarTodosDados, dbGetAll } = await import(`../data/db.js?t=${Date.now()}`);
    const exportado = await exportarTodosDados();
    await dbClear("invoices");
    assert.equal((await dbGetAll("invoices")).length, 0);

    const container = getContainer();
    render(container);

    const input = container.querySelector('input[type="file"]');
    const file = new window.File([JSON.stringify(exportado)], "export.json", { type: "application/json" });
    Object.defineProperty(input, "files", { value: [file], configurable: true });
    input.dispatchEvent(new window.Event("change", { bubbles: true }));

    await waitFor(() => /Faturas: 1/.test(container.textContent));

    const confirmarBtn = [...container.querySelectorAll("button")].find((b) =>
      /Confirmar — substituir/.test(b.textContent)
    );
    assert.ok(confirmarBtn, "devia mostrar o botão de confirmação depois de ler um ficheiro válido");
    confirmarBtn.click();

    await waitFor(() => /importados com sucesso/.test(container.textContent));
    const restauradas = await dbGetAll("invoices");
    assert.equal(restauradas.length, 1);
    assert.equal(restauradas[0].id, "a-restaurar");
  });

  test("cancelar depois de ler o ficheiro não altera nada", async () => {
    await saveInvoice(invoiceValida({ id: "intocado" }));
    const { exportarTodosDados, dbGetAll } = await import(`../data/db.js?t=${Date.now()}`);
    const exportadoVazio = await exportarTodosDados();
    exportadoVazio.stores.invoices = []; // ficheiro diferente do estado atual

    const container = getContainer();
    render(container);
    const input = container.querySelector('input[type="file"]');
    const file = new window.File([JSON.stringify(exportadoVazio)], "export.json", { type: "application/json" });
    Object.defineProperty(input, "files", { value: [file], configurable: true });
    input.dispatchEvent(new window.Event("change", { bubbles: true }));
    await waitFor(() => container.querySelector('input[type="file"]') === null);

    const cancelarBtn = [...container.querySelectorAll("button")].find((b) => b.textContent === "Cancelar");
    cancelarBtn.click();

    assert.ok(container.querySelector('input[type="file"]'), "devia voltar ao ecrã inicial de importação");
    assert.equal((await dbGetAll("invoices")).length, 1, "cancelar não deve tocar nos dados");
  });
});

describe("Os teus dados — apagar tudo", () => {
  test("pede confirmação antes de apagar", () => {
    const container = getContainer();
    render(container);
    const apagarBtn = [...container.querySelectorAll("button")].find((b) => b.textContent === "Apagar todos os meus dados");
    apagarBtn.click();
    assert.ok(container.querySelector('[role="alert"]'), "devia mostrar um aviso de confirmação");
    assert.ok([...container.querySelectorAll("button")].some((b) => b.textContent === "Sim, apagar tudo"));
  });

  test("confirmar apaga todos os stores", async () => {
    await saveInvoice(invoiceValida());
    const container = getContainer();
    render(container);

    const apagarBtn = [...container.querySelectorAll("button")].find((b) => b.textContent === "Apagar todos os meus dados");
    apagarBtn.click();
    const simBtn = [...container.querySelectorAll("button")].find((b) => b.textContent === "Sim, apagar tudo");
    simBtn.click();

    await waitFor(() => /foram apagados/.test(container.textContent));
    const { dbGetAll } = await import(`../data/db.js?t=${Date.now()}`);
    assert.equal((await dbGetAll("invoices")).length, 0);
  });

  test("cancelar não apaga nada", async () => {
    await saveInvoice(invoiceValida());
    const container = getContainer();
    render(container);

    const apagarBtn = [...container.querySelectorAll("button")].find((b) => b.textContent === "Apagar todos os meus dados");
    apagarBtn.click();
    const cancelarBtn = [...container.querySelectorAll("button")].find((b) => b.textContent === "Cancelar");
    cancelarBtn.click();

    const { dbGetAll } = await import(`../data/db.js?t=${Date.now()}`);
    assert.equal((await dbGetAll("invoices")).length, 1);
  });
});
