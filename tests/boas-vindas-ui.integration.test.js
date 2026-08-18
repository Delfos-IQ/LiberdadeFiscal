// Liberdade Fiscal — Teste de integração do ecrã de boas-vindas
// Executar: node --test tests/
//
// Comportamento revisto a pedido do autor (18/08/2026): o ecrã mostra-
// se SEMPRE ao abrir a app, não só na primeira visita — só deixa de
// aparecer se a pessoa marcar explicitamente "Não mostrar esta
// introdução da próxima vez". Ver app.js (showBrandIntro) para o
// ponto de entrada e modules/boas-vindas.js para a UI.

import "fake-indexeddb/auto";
import { test, describe, before, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";

import { dbClear, getSetting } from "../data/db.js";
import { render } from "../modules/boas-vindas.js";

before(() => {
  const dom = new JSDOM("<!DOCTYPE html><html><body></body></html>", { url: "http://localhost/" });
  global.window = dom.window;
  global.document = dom.window.document;
  global.HTMLElement = dom.window.HTMLElement;
});

beforeEach(async () => {
  await dbClear("userSettings");
});

function getContainer() {
  const container = document.createElement("div");
  document.body.appendChild(container);
  return container;
}

describe("modules/boas-vindas.js", () => {
  test("mostra o heading, os 4 princípios, e a opção 'não mostrar novamente' desmarcada por omissão", () => {
    const container = getContainer();
    render(container, { onComplete: () => {} });

    assert.ok(container.querySelector("#welcome-hero-heading"));
    assert.equal(container.querySelectorAll(".welcome-promise").length, 4);

    const checkbox = container.querySelector("#welcome-nao-mostrar");
    assert.ok(checkbox);
    assert.equal(checkbox.checked, false);

    const label = container.querySelector('label[for="welcome-nao-mostrar"]');
    assert.ok(label, "a checkbox devia ter uma label associada");
  });

  test("o heading recebe foco ao carregar", () => {
    const container = getContainer();
    render(container, { onComplete: () => {} });
    assert.equal(document.activeElement, container.querySelector("#welcome-hero-heading"));
  });

  test("clicar 'Vamos começar' SEM marcar a opção não grava introVista (o ecrã deve voltar a aparecer)", async () => {
    const container = getContainer();
    let completou = false;
    render(container, { onComplete: () => { completou = true; } });

    const cta = [...container.querySelectorAll("button")].find((b) => b.textContent.includes("Vamos começar"));
    cta.click();
    await new Promise((resolve) => setTimeout(resolve, 10));

    assert.equal(completou, true);
    const introVista = await getSetting("introVista");
    assert.equal(introVista, null, "introVista não devia ficar gravado se a opção não foi marcada");
  });

  test("marcando 'não mostrar novamente' antes de clicar, grava introVista=true", async () => {
    const container = getContainer();
    let completou = false;
    render(container, { onComplete: () => { completou = true; } });

    const checkbox = container.querySelector("#welcome-nao-mostrar");
    checkbox.checked = true;

    const cta = [...container.querySelectorAll("button")].find((b) => b.textContent.includes("Vamos começar"));
    cta.click();
    await new Promise((resolve) => setTimeout(resolve, 10));

    assert.equal(completou, true);
    const introVista = await getSetting("introVista");
    assert.equal(introVista, true);
  });
});
