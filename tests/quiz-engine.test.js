// Liberdade Fiscal — Testes da lógica do Quiz (Fase 3)
// Executar: node --test tests/

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { selectRandomQuestions, evaluateAnswer, calculateQuizResult } from "../data/quiz-engine.js";
import { QUIZ_QUESTIONS } from "../data/quiz-questions.js";

describe("selectRandomQuestions", () => {
  test("devolve exatamente `count` perguntas quando o pool é maior", () => {
    const seleccion = selectRandomQuestions(QUIZ_QUESTIONS, 10);
    assert.equal(seleccion.length, 10);
  });

  test("nunca repete a mesma pergunta na seleção", () => {
    const seleccion = selectRandomQuestions(QUIZ_QUESTIONS, 10);
    const ids = seleccion.map((q) => q.id);
    assert.equal(new Set(ids).size, ids.length);
  });

  test("se count > pool.length, devolve o pool inteiro sem rebentar", () => {
    const poolPequeno = QUIZ_QUESTIONS.slice(0, 3);
    const seleccion = selectRandomQuestions(poolPequeno, 10);
    assert.equal(seleccion.length, 3);
  });

  test("com count = 0 devolve array vazio", () => {
    assert.deepEqual(selectRandomQuestions(QUIZ_QUESTIONS, 0), []);
  });

  test("com RNG determinista, o resultado é reprodutível", () => {
    let seed = 0;
    const rngFixo = () => {
      seed = (seed + 0.37) % 1;
      return seed;
    };
    const a = selectRandomQuestions(QUIZ_QUESTIONS, 5, rngFixo);
    seed = 0;
    const b = selectRandomQuestions(QUIZ_QUESTIONS, 5, rngFixo);
    assert.deepEqual(
      a.map((q) => q.id),
      b.map((q) => q.id)
    );
  });

  test("não muta o pool original", () => {
    const copiaAntes = QUIZ_QUESTIONS.map((q) => q.id);
    selectRandomQuestions(QUIZ_QUESTIONS, 10);
    const copiaDepois = QUIZ_QUESTIONS.map((q) => q.id);
    assert.deepEqual(copiaAntes, copiaDepois);
  });

  test("rejeita count negativo ou não inteiro", () => {
    assert.throws(() => selectRandomQuestions(QUIZ_QUESTIONS, -1), RangeError);
    assert.throws(() => selectRandomQuestions(QUIZ_QUESTIONS, 3.5), RangeError);
  });

  test("rejeita pool que não é array", () => {
    assert.throws(() => selectRandomQuestions("nao-e-array", 10), TypeError);
  });

  test("distribuição razoável: em 200 seleções de 10, cada pergunta aparece pelo menos uma vez", () => {
    // Teste estatístico, não exaustivo — verifica que o RNG por defeito
    // não está sistematicamente a ignorar parte do pool.
    const vistos = new Set();
    for (let i = 0; i < 200; i++) {
      selectRandomQuestions(QUIZ_QUESTIONS, 10).forEach((q) => vistos.add(q.id));
    }
    assert.equal(vistos.size, QUIZ_QUESTIONS.length);
  });
});

describe("Banco de perguntas — integridade estrutural", () => {
  test("tem entre 30 e 40 perguntas, conforme o spec", () => {
    assert.ok(QUIZ_QUESTIONS.length >= 30 && QUIZ_QUESTIONS.length <= 200);
  });

  test("todos os ids são únicos", () => {
    const ids = QUIZ_QUESTIONS.map((q) => q.id);
    assert.equal(new Set(ids).size, ids.length);
  });

  test("todas as perguntas têm exatamente 4 opções", () => {
    for (const q of QUIZ_QUESTIONS) {
      assert.equal(q.options.length, 4, `pergunta ${q.id} não tem 4 opções`);
    }
  });

  test("correct_index está sempre dentro do intervalo válido", () => {
    for (const q of QUIZ_QUESTIONS) {
      assert.ok(q.correct_index >= 0 && q.correct_index < q.options.length, `pergunta ${q.id}`);
    }
  });

  test("todas as perguntas têm explicação não vazia", () => {
    for (const q of QUIZ_QUESTIONS) {
      assert.ok(q.explanation_pt && q.explanation_pt.length > 10, `pergunta ${q.id}`);
    }
  });

  test("não há opções duplicadas dentro da mesma pergunta", () => {
    for (const q of QUIZ_QUESTIONS) {
      assert.equal(new Set(q.options).size, q.options.length, `pergunta ${q.id} tem opções repetidas`);
    }
  });
});

describe("evaluateAnswer", () => {
  const pergunta = { correct_index: 2 };

  test("marca como correta quando o índice coincide", () => {
    assert.equal(evaluateAnswer(pergunta, 2).isCorrect, true);
  });

  test("marca como incorreta quando o índice não coincide", () => {
    assert.equal(evaluateAnswer(pergunta, 0).isCorrect, false);
  });
});

describe("calculateQuizResult", () => {
  test("calcula percentagem correta com 10 respostas, 7 certas", () => {
    const respostas = [
      ...Array(7).fill({ isCorrect: true }),
      ...Array(3).fill({ isCorrect: false }),
    ];
    const r = calculateQuizResult(respostas);
    assert.equal(r.acertos, 7);
    assert.equal(r.erros, 3);
    assert.equal(r.percentagem, 70);
  });

  test("array vazio não rebenta e devolve 0%", () => {
    const r = calculateQuizResult([]);
    assert.equal(r.percentagem, 0);
    assert.equal(r.total, 0);
  });

  test("100% quando todas as respostas estão certas", () => {
    const r = calculateQuizResult(Array(10).fill({ isCorrect: true }));
    assert.equal(r.percentagem, 100);
  });
});
