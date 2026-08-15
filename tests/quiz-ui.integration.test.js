// Liberdade Fiscal — Teste de integração do módulo de UI do Quiz
// Executar: node --test tests/
//
// Ao contrário de tax-engine.test.js e quiz-engine.test.js (funções
// puras), este teste sobe um DOM real via jsdom e simula cliques do
// utilizador pelo fluxo inteiro: ecrã inicial → 10 perguntas
// respondidas → ecrã de resultado. O objetivo é apanhar bugs de
// integração que testes de lógica pura não veem — classes CSS
// inexistentes, elementos não encontrados, foco mal gerido, estado
// dessincronizado entre cliques.
//
// jsdom é uma dependência de desenvolvimento apenas para testes — não
// é usada pela app em produção (que corre num browser real).

import { test, describe, before } from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";

let render;

before(async () => {
  const dom = new JSDOM("<!DOCTYPE html><html><body></body></html>", { url: "http://localhost/" });
  global.window = dom.window;
  global.document = dom.window.document;
  global.HTMLElement = dom.window.HTMLElement;

  ({ render } = await import("../modules/quiz.js"));
});

function getContainer() {
  const container = document.createElement("div");
  document.body.appendChild(container);
  return container;
}

describe("Quiz — fluxo de integração completo", () => {
  test("ecrã inicial mostra o botão de começar", () => {
    const container = getContainer();
    render(container);

    const startBtn = container.querySelector("button");
    assert.ok(startBtn, "botão de início não encontrado");
    assert.match(startBtn.textContent, /Começar/);
  });

  test("clicar em começar mostra a primeira pergunta com 4 opções", () => {
    const container = getContainer();
    render(container);

    const startBtn = container.querySelector("button");
    startBtn.click();

    const options = container.querySelectorAll('.quiz-option');
    assert.equal(options.length, 4);
    assert.match(container.textContent, /Pergunta 1 de 10/);
  });

  test("responder mostra feedback com explicação e desativa as opções", () => {
    const container = getContainer();
    render(container);
    container.querySelector("button").click(); // começar

    const options = container.querySelectorAll('.quiz-option');
    options[0].click();

    const optionsDepois = container.querySelectorAll('.quiz-option');
    optionsDepois.forEach((opt) => assert.equal(opt.disabled, true));

    // Uma das opções está marcada como correta (classe visual, não só cor)
    const correta = container.querySelector(".quiz-option--correct");
    assert.ok(correta, "nenhuma opção marcada como correta visualmente");

    // A explicação da pergunta está visível no DOM
    assert.match(container.textContent, /Resposta (certa|errada)/);
  });

  test("clicar numa opção depois de já ter respondido não muda a resposta (ignora cliques extra)", () => {
    const container = getContainer();
    render(container);
    container.querySelector("button").click();

    const options = container.querySelectorAll('.quiz-option');
    options[0].click();
    const primeiroFeedback = container.querySelector('[aria-live="polite"]').textContent;

    // As opções ficam disabled depois de responder — um clique real do
    // browser não dispararia o handler, mas testamos a resiliência do
    // estado interno mesmo assim (defesa em profundidade).
    const aindaOptions = container.querySelectorAll('.quiz-option');
    aindaOptions[1].click();
    const segundoFeedback = container.querySelector('[aria-live="polite"]').textContent;

    assert.equal(primeiroFeedback, segundoFeedback);
  });

  test("percorrer as 10 perguntas até ao fim chega ao ecrã de resultado com pontuação válida", () => {
    const container = getContainer();
    render(container);
    container.querySelector("button").click(); // começar

    for (let i = 0; i < 10; i++) {
      const options = container.querySelectorAll('.quiz-option');
      assert.equal(options.length, 4, `pergunta ${i + 1} não tem 4 opções`);
      options[0].click(); // responde sempre a 1ª opção (certa ou errada)

      const nextBtn = [...container.querySelectorAll("button")].find((b) =>
        /Próxima pergunta|Ver resultado/.test(b.textContent)
      );
      assert.ok(nextBtn, `botão de avançar não encontrado na pergunta ${i + 1}`);
      nextBtn.click();
    }

    assert.match(container.textContent, /Resultado/);
    const scoreMatch = container.textContent.match(/(\d+)\s*\/\s*10/);
    assert.ok(scoreMatch, "pontuação X/10 não encontrada no ecrã de resultado");
    const acertos = Number(scoreMatch[1]);
    assert.ok(acertos >= 0 && acertos <= 10);
  });

  test("repetir o quiz a partir do resultado volta a mostrar uma pergunta 1 de 10", () => {
    const container = getContainer();
    render(container);
    container.querySelector("button").click();

    for (let i = 0; i < 10; i++) {
      container.querySelectorAll('.quiz-option')[0].click();
      const nextBtn = [...container.querySelectorAll("button")].find((b) =>
        /Próxima pergunta|Ver resultado/.test(b.textContent)
      );
      nextBtn.click();
    }

    const restartBtn = [...container.querySelectorAll("button")].find((b) =>
      /Repetir/.test(b.textContent)
    );
    assert.ok(restartBtn, "botão de repetir não encontrado no ecrã de resultado");
    restartBtn.click();

    assert.match(container.textContent, /Pergunta 1 de 10/);
  });

  test("destroy() limpa o container (para o router trocar de rota sem deixar lixo)", () => {
    const container = getContainer();
    const instance = render(container);
    container.querySelector("button").click();
    assert.ok(container.children.length > 0);

    instance.destroy();
    assert.equal(container.children.length, 0);
  });
});
