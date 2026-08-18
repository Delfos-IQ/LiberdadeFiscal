// Liberdade Fiscal — Módulo de UI do Benchmark Internacional OCDE (Fase 8)
//
// Spec §6.6: compara o "tax wedge" da OCDE (IRS + Segurança Social,
// trabalhador + entidade patronal, sobre o custo total do trabalho)
// entre Portugal e outros seis países. O valor do próprio utilizador é
// calculado com a MESMA metodologia da OCDE (só trabalho, sem
// IVA/patrimoniais) para ser genuinamente comparável — ao contrário do
// resultado do Dia da Liberdade Fiscal (Fase 7), que inclui mais
// figuras tributárias e por isso NÃO é diretamente comparável a este
// benchmark (aviso obrigatório, mostrado sempre nesta secção).
//
// Pré-preenchimento (18/08/2026, a pedido do autor): se Rendimentos já
// foi preenchido no período atual, evitamos pedir o mesmo salário outra
// vez. Em modo individual, copiamos o salário bruto diretamente.
//
// Em modo agregado familiar (declaração conjunta, roadmap P3-15), a
// primeira versão desta pré-preenchimento usava só o salário da Pessoa
// A, para evitar aplicar os escalões de IRS de pessoa solteira à soma
// dos dois rendimentos (o que inflacionaria o resultado). A pedido do
// autor (revisão do mesmo dia), passámos a calcular "A tua situação"
// com os DOIS salários reais do agregado, usando o mesmo motor de
// declaração conjunta que Rendimentos usa (calcularCadeiaSalarialConjunta,
// quociente familiar, Art. 69.º CIRS) — já não há distorção, porque já
// não aplicamos escalões de pessoa solteira a um rendimento composto.
// Isto significa que, para este caso, "A tua situação" deixa de seguir
// à risca a definição da OCDE (pessoa solteira, sem filhos) — usa o
// regime fiscal real do agregado. Continua a não ser diretamente
// comparável às barras dos países (que são sempre de pessoa solteira);
// ver nota específica junto a essa linha, mais abaixo. Limitação
// conhecida: esta recomputação não inclui a dedução por dependentes
// (não temos as idades aqui, só o total já persistido) — documentado no
// texto da nota.

import { calcularCadeiaSalarial, calcularCadeiaSalarialConjunta } from "../data/tax-engine.js";
import { OECD_BENCHMARK_2025 } from "../data/oecd-benchmark-2025.js";
import { getPeriodoAtual, getSetting } from "../data/db.js";

const REGIOES = [
  { value: "continente", label: "Continente" },
  { value: "acores", label: "Açores" },
  { value: "madeira", label: "Madeira" },
];

