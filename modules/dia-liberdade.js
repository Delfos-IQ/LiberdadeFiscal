// Liberdade Fiscal — Módulo de UI do Dia da Liberdade Fiscal (Fase 7)
//
// Spec §6.5: consolida IRS + Segurança Social (trabalhador) + IVA e
// impostos especiais (registados em Faturas) + impostos
// patrimoniais/anuais (registados em Impostos Anuais) num único
// resultado explicável — nunca "a partir de hoje deixas de pagar
// impostos", sempre framed como proporção anual segundo hipóteses
// explícitas.
//
// Esta é também a terceira e última presença obrigatória do disclaimer
// legal exigida pelo spec (secção 9): onboarding, footer, e este ecrã.

import { calcularCadeiaSalarial, calculateFiscalFreedomDay } from "../data/tax-engine.js";
import { dbGetAll } from "../data/db.js";
import { buildShareText, desenharCartaoCanvas } from "../data/share-card.js";

// Ano fiscal ativo — tem de acompanhar data/tax-rules/2026/*.js. Não
// existe ainda um mecanismo de seleção de ano fiscal (fora do âmbito
// da v1, spec §5: "parâmetros fiscais versionados por ano").
const ANO_FISCAL = 2026;

const REGIOES = [
  { value: "continente", label: "Continente" },
  { value: "acores", label: "Açores" },
  { value: "madeira", label: "Madeira" },
];

