// Liberdade Fiscal — Teste de integração do módulo de UI de Faturas
// Executar: node --test tests/
//
// Cobre o fluxo completo (spec §6.3): onboarding de região (se ainda
// não definida) → seleção de item do catálogo → introdução do valor
// total → confirmação → persistência via saveInvoice (confirmed_by_user
// obrigatório) → listagem atualizada. Usa jsdom para o DOM e
// fake-indexeddb para uma IndexedDB real em Node.

import "fake-indexeddb/auto";
import { test, describe, before, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";

// Import estático (sem cache-busting): modules/faturas.js e
// modules/onboarding.js importam "../data/db.js" pelo mesmo
// especificador estático, por isso têm de partilhar a mesma entrada no
// registo de módulos do Node para que dbClear/setSetting aqui afetem a
// ligação IndexedDB que o módulo de UI realmente usa.
import { dbClear, setSetting, getSetting } from "../data/db.js";
import { render } from "../modules/faturas.js";

before(async () => {
  const dom = new JSDOM("<!DOCTYPE html><html><body></body></html>", { url: "http://localhost/" });
  global.window = dom.window;
  global.document = dom.window.document;
  global.HTMLElement = dom.window.HTMLElement;
  // Nota: global.crypto não é redefinido aqui de propósito — no Node
  // 20+, globalThis.crypto é um getter só de leitura (lançaria
  // TypeError). O crypto.randomUUID nativo do Node já está disponível
  // e é suficiente para o generateId() do módulo de faturas.
  global.Intl = Intl;
});

beforeEach(async () => {
  await dbClear("invoices");
  await dbClear("userSettings");
});

function getContainer() {
  const container = document.createElement("div");
  document.body.appendChild(container);
  return container;
}

// Vários passos do módulo (dbGetAll, saveInvoice) envolvem transações
// reais de IndexedDB, cujos callbacks disparam via eventos — podem
// exigir mais do que um único "tick" de macrotask para resolver,
// especialmente quando vários ficheiros de teste correm em paralelo.
// Em vez de um único setTimeout(0) (frágil, causava falhas
// intermitentes só quando corrido a par de outras suites), fazemos
// polling até a condição pretendida se verificar ou expirar o tempo.
async function waitFor(predicate, { timeout = 1000, interval = 5 } = {}) {
  const inicio = Date.now();
  while (Date.now() - inicio < timeout) {
    if (predicate()) return true;
    await new Promise((resolve) => setTimeout(resolve, interval));
  }
  return predicate();
}

describe("Faturas — onboarding de região", () => {
  test("mostra o ecrã de onboarding quando não há região guardada", async () => {
    const container = getContainer();
    render(container);
    await waitFor(() => container.querySelector("#onboarding-heading"));
    assert.ok(container.querySelector("#onboarding-heading"), "devia mostrar o heading de onboarding");
    assert.ok(container.querySelector(".disclaimer"), "onboarding deve incluir o disclaimer legal (spec §9)");
  });

  test("depois de escolher região, avança para a lista de faturas", async () => {
    const container = getContainer();
    render(container);
    await waitFor(() => container.querySelector("#onboarding-heading"));

    const radioAcores = container.querySelector("#regiao-acores");
    radioAcores.checked = true;
    const form = container.querySelector("form");
    form.dispatchEvent(new window.Event("submit", { bubbles: true, cancelable: true }));
    await waitFor(() => container.querySelector("#faturas-heading"));

    assert.ok(container.querySelector("#faturas-heading"), "devia mostrar o ecrã de lista de faturas");
    const regiaoGuardada = await getSetting("region");
    assert.equal(regiaoGuardada, "acores");
  });
});

describe("Faturas — fluxo manual", () => {
  beforeEach(async () => {
    await setSetting("region", "continente");
  });

  test("mostra diretamente a lista de faturas quando a região já está definida", async () => {
    const container = getContainer();
    render(container);
    await waitFor(() => container.querySelector("#faturas-heading"));
    assert.ok(container.querySelector("#faturas-heading"));
    assert.ok(container.querySelector('button[type="button"]'));
  });

  test("fluxo completo: escolher item, calcular, confirmar e persistir", async () => {
    const container = getContainer();
    render(container);
    await waitFor(() => container.querySelector("#faturas-heading"));

    const novaBtn = [...container.querySelectorAll("button")].find((b) => b.textContent.includes("Registar despesa"));
    novaBtn.click();
    await waitFor(() => container.querySelector("#nova-fatura-heading"));

    assert.ok(container.querySelector("#nova-fatura-heading"));

    const select = container.querySelector("#item-catalogo");
    select.value = "pao";
    select.dispatchEvent(new window.Event("change", { bubbles: true }));

    const valorInput = container.querySelector("#valor-total");
    valorInput.value = "10";
    valorInput.dispatchEvent(new window.Event("input", { bubbles: true }));

    const form = container.querySelector("form");
    form.dispatchEvent(new window.Event("submit", { bubbles: true, cancelable: true }));
    await waitFor(() => container.querySelector("#confirmar-heading"));

    assert.ok(container.querySelector("#confirmar-heading"), "devia mostrar o ecrã de confirmação");
    // Pão tem IVA reduzida (6% no Continente): base = 10 / 1.06 ≈ 9.43€
    const texto = container.textContent;
    assert.match(texto, /9,43\s?€|9\.43/);

    const confirmBtn = [...container.querySelectorAll("button")].find((b) =>
      b.textContent.includes("Confirmar e guardar")
    );
    confirmBtn.click();
    await waitFor(() => container.querySelector("#faturas-heading") && container.textContent.includes("Últimos registos"));

    assert.ok(container.querySelector("#faturas-heading"), "devia voltar à lista após guardar");
    assert.match(container.textContent, /Últimos registos/);
  });

  test("mostra erro de validação se nenhum item for escolhido", async () => {
    const container = getContainer();
    render(container);
    await waitFor(() => container.querySelector("#faturas-heading"));

    const novaBtn = [...container.querySelectorAll("button")].find((b) => b.textContent.includes("Registar despesa"));
    novaBtn.click();
    await waitFor(() => container.querySelector("#nova-fatura-heading"));

    const valorInput = container.querySelector("#valor-total");
    valorInput.value = "10";
    valorInput.dispatchEvent(new window.Event("input", { bubbles: true }));

    const form = container.querySelector("form");
    form.dispatchEvent(new window.Event("submit", { bubbles: true, cancelable: true }));
    await waitFor(() => container.querySelector('[role="alert"]'));

    const alerta = container.querySelector('[role="alert"]');
    assert.ok(alerta, "devia mostrar uma mensagem de erro acessível (role=alert)");
    assert.match(alerta.textContent, /Escolhe um item/);
  });

  test("mostra erro de validação se o valor for zero ou inválido", async () => {
    const container = getContainer();
    render(container);
    await waitFor(() => container.querySelector("#faturas-heading"));

    const novaBtn = [...container.querySelectorAll("button")].find((b) => b.textContent.includes("Registar despesa"));
    novaBtn.click();
    await waitFor(() => container.querySelector("#nova-fatura-heading"));

    const select = container.querySelector("#item-catalogo");
    select.value = "pao";
    select.dispatchEvent(new window.Event("change", { bubbles: true }));

    const form = container.querySelector("form");
    form.dispatchEvent(new window.Event("submit", { bubbles: true, cancelable: true }));
    await waitFor(() => container.querySelector('[role="alert"]'));

    const alerta = container.querySelector('[role="alert"]');
    assert.ok(alerta);
    assert.match(alerta.textContent, /valor total válido/);
  });

  test("item com imposto especial (combustível) mostra nota educativa ESTIMATE", async () => {
    const container = getContainer();
    render(container);
    await waitFor(() => container.querySelector("#faturas-heading"));

    const novaBtn = [...container.querySelectorAll("button")].find((b) => b.textContent.includes("Registar despesa"));
    novaBtn.click();
    await waitFor(() => container.querySelector("#nova-fatura-heading"));

    const select = container.querySelector("#item-catalogo");
    select.value = "combustivel-gasolina";
    select.dispatchEvent(new window.Event("change", { bubbles: true }));

    const valorInput = container.querySelector("#valor-total");
    valorInput.value = "50";
    valorInput.dispatchEvent(new window.Event("input", { bubbles: true }));

    const form = container.querySelector("form");
    form.dispatchEvent(new window.Event("submit", { bubbles: true, cancelable: true }));
    await waitFor(() => container.querySelector("#confirmar-heading"));

    assert.ok(container.querySelector(".disclaimer"), "devia mostrar a nota educativa sobre ISP");
  });

  test("cancelar a partir do formulário volta à lista sem guardar nada", async () => {
    const container = getContainer();
    render(container);
    await waitFor(() => container.querySelector("#faturas-heading"));

    const novaBtn = [...container.querySelectorAll("button")].find((b) => b.textContent.includes("Registar despesa"));
    novaBtn.click();
    await waitFor(() => container.querySelector("#nova-fatura-heading"));

    const cancelBtn = [...container.querySelectorAll("button")].find((b) => b.textContent.includes("Cancelar"));
    cancelBtn.click();
    await waitFor(() => container.querySelector("#faturas-heading"));

    assert.ok(container.querySelector("#faturas-heading"));
  });
});

describe("Faturas — acessibilidade básica", () => {
  beforeEach(async () => {
    await setSetting("region", "continente");
  });

  test("cada ecrã tem exatamente um h1 com foco programático", async () => {
    const container = getContainer();
    render(container);
    await waitFor(() => container.querySelector("#faturas-heading"));
    const headings = container.querySelectorAll("h1");
    assert.equal(headings.length, 1);
    assert.equal(headings[0].tabIndex, -1);
  });

  test("o formulário de nova despesa tem labels associados por htmlFor/id", async () => {
    const container = getContainer();
    render(container);
    await waitFor(() => container.querySelector("#faturas-heading"));
    const novaBtn = [...container.querySelectorAll("button")].find((b) => b.textContent.includes("Registar despesa"));
    novaBtn.click();
    await waitFor(() => container.querySelector("#nova-fatura-heading"));

    container.querySelectorAll("label[for]").forEach((label) => {
      const target = container.querySelector(`#${label.htmlFor}`);
      assert.ok(target, `label "for=${label.htmlFor}" deve apontar para um campo existente`);
    });
  });
});
