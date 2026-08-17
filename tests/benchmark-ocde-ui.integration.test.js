// Liberdade Fiscal — Teste de integração do módulo de UI do Benchmark
// Internacional OCDE (Fase 8)
// Executar: node --test tests/

import { test, describe, before } from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";

let render;

before(async () => {
  const dom = new JSDOM("<!DOCTYPE html><html><body></body></html>", { url: "http://localhost/" });
  global.window = dom.window;
  global.document = dom.window.document;
  global.HTMLElement = dom.window.HTMLElement;
  global.Intl = Intl;

  ({ render } = await import("../modules/benchmark-ocde.js"));
});

function getContainer() {
  const container = document.createElement("div");
  document.body.appendChild(container);
  return container;
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

describe("Benchmark OCDE — acessibilidade básica", () => {
  test("tem exatamente um h1 com foco programático", () => {
    const container = getContainer();
    render(container);
    const headings = container.querySelectorAll("h1");
    assert.equal(headings.length, 1);
    assert.equal(headings[0].tabIndex, -1);
  });
});
