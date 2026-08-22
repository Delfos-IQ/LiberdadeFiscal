// Liberdade Fiscal — Módulo de UI "Para onde vão os impostos" (22/08/2026)
//
// Rota secundária, mesmo padrão de acesso que "benchmark-ocde" e
// "degradacao-monetaria": sem botão próprio na navegação principal,
// acedida a partir de um link (btn--gold) no ecrã do Dia da Liberdade
// Fiscal.
//
// O que mostra: grandes rúbricas do gasto público português em 2025,
// em valores absolutos (euros) — juros da dívida pública, pensões,
// saúde e educação. Decisão de formato (ver cabeçalho de
// data/gasto-publico-2025.js): sem percentagem sobre o total da
// despesa pública, porque não foi possível confirmar com rigor esse
// total dentro do âmbito desta investigação. Mostra os números,
// explica o método, deixa o utilizador tirar as suas conclusões
// (CLAUDE.md §1).

import { GASTO_PUBLICO_2025 } from "../data/gasto-publico-2025.js";

const LABEL_STATUS = {
  verified: "✅ Execução real confirmada",
  estimate: "🟡 Valor orçamentado (não é ainda execução final confirmada)",
};

export function render(container) {
  container.innerHTML = "";
  drawConteudo(container);

  return {
    destroy() {
      container.innerHTML = "";
    },
  };
}

function drawConteudo(container) {
  const { ano, rubricas } = GASTO_PUBLICO_2025;

  const card = el("section", "card");
  card.setAttribute("aria-labelledby", "gasto-publico-heading");

  const heading = el("h1", null, "Para onde vão os impostos");
  heading.id = "gasto-publico-heading";
  heading.tabIndex = -1;

  const desc = el(
    "p",
    null,
    `Depois de calcular quanto pagas, aqui ficam algumas das maiores rúbricas do gasto público em Portugal em ${ano} — juros da dívida, pensões, saúde e educação — em valores absolutos, tal como foram executados.`
  );

  const notaFormato = el(
    "p",
    "disclaimer",
    "Estes valores são absolutos (em euros), não percentagens do total da despesa pública. Não incluímos uma percentagem porque não conseguimos confirmar com rigor suficiente o total consolidado exato de toda a despesa das administrações públicas — preferimos mostrar um número exato sem denominador a mostrar uma percentagem calculada sobre uma estimativa."
  );

  const voltarBtn = el("button", "btn btn--secondary", "← Voltar ao Dia da Liberdade");
  voltarBtn.type = "button";
  voltarBtn.addEventListener("click", () => {
    window.location.hash = "dia-liberdade";
  });

  card.append(heading, desc, notaFormato, voltarBtn);
  container.append(card);

  // --- Comparação entre rúbricas ---
  const compCard = el("section", "card");
  compCard.setAttribute("aria-labelledby", "gasto-publico-comparacao-heading");
  const compHeading = el("h2", null, `${ano}: as rúbricas lado a lado`);
  compHeading.id = "gasto-publico-comparacao-heading";

  const rubricasOrdenadas = [...rubricas].sort((a, b) => b.valorMilhoesEuros - a.valorMilhoesEuros);
  const maiorValor = rubricasOrdenadas[0]?.valorMilhoesEuros || 0;

  const compWrapper = el("div", "benchmark-lista");
  rubricasOrdenadas.forEach((r) => {
    compWrapper.append(criarLinhaBarra(r.label, r.valorMilhoesEuros, maiorValor));
  });

  const notaBarras = el(
    "p",
    "disclaimer",
    "As barras comparam as rúbricas entre si (a maior define 100% da largura) — não representam proporção do total da despesa pública."
  );

  compCard.append(compHeading, compWrapper, notaBarras);
  container.append(compCard);

  // --- Detalhe por rúbrica ---
  const detalheCard = el("section", "card");
  detalheCard.setAttribute("aria-labelledby", "gasto-publico-detalhe-heading");
  const detalheHeading = el("h2", null, "Detalhe e fontes");
  detalheHeading.id = "gasto-publico-detalhe-heading";
  detalheCard.append(detalheHeading);

  rubricasOrdenadas.forEach((r) => {
    const bloco = el("div", "gasto-publico-rubrica");
    const nome = el("h3", null, r.label);
    const valor = el("p", "stat-hero-small", formatMilhoesEuros(r.valorMilhoesEuros));
    const variacao = el("p", "stat-label", r.variacaoNota);
    const status = el("p", "disclaimer", LABEL_STATUS[r.status]);
    const fonte = document.createElement("p");
    fonte.className = "disclaimer";
    const link = document.createElement("a");
    link.href = r.sourceUrl;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.textContent = r.source;
    fonte.append("Fonte: ", link);

    bloco.append(nome, valor, variacao, status, fonte);
    detalheCard.append(bloco);
  });

  container.append(detalheCard);

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

function criarLinhaBarra(nome, valorMilhoesEuros, maiorValor) {
  const linha = el("div", "benchmark-linha");
  const label = el("span", "benchmark-linha__label", nome);
  const barraWrapper = el("span", "benchmark-linha__barra-wrapper");
  const barra = el("span", "benchmark-linha__barra");
  const largura = maiorValor > 0 ? Math.min(100, (valorMilhoesEuros / maiorValor) * 100) : 0;
  barra.style.width = `${largura}%`;
  barraWrapper.append(barra);
  const valor = el("span", "benchmark-linha__valor", formatMilhoesEuros(valorMilhoesEuros));

  linha.append(label, barraWrapper, valor);
  return linha;
}

/* ----------------------------- Utilitários ----------------------------- */

function el(tag, className, textContent) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (textContent !== undefined) node.textContent = textContent;
  return node;
}

function formatMilhoesEuros(valorMilhoesEuros) {
  if (valorMilhoesEuros >= 1000) {
    const milMilhoes = valorMilhoesEuros / 1000;
    return `${new Intl.NumberFormat("pt-PT", { maximumFractionDigits: 2 }).format(milMilhoes)} mil milhões €`;
  }
  return `${new Intl.NumberFormat("pt-PT", { maximumFractionDigits: 1 }).format(valorMilhoesEuros)} milhões €`;
}

function focusHeading(headingEl) {
  if (headingEl) headingEl.focus({ preventScroll: false });
}
