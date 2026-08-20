// Liberdade Fiscal — Ecrã "Continuar ou começar de novo?" (19/08/2026,
// a pedido do autor).
//
// Contexto: Rendimentos e Gastos rehidratam-se automaticamente a
// partir do "período atual" guardado em IndexedDB (ver
// data/db.js#getPeriodoAtual) — desenho deliberado para não perder
// dados ao navegar entre ecrãs dentro da mesma análise. Mas isso
// significa que reabrir a app dias depois também mostra os dados
// antigos, sem avisar. Este ecrã corre uma vez por sessão do
// navegador (ver app.js), antes da rota pedida, sempre que há uma
// análise em curso (periodoTemAnaliseEmCurso) — nunca apaga nada sem
// perguntar.

import { reiniciarPeriodoAtual } from "../data/db.js";

/**
 * @param {HTMLElement} container
 * @param {{ periodo: object, onDecidido: () => void }} opts
 */
export function render(container, { periodo, onDecidido }) {
  const card = el("section", "card");
  card.setAttribute("aria-labelledby", "retomar-heading");

  const heading = el("h1", null, "Tens uma análise em curso");
  heading.id = "retomar-heading";
  heading.tabIndex = -1;

  const dataGuardado = formatarDataHoraPT(periodo.criadoEm);
  const partes = [];
  if (periodo.rendimentos) partes.push("rendimento");
  if (periodo.gastosMensal) partes.push("estimativa de gastos");
  const resumoPartes = partes.length ? partes.join(" e ") : "dados";

  const desc = el(
    "p",
    null,
    `Guardaste ${resumoPartes} numa análise anterior${dataGuardado ? `, a ${dataGuardado}` : ""}. Queres continuar de onde ficaste ou começar uma análise nova?`
  );

  const nota = el(
    "p",
    "disclaimer",
    "Começar de novo apaga o rendimento e a estimativa de gastos guardados. Os impostos anuais que já tenhas registado (IMI, IUC, ISV...) mantêm-se — representam pagamentos reais, não fazem parte desta simulação."
  );

  const continuarBtn = el("button", "btn btn--primary", "Continuar a análise anterior");
  continuarBtn.type = "button";
  continuarBtn.addEventListener("click", () => onDecidido());

  const novaBtn = el("button", "btn btn--secondary", "Começar análise nova");
  novaBtn.type = "button";
  novaBtn.addEventListener("click", async () => {
    novaBtn.disabled = true;
    try {
      await reiniciarPeriodoAtual();
    } catch (err) {
      console.error("Não foi possível reiniciar o período atual:", err);
    }
    onDecidido();
  });

  const botoes = el("div", "taximetro-botoes");
  botoes.append(continuarBtn, novaBtn);

  card.append(heading, desc, nota, botoes);
  container.innerHTML = "";
  container.append(card);
  heading.focus({ preventScroll: false });

  return {
    destroy() {
      container.innerHTML = "";
    },
  };
}

function formatarDataHoraPT(iso) {
  if (!iso) return "";
  try {
    const data = new Date(iso);
    return new Intl.DateTimeFormat("pt-PT", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" }).format(
      data
    );
  } catch {
    return "";
  }
}

function el(tag, className, textContent) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (textContent !== undefined) node.textContent = textContent;
  return node;
}
