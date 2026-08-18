// Liberdade Fiscal — Teste de integração do módulo de UI do Taxímetro
// Executar: node --test tests/
//
// Sobe um DOM real via jsdom e simula o preenchimento do formulário —
// Modo Rápido e Modo Avançado — até ao ecrã de resultado.
//
// Usa fake-indexeddb: desde que este módulo passou a re-hidratar-se a
// partir do Período atual ao montar (ver getPeriodoAtual() em
// modules/taximetro.js), toca sempre em IndexedDB, mesmo nos testes
// que nunca chegam a clicar em "Guardar e avançar".

import "fake-indexeddb/auto";
import { test, describe, before, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";

let render, dbClear, getPeriodoAtual;

before(async () => {
  const dom = new JSDOM("<!DOCTYPE html><html><body></body></html>", { url: "http://localhost/" });
  global.window = dom.window;
  global.document = dom.window.document;
  global.HTMLElement = dom.window.HTMLElement;
  global.Intl = Intl; // jsdom usa o Intl do próprio Node — só garantir que está acessível

  ({ render } = await import("../modules/taximetro.js"));
  ({ dbClear, getPeriodoAtual } = await import("../data/db.js"));
});

beforeEach(async () => {
  await dbClear("userSettings");
});

async function waitFor(predicate, { timeout = 1000, interval = 5 } = {}) {
  const inicio = Date.now();
  while (Date.now() - inicio < timeout) {
    if (predicate()) return true;
    await new Promise((resolve) => setTimeout(resolve, interval));
  }
  return predicate();
}

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

    assert.match(container.textContent, /O teu Rendimento/);
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

describe("Taxímetro — re-hidratação a partir do Período guardado", () => {
  test("voltar ao ecrã depois de guardar mostra o resultado, não o formulário vazio", async () => {
    // Regressão: navegar Rendimentos → Gastos → Taxas → Dia da
    // Liberdade e voltar a Rendimentos mostrava o formulário em branco,
    // mesmo com o Período a manter o resultado corretamente (Dia da
    // Liberdade continuava certo). O módulo nunca se re-hidratava a
    // partir do período guardado ao montar — só escrevia, nunca lia.
    const container1 = getContainer();
    render(container1);
    setInput(container1, "salario-bruto", 2000);
    submitForm(container1);

    const avancarBtn = [...container1.querySelectorAll("button")].find((b) =>
      b.textContent.includes("Guardar e avançar")
    );
    avancarBtn.click();
    // window.location.hash só muda depois do "await atualizarPeriodoAtual(...)"
    // dentro do handler de clique — é um proxy síncrono fiável para
    // "a escrita no IndexedDB já terminou" (waitFor só suporta
    // predicados síncronos, nunca uma Promise, que seria sempre truthy).
    await waitFor(() => window.location.hash === "#faturas");
    assert.ok((await getPeriodoAtual()).rendimentos, "devia ter persistido rendimentos no período");

    // Simula "voltar" a Rendimentos: nova instância do módulo, novo
    // container (é o que app.js faz a cada mudança de rota).
    const container2 = getContainer();
    render(container2);
    await waitFor(() => container2.querySelector(".stat-hero"));

    assert.ok(
      container2.querySelector(".stat-hero"),
      "devia mostrar o ecrã de resultado, não o formulário vazio"
    );
    assert.equal(
      container2.querySelector("#salario-bruto"),
      null,
      "não devia mostrar o formulário em branco depois de já ter dados guardados"
    );
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

describe("Taxímetro — agregado familiar / declaração conjunta com dois rendimentos (roadmap P3-15)", () => {
  test("o campo do rendimento do cônjuge só aparece quando 'conjunta' está selecionado", () => {
    const container = getContainer();
    render(container);
    assert.equal(container.querySelector("#salario-bruto-conjuge"), null);

    setSelect(container, "estado-civil", "conjunta");
    assert.ok(container.querySelector("#salario-bruto-conjuge"));

    setSelect(container, "estado-civil", "individual");
    assert.equal(container.querySelector("#salario-bruto-conjuge"), null);
  });

  test("sem preencher o rendimento do cônjuge, 'conjunta' continua a comportar-se como antes (um só rendimento)", () => {
    const container = getContainer();
    render(container);
    setInput(container, "salario-bruto", 2000);
    setSelect(container, "estado-civil", "conjunta");
    submitForm(container);

    assert.ok(container.querySelector("#taximetro-result-heading"));
    assert.match(container.textContent, /Salário bruto/);
    assert.doesNotMatch(container.textContent, /Rendimento bruto combinado do agregado/);
  });

  test("preenchendo os dois rendimentos, mostra o resultado combinado e a repartição por pessoa", () => {
    const container = getContainer();
    render(container);
    setInput(container, "salario-bruto", 2000);
    setSelect(container, "estado-civil", "conjunta");
    setInput(container, "salario-bruto-conjuge", 1500);
    submitForm(container);

    assert.ok(container.querySelector("#taximetro-result-heading"));
    assert.match(container.textContent, /Rendimento bruto combinado do agregado/);
    assert.match(container.textContent, /Pessoa A — rendimento bruto/);
    assert.match(container.textContent, /Pessoa B — rendimento bruto/);
    // 2000 + 1500 = 3500€ combinados
    assert.match(container.textContent, /3\s?500,00\s?€|3.500,00\s?€/);
  });

  test("rendimento do cônjuge inválido (negativo) mostra erro em vez de calcular", () => {
    const container = getContainer();
    render(container);
    setInput(container, "salario-bruto", 2000);
    setSelect(container, "estado-civil", "conjunta");
    setInput(container, "salario-bruto-conjuge", -100);
    submitForm(container);

    const erro = container.querySelector('[role="alert"]');
    assert.ok(erro);
    assert.match(erro.textContent, /cônjuge/);
    assert.equal(container.querySelector("#taximetro-result-heading"), null);
  });

  test("'Guardar e avançar' persiste o resultado conjunto e a rehidratação volta a mostrá-lo", async () => {
    window.location.hash = "";
    const container = getContainer();
    render(container);
    setInput(container, "salario-bruto", 2200);
    setSelect(container, "estado-civil", "conjunta");
    setInput(container, "salario-bruto-conjuge", 1800);
    submitForm(container);
    await waitFor(() => container.querySelector("#taximetro-result-heading"));

    const avancarBtn = [...container.querySelectorAll("button")].find((b) => b.textContent.includes("Guardar e avançar"));
    avancarBtn.click();
    await waitFor(() => window.location.hash === "#faturas");

    const periodo = await getPeriodoAtual();
    assert.equal(periodo.rendimentos.modo, "conjunta-dois-rendimentos");
    assert.equal(periodo.rendimentos.pessoaA.salarioBrutoMensal, 2200);
    assert.equal(periodo.rendimentos.pessoaB.salarioBrutoMensal, 1800);
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
