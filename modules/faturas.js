// Liberdade Fiscal — Módulo de UI de "Gastos" (Fase 5, redesenhado em
// agosto de 2026 — ver CLAUDE.md §6.3)
//
// Redesenho de agosto de 2026, a pedido do autor: substitui a captura
// por fatura individual (item a item) por uma estimativa mensal
// autorreportada por categoria (data/categorias-gastos-pt.js) — menos
// precisa, muito menos fricção. Para cada categoria o utilizador
// introduz quanto gasta em média por mês; a app decompõe esse valor em
// base + IVA (e ISP/IT quando aplicável) e mostra a taxa/fonte de
// cada imposto.
//
// Categorias de dupla tributação (Combustível, Tabaco): aceitam um
// detalhe opcional (litros; nº de cigarros + preço do maço) que
// permite calcular o imposto especial (ISP/IT) com exatidão, além do
// IVA — em vez de só mostrar o IVA e deixar o resto por explicar.
//
// O fluxo de fatura individual + QR (faturas-qr.js) e o fallback de
// foto+IA continuam no código, mas ficam FORA da navegação ativa desta
// versão — o autor pediu para os manter disponíveis como possível
// "modo avançado" futuro, sem os apagar. Não importar faturas-qr.js
// aqui evita que fique morto silenciosamente sem ninguém notar: ficará
// por reativar explicitamente quando/se esse modo avançado avançar.

import { getSetting, atualizarPeriodoAtual } from "../data/db.js";
import { CATEGORIAS_GASTOS_PT } from "../data/categorias-gastos-pt.js";
import { decomporIVADeTotal, calcularITCigarros } from "../data/tax-engine.js";
import { IMPOSTOS_ESPECIAIS_2026 } from "../data/tax-rules/2026/impostos-especiais.js";
import { IVA_2026 } from "../data/tax-rules/2026/iva.js";
import { render as renderOnboarding } from "./onboarding.js";

