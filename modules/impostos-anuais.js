// Liberdade Fiscal — Módulo de UI de "Taxas" (impostos anuais/patrimoniais)
// (Fase 6, redesenhado em agosto de 2026 — ver CLAUDE.md §6.4)
//
// Spec §6.4: IMI, IUC, ISV, IMT, Imposto de Selo não encaixam no fluxo
// de "gasto mensal" — são eventos anuais ou pontuais. Ao contrário dos
// gastos, a app NÃO calcula estes valores (as tabelas completas de
// ISV/IUC/Imposto de Selo estão marcadas UNKNOWN/ESTIMATE em
// data/tax-rules/2026/patrimoniais.js — ver TAX-METHODOLOGY.md): o
// utilizador regista o valor que já sabe que pagou, tipicamente lido da
// própria nota de liquidação (ex.: carta do IMI, aviso do IUC).
//
// Redesenho de agosto de 2026: formulário simplificado a apenas
// tipo + valor (a data, a recorrência e a nota deixaram de se pedir —
// a data/recorrência são inferidas silenciosamente a partir do tipo,
// já que data/db.js ainda as exige na validação de savePeriodicTax).
// Este ecrã é o terceiro passo do fluxo acumulativo Rendimentos →
// Gastos → Taxas → Dia da Liberdade Fiscal — "Guardar e avançar" grava
// o total no Período atual (data/db.js) e navega para o resultado.

import { savePeriodicTax, dbGetAll, dbDelete, atualizarPeriodoAtual } from "../data/db.js";
import { PATRIMONIAIS_2026 } from "../data/tax-rules/2026/patrimoniais.js";

