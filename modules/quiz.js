// Liberdade Fiscal — Módulo de UI do Quiz (Fase 3)
//
// Vanilla JS, sem framework. Exporta `render(container)`, chamado pelo
// router em app.js. Devolve um objeto com `destroy()` para o router
// limpar o módulo ao navegar para outra rota.
//
// Toda a lógica de seleção/avaliação/pontuação vive em
// data/quiz-engine.js (funções puras, testadas). Este ficheiro só trata
// de DOM, estado de UI e acessibilidade.

import { selectRandomQuestions, evaluateAnswer, calculateQuizResult } from "../data/quiz-engine.js";
import { QUIZ_QUESTIONS } from "../data/quiz-questions.js";

const QUESTIONS_PER_SESSION = 10;

export function render(container) {
  /** @type {{phase: "start"|"question"|"result", questions?: any[], index?: number, answers?: any[], lastAnswer?: any, result?: any}} */
  let state = { phase: "start" };

  function startSession() {
    state = {
      phase: "question",
      questions: selectRandomQuestions(QUIZ_QUESTIONS, QUESTIONS_PER_SESSION),
      index: 0,
      answers: [],
      lastAnswer: null,
    };
    draw();
  }

  function selectOption(selectedIndex) {
    if (state.lastAnswer) return; // já respondida — ignora cliques extra
    const question = state.questions[state.index];
    const result = evaluateAnswer(question, selectedIndex);
    state.answers.push(result);
    state.lastAnswer = result;
    draw();
  }

  function goToNext() {
    const isLast = state.index + 1 >= state.questions.length;
    if (isLast) {
      state.phase = "result";
      state.result = calculateQuizResult(state.answers);
    } else {
      state.index += 1;
      state.lastAnswer = null;
    }
    draw();
  }

  function draw() {
    container.innerHTML = "";
    if (state.phase === "start") drawStart();
    else if (state.phase === "question") drawQuestion();
    else drawResult();
  }

  function drawStart() {
    const card = el("section", "card");
    card.setAttribute("aria-labelledby", "quiz-start-heading");

    const heading = el("h1", null, "Quiz de literacia fiscal");
    heading.id = "quiz-start-heading";
    heading.tabIndex = -1;

    const desc = el(
      "p",
      null,
      `Testa o que sabes sobre impostos em Portugal. Cada sessão tem ${QUESTIONS_PER_SESSION} perguntas escolhidas aleatoriamente de um banco de ${QUIZ_QUESTIONS.length}, com explicação a seguir a cada resposta.`
    );

    const startBtn = el("button", "btn btn--primary", "Começar o quiz");
    startBtn.type = "button";
    startBtn.addEventListener("click", startSession);

    card.append(heading, desc, startBtn);
    container.append(card);
    focusHeading(heading);
  }

  function drawQuestion() {
    const question = state.questions[state.index];
    const questionNumber = state.index + 1;
    const total = state.questions.length;

    const card = el("section", "card");
    card.setAttribute("aria-labelledby", "quiz-question-heading");

    const progress = el(
      "p",
      "stat-label",
      `Pergunta ${questionNumber} de ${total} · ${question.category}`
    );

    const heading = el("h1", null, question.question_pt);
    heading.id = "quiz-question-heading";
    heading.tabIndex = -1;

    // Nota de acessibilidade: NÃO usamos role="radiogroup"/"radio" aqui.
    // Esse padrão ARIA exige navegação por setas com roving tabindex
    // (WAI-ARIA Authoring Practices) — implementá-lo pela metade seria
    // pior do que não o usar, porque um utilizador de leitor de ecrã
    // esperaria as setas a funcionar e nada aconteceria. Um grupo de
    // <button> nativos com role="group" no contentor dá semântica
    // clara (são ações, não um estado de seleção alternável) e
    // navegação por Tab totalmente funcional sem código adicional.
    const optionsList = el("div", "quiz-options");
    optionsList.setAttribute("role", "group");
    optionsList.setAttribute("aria-labelledby", "quiz-question-heading");

    question.options.forEach((optionText, index) => {
      const btn = el("button", "quiz-option", optionText);
      btn.type = "button";

      if (state.lastAnswer) {
        const isCorrectOption = index === question.correct_index;
        const isSelectedOption = index === state.lastAnswer.selectedIndex;

        if (isCorrectOption) btn.classList.add("quiz-option--correct");
        if (isSelectedOption && !isCorrectOption) btn.classList.add("quiz-option--incorrect");
        btn.disabled = true;

        // aria-label reforça o estado para quem usa leitor de ecrã,
        // já que a diferenciação visual (contorno/cor) não chega até
        // à árvore de acessibilidade por si só.
        if (isCorrectOption) {
          btn.setAttribute("aria-label", `${optionText} — resposta correta`);
        } else if (isSelectedOption) {
          btn.setAttribute("aria-label", `${optionText} — a tua resposta, incorreta`);
        }
      } else {
        btn.addEventListener("click", () => selectOption(index));
      }

      optionsList.append(btn);
    });

    card.append(progress, heading, optionsList);

    // Região viva: anuncia o feedback a leitores de ecrã assim que a
    // resposta é avaliada, sem depender só da cor (WCAG 1.4.1).
    const feedbackRegion = el("div");
    feedbackRegion.setAttribute("role", "status");
    feedbackRegion.setAttribute("aria-live", "polite");

    if (state.lastAnswer) {
      const feedbackBadge = el(
        "p",
        `badge ${state.lastAnswer.isCorrect ? "" : "quiz-feedback--incorrect"}`,
        state.lastAnswer.isCorrect ? "✓ Resposta certa" : "✗ Resposta errada"
      );
      const explanation = el("p", null, question.explanation_pt);
      feedbackRegion.append(feedbackBadge, explanation);

      const nextBtn = el(
        "button",
        "btn btn--primary",
        questionNumber === total ? "Ver resultado" : "Próxima pergunta"
      );
      nextBtn.type = "button";
      nextBtn.addEventListener("click", goToNext);

      card.append(feedbackRegion, nextBtn);
      container.append(card);
      // Foco no botão de avançar, não no heading, para não repetir a
      // pergunta ao utilizador de leitor de ecrã que já a ouviu.
      nextBtn.focus();
    } else {
      card.append(feedbackRegion);
      container.append(card);
      focusHeading(heading);
    }
  }

  function drawResult() {
    const { acertos, total, percentagem } = state.result;

    const card = el("section", "card");
    card.setAttribute("aria-labelledby", "quiz-result-heading");

    const heading = el("h1", null, "Resultado");
    heading.id = "quiz-result-heading";
    heading.tabIndex = -1;

    const scoreEl = el("p", "stat-hero stat-hero--green", `${acertos} / ${total}`);
    const percentEl = el("p", "stat-label", `${percentagem}% de respostas certas`);

    const message = el(
      "p",
      null,
      percentagem >= 70
        ? "Boa! Já tens uma base sólida sobre a fiscalidade portuguesa."
        : "Vale a pena rever alguns conceitos — cada explicação que leste fica disponível para consultares outra vez fazendo o quiz de novo."
    );

    const restartBtn = el("button", "btn btn--primary", "Repetir o quiz");
    restartBtn.type = "button";
    restartBtn.addEventListener("click", startSession);

    card.append(heading, scoreEl, percentEl, message, restartBtn);
    container.append(card);
    focusHeading(heading);
  }

  draw();

  return {
    destroy() {
      container.innerHTML = "";
    },
  };
}

/* -----------------------------
   Utilitários de DOM
   ----------------------------- */

function el(tag, className, textContent) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (textContent !== undefined) node.textContent = textContent;
  return node;
}

function focusHeading(headingEl) {
  // Move o foco para o heading da nova "vista" — essencial para
  // utilizadores de leitor de ecrã e navegação por teclado num router
  // sem recarregar a página.
  headingEl.focus({ preventScroll: false });
}
