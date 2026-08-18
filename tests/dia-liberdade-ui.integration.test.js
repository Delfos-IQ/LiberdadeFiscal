// Liberdade Fiscal — Teste de integração do módulo de UI do Dia da
// Liberdade Fiscal (Fase 7, redesenhado em agosto de 2026)
// Executar: node --test tests/
//
// Redesenho de agosto de 2026: este ecrã deixou de pedir
// salário/tipo de trabalhador — lê o Período acumulado (data/db.js,
// preenchido pelos ecrãs Rendimentos → Gastos → Taxas) e só mostra um
// botão "Calcular". Testa os três estados (falta rendimento / pronto a
// calcular / resultado), o aviso de dados em falta, e o fecho de
// período.

import "fake-indexeddb/auto";
import { test, describe, before, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";

import { dbClear, atualizarPeriodoAtual, getPeriodoAtual } from "../data/db.js";
import { calcularCadeiaSalarial } from "../data/tax-engine.js";
import { render } from "../modules/dia-liberdade.js";

before(async () => {
  const dom = new JSDOM("<!DOCTYPE html><html><body></body></html>", { url: "http://localhost/" });
  global.window = dom.window;
  global.document = dom.window.document;
  global.HTMLElement = dom.window.HTMLElement;
  global.Intl = Intl;
});

beforeEach(async () => {
  await dbClear("invoices");
  await dbClear("periodicTaxes");
  await dbClear("userSettings");
  await dbClear("periodosFechados");
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

function clickByText(container, text) {
  const btn = [...container.querySelectorAll("button")].find((b) => b.textContent.includes(text));
  assert.ok(btn, `devia existir um botão com o texto "${text}"`);
  btn.click();
  return btn;
}

async function preencherRendimentos(salario = 2000) {
  const r = calcularCadeiaSalarial(salario, {
    tipoTrabalhador: "dependente",
    estadoCivil: "individual",
    dependentes: [],
    regiao: "continente",
  });
  await atualizarPeriodoAtual({ rendimentos: r });
}

describe("Dia da Liberdade Fiscal — sem rendimento registado", () => {
  test("mostra mensagem a pedir para preencher Rendimentos primeiro, com link", async () => {
    const container = getContainer();
    render(container);
    await waitFor(() => container.querySelector("#dia-liberdade-heading"));

    assert.match(container.textContent, /Ainda não há rendimento registado/);
    const link = container.querySelector('a[href="#taximetro"]');
    assert.ok(link, "devia existir um link para o ecrã de Rendimentos");
  });
});

describe("Dia da Liberdade Fiscal — pronto a calcular", () => {
  test("com rendimento preenchido mostra o resumo do período e o botão Calcular", async () => {
    await preencherRendimentos();
    const container = getContainer();
    render(container);
    await waitFor(() => container.textContent.includes("Calcular o meu Dia da Liberdade Fiscal"));

    assert.match(container.textContent, /Rendimentos/);
    assert.match(container.textContent, /por preencher \(opcional\)/);
  });

  test("clicar em Calcular mostra o resultado", async () => {
    await preencherRendimentos();
    const container = getContainer();
    render(container);
    await waitFor(() => container.textContent.includes("Calcular o meu Dia da Liberdade Fiscal"));

    clickByText(container, "Calcular o meu Dia da Liberdade Fiscal");
    await waitFor(() => container.querySelector("#resultado-dia-heading"));

    assert.ok(container.querySelector("#resultado-dia-heading"));
    assert.ok(container.querySelector(".stat-hero"));
  });
});

describe("Dia da Liberdade Fiscal — resultado", () => {
  test("com só rendimento preenchido, o resultado avisa que Gastos e Taxas não foram incluídos", async () => {
    await preencherRendimentos();
    const container = getContainer();
    render(container);
    await waitFor(() => container.textContent.includes("Calcular o meu Dia da Liberdade Fiscal"));
    clickByText(container, "Calcular o meu Dia da Liberdade Fiscal");
    await waitFor(() => container.querySelector("#resultado-dia-heading"));

    assert.match(container.textContent, /NÃO inclui/);
    assert.match(container.textContent, /Gastos/);
    assert.match(container.textContent, /Taxas/);
  });

  test("inclui os totais de Gastos e Taxas já guardados no período, sem aviso de dados em falta", async () => {
    await preencherRendimentos();
    await atualizarPeriodoAtual({
      gastosMensal: {
        regiao: "continente",
        categorias: [{ id: "alimentacao", label: "Alimentação", valorMensal: 100, ivaMensal: 5.66 }],
        totalMensal: 100,
        totalIvaMensal: 5.66,
      },
    });
    await atualizarPeriodoAtual({
      taxasAnuais: { total: 300, items: [{ tipo: "IMI", valor: 300 }] },
    });

    const container = getContainer();
    render(container);
    await waitFor(() => container.textContent.includes("Calcular o meu Dia da Liberdade Fiscal"));
    clickByText(container, "Calcular o meu Dia da Liberdade Fiscal");
    await waitFor(() => container.querySelector("#resultado-dia-heading"));

    assert.doesNotMatch(container.textContent, /NÃO inclui/);
    assert.match(container.textContent, /300,00\s?€|300\.00/);
  });

  test("o ecrã de resultado nunca afirma que se deixa de pagar impostos a partir dessa data", async () => {
    await preencherRendimentos();
    const container = getContainer();
    render(container);
    await waitFor(() => container.textContent.includes("Calcular o meu Dia da Liberdade Fiscal"));
    clickByText(container, "Calcular o meu Dia da Liberdade Fiscal");
    await waitFor(() => container.querySelector("#resultado-dia-heading"));

    assert.doesNotMatch(container.textContent.toLowerCase(), /deixas de pagar impostos a partir de hoje\./);
    assert.match(container.textContent, /proporção anual/);
  });

  test("inclui o disclaimer legal no ecrã de resultado", async () => {
    await preencherRendimentos();
    const container = getContainer();
    render(container);
    await waitFor(() => container.textContent.includes("Calcular o meu Dia da Liberdade Fiscal"));
    clickByText(container, "Calcular o meu Dia da Liberdade Fiscal");
    await waitFor(() => container.querySelector("#resultado-dia-heading"));

    assert.ok(container.querySelector(".disclaimer"));
  });

  test("mostra o link 'Comparar com a OCDE' e o botão 'Partilhar resultado'", async () => {
    await preencherRendimentos();
    const container = getContainer();
    render(container);
    await waitFor(() => container.textContent.includes("Calcular o meu Dia da Liberdade Fiscal"));
    clickByText(container, "Calcular o meu Dia da Liberdade Fiscal");
    await waitFor(() => container.querySelector("#resultado-dia-heading"));

    const compararLink = container.querySelector('a[href="#benchmark-ocde"]');
    assert.ok(compararLink, "devia existir um link para o benchmark OCDE");

    const partilharBtn = [...container.querySelectorAll("button")].find((b) =>
      b.textContent.includes("Partilhar resultado")
    );
    assert.ok(partilharBtn, "devia existir um botão de partilha");
    assert.doesNotThrow(() => partilharBtn.click());
  });

  test("mostra sempre um botão \"Descarregar imagem\", independente do menu de partilha nativo", async () => {
    await preencherRendimentos();
    const container = getContainer();
    render(container);
    await waitFor(() => container.textContent.includes("Calcular o meu Dia da Liberdade Fiscal"));
    clickByText(container, "Calcular o meu Dia da Liberdade Fiscal");
    await waitFor(() => container.querySelector("#resultado-dia-heading"));

    const descarregarBtn = [...container.querySelectorAll("button")].find((b) =>
      b.textContent.includes("Descarregar imagem")
    );
    assert.ok(descarregarBtn, "devia existir um botão para descarregar a imagem manualmente");
    assert.doesNotThrow(() => descarregarBtn.click());
    assert.match(container.textContent, /Descarregar imagem/);
  });

  test("botão 'Exportar relatório (PDF)' (roadmap P3-16): abre a metodologia e chama window.print()", async () => {
    await preencherRendimentos();
    const container = getContainer();
    render(container);
    await waitFor(() => container.textContent.includes("Calcular o meu Dia da Liberdade Fiscal"));
    clickByText(container, "Calcular o meu Dia da Liberdade Fiscal");
    await waitFor(() => container.querySelector("#resultado-dia-heading"));

    const exportarBtn = [...container.querySelectorAll("button")].find((b) =>
      b.textContent.includes("Exportar relatório (PDF)")
    );
    assert.ok(exportarBtn, "devia existir um botão para exportar o relatório em PDF");

    const detalhes = container.querySelector("details");
    assert.equal(detalhes.open, false, "a metodologia começa fechada");

    let printChamado = false;
    const printOriginal = window.print;
    window.print = () => {
      printChamado = true;
    };
    try {
      exportarBtn.click();
    } finally {
      window.print = printOriginal;
    }

    assert.equal(printChamado, true, "window.print() devia ter sido chamado");
    assert.equal(detalhes.open, true, "a metodologia deve abrir-se automaticamente antes de imprimir");
  });

  test("as ações interativas (Recalcular, Partilhar, Fechar período) têm a classe no-print", async () => {
    await preencherRendimentos();
    const container = getContainer();
    render(container);
    await waitFor(() => container.textContent.includes("Calcular o meu Dia da Liberdade Fiscal"));
    clickByText(container, "Calcular o meu Dia da Liberdade Fiscal");
    await waitFor(() => container.querySelector("#resultado-dia-heading"));

    const acoes = container.querySelector(".faturas-actions");
    assert.ok(acoes.classList.contains("no-print"));

    const fecharBtn = [...container.querySelectorAll("button")].find((b) =>
      b.textContent.includes("Fechar este período")
    );
    assert.ok(fecharBtn.classList.contains("no-print"));
  });

  test("Recalcular volta ao ecrã de resumo/Calcular (não pede dados outra vez)", async () => {
    await preencherRendimentos();
    const container = getContainer();
    render(container);
    await waitFor(() => container.textContent.includes("Calcular o meu Dia da Liberdade Fiscal"));
    clickByText(container, "Calcular o meu Dia da Liberdade Fiscal");
    await waitFor(() => container.querySelector("#resultado-dia-heading"));

    clickByText(container, "Recalcular");
    await waitFor(() => container.textContent.includes("Calcular o meu Dia da Liberdade Fiscal"));

    assert.ok(container.querySelector("#dia-liberdade-heading"));
  });

  test("'Fechar este período e começar um novo' guarda no histórico e reinicia o período", async () => {
    await preencherRendimentos();
    const container = getContainer();
    render(container);
    await waitFor(() => container.textContent.includes("Calcular o meu Dia da Liberdade Fiscal"));
    clickByText(container, "Calcular o meu Dia da Liberdade Fiscal");
    await waitFor(() => container.querySelector("#resultado-dia-heading"));

    clickByText(container, "Fechar este período e começar um novo");
    await waitFor(() => container.textContent.includes("Ainda não há rendimento registado"));

    const periodo = await getPeriodoAtual();
    assert.equal(periodo.rendimentos, null, "o período atual deve ter reiniciado");
  });

  test("comparativa com períodos anteriores (roadmap P3-14): não aparece no primeiro cálculo", async () => {
    await preencherRendimentos();
    const container = getContainer();
    render(container);
    await waitFor(() => container.textContent.includes("Calcular o meu Dia da Liberdade Fiscal"));
    clickByText(container, "Calcular o meu Dia da Liberdade Fiscal");
    await waitFor(() => container.querySelector("#resultado-dia-heading"));

    assert.equal(container.querySelector("#comparativa-historico-heading"), null);
  });

  test("comparativa com períodos anteriores: aparece depois de fechar um período e calcular de novo", async () => {
    await preencherRendimentos(1800);
    const container = getContainer();
    render(container);
    await waitFor(() => container.textContent.includes("Calcular o meu Dia da Liberdade Fiscal"));
    clickByText(container, "Calcular o meu Dia da Liberdade Fiscal");
    await waitFor(() => container.querySelector("#resultado-dia-heading"));
    clickByText(container, "Fechar este período e começar um novo");
    await waitFor(() => container.textContent.includes("Ainda não há rendimento registado"));

    await preencherRendimentos(2400);
    // Recarrega o módulo para forçar o load() inicial a ler o histórico
    // já com a entrada recém-fechada (o state.historico de uma
    // instância anterior não é partilhado).
    const container2 = getContainer();
    render(container2);
    await waitFor(() => container2.textContent.includes("Calcular o meu Dia da Liberdade Fiscal"));
    clickByText(container2, "Calcular o meu Dia da Liberdade Fiscal");
    await waitFor(() => container2.querySelector("#resultado-dia-heading"));
    await waitFor(() => container2.querySelector("#comparativa-historico-heading") !== null);

    const comparativa = container2.querySelector("#comparativa-historico-heading");
    assert.ok(comparativa, "a secção de comparativa devia aparecer com um período fechado no histórico");

    const tabela = container2.querySelector(".dia-liberdade-comparativa table");
    assert.ok(tabela);
    const linhas = tabela.querySelectorAll("tbody tr");
    // 1 linha do período fechado + 1 linha "Atual (por fechar)"
    assert.equal(linhas.length, 2);
    assert.match(linhas[1].textContent, /Atual \(por fechar\)/);

    assert.match(container2.textContent, /Face ao período fechado mais recente/);
  });
});

describe("Dia da Liberdade Fiscal — acessibilidade básica", () => {
  test("cada ecrã tem exatamente um h1 com foco programático (sem rendimento registado)", async () => {
    const container = getContainer();
    render(container);
    await waitFor(() => container.querySelector("#dia-liberdade-heading"));
    const headings = container.querySelectorAll("h1");
    assert.equal(headings.length, 1);
    assert.equal(headings[0].tabIndex, -1);
  });

  test("cada ecrã tem exatamente um h1 com foco programático (ecrã de resultado)", async () => {
    await preencherRendimentos();
    const container = getContainer();
    render(container);
    await waitFor(() => container.textContent.includes("Calcular o meu Dia da Liberdade Fiscal"));
    clickByText(container, "Calcular o meu Dia da Liberdade Fiscal");
    await waitFor(() => container.querySelector("#resultado-dia-heading"));

    const headings = container.querySelectorAll("h1");
    assert.equal(headings.length, 1);
    assert.equal(headings[0].tabIndex, -1);
  });
});
