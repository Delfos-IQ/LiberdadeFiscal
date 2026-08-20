// Liberdade Fiscal — Módulo de UI do Glossário fiscal (19/08/2026, a
// pedido do autor).
//
// Acesso: tal como "Os teus dados", não está na navegação principal (5
// itens já é o limite confortável a 320px, ver AUDITORIA-2026-08.md
// B-13) — está num link no footer, que sobrevive a todas as trocas de
// rota. É conteúdo opcional, "para quem quiser mais" — o autor foi
// explícito em não querer adicionar fricção ao fluxo principal (Quiz →
// Rendimentos → Gastos → Taxas → Dia da Liberdade), por isso este ecrã
// vive completamente à parte, sem nenhum passo do fluxo principal
// apontar para cá automaticamente.
//
// Cada figura usa <details>/<summary>, o mesmo padrão já usado em "Como
// chegámos a este número?" no ecrã do Dia da Liberdade Fiscal — fechado
// por omissão, para a lista completa (13 figuras) não ficar como um
// muro de texto.

import { GLOSSARIO } from "../data/glosario.js";

const ORDEM_CATEGORIAS = ["Rendimento", "Consumo", "Património", "Veículo", "Outras taxas"];

const LABEL_STATUS = {
  verified: { texto: "✅ Verificado", classe: "badge--verified" },
  estimate: { texto: "🟡 Estimativa", classe: "badge--estimate" },
  unknown: { texto: "🔴 Não confirmado", classe: "badge--unknown" },
};

export function render(container) {
  container.innerHTML = "";

  const card = el("section", "card");
  card.setAttribute("aria-labelledby", "glossario-heading");

  const heading = el("h1", null, "Glossário fiscal");
  heading.id = "glossario-heading";
  heading.tabIndex = -1;

  const desc = el(
    "p",
    null,
    "As figuras fiscais desta app, explicadas em linguagem simples: o que são, quem paga, e como se calculam. Cada uma indica se o valor está totalmente verificado, ainda em estimativa, ou por confirmar — a mesma disciplina de transparência do resto da app."
  );

  const nota = el(
    "p",
    "disclaimer",
    "Este glossário cobre a carga fiscal de trabalhar, consumir e ter património em Portugal — o mesmo âmbito do resto da app. Não inclui pensões, benefícios sociais nem planeamento financeiro, que ficam fora do que esta app se propõe a fazer."
  );

  card.append(heading, desc, nota);
  container.append(card);

  ORDEM_CATEGORIAS.forEach((categoria) => {
    const entradas = GLOSSARIO.filter((e) => e.categoria === categoria);
    if (entradas.length === 0) return;
    container.append(drawCategoria(categoria, entradas));
  });

  focusHeading(heading);

  return {
    destroy() {
      container.innerHTML = "";
    },
  };
}

function drawCategoria(categoria, entradas) {
  const secao = el("section", "card");
  const headingId = `glossario-cat-${slugify(categoria)}`;
  secao.setAttribute("aria-labelledby", headingId);

  const heading = el("h2", null, categoria);
  heading.id = headingId;
  secao.append(heading);

  entradas.forEach((entrada) => secao.append(drawEntrada(entrada)));

  return secao;
}

function drawEntrada(entrada) {
  const detalhes = document.createElement("details");
  detalhes.className = "glossario-entrada";

  const summary = document.createElement("summary");
  summary.textContent = `${entrada.sigla} — ${entrada.nome}`;
  detalhes.append(summary);

  const status = LABEL_STATUS[entrada.status] || LABEL_STATUS.unknown;
  const badge = el("span", `badge ${status.classe}`, status.texto);
  detalhes.append(badge);

  const pagaQuem = el("p", null);
  const pagaQuemLabel = el("strong", null, "Quem paga: ");
  pagaQuem.append(pagaQuemLabel, document.createTextNode(entrada.pagaQuem_pt));
  detalhes.append(pagaQuem);

  detalhes.append(el("p", null, entrada.explicacao_pt));

  const comoSeCalculaHeading = el("p", null);
  const comoSeCalculaLabel = el("strong", null, "Como se calcula: ");
  comoSeCalculaHeading.append(comoSeCalculaLabel, document.createTextNode(entrada.comoSeCalcula_pt));
  detalhes.append(comoSeCalculaHeading);

  const fonte = el("p", "stat-label", `Fonte: ${entrada.source}`);
  detalhes.append(fonte);

  if (entrada.sourceUrl) {
    const link = document.createElement("a");
    link.href = entrada.sourceUrl;
    link.textContent = "Ver fonte oficial";
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    const linkP = el("p", null);
    linkP.append(link);
    detalhes.append(linkP);
  }

  return detalhes;
}

/* ----------------------------- Utilitários ----------------------------- */

function el(tag, className, textContent) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (textContent !== undefined) node.textContent = textContent;
  return node;
}

function slugify(texto) {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function focusHeading(headingEl) {
  if (headingEl) headingEl.focus({ preventScroll: false });
}
