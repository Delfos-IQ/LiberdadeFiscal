// Liberdade Fiscal — Módulo de UI de Impostos Anuais/Patrimoniais (Fase 6)
//
// Spec §6.4: IMI, IUC, ISV, IMT, Imposto de Selo não encaixam no fluxo
// de "fatura de consumo diário" (Fase 5) — são eventos anuais ou
// pontuais. Ao contrário das faturas, a app NÃO calcula estes valores
// (as tabelas completas de ISV/IUC/Imposto de Selo estão marcadas
// UNKNOWN/ESTIMATE em data/tax-rules/2026/patrimoniais.js — ver
// TAX-METHODOLOGY.md): o utilizador regista o valor que já sabe que
// pagou, tipicamente lido da própria nota de liquidação (ex.: carta do
// IMI, aviso do IUC). Estes valores somam-se diretamente ao acumulado
// anual do Dia da Liberdade Fiscal (Fase 7).

import { savePeriodicTax, dbGetAll, dbDelete } from "../data/db.js";

const TIPOS_IMPOSTO = [
  {
    value: "IMI",
    label: "IMI — Imposto Municipal sobre Imóveis",
    ajuda: "Valor da nota de liquidação anual do teu imóvel.",
  },
  {
    value: "IUC",
    label: "IUC — Imposto Único de Circulação",
    ajuda: "Valor pago anualmente pelo teu veículo.",
  },
  {
    value: "ISV",
    label: "ISV — Imposto sobre Veículos",
    ajuda: "Pago uma única vez, na compra/matrícula do veículo.",
  },
  {
    value: "IMT",
    label: "IMT — Imposto Municipal sobre Transmissões Onerosas",
    ajuda: "Pago uma única vez, na compra de um imóvel.",
  },
  {
    value: "Imposto_Selo",
    label: "Imposto de Selo",
    ajuda: "Ex.: contratos de crédito, transmissões. Nunca acumulado com IVA sobre o mesmo ato.",
  },
];