// Ícones por categoria — puramente decorativos (aria-hidden), mesmo
// estilo de linha usado no nav principal (index.html), para dar
// identidade visual a cada categoria e quebrar a monotonia de cards
// idênticos. Markup interno de <svg>, sem viewBox/atributos externos
// repetidos — ver ICONE_VIEWBOX abaixo.
const ICONE_VIEWBOX = "0 0 24 24";
const ICONES_CATEGORIAS = {
  alimentacao: `<path d="M5 10h14l-1.3 8.2a2 2 0 0 1-2 1.8H8.3a2 2 0 0 1-2-1.8L5 10Z"/><path d="M8.5 10 10 5.5M15.5 10 14 5.5"/><path d="M9.5 13.5v3.5M14.5 13.5v3.5"/>`,
  restauracao: `<path d="M5 9h11v6a4 4 0 0 1-4 4H9a4 4 0 0 1-4-4V9Z"/><path d="M16 10.5h1.5a2.5 2.5 0 0 1 0 5H16"/><path d="M8 5.5c0-1 .8-1.3.8-2.3M11.5 5.5c0-1 .8-1.3.8-2.3"/>`,
  habitacao: `<path d="M4 11.5 12 4l8 7.5"/><path d="M6 10.5V20a1 1 0 0 0 1 1h4v-5h2v5h4a1 1 0 0 0 1-1v-9.5"/>`,
  combustivel: `<path d="M4 20.5V6.5a2 2 0 0 1 2-2h5a2 2 0 0 1 2 2v14"/><path d="M3 20.5h11"/><path d="M13 9.5h2.3a1.7 1.7 0 0 1 1.7 1.7v5.3a1.5 1.5 0 0 0 3 0V9l-2-2"/><path d="M6 8.5h4"/>`,
  transportes: `<rect x="3.5" y="6" width="17" height="11" rx="2.5"/><path d="M3.5 12h17"/><circle cx="7.5" cy="19.5" r="1.4"/><circle cx="16.5" cy="19.5" r="1.4"/><path d="M6.5 9h3M14.5 9h3"/>`,
  saude: `<rect x="4" y="4" width="16" height="16" rx="4"/><path d="M12 8v8M8 12h8"/>`,
  "cultura-lazer": `<path d="M12 4.5 14 9.7l5.5.4-4.2 3.6 1.4 5.4L12 16.8l-4.7 2.3 1.4-5.4-4.2-3.6 5.5-.4Z"/>`,
  "vestuario-outros": `<circle cx="12" cy="5" r="1.6"/><path d="M12 6.6v2"/><path d="M4 17.5 11 12a1.4 1.4 0 0 1 2 0l7 5.5"/><path d="M3.5 17.5h17"/>`,
  tabaco: `<rect x="3" y="10.5" width="14" height="3.5" rx="1"/><rect x="17" y="10.5" width="3.5" height="3.5" rx="1"/><path d="M4 8.5c0-1 .8-1.2.8-2.2S4 4.5 4 3.5M7 8.5c0-1 .8-1.2.8-2.2S7 4.5 7 3.5"/>`,
  alcool: `<path d="M8 3h8l-1 6.5a3 3 0 0 1-3 2.5 3 3 0 0 1-3-2.5L8 3Z"/><path d="M12 12v6M9 21h6"/>`,
};

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
  // detalhes[categoriaId] = { litros } ou { numeroCigarros, precoMaco }
  // — campos opcionais das categorias de dupla tributação.
  const detalhes = {};
  CATEGORIAS_GASTOS_PT.forEach((c) => {
    valores[c.id] = "";
    detalhes[c.id] = {};
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
      `Estima quanto gastas por mês em cada categoria (região: ${labelRegiao(regiao)}). Não precisas de guardar faturas — é uma estimativa tua, arredondada é suficiente. Cada categoria mostra depois quanto disso é, em média, IVA (e outros impostos, quando aplicável).`
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
    const voltarBtn = el("button", "btn btn--secondary", "← Voltar a Rendimentos");
    voltarBtn.type = "button";
    voltarBtn.addEventListener("click", () => {
      window.location.hash = "taximetro";
    });
    const avancarBtn = el("button", "btn btn--primary", "Guardar e avançar →");
    avancarBtn.type = "button";
    avancarBtn.addEventListener("click", async () => {
      await guardarEAvancar();
    });
    const botoes = el("div", "taximetro-botoes");
    botoes.append(voltarBtn, avancarBtn);
    avancarCard.append(botoes);
    container.append(avancarCard);

    focusHeading(heading);
  }

  function totalMensal() {
    return CATEGORIAS_GASTOS_PT.reduce((sum, c) => sum + (Number(valores[c.id]) || 0), 0);
  }

  function drawCategoria(cat) {
    const card = el("section", "card");

    const headerRow = el("div", "gastos-categoria-header");
    const iconChip = el("span", "gastos-categoria-icon");
    iconChip.setAttribute("aria-hidden", "true");
    iconChip.innerHTML = `<svg viewBox="${ICONE_VIEWBOX}" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${
      ICONES_CATEGORIAS[cat.id] || ""
    }</svg>`;
    const heading = el("h2", null, cat.label);
    headerRow.append(iconChip, heading);

    const exemplos = el("ul", "gastos-exemplos");
    exemplos.append(el("li", "visually-hidden", "Ex.:"));
    cat.exemplos.forEach((ex) => {
      exemplos.append(el("li", "gastos-exemplo-chip", ex));
    });

    const field = el("div", "taximetro-field");
    const label = document.createElement("label");
    const inputId = `gasto-${cat.id}`;
    label.htmlFor = inputId;
    label.textContent = "Quanto gastas por mês?";
    const inputWrap = el("div", "input-euro");
    const input = document.createElement("input");
    input.type = "number";
    input.id = inputId;
    input.min = "0";
    input.step = "0.01";
    input.inputMode = "decimal";
    input.value = valores[cat.id];
    input.addEventListener("input", (e) => {
      valores[cat.id] = e.target.value;
      // Só atualiza o total e o desglose desta categoria, sem redesenhar
      // tudo (evita perder o foco do input a cada tecla).
      totalHeroLive();
      atualizarDesgloseCategoria(cat, desgloseWrap);
    });
    inputWrap.append(input);
    field.append(label, inputWrap);

    card.append(headerRow, exemplos, field);

    if (cat.duplaTributacao === "combustivel") {
      card.append(drawDetalheCombustivel(cat, desgloseWrap_placeholder_ref));
    }
    if (cat.duplaTributacao === "tabaco") {
      card.append(drawDetalheTabaco(cat, desgloseWrap_placeholder_ref));
    }

    if (cat.notes) {
      card.append(el("p", "info-note", cat.notes));
    }

    const desgloseWrap = el("div");
    // As funções de detalhe acima precisam de referenciar o mesmo
    // desgloseWrap para o atualizar ao mudar litros/cigarros/preço —
    // por isso são desenhadas depois de desgloseWrap existir (ver
    // reatribuição de desgloseWrap_placeholder_ref abaixo).
    atualizarDesgloseCategoria(cat, desgloseWrap);
    card.append(desgloseWrap);

    return card;
  }

  // Pequeno truque para os campos de detalhe (definidos antes de
  // desgloseWrap existir, na ordem de append pretendida) conseguirem
  // referenciar o wrap correto: guardamos a referência mutável aqui e
  // resolvemo-la já dentro dos handlers de input.
  let desgloseWrap_placeholder_ref = null;

  function drawDetalheCombustivel(cat) {
    const wrap = el("div", "taximetro-field");
    const label = document.createElement("label");
    const inputId = `detalhe-litros-${cat.id}`;
    label.htmlFor = inputId;
    label.textContent = "Litros abastecidos por mês (opcional, para saber o ISP exato)";
    const input = document.createElement("input");
    input.type = "number";
    input.id = inputId;
    input.min = "0";
    input.step = "0.01";
    input.value = detalhes[cat.id].litros || "";
    input.addEventListener("input", (e) => {
      detalhes[cat.id].litros = e.target.value;
      const desgloseWrap = document.getElementById(`desglose-${cat.id}`);
      if (desgloseWrap) atualizarDesgloseCategoria(cat, desgloseWrap);
    });
    wrap.append(label, input);
    return wrap;
  }

  function drawDetalheTabaco(cat) {
    const wrap = el("div");
    const cigarrosField = el("div", "taximetro-field");
    const cigarrosLabel = document.createElement("label");
    const cigarrosId = `detalhe-cigarros-${cat.id}`;
    cigarrosLabel.htmlFor = cigarrosId;
    cigarrosLabel.textContent = "Nº de cigarros por mês (opcional, para saber o IT exato)";
    const cigarrosInput = document.createElement("input");
    cigarrosInput.type = "number";
    cigarrosInput.id = cigarrosId;
    cigarrosInput.min = "0";
    cigarrosInput.step = "1";
    cigarrosInput.value = detalhes[cat.id].numeroCigarros || "";
    cigarrosInput.addEventListener("input", (e) => {
      detalhes[cat.id].numeroCigarros = e.target.value;
      const desgloseWrap = document.getElementById(`desglose-${cat.id}`);
      if (desgloseWrap) atualizarDesgloseCategoria(cat, desgloseWrap);
    });
    cigarrosField.append(cigarrosLabel, cigarrosInput);

    const precoField = el("div", "taximetro-field");
    const precoLabel = document.createElement("label");
    const precoId = `detalhe-preco-maco-${cat.id}`;
    precoLabel.htmlFor = precoId;
    precoLabel.textContent = "Preço médio do maço (opcional)";
    const precoInputWrap = el("div", "input-euro");
    const precoInput = document.createElement("input");
    precoInput.type = "number";
    precoInput.id = precoId;
    precoInput.min = "0";
    precoInput.step = "0.01";
    precoInput.value = detalhes[cat.id].precoMaco || "";
    precoInput.addEventListener("input", (e) => {
      detalhes[cat.id].precoMaco = e.target.value;
      const desgloseWrap = document.getElementById(`desglose-${cat.id}`);
      if (desgloseWrap) atualizarDesgloseCategoria(cat, desgloseWrap);
    });
    precoInputWrap.append(precoInput);
    precoField.append(precoLabel, precoInputWrap);

    wrap.append(cigarrosField, precoField);
    return wrap;
  }

  function totalHeroLive() {
    const hero = container.querySelector(".stat-hero");
    if (hero) hero.textContent = formatEUR(totalMensal());
  }

  /**
   * Calcula o desglose de uma categoria: IVA sempre; ISP/IT adicional
   * quando a categoria tem dupla tributação e o utilizador preencheu o
   * detalhe opcional (litros; nº cigarros + preço do maço).
   */
  function calcularDesgloseCategoria(cat, valor) {
    const nivelIva = cat.tipo === "combustivel" ? "normal" : cat.tipo;
    const desglose = decomporIVADeTotal(valor, regiao, nivelIva);

    let especial = null;
    if (cat.duplaTributacao === "combustivel") {
      const litros = Number(detalhes[cat.id].litros);
      if (Number.isFinite(litros) && litros > 0) {
        // Assume gasolina como referência (a categoria não distingue
        // gasolina/gasóleo) — ver nota da categoria sobre esta
        // simplificação.
        const ispUnitario = IMPOSTOS_ESPECIAIS_2026.isp.gasolina.value;
        especial = { tipo: "ISP", valor: round2(litros * ispUnitario), fonte: IMPOSTOS_ESPECIAIS_2026.source };
      }
    } else if (cat.duplaTributacao === "tabaco") {
      const numeroCigarros = Number(detalhes[cat.id].numeroCigarros);
      const precoMaco = Number(detalhes[cat.id].precoMaco);
      if (Number.isFinite(numeroCigarros) && numeroCigarros > 0 && Number.isFinite(precoMaco) && precoMaco > 0) {
        const it = calcularITCigarros(numeroCigarros, precoMaco);
        especial = { tipo: "IT", valor: it.itTotal, fonte: IMPOSTOS_ESPECIAIS_2026.source };
      }
    }

    return { desglose, especial };
  }

  function atualizarDesgloseCategoria(cat, wrap) {
    wrap.id = `desglose-${cat.id}`;
    wrap.innerHTML = "";

    // A taxa de IVA aplicável não depende do valor introduzido — por
    // isso mostramo-la sempre, mesmo com o campo vazio ou a 0€, em vez
    // de só aparecer depois de já teres escrito um número. Pedido
    // explícito: "em todas as categorias tem de estar escrito qual é
    // o % de IVA pago", não só nas que já têm valor.
    const nivelIva = cat.tipo === "combustivel" ? "normal" : cat.tipo;
    const taxaIva = IVA_2026.taxas[regiao][nivelIva];
    const percentagemIva = Math.round(taxaIva * 100);

    const valor = Number(valores[cat.id]);
    const temValor = Number.isFinite(valor) && valor > 0;
    let especial = null;

    if (temValor) {
      const resultado = calcularDesgloseCategoria(cat, valor);
      const desglose = resultado.desglose;
      especial = resultado.especial;

      // O IVA mostrado NÃO é "23% de 100€" (isso seriam 23€) — é os
      // 23% já embutidos nos 100€ que indicaste, porque o valor que
      // introduzes é o preço final que pagaste, já com IVA incluído
      // (o preço de prateleira/talão), não o preço antes de imposto.
      // Por isso: base = 100 / 1,23 = 81,30€, e o IVA é a diferença
      // (100 − 81,30 = 18,70€), não 23% × 100. Mostramos sempre o
      // "Preço sem impostos" para quem quiser confirmar a conta à mão.
      const precoSemImpostos = especial
        ? round2(desglose.baseTributavel - especial.valor)
        : desglose.baseTributavel;

      const dl = el("dl", "taximetro-cadeia");
      appendItem(dl, "Preço sem impostos", formatEUR(precoSemImpostos));
      if (especial) {
        appendItem(dl, `Imposto especial (${especial.tipo})`, formatEUR(especial.valor));
      }
      appendItem(dl, "IVA (estimado)", formatEUR(desglose.imposto));
      appendItem(dl, "= Total que indicaste", formatEUR(valor));
      wrap.append(dl);
    }

    // Percentagem de IVA explícita — pedido para aparecer em todas as
    // categorias, não só o valor em euros.
    const fonte = el(
      "p",
      "disclaimer",
      temValor
        ? `Taxa de IVA aplicada: ${percentagemIva}% (${labelNivel(nivelIva)}, ${labelRegiao(regiao)}). O IVA já está incluído no valor que indicaste — por isso não é ${percentagemIva}% × ${formatEUR(valor)}, é a parte de IVA já embutida nesse valor (preço sem impostos × ${percentagemIva}%). Fonte: Código do IVA (CIVA), Art. 18.º e Listas I/II anexas.`
        : `Taxa de IVA aplicada: ${percentagemIva}% (${labelNivel(nivelIva)}, ${labelRegiao(regiao)}). Fonte: Código do IVA (CIVA), Art. 18.º e Listas I/II anexas.`
    );
    wrap.append(fonte);

    if (!temValor) return;

    if (cat.duplaTributacao === "combustivel" && !especial) {
      wrap.append(
        el(
          "p",
          "info-note",
          "Introduz os litros abastecidos acima para ver também o ISP — sem essa informação só mostramos o IVA."
        )
      );
    }
    if (cat.duplaTributacao === "tabaco" && !especial) {
      wrap.append(
        el(
          "p",
          "info-note",
          "Introduz o nº de cigarros e o preço do maço acima para ver também o IT — sem essa informação só mostramos o IVA."
        )
      );
    }
  }

  async function guardarEAvancar() {
    const categorias = CATEGORIAS_GASTOS_PT.map((c) => {
      const valorMensal = round2(Number(valores[c.id]) || 0);
      let ivaMensal = 0;
      let impostoEspecialMensal = 0;
      if (valorMensal > 0) {
        const { desglose, especial } = calcularDesgloseCategoria(c, valorMensal);
        ivaMensal = desglose.imposto;
        if (especial) impostoEspecialMensal = especial.valor;
      }
      return {
        id: c.id,
        label: c.label,
        valorMensal,
        ivaMensal: round2(ivaMensal),
        impostoEspecialMensal: round2(impostoEspecialMensal),
      };
    });
    const totalMensalArredondado = round2(totalMensal());
    const totalIvaMensal = round2(categorias.reduce((sum, c) => sum + c.ivaMensal, 0));
    const totalImpostoEspecialMensal = round2(categorias.reduce((sum, c) => sum + c.impostoEspecialMensal, 0));

    await atualizarPeriodoAtual({
      gastosMensal: {
        regiao,
        categorias,
        totalMensal: totalMensalArredondado,
        totalIvaMensal,
        totalImpostoEspecialMensal,
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
