// Liberdade Fiscal — Módulo de UI do Taxímetro (Fase 4)
//
// Modo Rápido: formulário mínimo (salário bruto, estado civil,
// dependentes, tipo de trabalhador, região) — pensado para <60s de
// preenchimento (spec §6.2). Modo Avançado acrescenta precisão: idade
// exata de cada dependente em vez de uma contagem simples (afeta o
// valor real da dedução, ver TAX-METHODOLOGY.md).
//
// Âmbito consciente desta fase: "tipo de contrato" (spec §6.2, Modo
// Avançado) não é modelado porque, verificado o Código do Trabalho e
// o CIRS, o tipo de vínculo contratual (efetivo/termo) não altera o
// cálculo de IRS ou TSU de 2026 por si só — só o TIPO de trabalhador
// (dependente vs. independente) o faz, e esse já está coberto. Incluir
// um seletor de tipo de contrato sem ligação nenhuma ao cálculo seria
// enganar o utilizador a pensar que influencia o resultado. Fica
// registado aqui para não parecer um esquecimento.

import { calcularCadeiaSalarial } from "../data/tax-engine.js";

const REGIOES = [
  { value: "continente", label: "Continente" },
  { value: "acores", label: "Açores" },
  { value: "madeira", label: "Madeira" },
];

