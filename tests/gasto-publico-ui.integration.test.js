// Liberdade Fiscal — Teste de integração do módulo de UI "Para onde
// vão os impostos" (Gasto Público, 22/08/2026)
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

  ({ render } = await import("../modules/gasto-publico.js"));
});

function getContainer() {
  const container = document.createElement("div");
  document.body.appendChild(container);
  return container;
}

describe("modules/gasto-publico.js — render", () => {
  test("desenha o heading principal", () => {
    const container = getContainer();
    render(container);

    const heading = container.querySelector("#gasto-publico-heading");
    assert.ok(heading, "heading principal em falta");
    assert.match(heading.textContent, /Para onde vão os impostos/);
  });

  test("explica que os valores são absolutos, sem percentagem do total", () => {
    const container = getContainer();
    render(container);

    assert.match(container.textContent, /valores absolutos/);
    assert.match(container.textContent, /não percentagens do total/);
  });

  test("mostra uma barra de comparação por rúbrica", () => {
    const container = getContainer();
    render(container);

    const linhas = container.querySelectorAll(".benchmark-linha");
    assert.equal(linhas.length, 4, "esperavam-se quatro barras (uma por rúbrica)");
  });

  test("mostra um bloco de detalhe por rúbrica, com fonte e link", () => {
    const container = getContainer();
    render(container);

    const blocos = container.querySelectorAll(".gasto-publico-rubrica");
    assert.equal(blocos.length, 4);

    blocos.forEach((bloco) => {
      const link = bloco.querySelector("a");
      assert.ok(link, "link de fonte em falta num bloco de rúbrica");
      assert.ok(link.href.startsWith("https://"), "sourceUrl inválido no link renderizado");
    });
  });

  test("mostra o rótulo de estimativa para educação (valor orçamentado, não execução final)", () => {
    const container = getContainer();
    render(container);

    assert.match(container.textContent, /Valor orçamentado/);
  });

  test("botão 'Voltar ao Dia da Liberdade' altera window.location.hash", () => {
    const container = getContainer();
    render(container);

    const botao = [...container.querySelectorAll("button")].find((b) =>
      b.textContent.includes("Voltar ao Dia da Liberdade")
    );
    assert.ok(botao, "botão de voltar em falta");
    botao.click();
    assert.equal(window.location.hash, "#dia-liberdade");
  });

  test("destroy() limpa o container", () => {
    const container = getContainer();
    const instance = render(container);
    assert.ok(container.children.length > 0);
    instance.destroy();
    assert.equal(container.children.length, 0);
  });
});
