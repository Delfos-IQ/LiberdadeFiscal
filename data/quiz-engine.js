// Liberdade Fiscal — Lógica pura do Quiz (Fase 3)
//
// Funções puras, sem tocar DOM nem estado global — testáveis em
// isolamento (ver tests/quiz-engine.test.js). O RNG é injetável para
// que os testes sejam deterministas sem depender de Math.random.

/**
 * Seleciona `count` perguntas aleatórias e sem repetição de um pool.
 * Usa Fisher-Yates parcial: eficiente mesmo com pools grandes (spec
 * §6.1 — preparado para escalar a 200 perguntas sem mudanças de
 * arquitetura).
 *
 * @param {Array<object>} pool
 * @param {number} count
 * @param {() => number} [rng] — função que devolve um float em [0,1).
 *   Por defeito Math.random; testes injetam um RNG determinista.
 * @returns {Array<object>}
 */
export function selectRandomQuestions(pool, count, rng = Math.random) {
  if (!Array.isArray(pool)) {
    throw new TypeError("pool deve ser um array.");
  }
  if (typeof count !== "number" || count < 0 || !Number.isInteger(count)) {
    throw new RangeError("count deve ser um inteiro >= 0.");
  }

  const n = Math.min(count, pool.length);
  const copia = pool.slice();

  // Fisher-Yates parcial: só embaralha os primeiros `n` elementos que
  // vamos precisar, em vez de embaralhar o array inteiro.
  for (let i = 0; i < n; i++) {
    const j = i + Math.floor(rng() * (copia.length - i));
    [copia[i], copia[j]] = [copia[j], copia[i]];
  }

  return copia.slice(0, n);
}

/**
 * Avalia uma resposta dada pelo utilizador contra a pergunta.
 * @param {{correct_index: number}} question
 * @param {number} selectedIndex
 */
export function evaluateAnswer(question, selectedIndex) {
  return {
    isCorrect: selectedIndex === question.correct_index,
    correctIndex: question.correct_index,
    selectedIndex,
  };
}

/**
 * Calcula o resultado final de uma sessão de quiz.
 * @param {Array<{isCorrect: boolean}>} answers
 */
export function calculateQuizResult(answers) {
  const total = answers.length;
  const acertos = answers.filter((a) => a.isCorrect).length;
  const percentagem = total > 0 ? round2((acertos / total) * 100) : 0;

  return {
    total,
    acertos,
    erros: total - acertos,
    percentagem,
  };
}

function round2(value) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}