const TIPOS_IMPOSTO = [
  {
    value: "IMI",
    label: "IMI — Imposto Municipal sobre Imóveis",
    ajuda: "Valor da nota de liquidação anual do teu imóvel.",
    recorrencia: "annual",
  },
  {
    value: "IUC",
    label: "IUC — Imposto Único de Circulação",
    ajuda: "Valor pago anualmente pelo teu veículo.",
    recorrencia: "annual",
  },
  {
    value: "ISV",
    label: "ISV — Imposto sobre Veículos",
    ajuda: "Pago uma única vez, na compra/matrícula do veículo.",
    recorrencia: "one_time",
  },
  {
    value: "IMT",
    label: "IMT — Imposto Municipal sobre Transmissões Onerosas",
    ajuda: "Pago uma única vez, na compra de um imóvel.",
    recorrencia: "one_time",
  },
  {
    value: "Imposto_Selo",
    label: "Imposto de Selo",
    ajuda: "Ex.: contratos de crédito, transmissões. Nunca acumulado com IVA sobre o mesmo ato.",
    recorrencia: "one_time",
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
    card.setAttribute("aria-labelledby", "taxas-heading");

    const heading = el("h1", null, "Taxas");
    heading.id = "taxas-heading";
    heading.tabIndex = -1;

    const desc = el(
      "p",
      null,
      "Regista aqui o IMI, IUC, ISV, IMT ou Imposto de Selo que já pagaste — não são calculados pela app, porque dependem de dados que só tu tens (concelho, valor patrimonial, cilindrada, etc.). Introduz o valor da tua nota de liquidação."
    );

    const privacidade = el(
      "p",
      "stat-label",
      "🔒 Estes valores ficam guardados só neste dispositivo — nunca saem daqui."
    );

    const totalAno = registos.reduce((sum, r) => sum + r.amount, 0);
    const resumo = el("div");
    resumo.append(
      el("p", "stat-hero", formatEUR(totalAno)),
      el("p", "stat-label", "Total registado nesta categoria")
    );

    const voltarBtn = el("button", "btn btn--secondary", "← Voltar a Gastos");
    voltarBtn.type = "button";
    voltarBtn.addEventListener("click", () => {
      window.location.hash = "faturas";
    });

    const novoBtn = el("button", "btn btn--primary", "+ Registar taxa");
    novoBtn.type = "button";
    novoBtn.addEventListener("click", () => {
      state.view = "novo";
      state.erro = null;
      draw();
    });

    const avancarBtn = el("button", "btn btn--secondary", "Guardar e avançar →");
    avancarBtn.type = "button";
    avancarBtn.addEventListener("click", async () => {
      await atualizarPeriodoAtual({
        taxasAnuais: {
          total: round2(totalAno),
          items: registos.map((r) => ({ tipo: r.type, valor: r.amount })),
        },
      });
      window.location.hash = "dia-liberdade";
    });

    const botoes = el("div", "taximetro-botoes");
    botoes.append(voltarBtn, novoBtn, avancarBtn);

    card.append(heading, desc, privacidade, resumo, botoes);
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
    card.setAttribute("aria-labelledby", "nova-taxa-heading");

    const heading = el("h1", null, "Registar taxa");
    heading.id = "nova-taxa-heading";
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
    tipoField.append(tipoLabel, tipoSelect, tipoAjuda);

    // IMI: a taxa varia por concelho (0,3%-0,45% do VPT) — pedir a
    // localidade em vez de assumir silenciosamente a taxa mais comum
    // (0,3%), e mostrar a taxa aplicável em %.
    const concelhoField = el("div", "taximetro-field");
    const concelhoLabel = document.createElement("label");
    concelhoLabel.htmlFor = "concelho-imi";
    concelhoLabel.textContent = "Em que concelho fica o imóvel? (ex.: Oeiras, Sintra, Leiria)";
    const concelhoInput = document.createElement("input");
    concelhoInput.type = "text";
    concelhoInput.id = "concelho-imi";
    concelhoInput.autocomplete = "off";
    const concelhoTaxaInfo = el("span", "stat-label", "");
    concelhoField.append(concelhoLabel, concelhoInput, concelhoTaxaInfo);
    concelhoField.hidden = true;

    // Normaliza para comparação: minúsculas, sem diacríticos, espaços
    // colapsados — para que "acores"/"Açores"/"AÇORES" ou "sao joao"/
    // "S. João" combinem com os nomes tal como publicados na fonte.
    function normalizarConcelho(str) {
      return str
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "")
        .toLowerCase()
        .replace(/\s+/g, " ")
        .trim();
    }

    function atualizarTaxaImi() {
      const tabela = PATRIMONIAIS_2026.imi.tabelaPorConcelho;
      const valorDigitado = concelhoInput.value.trim();
      const concelhoNormalizado = normalizarConcelho(valorDigitado);
      const entrada = tabela.lista.find(
        ([, nome]) => normalizarConcelho(nome) === concelhoNormalizado
      );
      const percentagem = (taxa) => (taxa * 100).toFixed(2).replace(/\.?0+$/, "").replace(".", ",");

      if (!valorDigitado) {
        concelhoTaxaInfo.textContent =
          "Ainda não nos disseste o concelho — sabemos que a maioria dos 308 municípios aplica 0,3%, mas confirma sempre a tua taxa no Portal das Finanças ou na Câmara Municipal.";
      } else if (entrada && entrada[2] === null) {
        concelhoTaxaInfo.textContent = `${entrada[1]} é um dos 6 concelhos com taxa de IMI diferenciada por freguesia — não temos um valor único para te mostrar. Confirma a taxa da tua freguesia no Portal das Finanças ou na Câmara Municipal.`;
      } else if (entrada) {
        const taxa = entrada[2];
        const nota =
          taxa === 0.0045
            ? " — um dos 4 concelhos com a taxa máxima em 2026"
            : "";
        concelhoTaxaInfo.textContent = `Em ${entrada[1]} a taxa de IMI em 2026 é ${percentagem(taxa)}% do VPT${nota} (🟡 é uma estimativa nossa a partir de fonte secundária, confirma sempre no Portal das Finanças ou na Câmara Municipal).`;
      } else {
        concelhoTaxaInfo.textContent = `Ainda não temos a taxa exata de "${valorDigitado}" na nossa lista (pode ser um dos ~9 concelhos sem informação disponível, ou um erro de escrita). A maioria dos municípios aplica ${percentagem(tabela.taxaSugeridaPorOmissao)}%, mas confirma o teu no Portal das Finanças ou na Câmara Municipal, e ajusta o valor pago abaixo se for diferente.`;
      }
    }
    concelhoInput.addEventListener("input", atualizarTaxaImi);
    atualizarTaxaImi();

    tipoSelect.addEventListener("change", () => {
      const t = TIPOS_IMPOSTO.find((x) => x.value === tipoSelect.value);
      tipoAjuda.textContent = t ? t.ajuda : "";
      concelhoField.hidden = tipoSelect.value !== "IMI";
    });
    concelhoField.hidden = tipoSelect.value !== "IMI";

    const valorField = el("div", "taximetro-field");
    const valorLabel = document.createElement("label");
    valorLabel.htmlFor = "valor-imposto";
    valorLabel.textContent = "Valor pago";
    const valorInputWrap = el("div", "input-euro");
    const valorInput = document.createElement("input");
    valorInput.type = "number";
    valorInput.id = "valor-imposto";
    valorInput.min = "0";
    valorInput.step = "0.01";
    valorInputWrap.append(valorInput);
    valorField.append(valorLabel, valorInputWrap);

    form.append(tipoField, concelhoField, valorField);

    if (state.erro) {
      const erroEl = el("p", "form-error", state.erro);
      erroEl.setAttribute("role", "alert");
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

      const tipoInfo = TIPOS_IMPOSTO.find((t) => t.value === tipoSelect.value);

      try {
        await savePeriodicTax({
          id: generateId(),
          type: tipoSelect.value,
          amount: round2(valor),
          date: new Date().toISOString().slice(0, 10),
          recurrence: tipoInfo ? tipoInfo.recorrencia : "one_time",
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
