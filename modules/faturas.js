// Liberdade Fiscal — Módulo de UI de "Gastos" (Fase 5, redesenhado em
// agosto de 2026 — ver CLAUDE.md §6.3)
//
// Redesenho de agosto de 2026, a pedido do autor: substitui a captura
// por fatura individual (item a item) por uma estimativa mensal
// autorreportada por categoria (data/categorias-gastos-pt.js) — menos
// precisa, muito menos fricção. Para cada categoria o utilizador
// introduz quanto gasta em média por mês; a app decompõe esse valor em
// base + IVA (e ISP quando aplicável) e mostra a fonte de cada taxa.
//
// O fluxo de fatura individual + QR (faturas-qr.js) e o fallback de
// foto+IA continuam no código, mas ficam FORA da navegação ativa desta
// versão — o autor pediu para os manter disponíveis como possível
// "modo avançado" futuro, sem os apagar. Não importar faturas-qr.js
// aqui evita que fique morto silenciosamente sem ninguém notar: ficará
// por reativar explicitamente quando/se esse modo avançado avançar.

import { getSetting, atualizarPeriodoAtual } from "../data/db.js";
import { CATEGORIAS_GASTOS_PT } from "../data/categorias-gastos-pt.js";
import { decomporIVADeTotal, decomporCombustivel } from "../data/tax-engine.js";
import { render as renderOnboarding } from "./onboarding.js";

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

    subInstance = renderGastosApp(container, regiao);
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

function renderGastosApp(container, regiao) {
  // valores[categoriaId] = string do <input> (mantém-se como string
  // para não perder "0," a meio de escrever, etc.)
  const valores = {};
  CATEGORIAS_GASTOS_PT.forEach((c) => {
    valores[c.id] = "";
  });

  function draw() {
    container.innerHTML = "";

    const card = el("section", "card");
    card.setAttribute("aria-labelledby", "gastos-heading");

    const heading = el("h1", null, "Gastos");
    heading.id = "gastos-heading";
    heading.tabIndex = -1;

    const desc = el(
      "p",
      null,
      `Estima quanto gastas por mês em cada categoria (região: ${labelRegiao(regiao)}). Não precisas de guardar faturas — é uma estimativa tua, arredondada é suficiente. Cada categoria mostra depois quanto disso é, em média, IVA.`
    );

    const privacidade = el(
      "p",
      "stat-label",
      "🔒 Estes valores ficam só neste dispositivo. Nada é enviado para nenhum servidor."
    );

    card.append(heading, desc, privacidade);
    container.append(card);

    const totalCard = el("section", "card");
    const totalHero = el("p", "stat-hero", formatEUR(totalMensal()));
    const totalLabel = el("p", "stat-label", "Total estimado de gastos por mês");
    totalCard.append(totalHero, totalLabel);
    container.append(totalCard);

    CATEGORIAS_GASTOS_PT.forEach((cat) => {
      container.append(drawCategoria(cat));
    });

    const avancarCard = el("section", "card");
    const avancarBtn = el("button", "btn btn--primary", "Guardar e avançar →");
    avancarBtn.type = "button";
    avancarBtn.addEventListener("click", async () => {
      await guardarEAvancar();
    });
    avancarCard.append(avancarBtn);
    container.append(avancarCard);

    focusHeading(heading);
  }

  function totalMensal() {
    return CATEGORIAS_GASTOS_PT.reduce((sum, c) => sum + (Number(valores[c.id]) || 0), 0);
  }

  function drawCategoria(cat) {
    const card = el("section", "card");

    const heading = el("h2", null, cat.label);
    const exemplos = el("p", "stat-label", `Ex.: ${cat.exemplos.join(", ")}`);

    const field = el("div", "taximetro-field");
    const label = document.createElement("label");
    const inputId = `gasto-${cat.id}`;
    label.htmlFor = inputId;
    label.textContent = "Quanto gastas por mês (€)?";
    const input = document.createElement("input");
    input.type = "number";
    input.id = inputId;
    input.min = "0";
    input.step = "0.01";
    input.value = valores[cat.id];
    input.addEventListener("input", (e) => {
      valores[cat.id] = e.target.value;
      // Só atualiza o total e o desglose desta categoria, sem redesenhar
      // tudo (evita perder o foco do input a cada tecla).
      totalHeroLive();
      atualizarDesgloseCategoria(cat, desgloseWrap);
    });
    field.append(label, input);

    card.append(heading, exemplos, field);

    if (cat.notes) {
      card.append(el("p", "disclaimer", cat.notes));
    }

    const desgloseWrap = el("div");
    atualizarDesgloseCategoria(cat, desgloseWrap);
    card.append(desgloseWrap);

    return card;
  }

  function totalHeroLive() {
    const hero = container.querySelector(".stat-hero");
    if (hero) hero.textContent = formatEUR(totalMensal());
  }

  function atualizarDesgloseCategoria(cat, wrap) {
    wrap.innerHTML = "";
    const valor = Number(valores[cat.id]);
    if (!Number.isFinite(valor) || valor <= 0) return;

    let desglose;
    let notaEspecial = null;

    if (cat.tipo === "combustivel") {
      const especial = decomporCombustivel(valor, "gasolina", regiao);
      desglose = { baseTributavel: null, imposto: especial.ivaEstimado };
      notaEspecial = especial;
    } else {
      desglose = decomporIVADeTotal(valor, regiao, cat.tipo);
    }

    const dl = el("dl", "taximetro-cadeia");
    if (desglose.baseTributavel !== null) {
      appendItem(dl, "Base sem IVA (estimada)", formatEUR(desglose.baseTributavel));
    }
    appendItem(dl, "IVA (estimado)", formatEUR(desglose.imposto));
    wrap.append(dl);

    const fonte = el(
      "p",
      "disclaimer",
      `Fonte: Código do IVA (CIVA), Art. 18.º e Listas I/II anexas — taxa ${labelNivel(cat.tipo)} aplicada em ${labelRegiao(regiao)}.`
    );
    wrap.append(fonte);

    if (notaEspecial && notaEspecial.notes) {
      wrap.append(el("p", "disclaimer", notaEspecial.notes));
    }
  }

  async function guardarEAvancar() {
    const categorias = CATEGORIAS_GASTOS_PT.map((c) => {
      const valorMensal = round2(Number(valores[c.id]) || 0);
      let ivaMensal = 0;
      if (valorMensal > 0) {
        if (c.tipo === "combustivel") {
          const especial = decomporCombustivel(valorMensal, "gasolina", regiao);
          ivaMensal = especial.ivaEstimado || 0;
        } else {
          ivaMensal = decomporIVADeTotal(valorMensal, regiao, c.tipo).imposto;
        }
      }
      return { id: c.id, label: c.label, valorMensal, ivaMensal: round2(ivaMensal) };
    });
    const totalMensalArredondado = round2(totalMensal());
    const totalIvaMensal = round2(categorias.reduce((sum, c) => sum + c.ivaMensal, 0));

    await atualizarPeriodoAtual({
      gastosMensal: {
        regiao,
        categorias,
        totalMensal: totalMensalArredondado,
        totalIvaMensal,
      },
    });
    window.location.hash = "impostos-anuais";
  }

  draw();

  return {
    destroy() {
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

function labelNivel(nivel) {
  return { reduzida: "reduzida", intermedia: "intermédia", normal: "normal" }[nivel] || nivel;
}

function formatEUR(value) {
  return new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" }).format(value);
}

function round2(value) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function focusHeading(headingEl) {
  if (headingEl) headingEl.focus({ preventScroll: false });
}
