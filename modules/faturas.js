// Liberdade Fiscal — Módulo de UI de Faturas (Fase 5)
//
// Fluxo primário: manual (spec §6.3). O utilizador escolhe um item do
// catálogo (IVA já resolvido) e introduz o total pago; a app calcula
// o desglose. Atajo QR está em faturas-qr.js (importado aqui). Foto+IA
// é um fallback que depende de um Cloudflare Worker não desplegado
// nesta fase — ver tasks pendentes.

import { getSetting } from "../data/db.js";
import { saveInvoice, dbGetAll } from "../data/db.js";
import { GOODS_SERVICES_PT } from "../data/goods-services-pt.js";
import { decomporIVADeTotal, decomporCombustivel, decomporIABA } from "../data/tax-engine.js";
import { render as renderOnboarding } from "./onboarding.js";
import { render as renderQrAtalho } from "./faturas-qr.js";

export function render(container) {
  let destroyed = false;
  let subInstance = null;

  async function start() {
    const regiao = await getSetting("region");
    if (destroyed) return;

    if (!regiao) {
      subInstance = renderOnboarding(container, {
        onComplete: () => {
          if (!destroyed) start();
        },
      });
      return;
    }

    subInstance = renderFaturaApp(container, regiao);
  }

  start();

  return {
    destroy() {
      destroyed = true;
      if (subInstance && typeof subInstance.destroy === "function") subInstance.destroy();
      container.innerHTML = "";
    },
  };
}