export function render(container) {
  let state = {
    phase: "form",
    modo: "rapido",
    salarioBruto: "",
    estadoCivil: "individual",
    tipoTrabalhador: "dependente",
    regiao: "continente",
    numDependentesRapido: 0,
    dependentesAvancado: [],
    erro: null,
    resultado: null,
  };

  function draw() {
    container.innerHTML = "";
    if (state.phase === "form") drawForm();
    else drawResult();
  }

  function handleSubmit(event) {
    event.preventDefault();

    const salario = Number(state.salarioBruto);
    if (!Number.isFinite(salario) || salario <= 0) {
      state.erro = "Introduz um salário bruto mensal válido, maior que zero.";
      draw();
      return;
    }

    const dependentes =
      state.modo === "avancado"
        ? state.dependentesAvancado
        : Array.from({ length: state.numDependentesRapido }, () => ({ idade: 10 }));
    // No Modo Rápido assumimos idade > 3 anos para cada dependente
    // (dedução de 600€/ano cada) como simplificação conservadora —
    // comunicado explicitamente no ecrã de resultado, nunca escondido.

    try {
      const resultado = calcularCadeiaSalarial(salario, {
        tipoTrabalhador: state.tipoTrabalhador,
        estadoCivil: state.estadoCivil,
        dependentes,
        regiao: state.regiao,
      });
      state.erro = null;
      state.resultado = resultado;
      state.usouSimplificacaoDependentes = state.modo === "rapido" && dependentes.length > 0;
      state.phase = "result";
    } catch (err) {
      state.erro = `Não foi possível calcular: ${err.message}`;
    }
    draw();
  }

  function voltarAoFormulario() {
    state.phase = "form";
    draw();
  }

  function drawForm() {
    const card = el("section", "card");
    card.setAttribute("aria-labelledby", "taximetro-heading");

    const heading = el("h1", null, "Taxímetro");
    heading.id = "taximetro-heading";
    heading.tabIndex = -1;

    const desc = el(
      "p",
      null,
      "Descobre, em menos de um minuto, quanto do teu salário bruto fica realmente contigo."
    );

    const modeToggle = el("div", "taximetro-mode-toggle");
    modeToggle.setAttribute("role", "group");
    modeToggle.setAttribute("aria-label", "Modo do simulador");
    const rapidoBtn = el("button", state.modo === "rapido" ? "btn btn--primary" : "btn btn--secondary", "Modo Rápido");
    const avancadoBtn = el("button", state.modo === "avancado" ? "btn btn--primary" : "btn btn--secondary", "Modo Avançado");
    rapidoBtn.type = "button";
    avancadoBtn.type = "button";
    rapidoBtn.setAttribute("aria-pressed", String(state.modo === "rapido"));
    avancadoBtn.setAttribute("aria-pressed", String(state.modo === "avancado"));
    rapidoBtn.addEventListener("click", () => {
      state.modo = "rapido";
      draw();
    });
    avancadoBtn.addEventListener("click", () => {
      state.modo = "avancado";
      draw();
    });
    modeToggle.append(rapidoBtn, avancadoBtn);

    const form = el("form");
    form.noValidate = true;
    form.addEventListener("submit", handleSubmit);

    form.append(
      fieldNumber("salario-bruto", "Salário bruto mensal (€)", state.salarioBruto, (v) => {
        state.salarioBruto = v;
      }),
      fieldSelect(
        "tipo-trabalhador",
        "Tipo de trabalhador",
        [
          { value: "dependente", label: "Por conta de outrem" },
          { value: "independente", label: "Independente (recibos verdes)" },
        ],
        state.tipoTrabalhador,
        (v) => {
          state.tipoTrabalhador = v;
        }
      ),
      fieldSelect(
        "estado-civil",
        "Estado civil (para efeitos de IRS)",
        [
          { value: "individual", label: "Solteiro(a) / declaração individual" },
          { value: "conjunta", label: "Casado(a) ou união de facto — declaração conjunta" },
        ],
        state.estadoCivil,
        (v) => {
          state.estadoCivil = v;
        }
      ),
      fieldSelect("regiao", "Região", REGIOES, state.regiao, (v) => {
        state.regiao = v;
      })
    );

    if (state.modo === "rapido") {
      form.append(
        fieldNumber("num-dependentes", "Número de dependentes", state.numDependentesRapido, (v) => {
          state.numDependentesRapido = Math.max(0, Math.round(Number(v) || 0));
        }, { min: 0, step: 1 })
      );
      const nota = el(
        "p",
        "stat-label",
        "Modo Rápido: assume que cada dependente tem mais de 3 anos. Para um valor mais preciso, usa o Modo Avançado."
      );
      form.append(nota);
    } else {
      form.append(drawDependentesAvancado());
    }

    if (state.erro) {
      const erroEl = el("p", null, state.erro);
      erroEl.setAttribute("role", "alert");
      erroEl.style.color = "var(--color-danger)";
      form.append(erroEl);
    }

    const submitBtn = el("button", "btn btn--primary", "Calcular");
    submitBtn.type = "submit";
    form.append(submitBtn);

    card.append(heading, desc, modeToggle, form);
    container.append(card);
    focusHeading(heading);
  }

  function drawDependentesAvancado() {
    const wrapper = el("div", "taximetro-dependentes");
    const label = el("p", "stat-label", "Dependentes (idade de cada um)");
    wrapper.append(label);

    state.dependentesAvancado.forEach((dep, index) => {
      const row = el("div", "taximetro-dependente-row");
      const input = document.createElement("input");
      input.type = "number";
      input.min = "0";
      input.max = "30";
      input.value = String(dep.idade);
      input.setAttribute("aria-label", `Idade do dependente ${index + 1}`);
      input.addEventListener("input", (e) => {
        state.dependentesAvancado[index].idade = Number(e.target.value) || 0;
      });

      const removeBtn = el("button", "btn btn--secondary", "Remover");
      removeBtn.type = "button";
      removeBtn.addEventListener("click", () => {
        state.dependentesAvancado.splice(index, 1);
        draw();
      });

      row.append(input, removeBtn);
      wrapper.append(row);
    });

    const addBtn = el("button", "btn btn--secondary", "+ Adicionar dependente");
    addBtn.type = "button";
    addBtn.addEventListener("click", () => {
      state.dependentesAvancado.push({ idade: 10 });
      draw();
    });
    wrapper.append(addBtn);

    return wrapper;
  }

  function drawResult() {
    const r = state.resultado;
    const card = el("section", "card");
    card.setAttribute("aria-labelledby", "taximetro-result-heading");

    const heading = el("h1", null, "O teu Taxímetro");
    heading.id = "taximetro-result-heading";
    heading.tabIndex = -1;

    const liquido = el("p", "stat-hero stat-hero--green", formatEUR(r.salarioLiquidoMensal));
    const liquidoLabel = el("p", "stat-label", "Salário líquido mensal estimado");

    // Cadeia completa e explícita — nunca um único número sem dizer o
    // que representa (spec §6.2).
    const cadeia = el("dl", "taximetro-cadeia");
    appendCadeiaItem(cadeia, "Custo total para o empregador", r.custoTotalEmpregadorMensal, r.tipoTrabalhador === "independente");
    appendCadeiaItem(cadeia, "Salário bruto", r.salarioBrutoMensal);
    appendCadeiaItem(cadeia, "Segurança Social", -r.descontoSSMensal);
    appendCadeiaItem(cadeia, "IRS estimado", -r.irsEstimadoMensal);
    appendCadeiaItem(cadeia, "Salário líquido", r.salarioLiquidoMensal, false, true);

    const detalhes = el("details");
    const summary = document.createElement("summary");
    summary.textContent = "Como chegámos a este número?";
    const explicacao = el(
      "div",
      null
    );
    explicacao.innerHTML = "";
    explicacao.append(
      el("p", null, r.metodologia),
      el(
        "p",
        null,
        `Rendimento coletável anual: ${formatEUR(r.detalheAnual.rendimentoColetavelAnual)} · Taxa efetiva de IRS: ${(r.detalheAnual.irs.taxaEfetiva * 100).toFixed(2)}%`
      )
    );

    if (r.deducaoAnualPorDependentes > 0) {
      explicacao.append(
        el(
          "p",
          null,
          `Dedução anual por dependentes aplicada: ${formatEUR(r.deducaoAnualPorDependentes)}${state.usouSimplificacaoDependentes ? " (Modo Rápido: assumiu-se idade superior a 3 anos para cada dependente)" : ""}.`
        )
      );
    }

    if (r.detalheAnual.irs.diferencialRegionalAplicado) {
      const avisoRegional = el(
        "p",
        null,
        "Este cálculo inclui uma redução de IRS para a região autónoma escolhida. O mecanismo exato deste diferencial regional ainda não foi confirmado contra a fonte legal primária — ver TAX-METHODOLOGY.md. Trata este valor como uma estimativa, não como um valor oficial."
      );
      avisoRegional.className = "disclaimer";
      explicacao.append(avisoRegional);
    }

    detalhes.append(summary, explicacao);

    const backBtn = el("button", "btn btn--secondary", "Simular outro valor");
    backBtn.type = "button";
    backBtn.addEventListener("click", voltarAoFormulario);

    card.append(heading, liquido, liquidoLabel, cadeia, detalhes, backBtn);
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

function fieldNumber(id, labelText, value, onChange, attrs = {}) {
  const wrapper = el("div", "taximetro-field");
  const label = document.createElement("label");
  label.htmlFor = id;
  label.textContent = labelText;
  const input = document.createElement("input");
  input.type = "number";
  input.id = id;
  input.name = id;
  input.value = value === "" ? "" : String(value);
  input.min = attrs.min !== undefined ? String(attrs.min) : "0";
  if (attrs.step !== undefined) input.step = String(attrs.step);
  input.addEventListener("input", (e) => onChange(e.target.value));
  wrapper.append(label, input);
  return wrapper;
}

function fieldSelect(id, labelText, options, value, onChange) {
  const wrapper = el("div", "taximetro-field");
  const label = document.createElement("label");
  label.htmlFor = id;
  label.textContent = labelText;
  const select = document.createElement("select");
  select.id = id;
  select.name = id;
  options.forEach((opt) => {
    const optionEl = document.createElement("option");
    optionEl.value = opt.value;
    optionEl.textContent = opt.label;
    optionEl.selected = opt.value === value;
    select.append(optionEl);
  });
  select.addEventListener("change", (e) => onChange(e.target.value));
  wrapper.append(label, select);
  return wrapper;
}

function appendCadeiaItem(dl, label, value, oculto = false, destaque = false) {
  if (oculto) return;
  const dt = el("dt", destaque ? "stat-label" : null, label);
  const sinal = value < 0 ? "− " : "";
  const dd = el("dd", destaque ? "stat-label" : null, `${sinal}${formatEUR(Math.abs(value))}`);
  dl.append(dt, dd);
}

function formatEUR(value) {
  return new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" }).format(value);
}

function focusHeading(headingEl) {
  headingEl.focus({ preventScroll: false });
}
