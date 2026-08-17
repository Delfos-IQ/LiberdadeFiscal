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
    precoLabel.textContent = "Preço médio do maço (€, opcional)";
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
    precoField.append(precoLabel, precoInput);

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
    const valor = Number(valores[cat.id]);
    if (!Number.isFinite(valor) || valor <= 0) return;

    const { desglose, especial } = calcularDesgloseCategoria(cat, valor);

    const dl = el("dl", "taximetro-cadeia");
    if (especial) {
      appendItem(dl, `Imposto especial (${especial.tipo})`, formatEUR(especial.valor));
    }
    appendItem(dl, "IVA (estimado)", formatEUR(desglose.imposto));
    wrap.append(dl);

    // Percentagem de IVA explícita — pedido para aparecer em todas as
    // categorias, não só o valor em euros.
    const percentagemIva = Math.round(desglose.taxa * 100);
    const fonte = el(
      "p",
      "disclaimer",
      `Taxa de IVA aplicada: ${percentagemIva}% (${labelNivel(cat.tipo === "combustivel" ? "normal" : cat.tipo)}, ${labelRegiao(regiao)}). Fonte: Código do IVA (CIVA), Art. 18.º e Listas I/II anexas.`
    );
    wrap.append(fonte);

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
