// Liberdade Fiscal — Teste de integração do módulo de UI do fallback
// foto+IA (roadmap P3-17, modules/faturas-foto-ocr.js)
// Executar: node --test tests/
//
// Módulo dormant (fora da navegação ativa, ver modules/faturas.js) —
// testado isoladamente aqui, tal como modules/faturas-qr.js seria.
// Cobre: aviso de indisponibilidade sem workerUrl configurado, fluxo
// feliz com fetch mockado, e propagação de mensagens de erro.

import { test, describe, before } from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";

import { render } from "../modules/faturas-foto-ocr.js";

before(() => {
  const dom = new JSDOM("<!DOCTYPE html><html><body></body></html>", { url: "http://localhost/" });
  global.window = dom.window;
  global.document = dom.window.document;
  global.HTMLElement = dom.window.HTMLElement;
  global.File = dom.window.File;
  global.Blob = dom.window.Blob;
  global.FileReader = dom.window.FileReader;
});

function getContainer() {
  const container = document.createElement("div");
  document.body.appendChild(container);
  return container;
}

function definirFicheiroNoInput(input, ficheiro) {
  Object.defineProperty(input, "files", {
    value: [ficheiro],
    configurable: true,
  });
}

describe("modules/faturas-foto-ocr.js — sem worker configurado", () => {
  test("mostra aviso de indisponibilidade em vez de um formulário", () => {
    const container = getContainer();
    let canceladoChamado = false;

    render(container, {
      workerUrl: null,
      onDadosExtraidos: () => {
        throw new Error("não deveria ser chamado");
      },
      onCancelar: () => {
        canceladoChamado = true;
      },
    });

    assert.match(container.textContent, /ainda não está disponível/);
    assert.equal(container.querySelector("form"), null);

    const voltarBtn = container.querySelector("button");
    voltarBtn.click();
    assert.equal(canceladoChamado, true);
  });

  test("o heading recebe foco ao carregar", () => {
    const container = getContainer();
    render(container, { workerUrl: null, onDadosExtraidos: () => {}, onCancelar: () => {} });
    assert.equal(document.activeElement, container.querySelector("h1"));
  });
});

describe("modules/faturas-foto-ocr.js — com worker configurado", () => {
  test("estrutura acessível: heading com foco, label associada ao input", () => {
    const container = getContainer();
    render(container, {
      workerUrl: "https://worker.example/ocr",
      onDadosExtraidos: () => {},
      onCancelar: () => {},
    });

    const heading = container.querySelector("h1");
    assert.equal(document.activeElement, heading);

    const input = container.querySelector("#foto-ocr-input");
    const label = container.querySelector('label[for="foto-ocr-input"]');
    assert.ok(input);
    assert.ok(label);
  });

  test("submeter sem selecionar ficheiro mostra erro com role=alert", async () => {
    const container = getContainer();
    render(container, {
      workerUrl: "https://worker.example/ocr",
      onDadosExtraidos: () => {},
      onCancelar: () => {},
    });

    const form = container.querySelector("form");
    form.dispatchEvent(new window.Event("submit", { bubbles: true, cancelable: true }));
    await Promise.resolve();

    const erro = container.querySelector('[role="alert"]');
    assert.ok(erro);
    assert.match(erro.textContent, /Nenhuma imagem selecionada/);
  });

  test("fluxo feliz: extrai dados e chama onDadosExtraidos", async () => {
    const container = getContainer();
    let dadosRecebidos = null;

    const originalFetch = global.fetch;
    global.fetch = async () => ({
      ok: true,
      json: async () => ({
        ok: true,
        extraido: {
          estabelecimento: "Padaria Central",
          data: "2026-08-18",
          valor_total: 4.2,
          confianca: "alta",
        },
      }),
    });

    try {
      render(container, {
        workerUrl: "https://worker.example/ocr",
        onDadosExtraidos: (dados) => {
          dadosRecebidos = dados;
        },
        onCancelar: () => {},
      });

      const input = container.querySelector("#foto-ocr-input");
      const ficheiro = new File(["conteudo"], "fatura.jpg", { type: "image/jpeg" });
      definirFicheiroNoInput(input, ficheiro);

      const form = container.querySelector("form");
      form.dispatchEvent(new window.Event("submit", { bubbles: true, cancelable: true }));

      // Deixa a cadeia de promises (ficheiroParaBase64 + chamarWorkerOCR) resolver.
      await new Promise((resolve) => setTimeout(resolve, 50));

      assert.ok(dadosRecebidos, "onDadosExtraidos deveria ter sido chamado");
      assert.equal(dadosRecebidos.estabelecimento, "Padaria Central");
      assert.equal(dadosRecebidos.valorTotal, 4.2);
      assert.equal(dadosRecebidos.confianca, "alta");
    } finally {
      global.fetch = originalFetch;
    }
  });

  test("erro do worker fica visível com role=alert e sugestão de registo manual", async () => {
    const container = getContainer();

    const originalFetch = global.fetch;
    global.fetch = async () => ({
      ok: false,
      json: async () => ({ error: "Não foi possível processar a imagem." }),
    });

    try {
      render(container, {
        workerUrl: "https://worker.example/ocr",
        onDadosExtraidos: () => {
          throw new Error("não deveria ser chamado");
        },
        onCancelar: () => {},
      });

      const input = container.querySelector("#foto-ocr-input");
      const ficheiro = new File(["conteudo"], "fatura.jpg", { type: "image/jpeg" });
      definirFicheiroNoInput(input, ficheiro);

      const form = container.querySelector("form");
      form.dispatchEvent(new window.Event("submit", { bubbles: true, cancelable: true }));

      await new Promise((resolve) => setTimeout(resolve, 50));

      const erro = container.querySelector('[role="alert"]');
      assert.ok(erro);
      assert.match(erro.textContent, /Não foi possível processar a imagem/);
      assert.match(erro.textContent, /registar esta despesa manualmente/);
    } finally {
      global.fetch = originalFetch;
    }
  });
});

describe("modules/faturas-foto-ocr.js — ciclo de vida", () => {
  test("destroy() limpa o container", () => {
    const container = getContainer();
    const instancia = render(container, {
      workerUrl: "https://worker.example/ocr",
      onDadosExtraidos: () => {},
      onCancelar: () => {},
    });
    assert.ok(container.querySelector("form"));
    instancia.destroy();
    assert.equal(container.innerHTML, "");
  });
});
