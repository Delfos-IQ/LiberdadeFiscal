// Liberdade Fiscal — Verificação automatizada de acessibilidade (axe-core)
// Executar: node --test tests/
//
// Auditoria 2026-08, roadmap P1-7: "verificar acessibilidade com
// ferramentas reais" foi sempre uma limitação conhecida deste projeto
// (QA-FASE-9.md secção 4: "não verificado nesta fase — o sandbox de
// execução não tem um browser disponível"). Continua a não haver um
// browser real aqui, mas o axe-core corre sobre jsdom sem ele: cobre
// TODAS as regras estruturais/ARIA da mesma engine que o Lighthouse e
// as extensões de browser usam — labels em falta, uso inválido de
// ARIA, ids duplicados, ordem de headings, nomes acessíveis de
// botões, landmarks — só não consegue verificar o que depende de
// layout real (color-contrast: em jsdom fica sempre "incomplete", não
// "passa" nem "falha", porque não há motor de rendering CSS a sério).
//
// O contraste de cor já foi verificado à parte por cálculo de
// luminância relativa (AUDITORIA-FASE-1.md, hallazgo C-1, corrigido).
// Isto é complementar, não substitui uma passagem eventual de
// Lighthouse + leitor de ecrã real num browser físico, que continua
// recomendada antes de qualquer promoção do produto (ver roadmap
// P1-7 em AUDITORIA-2026-08.md).

import "fake-indexeddb/auto";
import { test, describe, before, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";
import axeCore from "axe-core";

let dbClear, setSetting;

before(async () => {
  const dom = new JSDOM("<!DOCTYPE html><html><body></body></html>", {
    url: "http://localhost/",
    pretendToBeVisual: true,
  });
  global.window = dom.window;
  global.document = dom.window.document;
  global.HTMLElement = dom.window.HTMLElement;
  global.Intl = Intl;

  const db = await import("../data/db.js");
  dbClear = db.dbClear;
  setSetting = db.setSetting;
});

beforeEach(async () => {
  for (const store of ["invoices", "periodicTaxes", "quizResults", "userSettings", "periodosFechados"]) {
    await dbClear(store);
  }
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

/**
 * Corre axe-core sobre um container já montado e devolve só as
 * violações — exclui color-contrast (sempre "incomplete" em jsdom, ver
 * cabeçalho deste ficheiro) e region (regra de landmark top-level que
 * não se aplica a testar um módulo isolado fora do <main> real da
 * app).
 */
async function auditar(container) {
  const resultados = await axeCore.run(container, {
    rules: {
      "color-contrast": { enabled: false },
      region: { enabled: false },
    },
  });
  return resultados.violations;
}

function formatarViolacoes(violacoes) {
  return violacoes
    .map((v) => `${v.id} (${v.impact}): ${v.help} — ${v.nodes.length} elemento(s)`)
    .join("\n");
}

describe("Acessibilidade (axe-core sobre jsdom) — ecrãs principais", () => {
  test("Quiz", async () => {
    const { render } = await import(`../modules/quiz.js?t=${Date.now()}`);
    const container = getContainer();
    render(container);
    const violacoes = await auditar(container);
    assert.equal(violacoes.length, 0, formatarViolacoes(violacoes));
  });

  test("Rendimentos — formulário", async () => {
    const { render } = await import(`../modules/taximetro.js?t=${Date.now()}`);
    const container = getContainer();
    render(container);
    const violacoes = await auditar(container);
    assert.equal(violacoes.length, 0, formatarViolacoes(violacoes));
  });

  test("Rendimentos — ecrã de resultado", async () => {
    const { render } = await import(`../modules/taximetro.js?t=${Date.now()}`);
    const container = getContainer();
    render(container);
    container.querySelector("#salario-bruto").value = "2000";
    container.querySelector("#salario-bruto").dispatchEvent(new window.Event("input", { bubbles: true }));
    container.querySelector("form").dispatchEvent(new window.Event("submit", { bubbles: true, cancelable: true }));
    const violacoes = await auditar(container);
    assert.equal(violacoes.length, 0, formatarViolacoes(violacoes));
  });

  test("Gastos", async () => {
    await setSetting("region", "continente");
    const { render } = await import(`../modules/faturas.js?t=${Date.now()}`);
    const container = getContainer();
    render(container);
    await waitFor(() => container.querySelector("#gastos-heading"));
    const violacoes = await auditar(container);
    assert.equal(violacoes.length, 0, formatarViolacoes(violacoes));
  });

  test("Gastos — onboarding de região", async () => {
    const { render } = await import(`../modules/faturas.js?t=${Date.now()}`);
    const container = getContainer();
    render(container);
    await waitFor(() => container.querySelector("#onboarding-heading"));
    const violacoes = await auditar(container);
    assert.equal(violacoes.length, 0, formatarViolacoes(violacoes));
  });

  test("Taxas", async () => {
    const { render } = await import(`../modules/impostos-anuais.js?t=${Date.now()}`);
    const container = getContainer();
    render(container);
    await waitFor(() => container.querySelector(".card"));
    const violacoes = await auditar(container);
    assert.equal(violacoes.length, 0, formatarViolacoes(violacoes));
  });

  test("Dia da Liberdade Fiscal", async () => {
    const { render } = await import(`../modules/dia-liberdade.js?t=${Date.now()}`);
    const container = getContainer();
    render(container);
    await waitFor(() => container.querySelector(".card"));
    const violacoes = await auditar(container);
    assert.equal(violacoes.length, 0, formatarViolacoes(violacoes));
  });

  test("Comparação OCDE", async () => {
    const { render } = await import(`../modules/benchmark-ocde.js?t=${Date.now()}`);
    const container = getContainer();
    render(container);
    const violacoes = await auditar(container);
    assert.equal(violacoes.length, 0, formatarViolacoes(violacoes));
  });

  test("Os teus dados", async () => {
    const { render } = await import(`../modules/dados.js?t=${Date.now()}`);
    const container = getContainer();
    render(container);
    const violacoes = await auditar(container);
    assert.equal(violacoes.length, 0, formatarViolacoes(violacoes));
  });
});
