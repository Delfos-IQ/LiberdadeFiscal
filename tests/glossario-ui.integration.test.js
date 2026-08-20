// Liberdade Fiscal — Teste de integração do módulo de UI do Glossário
// fiscal (19/08/2026)
// Executar: node --test tests/

import { test, describe, before } from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";

import { GLOSSARIO } from "../data/glosario.js";

let render;

before(async () => {
  const dom = new JSDOM("<!DOCTYPE html><html><body></body></html>", { url: "http://localhost/" });
  global.window = dom.window;
  global.document = dom.window.document;
  global.HTMLElement = dom.window.HTMLElement;
  global.Intl = Intl;

  ({ render } = await import("../modules/glossario.js"));
});

function getContainer() {
  const container = document.createElement("div");
  document.body.appendChild(container);
  return container;
}

describe("data/glosario.js — integridade dos dados", () => {
  test("todas as entradas têm id único", () => {
    const ids = GLOSSARIO.map((e) => e.id);
    const unicos = new Set(ids);
    assert.equal(unicos.size, ids.length, "há ids duplicados no glossário");
  });

  test("todas as entradas têm os campos obrigatórios preenchidos", () => {
    for (const entrada of GLOSSARIO) {
      for (const campo of [
        "id",
        "sigla",
        "nome",
        "tipo",
        "categoria",
        "pagaQuem_pt",
        "explicacao_pt",
        "comoSeCalcula_pt",
        "status",
        "source",
      ]) {
        assert.ok(
          typeof entrada[campo] === "string" && entrada[campo].length > 0,
          `entrada "${entrada.id}" tem o campo "${campo}" vazio ou em falta`
        );
      }
    }
  });

  test("status é sempre um dos três valores válidos", () => {
    for (const entrada of GLOSSARIO) {
      assert.ok(
        ["verified", "estimate", "unknown"].includes(entrada.status),
        `entrada "${entrada.id}" tem status inválido: "${entrada.status}"`
      );
    }
  });

  test("cobre as 13 figuras esperadas (11 da tabela do CLAUDE.md §7 + CAV + Taxa Turística)", () => {
    assert.equal(GLOSSARIO.length, 13);
  });
});

describe("Glossário fiscal — estrutura do ecrã", () => {
  test("tem exatamente um h1 com foco programático", () => {
    const container = getContainer();
    render(container);
    const headings = container.querySelectorAll("h1");
    assert.equal(headings.length, 1);
    assert.equal(headings[0].tabIndex, -1);
  });

  test("mostra uma <details> por cada entrada do glossário", () => {
    const container = getContainer();
    render(container);
    const detalhes = container.querySelectorAll("details.glossario-entrada");
    assert.equal(detalhes.length, GLOSSARIO.length);
  });

  test("cada <details> está fechada por omissão (não é um muro de texto)", () => {
    const container = getContainer();
    render(container);
    const detalhes = [...container.querySelectorAll("details.glossario-entrada")];
    assert.ok(detalhes.every((d) => !d.open));
  });

  test("mostra o disclaimer de âmbito (sem pensões/benefícios sociais)", () => {
    const container = getContainer();
    render(container);
    assert.match(container.textContent, /pensões/);
  });

  test("cada entrada mostra um link para a fonte oficial, quando existe sourceUrl", () => {
    const container = getContainer();
    render(container);
    const comSourceUrl = GLOSSARIO.filter((e) => e.sourceUrl).length;
    const links = container.querySelectorAll("details.glossario-entrada a[href]");
    assert.equal(links.length, comSourceUrl);
    links.forEach((link) => {
      assert.equal(link.target, "_blank");
      assert.equal(link.rel, "noopener noreferrer");
    });
  });

  test("destroy() limpa o container", () => {
    const container = getContainer();
    const instancia = render(container);
    instancia.destroy();
    assert.equal(container.innerHTML, "");
  });
});
