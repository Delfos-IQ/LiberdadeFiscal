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

import { calcularCadeiaSalarial } from "../data/tax-engine.js";
import { OECD_BENCHMARK_2025 } from "../data/oecd-benchmark-2025.js";

const REGIOES = [
  { value: "continente", label: "Continente" },
  { value: "acores", label: "Açores" },
  { value: "madeira", label: "Madeira" },
];

export function render(container) {
  let state = {
    salarioBruto: "",
    tipoTrabalhador: "dependente",
    estadoCivil: "individual",
    regiao: "continente",
    erro: null,
    taxWedgeUtilizador: null,
  };

  function draw() {
    container.innerHTML = "";
    drawConteudo();
  }

  function handleSubmit(event) {
    event.preventDefault();
    const salario = Number(state.salarioBruto);
    if (!Number.isFinite(salario) || salario <= 0) {
      state.erro = "Introduz um salário bruto mensal válido, maior que zero.";
      draw();
      return;
    }

    try {
      const cadeia = calcularCadeiaSalarial(salario, {
        tipoTrabalhador: state.tipoTrabalhador,
        estadoCivil: state.estadoCivil,
        regiao: state.regiao,
      });

      const irsAnual = Math.max(0, cadeia.irsAnualAntesDeDeducoes - cadeia.deducaoAnualPorDependentes);
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

    const avisoMetodologia = el("p", "disclaimer", OECD_BENCHMARK_2025.methodologyNote);

    const form = el("form");
    form.noValidate = true;

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

    form.append(salarioField, regiaoField);

    if (state.erro) {
      const erroEl = el("p", null, state.erro);
      erroEl.setAttribute("role", "alert");
      erroEl.style.color = "var(--color-danger)";
      form.append(erroEl);
    }

    const submitBtn = el("button", "btn btn--primary", "Calcular a minha posição");
    submitBtn.type = "submit";
    form.addEventListener("submit", handleSubmit);
    form.append(submitBtn);

    card.append(heading, desc, avisoMetodologia, form);
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

    if (state.taxWedgeUtilizador !== null) {
      listaWrapper.append(criarLinhaBarra("A tua situação", state.taxWedgeUtilizador, false, false, true));
    }

    listaCard.append(listaHeading, listaWrapper);
    container.append(listaCard);

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
