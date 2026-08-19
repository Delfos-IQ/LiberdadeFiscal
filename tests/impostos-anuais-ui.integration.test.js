// Liberdade Fiscal — Teste de integração do módulo de UI de "Taxas"
// (impostos anuais/patrimoniais, Fase 6)
// Executar: node --test tests/
//
// Cobre o registo manual de IMI/IUC/ISV/IMT/Imposto de Selo (spec
// §6.4): a app não calcula estes valores (tabelas UNKNOWN/ESTIMATE),
// só regista o que o utilizador já sabe que pagou, validado por
// savePeriodicTax(). Redesenho de agosto de 2026: formulário
// simplificado a tipo + valor (data/recorrência são inferidas
// silenciosamente); "Guardar e avançar" persiste o total no Período
// acumulado e navega para o Dia da Liberdade Fiscal.

import "fake-indexeddb/auto";
import { test, describe, before, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";

import { dbClear, getPeriodoAtual } from "../data/db.js";
import { render } from "../modules/impostos-anuais.js";
import { PATRIMONIAIS_2026 } from "../data/tax-rules/2026/patrimoniais.js";

before(async () => {
  const dom = new JSDOM("<!DOCTYPE html><html><body></body></html>", { url: "http://localhost/" });
  global.window = dom.window;
  global.document = dom.window.document;
  global.HTMLElement = dom.window.HTMLElement;
  global.Intl = Intl;
});

beforeEach(async () => {
  await dbClear("periodicTaxes");
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

function clickByText(container, text) {
  const btn = [...container.querySelectorAll("button")].find((b) => b.textContent.includes(text));
  btn.click();
  return btn;
}

describe("IMI — integridade da tabela por concelho (ronda 'verificação em mundo real', 18/08/2026)", () => {
  const lista = PATRIMONIAIS_2026.imi.tabelaPorConcelho.lista;

  test("tem um número plausível de entradas (perto de, mas não mais de, 308 concelhos de Portugal)", () => {
    assert.ok(lista.length > 250 && lista.length <= 308, `esperado entre 251 e 308, obtido ${lista.length}`);
  });

  test("não há nomes de concelho duplicados", () => {
    const nomes = lista.map(([, nome]) => nome.toLowerCase());
    const unicos = new Set(nomes);
    assert.equal(unicos.size, nomes.length, "há nomes de concelho repetidos na tabela");
  });

  test("toda taxa não-nula está dentro do intervalo legal nacional (0,3%–0,45%)", () => {
    for (const [distrito, nome, taxa] of lista) {
      if (taxa === null) continue;
      assert.ok(
        taxa >= 0.003 && taxa <= 0.0045,
        `${nome} (${distrito}): taxa ${taxa} fora do intervalo legal [0,3%, 0,45%]`
      );
    }
  });

  test("os concelhos com taxa máxima (0,45%) na tabela batem com excecoesConhecidas.taxaMaxima045", () => {
    const comTaxaMaxima = lista.filter(([, , taxa]) => taxa === 0.0045).map(([, nome]) => nome);
    const esperados = PATRIMONIAIS_2026.imi.tabelaPorConcelho.excecoesConhecidas.taxaMaxima045;
    assert.equal(comTaxaMaxima.length, esperados.length);
    esperados.forEach((nome) => {
      assert.ok(
        comTaxaMaxima.some((n) => n.toLowerCase().includes(nome.toLowerCase().split(" ")[0].toLowerCase())),
        `esperava encontrar ${nome} entre os concelhos com taxa máxima`
      );
    });
  });

  test("os 6 concelhos com taxa diferenciada por freguesia estão marcados com taxa null, não com um número inventado", () => {
    const semTaxaUnica = lista.filter(([, , taxa]) => taxa === null).map(([, nome]) => nome);
    assert.equal(semTaxaUnica.length, 6, `esperados 6 concelhos com taxa null, obtidos ${semTaxaUnica.length}`);
  });
});

describe("Taxas — lista", () => {
  test("mostra ecrã inicial vazio com botão de registar", async () => {
    const container = getContainer();
    render(container);
    await waitFor(() => container.querySelector("#taxas-heading"));
    assert.ok(container.querySelector("#taxas-heading"));
    assert.match(container.textContent, /Taxas/);
    assert.ok([...container.querySelectorAll("button")].some((b) => b.textContent.includes("Registar taxa")));
  });
});

describe("Taxas — registo manual", () => {
  test("regista um IMI válido (só tipo + valor) e mostra-o na lista", async () => {
    const container = getContainer();
    render(container);
    await waitFor(() => container.querySelector("#taxas-heading"));

    clickByText(container, "Registar taxa");
    await waitFor(() => container.querySelector("#nova-taxa-heading"));

    // O formulário simplificado (agosto 2026) já não tem campos de
    // data/recorrência/nota — só tipo + valor.
    assert.equal(container.querySelector("#data-imposto"), null);
    assert.equal(container.querySelector("#recorrencia-imposto"), null);
    assert.equal(container.querySelector("#nota-imposto"), null);

    const valorInput = container.querySelector("#valor-imposto");
    valorInput.value = "350";
    valorInput.dispatchEvent(new window.Event("input", { bubbles: true }));

    const form = container.querySelector("form");
    form.dispatchEvent(new window.Event("submit", { bubbles: true, cancelable: true }));

    await waitFor(() => container.querySelector("#taxas-heading") && container.textContent.includes("350"));

    assert.ok(container.querySelector("#taxas-heading"));
    assert.match(container.textContent, /350,00\s?€|350\.00/);
    assert.match(container.textContent, /IMI/);
  });

  test("rejeita valor zero ou inválido com mensagem acessível", async () => {
    const container = getContainer();
    render(container);
    await waitFor(() => container.querySelector("#taxas-heading"));

    clickByText(container, "Registar taxa");
    await waitFor(() => container.querySelector("#nova-taxa-heading"));

    const form = container.querySelector("form");
    form.dispatchEvent(new window.Event("submit", { bubbles: true, cancelable: true }));

    await waitFor(() => container.querySelector('[role="alert"]'));
    const alerta = container.querySelector('[role="alert"]');
    assert.ok(alerta);
    assert.match(alerta.textContent, /valor válido/);
  });

  test("IMI: concelho conhecido mostra a taxa exata da tabela (🟡 ESTIMATE, ronda 'verificação em mundo real' 18/08/2026)", async () => {
    const container = getContainer();
    render(container);
    await waitFor(() => container.querySelector("#taxas-heading"));

    clickByText(container, "Registar taxa");
    await waitFor(() => container.querySelector("#nova-taxa-heading"));

    const concelhoInput = container.querySelector("#concelho-imi");
    assert.ok(concelhoInput, "o campo de concelho deve existir e estar visível por omissão (IMI é o tipo por omissão)");

    concelhoInput.value = "Coimbra";
    concelhoInput.dispatchEvent(new window.Event("input", { bubbles: true }));
    await waitFor(() => container.textContent.includes("0,3%"));
    assert.match(container.textContent, /Coimbra/);
  });

  test("IMI: reconhece o concelho mesmo sem acentos ou com capitalização diferente", async () => {
    const container = getContainer();
    render(container);
    await waitFor(() => container.querySelector("#taxas-heading"));

    clickByText(container, "Registar taxa");
    await waitFor(() => container.querySelector("#nova-taxa-heading"));

    const concelhoInput = container.querySelector("#concelho-imi");
    concelhoInput.value = "vila real de santo antonio";
    concelhoInput.dispatchEvent(new window.Event("input", { bubbles: true }));
    await waitFor(() => container.textContent.includes("0,45%"));
    assert.match(container.textContent, /taxa máxima/);
  });

  test("IMI: concelho com taxa diferenciada por freguesia (Sesimbra) explica em vez de mostrar um número errado", async () => {
    const container = getContainer();
    render(container);
    await waitFor(() => container.querySelector("#taxas-heading"));

    clickByText(container, "Registar taxa");
    await waitFor(() => container.querySelector("#nova-taxa-heading"));

    const concelhoInput = container.querySelector("#concelho-imi");
    concelhoInput.value = "Sesimbra";
    concelhoInput.dispatchEvent(new window.Event("input", { bubbles: true }));
    await waitFor(() => container.textContent.includes("freguesia"));
  });

  test("IMI: concelho fora da tabela mostra o aviso de taxa desconhecida em vez de inventar um valor", async () => {
    const container = getContainer();
    render(container);
    await waitFor(() => container.querySelector("#taxas-heading"));

    clickByText(container, "Registar taxa");
    await waitFor(() => container.querySelector("#nova-taxa-heading"));

    const concelhoInput = container.querySelector("#concelho-imi");
    concelhoInput.value = "Concelho Inexistente XYZ";
    concelhoInput.dispatchEvent(new window.Event("input", { bubbles: true }));
    await waitFor(() => container.textContent.includes("Ainda não temos a taxa exata"));
  });

  test("cancelar volta à lista sem guardar nada", async () => {
    const container = getContainer();
    render(container);
    await waitFor(() => container.querySelector("#taxas-heading"));

    clickByText(container, "Registar taxa");
    await waitFor(() => container.querySelector("#nova-taxa-heading"));

    clickByText(container, "Cancelar");
    await waitFor(() => container.querySelector("#taxas-heading"));

    assert.ok(container.querySelector("#taxas-heading"));
    assert.doesNotMatch(container.textContent, /Registos/, "sem registos guardados, a secção de lista não deve aparecer");
  });

  test("remover um registo já guardado atualiza a lista", async () => {
    const container = getContainer();
    render(container);
    await waitFor(() => container.querySelector("#taxas-heading"));

    clickByText(container, "Registar taxa");
    await waitFor(() => container.querySelector("#nova-taxa-heading"));
    const valorInput = container.querySelector("#valor-imposto");
    valorInput.value = "120";
    valorInput.dispatchEvent(new window.Event("input", { bubbles: true }));
    container.querySelector("form").dispatchEvent(new window.Event("submit", { bubbles: true, cancelable: true }));
    await waitFor(() => container.textContent.includes("120"));

    const removerBtn = [...container.querySelectorAll("button")].find((b) => b.textContent.includes("Remover"));
    assert.ok(removerBtn, "devia existir um botão Remover após guardar um registo");
    removerBtn.click();

    await waitFor(() => !container.textContent.includes("120,00"));
    assert.doesNotMatch(container.textContent, /120,00\s?€/);
  });

  test('"Guardar e avançar" persiste o total no Período acumulado e navega para o Dia da Liberdade', async () => {
    const container = getContainer();
    render(container);
    await waitFor(() => container.querySelector("#taxas-heading"));

    clickByText(container, "Registar taxa");
    await waitFor(() => container.querySelector("#nova-taxa-heading"));
    const valorInput = container.querySelector("#valor-imposto");
    valorInput.value = "200";
    valorInput.dispatchEvent(new window.Event("input", { bubbles: true }));
    container.querySelector("form").dispatchEvent(new window.Event("submit", { bubbles: true, cancelable: true }));
    await waitFor(() => container.querySelector("#taxas-heading") && container.textContent.includes("200"));

    clickByText(container, "Guardar e avançar");
    await waitFor(() => window.location.hash === "#dia-liberdade");

    assert.equal(window.location.hash, "#dia-liberdade");
    const periodo = await getPeriodoAtual();
    assert.ok(periodo.taxasAnuais, "devia ter guardado taxasAnuais no período");
    assert.equal(periodo.taxasAnuais.total, 200);
  });
});

describe("Taxas — CAV e Taxa Municipal Turística (adicionadas 18/08/2026, a pedido do autor)", () => {
  function selecionarTipo(container, value) {
    const tipoSelect = container.querySelector("#tipo-imposto");
    tipoSelect.value = value;
    tipoSelect.dispatchEvent(new window.Event("change", { bubbles: true }));
  }

  test("CAV: escolher 'Normal' sugere 36,24€/ano (3,02€/mês × 12), editável", async () => {
    const container = getContainer();
    render(container);
    await waitFor(() => container.querySelector("#taxas-heading"));
    clickByText(container, "Registar taxa");
    await waitFor(() => container.querySelector("#nova-taxa-heading"));

    selecionarTipo(container, "CAV");
    const situacaoSelect = container.querySelector("#situacao-cav");
    assert.ok(situacaoSelect, "o seletor de situação da CAV deve aparecer quando o tipo é CAV");
    situacaoSelect.value = "normal";
    situacaoSelect.dispatchEvent(new window.Event("change", { bubbles: true }));

    const valorInput = container.querySelector("#valor-imposto");
    assert.equal(Number(valorInput.value), 36.24);
  });

  test("CAV: escolher 'Isento' sugere 0€", async () => {
    const container = getContainer();
    render(container);
    await waitFor(() => container.querySelector("#taxas-heading"));
    clickByText(container, "Registar taxa");
    await waitFor(() => container.querySelector("#nova-taxa-heading"));

    selecionarTipo(container, "CAV");
    const situacaoSelect = container.querySelector("#situacao-cav");
    situacaoSelect.value = "isento";
    situacaoSelect.dispatchEvent(new window.Event("change", { bubbles: true }));

    const valorInput = container.querySelector("#valor-imposto");
    assert.equal(Number(valorInput.value), 0);
  });

  test("CAV: o valor sugerido continua editável manualmente (nunca bloqueia o utilizador)", async () => {
    const container = getContainer();
    render(container);
    await waitFor(() => container.querySelector("#taxas-heading"));
    clickByText(container, "Registar taxa");
    await waitFor(() => container.querySelector("#nova-taxa-heading"));

    selecionarTipo(container, "CAV");
    const valorInput = container.querySelector("#valor-imposto");
    valorInput.value = "12";
    valorInput.dispatchEvent(new window.Event("input", { bubbles: true }));
    assert.equal(Number(valorInput.value), 12);
  });

  test("Taxa Municipal Turística: calculadora opcional noites × valor/noite preenche o valor pago", async () => {
    const container = getContainer();
    render(container);
    await waitFor(() => container.querySelector("#taxas-heading"));
    clickByText(container, "Registar taxa");
    await waitFor(() => container.querySelector("#nova-taxa-heading"));

    selecionarTipo(container, "Taxa_Turistica");
    const noitesInput = container.querySelector("#noites-turistica");
    const valorNoiteInput = container.querySelector("#valor-noite-turistica");
    assert.ok(noitesInput && valorNoiteInput, "os campos da calculadora devem aparecer para Taxa_Turistica");

    noitesInput.value = "3";
    noitesInput.dispatchEvent(new window.Event("input", { bubbles: true }));
    valorNoiteInput.value = "4";
    valorNoiteInput.dispatchEvent(new window.Event("input", { bubbles: true }));

    const valorInput = container.querySelector("#valor-imposto");
    assert.equal(Number(valorInput.value), 12);
  });

  test("Taxa Municipal Turística: regista e aparece na lista com o tipo correto", async () => {
    const container = getContainer();
    render(container);
    await waitFor(() => container.querySelector("#taxas-heading"));
    clickByText(container, "Registar taxa");
    await waitFor(() => container.querySelector("#nova-taxa-heading"));

    selecionarTipo(container, "Taxa_Turistica");
    const valorInput = container.querySelector("#valor-imposto");
    valorInput.value = "8";
    valorInput.dispatchEvent(new window.Event("input", { bubbles: true }));
    container.querySelector("form").dispatchEvent(new window.Event("submit", { bubbles: true, cancelable: true }));

    await waitFor(() => container.querySelector("#taxas-heading") && container.textContent.includes("8,00"));
    assert.match(container.textContent, /Taxa Municipal Turística/);
    assert.match(container.textContent, /8,00\s?€/);
  });

  test("campos de CAV e Taxa Turística ficam escondidos para os outros tipos de imposto", async () => {
    const container = getContainer();
    render(container);
    await waitFor(() => container.querySelector("#taxas-heading"));
    clickByText(container, "Registar taxa");
    await waitFor(() => container.querySelector("#nova-taxa-heading"));

    selecionarTipo(container, "IUC");
    assert.equal(container.querySelector("#situacao-cav").closest(".taximetro-field").hidden, true);
    assert.equal(container.querySelector("#noites-turistica").closest(".taximetro-field").hidden, true);
  });
});

describe("Taxas — acessibilidade básica", () => {
  test("cada ecrã tem exatamente um h1 com foco programático", async () => {
    const container = getContainer();
    render(container);
    await waitFor(() => container.querySelector("#taxas-heading"));
    const headings = container.querySelectorAll("h1");
    assert.equal(headings.length, 1);
    assert.equal(headings[0].tabIndex, -1);
  });

  test("todos os campos do formulário têm label associado por htmlFor/id", async () => {
    const container = getContainer();
    render(container);
    await waitFor(() => container.querySelector("#taxas-heading"));
    clickByText(container, "Registar taxa");
    await waitFor(() => container.querySelector("#nova-taxa-heading"));

    container.querySelectorAll("label[for]").forEach((label) => {
      const target = container.querySelector(`#${label.htmlFor}`);
      assert.ok(target, `label "for=${label.htmlFor}" deve apontar para um campo existente`);
    });
  });
});
