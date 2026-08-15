// Liberdade Fiscal — Teste de integração do módulo de UI do Taxímetro
// Executar: node --test tests/
//
// Sobe um DOM real via jsdom e simula o preenchimento do formulário —
// Modo Rápido e Modo Avançado — até ao ecrã de resultado.

import { test, describe, before } from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";

let render;

before(async () => {
  const dom = new JSDOM("<!DOCTYPE html><html><body></body></html>", { url: "http://localhost/" });
  global.window = dom.window;
  global.document = dom.window.document;
  global.HTMLElement = dom.window.HTMLElement;
  global.Intl = Intl; // jsdom usa o Intl do próprio Node — só garantir que está acessível

  ({ render } = await import("../modules/taximetro.js"));
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

function setSelect(container, id, value) {
  const select = container.querySelector(`#${id}`);
  select.value = value;
  select.dispatchEvent(new window.Event("change", { bubbles: true }));
}

function submitForm(container) {
  const form = container.querySelector("form");
  form.dispatchEvent(new window.Event("submit", { bubbles: true, cancelable: true }));
}

describe("Taxímetro — Modo Rápido", () => {
  test("mostra os 4 campos obrigatórios do Modo Rápido", () => {
    const container = getContainer();
    render(container);
    assert.ok(container.querySelector("#salario-bruto"));
    assert.ok(container.querySelector("#tipo-trabalhador"));
    assert.ok(container.querySelector("#estado-civil"));
    assert.ok(container.querySelector("#regiao"));
  });

  test("submeter com salário válido mostra o resultado com a cadeia completa", () => {
    const container = getContainer();
    render(container);
    setInput(container, "salario-bruto", 2000);
    submitForm(container);

    assert.match(container.textContent, /O teu Taxímetro/);
    assert.match(container.textContent, /Custo total para o empregador/);
    assert.match(container.textContent, /Segurança Social/);
    assert.match(container.textContent, /IRS estimado/);
    assert.match(container.textContent, /Salário líquido/);
  });

  test("salário vazio ou zero mostra erro e não avança para o resultado", () => {
    const container = getContainer();
    render(container);
    setInput(container, "salario-bruto", 0);
    submitForm(container);

    assert.match(container.textContent, /Introduz um salário bruto/);
    assert.equal(container.querySelector("#salario-bruto") !== null, true, "deve continuar no formulário");
  });

  test("salário negativo é rejeitado", () => {
    const container = getContainer();
    render(container);
    setInput(container, "salario-bruto", -500);
    submitForm(container);
    assert.match(container.textContent, /Introduz um salário bruto/);
  });

  test("mudar para trabalhador independente altera o resultado face a dependente, para o mesmo bruto", () => {
    const container1 = getContainer();
    render(container1);
    setInput(container1, "salario-bruto", 2000);
    submitForm(container1);
    const custoDependente = container1.querySelector(".taximetro-cadeia dd").textContent;

    const container2 = getContainer();
    render(container2);
    setInput(container2, "salario-bruto", 2000);
    setSelect(container2, "tipo-trabalhador", "independente");
    submitForm(container2);
    const custoIndependente = container2.querySelector(".taximetro-cadeia dd").textContent;

    assert.notEqual(custoDependente, custoIndependente);
  });

  test('"Simular outro valor" volta ao formulário', () => {
    const container = getContainer();
    render(container);
    setInput(container, "salario-bruto", 1500);
    submitForm(container);

    const voltarBtn = [...container.querySelectorAll("button")].find((b) =>
      /Simular outro valor/.test(b.textContent)
    );
    assert.ok(voltarBtn);
    voltarBtn.click();

    assert.ok(container.querySelector("#salario-bruto"), "deve mostrar o formulário outra vez");
  });
});

describe("Taxímetro — Modo Avançado", () => {
  test("alternar para Modo Avançado troca o campo de contagem por lista de dependentes com idade", () => {
    const container = getContainer();
    render(container);

    const avancadoBtn = [...container.querySelectorAll("button")].find((b) => /Modo Avançado/.test(b.textContent));
    avancadoBtn.click();

    assert.equal(container.querySelector("#num-dependentes"), null);
    assert.ok(container.querySelector(".taximetro-dependentes"));
  });

  test('"+ Adicionar dependente" cria uma linha com input de idade', () => {
    const container = getContainer();
    render(container);
    const avancadoBtn = [...container.querySelectorAll("button")].find((b) => /Modo Avançado/.test(b.textContent));
    avancadoBtn.click();

    const addBtn = [...container.querySelectorAll("button")].find((b) => /Adicionar dependente/.test(b.textContent));
    addBtn.click();

    const rows = container.querySelectorAll(".taximetro-dependente-row");
    assert.equal(rows.length, 1);
  });

  test("dependente com idade <=3 anos no Modo Avançado resulta em dedução diferente do Modo Rápido", () => {
    const containerAvancado = getContainer();
    render(containerAvancado);
    let btn = [...containerAvancado.querySelectorAll("button")].find((b) => /Modo Avançado/.test(b.textContent));
    btn.click();
    btn = [...containerAvancado.querySelectorAll("button")].find((b) => /Adicionar dependente/.test(b.textContent));
    btn.click();
    // O input de idade não tem id (é gerado dinamicamente por linha) —
    // seleciona-se diretamente pela classe do wrapper.
    const idadeInput = containerAvancado.querySelector(".taximetro-dependente-row input");
    idadeInput.value = "2";
    idadeInput.dispatchEvent(new window.Event("input", { bubbles: true }));
    setInput(containerAvancado, "salario-bruto", 3000);
    submitForm(containerAvancado);

    assert.match(containerAvancado.textContent, /726/); // dedução para <=3 anos

    const containerRapido = getContainer();
    render(containerRapido);
    setInput(containerRapido, "salario-bruto", 3000);
    setInput(containerRapido, "num-dependentes", 1);
    submitForm(containerRapido);
    assert.match(containerRapido.textContent, /600/); // Modo Rápido assume >3 anos
  });

  test('"Remover" apaga a linha do dependente', () => {
    const container = getContainer();
    render(container);
    let btn = [...container.querySelectorAll("button")].find((b) => /Modo Avançado/.test(b.textContent));
    btn.click();
    btn = [...container.querySelectorAll("button")].find((b) => /Adicionar dependente/.test(b.textContent));
    btn.click();
    assert.equal(container.querySelectorAll(".taximetro-dependente-row").length, 1);

    const removeBtn = [...container.querySelectorAll("button")].find((b) => /Remover/.test(b.textContent));
    removeBtn.click();
    assert.equal(container.querySelectorAll(".taximetro-dependente-row").length, 0);
  });
});

describe("Taxímetro — acessibilidade e ciclo de vida", () => {
  test("o heading principal recebe foco ao carregar o formulário", () => {
    const container = getContainer();
    render(container);
    assert.equal(document.activeElement, container.querySelector("#taximetro-heading"));
  });

  test("o heading do resultado recebe foco ao submeter", () => {
    const container = getContainer();
    render(container);
    setInput(container, "salario-bruto", 2000);
    submitForm(container);
    assert.equal(document.activeElement, container.querySelector("#taximetro-result-heading"));
  });

  test("todos os campos do formulário têm <label> associado por htmlFor/id", () => {
    const container = getContainer();
    render(container);
    const inputs = container.querySelectorAll("input, select");
    inputs.forEach((input) => {
      if (!input.id) return;
      const label = container.querySelector(`label[for="${input.id}"]`);
      assert.ok(label, `input #${input.id} não tem label associado`);
    });
  });

  test("destroy() limpa o container", () => {
    const container = getContainer();
    const instance = render(container);
    assert.ok(container.children.length > 0);
    instance.destroy();
    assert.equal(container.children.length, 0);
  });
});