function renderFaturaApp(container, regiaoInicial) {
  let state = {
    regiao: regiaoInicial,
    view: "lista", // "lista" | "nova" | "qr"
    itemSelecionado: null,
    valorTotal: "",
    erro: null,
    ultimoResultado: null,
  };

  async function draw() {
    container.innerHTML = "";
    if (state.view === "qr") {
      const qrInstance = renderQrAtalho(container, {
        regiao: state.regiao,
        onDadosLidos: (dadosPreenchidos) => {
          state.view = "nova";
          state.dadosQr = dadosPreenchidos;
          if (dadosPreenchidos.valorTotal !== null && dadosPreenchidos.valorTotal !== undefined) {
            state.valorTotal = String(dadosPreenchidos.valorTotal);
          }
          state.itemSelecionado = null;
          state.erro = null;
          draw();
        },
        onCancelar: () => {
          state.view = "lista";
          draw();
        },
      });
      currentSubInstance = qrInstance;
      return;
    }

    currentSubInstance = null;

    if (state.view === "nova") {
      await drawNovaFatura();
    } else {
      await drawLista();
    }
  }

  let currentSubInstance = null;

  async function drawLista() {
    const invoices = (await dbGetAll("invoices")).sort((a, b) => (a.date < b.date ? 1 : -1));

    const card = el("section", "card");
    card.setAttribute("aria-labelledby", "faturas-heading");

    const heading = el("h1", null, "Faturas");
    heading.id = "faturas-heading";
    heading.tabIndex = -1;

    const regiaoInfo = el("p", "stat-label", `Região: ${labelRegiao(state.regiao)}`);

    const totalGasto = invoices.reduce((sum, inv) => sum + inv.amount_total, 0);
    const totalIva = invoices.reduce((sum, inv) => sum + (inv.amount_tax || 0), 0);

    const resumo = el("div");
    resumo.append(
      el("p", "stat-hero", formatEUR(totalGasto)),
      el("p", "stat-label", `Total registado · ${formatEUR(totalIva)} em IVA estimado`)
    );

    const actions = el("div", "faturas-actions");
    const novaBtn = el("button", "btn btn--primary", "+ Registar despesa");
    novaBtn.type = "button";
    novaBtn.addEventListener("click", () => {
      state.view = "nova";
      state.itemSelecionado = null;
      state.valorTotal = "";
      state.erro = null;
      state.dadosQr = null;
      draw();
    });
    const qrBtn = el("button", "btn btn--secondary", "Ler código QR");
    qrBtn.type = "button";
    qrBtn.addEventListener("click", () => {
      state.view = "qr";
      draw();
    });
    actions.append(novaBtn, qrBtn);

    card.append(heading, regiaoInfo, resumo, actions);
    container.append(card);

    if (invoices.length > 0) {
      const listCard = el("section", "card");
      const listHeading = el("h2", null, "Últimos registos");
      const list = el("ul", "faturas-list");
      invoices.slice(0, 20).forEach((inv) => {
        const item = GOODS_SERVICES_PT.find((g) => g.id === inv.goodServiceId);
        const li = el("li", "faturas-list-item");
        li.append(
          el("span", null, item ? item.name_pt : inv.goodServiceId),
          el("span", "stat-label", `${inv.date} · ${formatEUR(inv.amount_total)}`)
        );
        list.append(li);
      });
      listCard.append(listHeading, list);
      container.append(listCard);
    }

    focusHeading(heading);
  }

  async function drawNovaFatura() {
    const card = el("section", "card");
    card.setAttribute("aria-labelledby", "nova-fatura-heading");

    const heading = el("h1", null, "Registar despesa");
    heading.id = "nova-fatura-heading";
    heading.tabIndex = -1;

    const form = el("form");
    form.noValidate = true;

    if (state.dadosQr) {
      const qrNota = el(
        "p",
        "disclaimer",
        "Valor preenchido a partir do código QR. O QR não indica a que categoria pertence a despesa — escolhe o item mais próximo do catálogo para calcularmos o IVA correto."
      );
      form.append(qrNota);
    }

    const itemField = el("div", "taximetro-field");
    const itemLabel = document.createElement("label");
    itemLabel.htmlFor = "item-catalogo";
    itemLabel.textContent = "O que compraste?";
    const itemSelect = document.createElement("select");
    itemSelect.id = "item-catalogo";
    const placeholderOpt = document.createElement("option");
    placeholderOpt.value = "";
    placeholderOpt.textContent = "— Seleciona um item —";
    itemSelect.append(placeholderOpt);

    const categorias = [...new Set(GOODS_SERVICES_PT.map((i) => i.category))];
    categorias.forEach((cat) => {
      const optgroup = document.createElement("optgroup");
      optgroup.label = cat;
      GOODS_SERVICES_PT.filter((i) => i.category === cat).forEach((item) => {
        const opt = document.createElement("option");
        opt.value = item.id;
        opt.textContent = item.name_pt;
        opt.selected = state.itemSelecionado === item.id;
        optgroup.append(opt);
      });
      itemSelect.append(optgroup);
    });
    itemSelect.addEventListener("change", (e) => {
      state.itemSelecionado = e.target.value || null;
    });
    itemField.append(itemLabel, itemSelect);

    const valorField = el("div", "taximetro-field");
    const valorLabel = document.createElement("label");
    valorLabel.htmlFor = "valor-total";
    valorLabel.textContent = "Quanto pagaste, no total (€)?";
    const valorInput = document.createElement("input");
    valorInput.type = "number";
    valorInput.id = "valor-total";
    valorInput.min = "0";
    valorInput.step = "0.01";
    valorInput.value = state.valorTotal;
    valorInput.addEventListener("input", (e) => {
      state.valorTotal = e.target.value;
    });
    valorField.append(valorLabel, valorInput);

    form.append(itemField, valorField);

    if (state.erro) {
      const erroEl = el("p", null, state.erro);
      erroEl.setAttribute("role", "alert");
      erroEl.style.color = "var(--color-danger)";
      form.append(erroEl);
    }

    const submitBtn = el("button", "btn btn--primary", "Calcular e confirmar");
    submitBtn.type = "submit";

    const cancelBtn = el("button", "btn btn--secondary", "Cancelar");
    cancelBtn.type = "button";
    cancelBtn.addEventListener("click", () => {
      state.view = "lista";
      draw();
    });

    form.addEventListener("submit", (event) => {
      event.preventDefault();
      handleCalcular();
    });

    form.append(submitBtn, cancelBtn);
    card.append(heading, form);
    container.append(card);
    focusHeading(heading);
  }

  function handleCalcular() {
    const item = GOODS_SERVICES_PT.find((i) => i.id === state.itemSelecionado);
    const valor = Number(state.valorTotal);

    if (!item) {
      state.erro = "Escolhe um item do catálogo.";
      draw();
      return;
    }
    if (!Number.isFinite(valor) || valor <= 0) {
      state.erro = "Introduz um valor total válido, maior que zero.";
      draw();
      return;
    }

    state.erro = null;
    const desglose = decomporIVADeTotal(valor, state.regiao, item.iva_level);

    let notaEspecial = null;
    if (item.special_tax) {
      if (item.special_tax.type === "ISP") {
        const tipoCombustivel = item.id === "combustivel-gasolina" ? "gasolina" : "gasoleoRodoviario";
        notaEspecial = decomporCombustivel(valor, tipoCombustivel, state.regiao);
      } else if (item.special_tax.type === "IABA") {
        notaEspecial = decomporIABA();
      } else {
        notaEspecial = { status: "info", notes: item.special_tax.note };
      }
    }

    state.ultimoResultado = { item, valor, desglose, notaEspecial };
    drawConfirmacao();
  }

  function drawConfirmacao() {
    container.innerHTML = "";
    const { item, valor, desglose, notaEspecial } = state.ultimoResultado;

    const card = el("section", "card");
    card.setAttribute("aria-labelledby", "confirmar-heading");

    const heading = el("h1", null, "Confirma o registo");
    heading.id = "confirmar-heading";
    heading.tabIndex = -1;

    const resumo = el("dl", "taximetro-cadeia");
    appendItem(resumo, "Item", item.name_pt);
    appendItem(resumo, "Valor pago", formatEUR(valor));
    appendItem(resumo, "Base tributável (estimada)", formatEUR(desglose.baseTributavel));
    appendItem(resumo, "IVA (estimado)", formatEUR(desglose.imposto));

    card.append(heading, resumo);

    if (notaEspecial) {
      const nota = el(
        "p",
        "disclaimer",
        notaEspecial.status === "UNKNOWN" || notaEspecial.status === "ESTIMATE"
          ? notaEspecial.notes || notaEspecial.reason
          : notaEspecial.notes
      );
      card.append(nota);
    }

    const confirmBtn = el("button", "btn btn--primary", "Confirmar e guardar");
    confirmBtn.type = "button";
    confirmBtn.addEventListener("click", async () => {
      const invoice = {
        id: generateId(),
        date: new Date().toISOString().slice(0, 10),
        source: "manual",
        goodServiceId: item.id,
        region: state.regiao,
        amount_total: round2(valor),
        amount_base: round2(desglose.baseTributavel),
        amount_tax: round2(desglose.imposto),
        confirmed_by_user: true,
      };
      await saveInvoice(invoice);
      state.view = "lista";
      draw();
    });

    const backBtn = el("button", "btn btn--secondary", "Voltar e corrigir");
    backBtn.type = "button";
    backBtn.addEventListener("click", () => {
      state.view = "nova";
      draw();
    });

    card.append(confirmBtn, backBtn);
    container.append(card);
    focusHeading(heading);
  }

  draw();

  return {
    destroy() {
      if (currentSubInstance && typeof currentSubInstance.destroy === "function") {
        currentSubInstance.destroy();
      }
      container.innerHTML = "";
    },
  };
}

/* -----------------------------
   Utilitários
   ----------------------------- */

function el(tag, className, textContent) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (textContent !== undefined) node.textContent = textContent;
  return node;
}

function appendItem(dl, label, value) {
  dl.append(el("dt", null, label), el("dd", null, value));
}

function labelRegiao(regiao) {
  return { continente: "Continente", acores: "Açores", madeira: "Madeira" }[regiao] || regiao;
}

function formatEUR(value) {
  return new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" }).format(value);
}

function round2(value) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function generateId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return `inv-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function focusHeading(headingEl) {
  if (headingEl) headingEl.focus({ preventScroll: false });
}
