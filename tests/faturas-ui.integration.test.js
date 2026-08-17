// Liberdade Fiscal — Teste de integração do módulo de UI de "Gastos"
// Executar: node --test tests/
//
// Redesenho de agosto de 2026 (spec §6.3): captura por categoria
// mensal autorreportada em vez de fatura individual. Cobre: onboarding
// de região (se ainda não definida) → preenchimento de categorias →
// desglose educativo de IVA em tempo real → "Guardar e avançar"
// persiste no Período acumulado (data/db.js) e navega para Taxas.
// Usa jsdom para o DOM e fake-indexeddb para uma IndexedDB real em
// Node.

import "fake-indexeddb/auto";
import { test, describe, before, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";

// Import estático (sem cache-busting): modules/faturas.js e
// modules/onboarding.js importam "../data/db.js" pelo mesmo
// especificador estático, por isso têm de partilhar a mesma entrada no
// registo de módulos do Node para que dbClear/setSetting/getPeriodoAtual
// aqui afetem a ligação IndexedDB que o módulo de UI realmente usa.
import { dbClear, setSetting, getSetting, getPeriodoAtual } from "../data/db.js";
import { render } from "../modules/faturas.js";

before(async () => {
  const dom = new JSDOM("<!DOCTYPE html><html><body></body></html>", { url: "http://localhost/" });
  global.window = dom.window;
  global.document = dom.window.document;
  global.HTMLElement = dom.window.HTMLElement;
  // Nota: global.crypto não é redefinido aqui de propósito — ver
  // taximetro-ui.integration.test.js para a justificação completa.
  global.Intl = Intl;
});

beforeEach(async () => {
  await dbClear("invoices");
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

describe("Gastos — onboarding de região", () => {
  test("mostra o ecrã de onboarding quando não há região guardada", async () => {
    const container = getContainer();
    render(container);
    await waitFor(() => container.querySelector("#onboarding-heading"));
    assert.ok(container.querySelector("#onboarding-heading"), "devia mostrar o heading de onboarding");
    assert.ok(container.querySelector(".disclaimer"), "onboarding deve incluir o disclaimer legal (spec §9)");
  });

  test("depois de escolher região, avança para o ecrã de Gastos", async () => {
    const container = getContainer();
    render(container);
    await waitFor(() => container.querySelector("#onboarding-heading"));

    const radioAcores = container.querySelector("#regiao-acores");
    radioAcores.checked = true;
    const form = container.querySelector("form");
    form.dispatchEvent(new window.Event("submit", { bubbles: true, cancelable: true }));
    await waitFor(() => container.querySelector("#gastos-heading"));

    assert.ok(container.querySelector("#gastos-heading"), "devia mostrar o ecrã de Gastos");
    const regiaoGuardada = await getSetting("region");
    assert.equal(regiaoGuardada, "acores");
  });
});

describe("Gastos — captura mensal por categoria", () => {
  beforeEach(async () => {
    await setSetting("region", "continente");
  });

  test("mostra o ecrã de Gastos diretamente quando a região já está definida", async () => {
    const container = getContainer();
    render(container);
    await waitFor(() => container.querySelector("#gastos-heading"));
    assert.ok(container.querySelector("#gastos-heading"));
  });

  test("mostra todas as categorias com os seus exemplos", async () => {
    const container = getContainer();
    render(container);
    await waitFor(() => container.querySelector("#gastos-heading"));
    assert.ok(container.querySelector("#gasto-alimentacao"), "categoria Alimentação deve existir");
    assert.ok(container.querySelector("#gasto-combustivel"), "categoria Combustível deve existir");
    assert.match(container.textContent, /Ex\.:/);
  });

  test("introduzir um valor numa categoria mostra o desglose de IVA e a fonte", async () => {
    const container = getContainer();
    render(container);
    await waitFor(() => container.querySelector("#gastos-heading"));

    const input = container.querySelector("#gasto-alimentacao");
    input.value = "200";
    input.dispatchEvent(new window.Event("input", { bubbles: true }));

    assert.match(container.textContent, /IVA \(estimado\)/);
    assert.match(container.textContent, /Fonte: Código do IVA/);
  });

  test("categoria de combustível mostra a nota sobre o ISP", async () => {
    const container = getContainer();
    render(container);
    await waitFor(() => container.querySelector("#gastos-heading"));

    const input = container.querySelector("#gasto-combustivel");
    input.value = "60";
    input.dispatchEvent(new window.Event("input", { bubbles: true }));

    assert.match(container.textContent, /ISP/);
  });

  test("o total mensal atualiza ao preencher categorias", async () => {
    const container = getContainer();
    render(container);
    await waitFor(() => container.querySelector("#gastos-heading"));

    const input = container.querySelector("#gasto-alimentacao");
    input.value = "150";
    input.dispatchEvent(new window.Event("input", { bubbles: true }));

    const hero = container.querySelector(".stat-hero");
    assert.match(hero.textContent, /150,00\s?€|150\.00/);
  });

  test('"Guardar e avançar" persiste no Período acumulado e navega para Taxas', async () => {
    const container = getContainer();
    render(container);
    await waitFor(() => container.querySelector("#gastos-heading"));

    const inputAlimentacao = container.querySelector("#gasto-alimentacao");
    inputAlimentacao.value = "100";
    inputAlimentacao.dispatchEvent(new window.Event("input", { bubbles: true }));

    const avancarBtn = [...container.querySelectorAll("button")].find((b) =>
      b.textContent.includes("Guardar e avançar")
    );
    avancarBtn.click();
    await waitFor(() => window.location.hash === "#impostos-anuais");

    assert.equal(window.location.hash, "#impostos-anuais");
    const periodo = await getPeriodoAtual();
    assert.ok(periodo.gastosMensal, "devia ter guardado gastosMensal no período");
    assert.equal(periodo.gastosMensal.totalMensal, 100);
    const alimentacao = periodo.gastosMensal.categorias.find((c) => c.id === "alimentacao");
    assert.equal(alimentacao.valorMensal, 100);
    assert.ok(alimentacao.ivaMensal > 0, "devia ter calculado o IVA estimado da categoria");
  });

  test("voltar ao ecrã depois de guardar mostra os valores já preenchidos, não em branco", async () => {
    // Regressão: navegar Rendimentos → Gastos → Taxas → Dia da
    // Liberdade e voltar a Gastos mostrava tudo a 0€, mesmo com o
    // Período a manter os dados corretamente (Dia da Liberdade
    // continuava certo). O módulo de UI nunca se re-hidratava a partir
    // do período guardado ao montar — só escrevia, nunca relia.
    const container1 = getContainer();
    render(container1);
    await waitFor(() => container1.querySelector("#gastos-heading"));
    const input1 = container1.querySelector("#gasto-alimentacao");
    input1.value = "100";
    input1.dispatchEvent(new window.Event("input", { bubbles: true }));
    const avancarBtn = [...container1.querySelectorAll("button")].find((b) =>
      b.textContent.includes("Guardar e avançar")
    );
    avancarBtn.click();
    await waitFor(() => window.location.hash === "#impostos-anuais");

    // Simula "voltar" a Gastos: nova instância do módulo, novo container
    // (é o que app.js faz a cada mudança de rota).
    const container2 = getContainer();
    render(container2);
    await waitFor(() => container2.querySelector("#gastos-heading"));
    await waitFor(() => container2.querySelector("#gasto-alimentacao")?.value === "100");

    const input2 = container2.querySelector("#gasto-alimentacao");
    assert.equal(input2.value, "100", "o valor guardado devia reaparecer no input ao voltar ao ecrã");

    const totalHero = container2.querySelector(".stat-hero");
    assert.match(totalHero.textContent, /100,00/, "o total mensal também devia refletir o valor recuperado");
  });
});

describe("Gastos — acessibilidade básica", () => {
  beforeEach(async () => {
    await setSetting("region", "continente");
  });

  test("existe exatamente um h1 com foco programático", async () => {
    const container = getContainer();
    render(container);
    await waitFor(() => container.querySelector("#gastos-heading"));
    const headings = container.querySelectorAll("h1");
    assert.equal(headings.length, 1);
    assert.equal(headings[0].tabIndex, -1);
  });

  test("cada input de categoria tem um label associado por htmlFor/id", async () => {
    const container = getContainer();
    render(container);
    await waitFor(() => container.querySelector("#gastos-heading"));

    container.querySelectorAll("label[for]").forEach((label) => {
      const target = container.querySelector(`#${label.htmlFor}`);
      assert.ok(target, `label "for=${label.htmlFor}" deve apontar para um campo existente`);
    });
  });
});
