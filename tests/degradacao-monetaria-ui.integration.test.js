// Liberdade Fiscal — Teste de integração do módulo de UI "Degradação
// Monetária" (22/08/2026)
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

  ({ render } = await import("../modules/degradacao-monetaria.js"));
});

function getContainer() {
  const container = document.createElement("div");
  document.body.appendChild(container);
  return container;
}

describe("modules/degradacao-monetaria.js — render", () => {
  test("desenha o heading principal e o texto explicativo", () => {
    const container = getContainer();
    render(container);

    const heading = container.querySelector("#degradacao-monetaria-heading");
    assert.ok(heading, "heading principal em falta");
    assert.match(heading.textContent, /Degradação Monetária/);
  });

  test("mostra a comparação nominal vs. inflação acumulada, com duas barras", () => {
    const container = getContainer();
    render(container);

    const linhas = container.querySelectorAll(".benchmark-linha");
    assert.equal(linhas.length, 2, "esperavam-se exatamente duas barras (nominal e inflação)");
  });

  test("mostra a tabela ano a ano com uma linha por ano de 2021 a 2026", () => {
    const container = getContainer();
    render(container);

    const linhasTabela = container.querySelectorAll(".taximetro-escaloes tbody tr");
    assert.equal(linhasTabela.length, 6);
  });

  test("mostra o disclaimer sobre 2026 estar em curso", () => {
    const container = getContainer();
    render(container);

    const texto = container.textContent;
    assert.match(texto, /2026 ainda está em curso/);
  });

  test("botão 'Voltar ao Dia da Liberdade' altera window.location.hash", () => {
    const container = getContainer();
    render(container);

    const botao = [...container.querySelectorAll("button")].find((b) => b.textContent.includes("Voltar ao Dia da Liberdade"));
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