export function render(container) {
  let destroyed = false;
  let state = {
    modoCalculo: "individual", // "individual" | "agregado" — decidido pelo prefill, ver abaixo
    salarioBruto: "",
    salarioBrutoA: "",
    salarioBrutoB: "",
    tipoTrabalhador: "dependente",
    estadoCivil: "individual",
    regiao: "continente",
    erro: null,
    taxWedgeUtilizador: null,
    prefillNota: null, // "individual" | "agregado" | null
  };

  // Pré-preenchimento a partir do período atual — ver nota de cabeçalho.
  // Falha em silêncio se o IndexedDB não estiver disponível: o
  // formulário vazio já desenhado continua a funcionar.
  Promise.all([getPeriodoAtual(), getSetting("region")])
    .then(([periodo, regiaoGuardada]) => {
      if (destroyed) return;
      let mudou = false;

      if (regiaoGuardada) {
        state.regiao = regiaoGuardada;
        mudou = true;
      }

      const r = periodo.rendimentos;
      if (r && r.modo === "conjunta-dois-rendimentos" && r.pessoaA && r.pessoaB) {
        state.modoCalculo = "agregado";
        state.salarioBrutoA = String(r.pessoaA.salarioBrutoMensal);
        state.salarioBrutoB = String(r.pessoaB.salarioBrutoMensal);
        state.prefillNota = "agregado";
        mudou = true;
      } else if (r && typeof r.salarioBrutoMensal === "number") {
        state.salarioBruto = String(r.salarioBrutoMensal);
        if (r.tipoTrabalhador) state.tipoTrabalhador = r.tipoTrabalhador;
        state.prefillNota = "individual";
        mudou = true;
      }

      if (mudou) draw();
    })
    .catch(() => {});

  function draw() {
    container.innerHTML = "";
    drawConteudo();
  }

  function handleSubmit(event) {
    event.preventDefault();

    let cadeia;

    if (state.modoCalculo === "agregado") {
      const salarioA = Number(state.salarioBrutoA);
      const salarioB = Number(state.salarioBrutoB);
      const algumInvalido =
        !Number.isFinite(salarioA) || salarioA < 0 || !Number.isFinite(salarioB) || salarioB < 0;
      if (algumInvalido || salarioA + salarioB <= 0) {
        state.erro = "Introduz os dois salários brutos mensais do agregado (podem ser 0, mas a soma tem de ser maior que zero).";
        draw();
        return;
      }
      try {
        cadeia = calcularCadeiaSalarialConjunta(salarioA, salarioB, { regiao: state.regiao });
      } catch (err) {
        state.erro = `Não foi possível calcular: ${err.message}`;
        state.taxWedgeUtilizador = null;
        draw();
        return;
      }
    } else {
      const salario = Number(state.salarioBruto);
      if (!Number.isFinite(salario) || salario <= 0) {
        state.erro = "Introduz um salário bruto mensal válido, maior que zero.";
        draw();
        return;
      }
      try {
        cadeia = calcularCadeiaSalarial(salario, {
          tipoTrabalhador: state.tipoTrabalhador,
          estadoCivil: state.estadoCivil,
          regiao: state.regiao,
        });
      } catch (err) {
        state.erro = `Não foi possível calcular: ${err.message}`;
        state.taxWedgeUtilizador = null;
        draw();
        return;
      }
    }

    try {
      // Inclui a taxa adicional de solidariedade (Art. 68.º-A CIRS,
      // 🟡 ESTIMATE, cablada em 18/08/2026) quando aplicável.
      const irsAnual =
        Math.max(0, cadeia.irsAnualAntesDeDeducoes - cadeia.deducaoAnualPorDependentes) +
        (cadeia.taxaSolidariedadeAnual || 0);
      const ssTrabalhadorAnual = round2(cadeia.descontoSSMensal * 12);
      const custoTotalEmpregadorAnual = round2(cadeia.custoTotalEmpregadorMensal * 12);

      // Metodologia OCDE: tax wedge = (IRS + SS trabalhador + SS
      // entidade patronal) ÷ custo total do trabalho. A "SS entidade
      // patronal" é a diferença entre o custo total do empregador e o
      // salário bruto (que já inclui a SS do trabalhador embutida no
      // bruto, mas não o encargo patronal adicional).
      const tsuPatronalAnual = round2(custoTotalEmpregadorAnual - cadeia.salarioBrutoMensal * 12);
      const numerador = irsAnual + ssTrabalhadorAnual + tsuPatronalAnual;
      const taxWedge = custoTotalEmpregadorAnual > 0 ? numerador / custoTotalEmpregadorAnual : 0;

      state.erro = null;
      state.taxWedgeUtilizador = round1(taxWedge * 100);
    } catch (err) {
      state.erro = `Não foi possível calcular: ${err.message}`;
      state.taxWedgeUtilizador = null;
    }
    draw();
  }

  function drawConteudo() {
    const card = el("section", "card");
    card.setAttribute("aria-labelledby", "benchmark-heading");

    const heading = el("h1", null, "Comparação internacional (OCDE)");
    heading.id = "benchmark-heading";
    heading.tabIndex = -1;

    const desc = el(
      "p",
      null,
      `Compara a carga fiscal sobre o trabalho (IRS + Segurança Social) entre Portugal e outros países, com base no relatório "${OECD_BENCHMARK_2025.source}".`
    );

    // Destaque próprio para o critério "pessoa solteira, sem filhos" —
    // antes só aparecia a meio da frase da metodologia (fácil de
    // ignorar). Aplica-se sempre às barras dos países (é a definição da
    // OCDE). Já não dizemos "incluindo o teu" de forma incondicional
    // porque, em modo agregado (dois rendimentos), "A tua situação" usa
    // o regime fiscal real do casal, não o de pessoa solteira — ver nota
    // específica junto a essa linha, mais abaixo.
    const avisoSolteiro = el(
      "p",
      "disclaimer",
      "⚠️ Todos os valores desta lista de países assumem sempre uma pessoa solteira, sem filhos e sem declaração conjunta. É a definição usada pela OCDE, e é a única forma de os números serem comparáveis entre países."
    );

    const avisoMetodologia = el("p", "disclaimer", OECD_BENCHMARK_2025.methodologyNote);

    // Esta é uma rota secundária, sem botão próprio na navegação
    // principal (só se chega aqui a partir do link em Dia da
    // Liberdade) — sem este botão, o único caminho de volta seria o
    // "recuar" do browser, que nem sequer existe quando a app está
    // instalada como PWA (display: standalone, sem barra de endereço).
    const voltarBtn = el("button", "btn btn--secondary", "← Voltar ao Dia da Liberdade");
    voltarBtn.type = "button";
    voltarBtn.addEventListener("click", () => {
      window.location.hash = "dia-liberdade";
    });

    const form = el("form");
    form.noValidate = true;

    let camposSalario;
    let notaPrefill = null;

    if (state.modoCalculo === "agregado") {
      const campoA = el("div", "taximetro-field");
      const labelA = document.createElement("label");
      labelA.htmlFor = "bm-salario-bruto-a";
      labelA.textContent = "Salário bruto mensal — Pessoa A (€)";
      const inputA = document.createElement("input");
      inputA.type = "number";
      inputA.id = "bm-salario-bruto-a";
      inputA.min = "0";
      inputA.step = "0.01";
      inputA.value = state.salarioBrutoA;
      inputA.addEventListener("input", (e) => (state.salarioBrutoA = e.target.value));
      campoA.append(labelA, inputA);

      const campoB = el("div", "taximetro-field");
      const labelB = document.createElement("label");
      labelB.htmlFor = "bm-salario-bruto-b";
      labelB.textContent = "Salário bruto mensal — Pessoa B (€)";
      const inputB = document.createElement("input");
      inputB.type = "number";
      inputB.id = "bm-salario-bruto-b";
      inputB.min = "0";
      inputB.step = "0.01";
      inputB.value = state.salarioBrutoB;
      inputB.addEventListener("input", (e) => (state.salarioBrutoB = e.target.value));
      campoB.append(labelB, inputB);

      camposSalario = [campoA, campoB];
      notaPrefill = el(
        "p",
        "disclaimer",
        "Pré-preenchidos com os dois salários brutos do agregado registados em Rendimentos (declaração conjunta). Calculamos com o mesmo regime de declaração conjunta usado lá (quociente familiar, Art. 69.º CIRS) — sem a dedução por dependentes, que não é recolhida neste ecrã. Podes alterar os valores."
      );
    } else {
      const salarioField = el("div", "taximetro-field");
      const salarioLabel = document.createElement("label");
      salarioLabel.htmlFor = "bm-salario-bruto";
      salarioLabel.textContent = "O teu salário bruto mensal (€) — opcional, para te comparares";
      const salarioInput = document.createElement("input");
      salarioInput.type = "number";
      salarioInput.id = "bm-salario-bruto";
      salarioInput.min = "0";
      salarioInput.step = "0.01";
      salarioInput.value = state.salarioBruto;
      salarioInput.addEventListener("input", (e) => (state.salarioBruto = e.target.value));
      salarioField.append(salarioLabel, salarioInput);
      camposSalario = [salarioField];

      if (state.prefillNota === "individual") {
        notaPrefill = el("p", "disclaimer", "Pré-preenchido com o salário bruto que introduziste em Rendimentos. Podes alterar o valor.");
      }
    }

    const regiaoField = el("div", "taximetro-field");
    const regiaoLabel = document.createElement("label");
    regiaoLabel.htmlFor = "bm-regiao";
    regiaoLabel.textContent = "Região";
    const regiaoSelect = document.createElement("select");
    regiaoSelect.id = "bm-regiao";
    REGIOES.forEach((r) => {
      const opt = document.createElement("option");
      opt.value = r.value;
      opt.textContent = r.label;
      regiaoSelect.append(opt);
    });
    regiaoSelect.value = state.regiao;
    regiaoSelect.addEventListener("change", (e) => (state.regiao = e.target.value));
    regiaoField.append(regiaoLabel, regiaoSelect);

    form.append(...camposSalario);
    if (notaPrefill) form.append(notaPrefill);
    form.append(regiaoField);

    if (state.erro) {
      const erroEl = el("p", "form-error", state.erro);
      erroEl.setAttribute("role", "alert");
      form.append(erroEl);
    }

    const submitBtn = el("button", "btn btn--primary", "Calcular a minha posição");
    submitBtn.type = "submit";
    form.addEventListener("submit", handleSubmit);
    form.append(submitBtn);

    card.append(heading, desc, avisoSolteiro, avisoMetodologia, voltarBtn, form);
    container.append(card);

    const listaCard = el("section", "card");
    listaCard.setAttribute("aria-labelledby", "benchmark-lista-heading");
    const listaHeading = el("h2", null, "Tax wedge — pessoa solteira, sem filhos, salário médio nacional");
    listaHeading.id = "benchmark-lista-heading";

    const paises = [...OECD_BENCHMARK_2025.countries].sort((a, b) => b.taxWedgePercent - a.taxWedgePercent);
    const listaWrapper = el("div", "benchmark-lista");

    paises.forEach((pais) => {
      listaWrapper.append(criarLinhaBarra(pais.name_pt, pais.taxWedgePercent, pais.code === "PT"));
    });
    listaWrapper.append(criarLinhaBarra("Média OCDE", OECD_BENCHMARK_2025.oecdAverage, false, true));

    let notaSituacao = null;
    if (state.taxWedgeUtilizador !== null) {
      listaWrapper.append(criarLinhaBarra("A tua situação", state.taxWedgeUtilizador, false, false, true));

      if (state.modoCalculo === "agregado") {
        // A pedido do autor (18/08/2026): em modo agregado usamos o
        // regime fiscal REAL do casal (declaração conjunta, quociente
        // familiar) em vez de o tratar como pessoa solteira — por isso
        // a nota aqui é diferente da do modo individual: não afirma que
        // se assume solteiro/a, mas alerta que comparar a carga fiscal
        // de duas pessoas com a de uma só (as barras dos países) não é
        // uma comparação direta.
        notaSituacao = el(
          "p",
          "disclaimer",
          "\"A tua situação\" foi calculada com o regime fiscal real do teu agregado (declaração conjunta, quociente familiar) — ao contrário das barras dos países, que são sempre de uma pessoa solteira, sem filhos. Estás a comparar a carga fiscal de duas pessoas com a de uma só; serve como referência aproximada, não como equivalência direta. O teu Dia da Liberdade Fiscal, que usa os teus dados reais, está no ecrã anterior."
        );
      } else {
        // Reforço a pedido do autor: mesmo quem tem dependentes em
        // Rendimentos vê aqui um número calculado como se fosse
        // solteiro/a e sem filhos — de propósito, para ser comparável
        // às barras dos outros países. Sem esta nota, alguém nessa
        // situação podia ler "A tua situação" como sendo o seu Dia da
        // Liberdade Fiscal real (que usa os dados verdadeiros e vive no
        // ecrã anterior).
        notaSituacao = el(
          "p",
          "disclaimer",
          "\"A tua situação\" foi calculada como se fosses solteiro/a, sem filhos e sem declaração conjunta — mesmo que a tua situação real seja outra — só assim é comparável às restantes barras. O teu Dia da Liberdade Fiscal, que usa os teus dados reais, está no ecrã anterior."
        );
      }
    }

    listaCard.append(listaHeading, listaWrapper);
    if (notaSituacao) listaCard.append(notaSituacao);
    container.append(listaCard);

    // Segundo botão de voltar, no fundo — a lista de países pode ser
    // comprida, e o botão do topo já pode estar fora do ecrã.
    const voltarCard = el("section", "card");
    const voltarBtnFundo = el("button", "btn btn--secondary", "← Voltar ao Dia da Liberdade");
    voltarBtnFundo.type = "button";
    voltarBtnFundo.addEventListener("click", () => {
      window.location.hash = "dia-liberdade";
    });
    voltarCard.append(voltarBtnFundo);
    container.append(voltarCard);

    focusHeading(heading);
  }

  function criarLinhaBarra(nome, percent, destaquePortugal = false, media = false, utilizador = false) {
    const linha = el("div", "benchmark-linha");
    if (destaquePortugal) linha.classList.add("benchmark-linha--portugal");
    if (media) linha.classList.add("benchmark-linha--media");
    if (utilizador) linha.classList.add("benchmark-linha--utilizador");

    const label = el("span", "benchmark-linha__label", nome);
    const barraWrapper = el("span", "benchmark-linha__barra-wrapper");
    const barra = el("span", "benchmark-linha__barra");
    barra.style.width = `${Math.min(100, percent)}%`;
    barraWrapper.append(barra);
    const valor = el("span", "benchmark-linha__valor", `${formatNumeroPT(percent)}%`);

    linha.append(label, barraWrapper, valor);
    return linha;
  }

  draw();

  return {
    destroy() {
      destroyed = true;
      container.innerHTML = "";
    },
  };
}

/* ----------------------------- Utilitários ----------------------------- */

function el(tag, className, textContent) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (textContent !== undefined) node.textContent = textContent;
  return node;
}

function formatNumeroPT(value) {
  return new Intl.NumberFormat("pt-PT", { maximumFractionDigits: 1 }).format(value);
}

function round1(value) {
  return Math.round(value * 10) / 10;
}

function round2(value) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function focusHeading(headingEl) {
  if (headingEl) headingEl.focus({ preventScroll: false });
}