export function render(container) {
  let state = {
    phase: "form",
    salarioBruto: "",
    estadoCivil: "individual",
    tipoTrabalhador: "dependente",
    regiao: "continente",
    numDependentes: 0,
    erro: null,
    resultado: null,
  };

  function draw() {
    container.innerHTML = "";
    if (state.phase === "form") drawForm();
    else drawResult();
  }

  async function handleSubmit(event) {
    event.preventDefault();

    const salario = Number(state.salarioBruto);
    if (!Number.isFinite(salario) || salario <= 0) {
      state.erro = "Introduz um salário bruto mensal válido, maior que zero.";
      draw();
      return;
    }

    const dependentes = Array.from({ length: state.numDependentes }, () => ({ idade: 10 }));

    try {
      const cadeia = calcularCadeiaSalarial(salario, {
        tipoTrabalhador: state.tipoTrabalhador,
        estadoCivil: state.estadoCivil,
        dependentes,
        regiao: state.regiao,
      });

      const irsAnual = Math.max(0, cadeia.irsAnualAntesDeDeducoes - cadeia.deducaoAnualPorDependentes);
      const ssTrabalhadorAnual = round2(cadeia.descontoSSMensal * 12);
      const rendimentoBrutoAnual = cadeia.detalheAnual.rendimentoBrutoAnual;

      const [invoices, periodicTaxes] = await Promise.all([dbGetAll("invoices"), dbGetAll("periodicTaxes")]);
      const ivaEEspeciaisRegistado = round2(invoices.reduce((sum, inv) => sum + (inv.amount_tax || 0), 0));
      const patrimoniaisRegistado = round2(periodicTaxes.reduce((sum, t) => sum + (t.amount || 0), 0));

      const resultado = calculateFiscalFreedomDay({
        ano: ANO_FISCAL,
        rendimentoBrutoAnual,
        irsAnual,
        ssTrabalhadorAnual,
        ivaEEspeciaisRegistado,
        patrimoniaisRegistado,
      });

      state.erro = null;
      state.resultado = resultado;
      state.numRegistosConsumo = invoices.length;
      state.numRegistosPatrimoniais = periodicTaxes.length;
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
    card.setAttribute("aria-labelledby", "dia-liberdade-heading");

    const heading = el("h1", null, "Dia da Liberdade Fiscal");
    heading.id = "dia-liberdade-heading";
    heading.tabIndex = -1;

    const desc = el(
      "p",
      null,
      "Junta o teu rendimento de trabalho aos consumos e impostos patrimoniais que já registaste, e descobre a que dia do ano corresponde a proporção do teu ano dedicada a impostos e contribuições."
    );

    const form = el("form");
    form.noValidate = true;

    const salarioField = el("div", "taximetro-field");
    const salarioLabel = document.createElement("label");
    salarioLabel.htmlFor = "dl-salario-bruto";
    salarioLabel.textContent = "Salário bruto mensal (€)";
    const salarioInput = document.createElement("input");
    salarioInput.type = "number";
    salarioInput.id = "dl-salario-bruto";
    salarioInput.min = "0";
    salarioInput.step = "0.01";
    salarioInput.value = state.salarioBruto;
    salarioInput.addEventListener("input", (e) => (state.salarioBruto = e.target.value));
    salarioField.append(salarioLabel, salarioInput);

    const tipoField = el("div", "taximetro-field");
    const tipoLabel = document.createElement("label");
    tipoLabel.htmlFor = "dl-tipo-trabalhador";
    tipoLabel.textContent = "Tipo de trabalhador";
    const tipoSelect = document.createElement("select");
    tipoSelect.id = "dl-tipo-trabalhador";
    [
      { value: "dependente", label: "Trabalhador por conta de outrem" },
      { value: "independente", label: "Trabalhador independente" },
    ].forEach((o) => {
      const opt = document.createElement("option");
      opt.value = o.value;
      opt.textContent = o.label;
      tipoSelect.append(opt);
    });
    tipoSelect.value = state.tipoTrabalhador;
    tipoSelect.addEventListener("change", (e) => (state.tipoTrabalhador = e.target.value));
    tipoField.append(tipoLabel, tipoSelect);

    const estadoField = el("div", "taximetro-field");
    const estadoLabel = document.createElement("label");
    estadoLabel.htmlFor = "dl-estado-civil";
    estadoLabel.textContent = "Estado civil (para efeitos de IRS)";
    const estadoSelect = document.createElement("select");
    estadoSelect.id = "dl-estado-civil";
    [
      { value: "individual", label: "Declaração individual" },
      { value: "conjunta", label: "Declaração conjunta (casado/união de facto)" },
    ].forEach((o) => {
      const opt = document.createElement("option");
      opt.value = o.value;
      opt.textContent = o.label;
      estadoSelect.append(opt);
    });
    estadoSelect.value = state.estadoCivil;
    estadoSelect.addEventListener("change", (e) => (state.estadoCivil = e.target.value));
    estadoField.append(estadoLabel, estadoSelect);

    const regiaoField = el("div", "taximetro-field");
    const regiaoLabel = document.createElement("label");
    regiaoLabel.htmlFor = "dl-regiao";
    regiaoLabel.textContent = "Região";
    const regiaoSelect = document.createElement("select");
    regiaoSelect.id = "dl-regiao";
    REGIOES.forEach((r) => {
      const opt = document.createElement("option");
      opt.value = r.value;
      opt.textContent = r.label;
      regiaoSelect.append(opt);
    });
    regiaoSelect.value = state.regiao;
    regiaoSelect.addEventListener("change", (e) => (state.regiao = e.target.value));
    regiaoField.append(regiaoLabel, regiaoSelect);

    const depField = el("div", "taximetro-field");
    const depLabel = document.createElement("label");
    depLabel.htmlFor = "dl-dependentes";
    depLabel.textContent = "Número de dependentes";
    const depInput = document.createElement("input");
    depInput.type = "number";
    depInput.id = "dl-dependentes";
    depInput.min = "0";
    depInput.step = "1";
    depInput.value = String(state.numDependentes);
    depInput.addEventListener("input", (e) => (state.numDependentes = Math.max(0, Number(e.target.value) || 0)));
    depField.append(depLabel, depInput);

    const notaConsumo = el(
      "p",
      "disclaimer",
      "O IVA/impostos especiais e os impostos patrimoniais usados neste cálculo são os que já registaste nas secções Faturas e Impostos Anuais — não uma estimativa automática do teu consumo total. Regista mais despesas para um resultado mais preciso."
    );

    form.append(salarioField, tipoField, estadoField, regiaoField, depField, notaConsumo);

    if (state.erro) {
      const erroEl = el("p", null, state.erro);
      erroEl.setAttribute("role", "alert");
      erroEl.style.color = "var(--color-danger)";
      form.append(erroEl);
    }

    const submitBtn = el("button", "btn btn--primary", "Calcular o meu Dia da Liberdade Fiscal");
    submitBtn.type = "submit";
    form.addEventListener("submit", handleSubmit);
    form.append(submitBtn);

    const disclaimer = el(
      "p",
      "disclaimer",
      "Esta aplicação fornece estimativas para fins informativos e educativos. Não constitui aconselhamento fiscal, financeiro ou jurídico e não substitui o cálculo oficial da Autoridade Tributária."
    );

    card.append(heading, desc, form, disclaimer);
    container.append(card);
    heading.focus({ preventScroll: false });
  }

  function drawResult() {
    const r = state.resultado;

    const card = el("section", "card");
    card.setAttribute("aria-labelledby", "resultado-dia-heading");

    const heading = el("h1", null, "O teu Dia da Liberdade Fiscal");
    heading.id = "resultado-dia-heading";
    heading.tabIndex = -1;

    const dataFormatada = formatarDataPT(r.date);
    const dataHero = el("p", "stat-hero", dataFormatada);
    const percentagemLabel = el(
      "p",
      "stat-label",
      `${formatPercentagem(r.percentage)} do ano (${r.dayOfYear} de ${isAnoBissexto(r.ano) ? 366 : 365} dias) — segundo as hipóteses desta simulação`
    );

    const framing = el(
      "p",
      null,
      "Esta é a data correspondente à proporção anual do valor destinado a impostos e contribuições, segundo as hipóteses usadas nesta simulação — não significa que deixes de pagar impostos a partir de hoje."
    );

    const breakdown = el("dl", "taximetro-cadeia");
    appendItem(breakdown, "IRS anual", formatEUR(r.breakdown.irs));
    appendItem(breakdown, "Segurança Social (trabalhador)", formatEUR(r.breakdown.segurancaSocial));
    appendItem(breakdown, "IVA e impostos especiais registados", formatEUR(r.breakdown.ivaEEspeciais));
    appendItem(breakdown, "Impostos patrimoniais/anuais registados", formatEUR(r.breakdown.patrimoniais));
    appendItem(breakdown, "Total de impostos e contribuições", formatEUR(r.totalImpostos));
    appendItem(breakdown, "Rendimento bruto anual de referência", formatEUR(r.rendimentoBase));

    const detalhes = document.createElement("details");
    const summary = document.createElement("summary");
    summary.textContent = "Como chegámos a este número?";
    const metodologiaTexto = el("p", null, r.methodology);
    const registosInfo = el(
      "p",
      "stat-label",
      `Baseado em ${state.numRegistosConsumo} registo(s) de faturas e ${state.numRegistosPatrimoniais} registo(s) de impostos anuais/patrimoniais.`
    );
    detalhes.append(summary, metodologiaTexto, registosInfo);

    const disclaimer = el(
      "p",
      "disclaimer",
      "Esta aplicação fornece estimativas para fins informativos e educativos. Não constitui aconselhamento fiscal, financeiro ou jurídico e não substitui o cálculo oficial da Autoridade Tributária."
    );

    const acoes = el("div", "faturas-actions");

    const voltarBtn = el("button", "btn btn--secondary", "Recalcular");
    voltarBtn.type = "button";
    voltarBtn.addEventListener("click", voltarAoFormulario);
    acoes.append(voltarBtn);

    if (typeof document !== "undefined" && "createElement" in document) {
      const partilharBtn = el("button", "btn btn--primary", "Partilhar resultado");
      partilharBtn.type = "button";
      partilharBtn.addEventListener("click", () => partilharResultado(r));
      acoes.append(partilharBtn);
    }

    const compararLink = document.createElement("a");
    compararLink.href = "#benchmark-ocde";
    compararLink.className = "btn btn--secondary";
    compararLink.textContent = "Comparar com a OCDE →";
    acoes.append(compararLink);

    card.append(heading, dataHero, percentagemLabel, framing, breakdown, detalhes, acoes, disclaimer);
    container.append(card);
    heading.focus({ preventScroll: false });
  }

  async function partilharResultado(resultado) {
    const texto = buildShareText(resultado);

    // Canvas API pode não existir em todos os ambientes (ex.: testes
    // headless) — nesse caso caímos diretamente para a partilha de
    // texto simples, sem imagem.
    let blob = null;
    try {
      const canvas = document.createElement("canvas");
      canvas.width = 1080;
      canvas.height = 1920;
      if (canvas.getContext) {
        desenharCartaoCanvas(canvas, resultado);
        blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
      }
    } catch {
      blob = null;
    }

    const podePartilharFicheiro =
      blob && typeof navigator !== "undefined" && navigator.canShare && navigator.canShare({ files: [ficheiroDe(blob)] });

    try {
      if (podePartilharFicheiro) {
        await navigator.share({ text: texto, files: [ficheiroDe(blob)] });
        return;
      }
      if (typeof navigator !== "undefined" && navigator.share) {
        await navigator.share({ text: texto });
        return;
      }
    } catch {
      // Utilizador cancelou a partilha nativa, ou falhou — cai para o
      // fallback abaixo em vez de deixar o botão sem efeito nenhum.
    }

    if (blob) {
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "liberdade-fiscal.png";
      link.click();
      URL.revokeObjectURL(url);
    } else if (typeof navigator !== "undefined" && navigator.clipboard) {
      await navigator.clipboard.writeText(texto);
    }
  }

  function ficheiroDe(blob) {
    return new File([blob], "liberdade-fiscal.png", { type: "image/png" });
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

function appendItem(dl, label, value) {
  dl.append(el("dt", null, label), el("dd", null, value));
}

function formatEUR(value) {
  return new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" }).format(value);
}

function formatPercentagem(fracao) {
  return new Intl.NumberFormat("pt-PT", { style: "percent", maximumFractionDigits: 1 }).format(fracao);
}

function formatarDataPT(isoDate) {
  const [ano, mes, dia] = isoDate.split("-").map(Number);
  const data = new Date(Date.UTC(ano, mes - 1, dia));
  return new Intl.DateTimeFormat("pt-PT", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(
    data
  );
}

function isAnoBissexto(ano) {
  return (ano % 4 === 0 && ano % 100 !== 0) || ano % 400 === 0;
}

function round2(value) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}