export function render(container) {
  let state = {
    view: "lista", // "lista" | "novo"
    erro: null,
  };

  async function draw() {
    container.innerHTML = "";
    if (state.view === "novo") {
      drawNovoRegisto();
    } else {
      await drawLista();
    }
  }

  async function drawLista() {
    const registos = (await dbGetAll("periodicTaxes")).sort((a, b) => (a.date < b.date ? 1 : -1));

    const card = el("section", "card");
    card.setAttribute("aria-labelledby", "impostos-anuais-heading");

    const heading = el("h1", null, "Impostos anuais e patrimoniais");
    heading.id = "impostos-anuais-heading";
    heading.tabIndex = -1;

    const desc = el(
      "p",
      null,
      "Regista aqui o IMI, IUC, ISV, IMT ou Imposto de Selo que já pagaste — não são calculados pela app, porque dependem de dados que só tu tens (concelho, valor patrimonial, cilindrada, etc.). Introduz o valor da tua nota de liquidação."
    );

    const totalAno = registos.reduce((sum, r) => sum + r.amount, 0);
    const resumo = el("div");
    resumo.append(
      el("p", "stat-hero", formatEUR(totalAno)),
      el("p", "stat-label", "Total registado nesta categoria")
    );

    const novoBtn = el("button", "btn btn--primary", "+ Registar imposto");
    novoBtn.type = "button";
    novoBtn.addEventListener("click", () => {
      state.view = "novo";
      state.erro = null;
      draw();
    });

    card.append(heading, desc, resumo, novoBtn);
    container.append(card);

    if (registos.length > 0) {
      const listCard = el("section", "card");
      const listHeading = el("h2", null, "Registos");
      const list = el("ul", "faturas-list");
      registos.forEach((r) => {
        const tipoInfo = TIPOS_IMPOSTO.find((t) => t.value === r.type);
        const li = el("li", "faturas-list-item");
        const label = el("span", null, tipoInfo ? tipoInfo.label : r.type);
        const valorEData = el("span", "stat-label", `${r.date} · ${formatEUR(r.amount)}`);
        const removerBtn = el("button", "btn btn--secondary", "Remover");
        removerBtn.type = "button";
        removerBtn.setAttribute("aria-label", `Remover registo de ${tipoInfo ? tipoInfo.label : r.type} de ${r.date}`);
        removerBtn.addEventListener("click", async () => {
          await dbDelete("periodicTaxes", r.id);
          draw();
        });
        const linha = el("div");
        linha.append(label, document.createElement("br"), valorEData);
        li.append(linha, removerBtn);
        list.append(li);
      });
      listCard.append(listHeading, list);
      container.append(listCard);
    }

    focusHeading(heading);
  }

  function drawNovoRegisto() {
    const card = el("section", "card");
    card.setAttribute("aria-labelledby", "novo-imposto-heading");

    const heading = el("h1", null, "Registar imposto anual/patrimonial");
    heading.id = "novo-imposto-heading";
    heading.tabIndex = -1;

    const form = el("form");
    form.noValidate = true;

    const tipoField = el("div", "taximetro-field");
    const tipoLabel = document.createElement("label");
    tipoLabel.htmlFor = "tipo-imposto";
    tipoLabel.textContent = "Que imposto pagaste?";
    const tipoSelect = document.createElement("select");
    tipoSelect.id = "tipo-imposto";
    TIPOS_IMPOSTO.forEach((t) => {
      const opt = document.createElement("option");
      opt.value = t.value;
      opt.textContent = t.label;
      tipoSelect.append(opt);
    });
    const tipoAjuda = el("span", "stat-label", TIPOS_IMPOSTO[0].ajuda);
    tipoSelect.addEventListener("change", () => {
      const t = TIPOS_IMPOSTO.find((x) => x.value === tipoSelect.value);
      tipoAjuda.textContent = t ? t.ajuda : "";
      recorrenciaSelect.value = ["IMI", "IUC"].includes(tipoSelect.value) ? "annual" : "one_time";
    });
    tipoField.append(tipoLabel, tipoSelect, tipoAjuda);

    const valorField = el("div", "taximetro-field");
    const valorLabel = document.createElement("label");
    valorLabel.htmlFor = "valor-imposto";
    valorLabel.textContent = "Valor pago (€)";
    const valorInput = document.createElement("input");
    valorInput.type = "number";
    valorInput.id = "valor-imposto";
    valorInput.min = "0";
    valorInput.step = "0.01";
    valorField.append(valorLabel, valorInput);

    const dataField = el("div", "taximetro-field");
    const dataLabel = document.createElement("label");
    dataLabel.htmlFor = "data-imposto";
    dataLabel.textContent = "Data do pagamento";
    const dataInput = document.createElement("input");
    dataInput.type = "date";
    dataInput.id = "data-imposto";
    dataInput.value = new Date().toISOString().slice(0, 10);
    dataField.append(dataLabel, dataInput);

    const recorrenciaField = el("div", "taximetro-field");
    const recorrenciaLabel = document.createElement("label");
    recorrenciaLabel.htmlFor = "recorrencia-imposto";
    recorrenciaLabel.textContent = "Recorrência";
    const recorrenciaSelect = document.createElement("select");
    recorrenciaSelect.id = "recorrencia-imposto";
    [
      { value: "annual", label: "Anual (repete todos os anos)" },
      { value: "one_time", label: "Pontual (pagamento único)" },
    ].forEach((r) => {
      const opt = document.createElement("option");
      opt.value = r.value;
      opt.textContent = r.label;
      recorrenciaSelect.append(opt);
    });
    recorrenciaField.append(recorrenciaLabel, recorrenciaSelect);

    const notaField = el("div", "taximetro-field");
    const notaLabel = document.createElement("label");
    notaLabel.htmlFor = "nota-imposto";
    notaLabel.textContent = "Nota (opcional)";
    const notaInput = document.createElement("input");
    notaInput.type = "text";
    notaInput.id = "nota-imposto";
    notaField.append(notaLabel, notaInput);

    form.append(tipoField, valorField, dataField, recorrenciaField, notaField);

    if (state.erro) {
      const erroEl = el("p", null, state.erro);
      erroEl.setAttribute("role", "alert");
      erroEl.style.color = "var(--color-danger)";
      form.append(erroEl);
    }

    const submitBtn = el("button", "btn btn--primary", "Guardar");
    submitBtn.type = "submit";
    const cancelBtn = el("button", "btn btn--secondary", "Cancelar");
    cancelBtn.type = "button";
    cancelBtn.addEventListener("click", () => {
      state.view = "lista";
      draw();
    });

    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const valor = Number(valorInput.value);
      if (!Number.isFinite(valor) || valor <= 0) {
        state.erro = "Introduz um valor válido, maior que zero.";
        draw();
        return;
      }
      if (!dataInput.value) {
        state.erro = "Introduz a data do pagamento.";
        draw();
        return;
      }

      try {
        await savePeriodicTax({
          id: generateId(),
          type: tipoSelect.value,
          amount: round2(valor),
          date: dataInput.value,
          recurrence: recorrenciaSelect.value,
          note: notaInput.value.trim() || undefined,
        });
        state.view = "lista";
        state.erro = null;
        draw();
      } catch (err) {
        state.erro = err.message;
        draw();
      }
    });

    form.append(submitBtn, cancelBtn);
    card.append(heading, form);
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

/* ----------------------------- Utilitários ----------------------------- */

function el(tag, className, textContent) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (textContent !== undefined) node.textContent = textContent;
  return node;
}

function formatEUR(value) {
  return new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" }).format(value);
}

function round2(value) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function generateId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return `tax-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function focusHeading(headingEl) {
  if (headingEl) headingEl.focus({ preventScroll: false });
}
