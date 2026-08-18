// Liberdade Fiscal — Teste de integração do módulo de UI do Benchmark
// Internacional OCDE (Fase 8)
// Executar: node --test tests/

import "fake-indexeddb/auto";
import { test, describe, before, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";

import { dbClear, atualizarPeriodoAtual, setSetting } from "../data/db.js";
import { calcularCadeiaSalarial, calcularCadeiaSalarialConjunta } from "../data/tax-engine.js";

let render;

before(async () => {
  const dom = new JSDOM("<!DOCTYPE html><html><body></body></html>", { url: "http://localhost/" });
  global.window = dom.window;
  global.document = dom.window.document;
  global.HTMLElement = dom.window.HTMLElement;
  global.Intl = Intl;

  ({ render } = await import("../modules/benchmark-ocde.js"));
});

beforeEach(async () => {
  // O período atual (incluindo rendimentos) e a região guardada vivem
  // ambos em userSettings (ver data/db.js) — limpar este store chega
  // para isolar os testes de pré-preenchimento uns dos outros.
  await dbClear("userSettings");
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

describe("Benchmark OCDE — conteúdo estático", () => {
  test("mostra os 7 países + a média OCDE", () => {
    const container = getContainer();
    render(container);
    const linhas = container.querySelectorAll(".benchmark-linha");
    // 7 países da lista estática + 1 linha da média OCDE
    assert.equal(linhas.length, 8);
  });

  test("Portugal está destacado visualmente", () => {
    const container = getContainer();
    render(container);
    assert.ok(container.querySelector(".benchmark-linha--portugal"));
    assert.match(container.querySelector(".benchmark-linha--portugal").textContent, /Portugal/);
  });

  test("mostra o aviso obrigatório de metodologia (spec §6.6)", () => {
    const container = getContainer();
    render(container);
    const disclaimers = container.querySelectorAll(".disclaimer");
    const algumFalaDeMetodologia = [...disclaimers].some((d) => /Não inclui IVA/.test(d.textContent));
    assert.ok(algumFalaDeMetodologia, "devia explicar que o tax wedge da OCDE não inclui IVA/patrimoniais");
  });

  test("destaca em destaque próprio que a comparação é sempre pessoa solteira, sem filhos", () => {
    const container = getContainer();
    render(container);
    const disclaimers = container.querySelectorAll(".disclaimer");
    const algumDestacaSolteiro = [...disclaimers].some((d) => /pessoa solteira, sem filhos e sem declaração conjunta/.test(d.textContent));
    assert.ok(algumDestacaSolteiro, "devia ter um aviso próprio e destacado sobre o critério pessoa solteira");
  });
});

describe("Benchmark OCDE — cálculo da posição do utilizador", () => {
  test("rejeita salário inválido com mensagem acessível", () => {
    const container = getContainer();
    render(container);
    submitForm(container);
    const alerta = container.querySelector('[role="alert"]');
    assert.ok(alerta);
    assert.match(alerta.textContent, /salário bruto mensal válido/);
  });

  test("com um salário válido, mostra uma linha 'A tua situação'", () => {
    const container = getContainer();
    render(container);
    setInput(container, "bm-salario-bruto", 2000);
    submitForm(container);
    assert.ok(container.querySelector(".benchmark-linha--utilizador"));
    assert.match(container.querySelector(".benchmark-linha--utilizador").textContent, /A tua situação/);
  });

  test("junto a 'A tua situação' explica que assume solteiro/a e sem filhos", () => {
    const container = getContainer();
    render(container);
    setInput(container, "bm-salario-bruto", 2000);
    submitForm(container);
    const disclaimers = container.querySelectorAll(".disclaimer");
    const notaSituacao = [...disclaimers].find((d) => /"A tua situação" foi calculada/.test(d.textContent));
    assert.ok(notaSituacao, "devia explicar a hipótese assumida no cálculo de 'A tua situação'");
    assert.match(notaSituacao.textContent, /Dia da Liberdade Fiscal.*ecrã anterior/);
  });
});

describe("Benchmark OCDE — navegação", () => {
  // Regressão: esta é uma rota secundária, sem botão próprio na
  // navegação principal — só se chega aqui a partir do link em Dia da
  // Liberdade. Sem um botão de voltar explícito, o único caminho de
  // volta seria o "recuar" do browser, que nem sequer existe quando a
  // app está instalada como PWA (display: standalone).
  test("tem um botão para voltar ao Dia da Liberdade", () => {
    const container = getContainer();
    render(container);
    const voltarBtns = [...container.querySelectorAll("button")].filter((b) =>
      /Voltar ao Dia da Liberdade/.test(b.textContent)
    );
    assert.ok(voltarBtns.length >= 1, "devia ter pelo menos um botão de voltar");
    voltarBtns.forEach((b) => assert.equal(b.type, "button", "não deve submeter o formulário de simulação"));
  });

  test("clicar em voltar muda a hash para dia-liberdade", () => {
    const container = getContainer();
    render(container);
    window.location.hash = "benchmark-ocde";
    const voltarBtn = [...container.querySelectorAll("button")].find((b) =>
      /Voltar ao Dia da Liberdade/.test(b.textContent)
    );
    voltarBtn.click();
    assert.equal(window.location.hash, "#dia-liberdade");
  });
});

describe("Benchmark OCDE — pré-preenchimento a partir do período (18/08/2026)", () => {
  test("sem período preenchido, o campo de salário continua vazio", async () => {
    const container = getContainer();
    render(container);
    await waitFor(() => true, { timeout: 20 }); // dá tempo às promises resolverem
    const input = container.querySelector("#bm-salario-bruto");
    assert.equal(input.value, "");
    // Aviso "pessoa solteira" + aviso de metodologia da OCDE — nenhuma
    // nota de pré-preenchimento nem de "A tua situação" (não há período
    // nem cálculo submetido).
    assert.equal(container.querySelectorAll(".disclaimer").length, 2);
  });

  test("em modo individual, pré-preenche com o salário bruto de Rendimentos", async () => {
    const r = calcularCadeiaSalarial(2500, { tipoTrabalhador: "dependente", estadoCivil: "individual", regiao: "continente" });
    await atualizarPeriodoAtual({ rendimentos: r });
    await setSetting("region", "madeira");

    const container = getContainer();
    render(container);
    await waitFor(() => container.querySelector("#bm-salario-bruto").value !== "");

    assert.equal(container.querySelector("#bm-salario-bruto").value, "2500");
    assert.equal(container.querySelector("#bm-regiao").value, "madeira");
    const nota = [...container.querySelectorAll(".disclaimer")].find((d) => /Pré-preenchido/.test(d.textContent));
    assert.ok(nota, "devia explicar que o valor veio de Rendimentos");
    assert.match(nota.textContent, /salário bruto que introduziste em Rendimentos/);
  });

  test("em modo agregado (dois rendimentos), pré-preenche os dois salários reais do agregado (A e B)", async () => {
    const r = calcularCadeiaSalarialConjunta(2000, 3000, { regiao: "continente" });
    await atualizarPeriodoAtual({ rendimentos: r });

    const container = getContainer();
    render(container);
    await waitFor(() => container.querySelector("#bm-salario-bruto-a"));

    // Já não escondemos nenhum dos dois salários — usamos os dois no
    // cálculo conjunto (ver teste seguinte), em vez de aplicar escalões
    // de pessoa solteira a um só ou à soma dos dois.
    assert.equal(container.querySelector("#bm-salario-bruto-a").value, "2000");
    assert.equal(container.querySelector("#bm-salario-bruto-b").value, "3000");
    assert.equal(container.querySelector("#bm-salario-bruto"), null, "não deve mostrar o campo de salário único em modo agregado");

    const nota = [...container.querySelectorAll(".disclaimer")].find((d) => /Pré-preenchidos/.test(d.textContent));
    assert.ok(nota, "devia explicar a origem dos dois valores");
    assert.match(nota.textContent, /declaração conjunta/);
  });

  test("em modo agregado, calcular usa o regime de declaração conjunta (quociente familiar), não escalões de pessoa solteira", async () => {
    const r = calcularCadeiaSalarialConjunta(2000, 3000, { regiao: "continente" });
    await atualizarPeriodoAtual({ rendimentos: r });

    const container = getContainer();
    render(container);
    await waitFor(() => container.querySelector("#bm-salario-bruto-a"));

    submitForm(container);

    const linhaUtilizador = container.querySelector(".benchmark-linha--utilizador");
    assert.ok(linhaUtilizador, "devia mostrar 'A tua situação' com os valores pré-preenchidos, sem precisar de os reintroduzir");

    // Nota específica de modo agregado, distinta da de modo individual —
    // não afirma "solteiro/a", alerta para a comparação de duas pessoas
    // vs. uma.
    const disclaimers = container.querySelectorAll(".disclaimer");
    const notaSituacao = [...disclaimers].find((d) => /"A tua situação" foi calculada/.test(d.textContent));
    assert.ok(notaSituacao);
    assert.match(notaSituacao.textContent, /regime fiscal real do teu agregado/);
    assert.doesNotMatch(notaSituacao.textContent, /solteiro\/a/);
  });

  test("em modo agregado, rejeita quando os dois salários estão em falta", async () => {
    const r = calcularCadeiaSalarialConjunta(2000, 3000, { regiao: "continente" });
    await atualizarPeriodoAtual({ rendimentos: r });

    const container = getContainer();
    render(container);
    await waitFor(() => container.querySelector("#bm-salario-bruto-a"));

    setInput(container, "bm-salario-bruto-a", 0);
    setInput(container, "bm-salario-bruto-b", 0);
    submitForm(container);

    const alerta = container.querySelector('[role="alert"]');
    assert.ok(alerta);
    assert.match(alerta.textContent, /dois salários brutos mensais do agregado/);
  });

  test("o valor pré-preenchido continua editável pelo utilizador", async () => {
    const r = calcularCadeiaSalarial(2500, { tipoTrabalhador: "dependente", estadoCivil: "individual", regiao: "continente" });
    await atualizarPeriodoAtual({ rendimentos: r });

    const container = getContainer();
    render(container);
    await waitFor(() => container.querySelector("#bm-salario-bruto").value !== "");

    setInput(container, "bm-salario-bruto", 999);
    assert.equal(container.querySelector("#bm-salario-bruto").value, "999");
  });
});

describe("Benchmark OCDE — acessibilidade básica", () => {
  test("tem exatamente um h1 com foco programático", () => {
    const container = getContainer();
    render(container);
    const headings = container.querySelectorAll("h1");
    assert.equal(headings.length, 1);
    assert.equal(headings[0].tabIndex, -1);
  });
});
