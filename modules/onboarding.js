// Liberdade Fiscal — Onboarding de região (Fase 5)
//
// Não é uma rota própria — é invocado pelo módulo de Faturas (e no
// futuro por outros que precisem de região) enquanto a região não
// estiver guardada. Pede a região UMA VEZ (spec §6.3) e persiste-a via
// data/db.js setSetting.
//
// Esta é também uma das três presenças obrigatórias do disclaimer
// legal exigidas pelo spec (secção 9): onboarding, ecrã do Dia da
// Liberdade Fiscal, e footer/Acerca de (já coberto em index.html).

import { setSetting } from "../data/db.js";

const REGIOES = [
  { value: "continente", label: "Continente", desc: "IVA 6% / 13% / 23%" },
  { value: "acores", label: "Açores", desc: "IVA 4% / 9% / 16%" },
  { value: "madeira", label: "Madeira", desc: "IVA 4% / 12% / 22%" },
];

/**
 * @param {HTMLElement} container
 * @param {{ onComplete: (regiao: string) => void }} opcoes
 */
export function render(container, { onComplete }) {
  container.innerHTML = "";

  const card = el("section", "card");
  card.setAttribute("aria-labelledby", "onboarding-heading");

  const heading = el("h1", null, "Antes de começares");
  heading.id = "onboarding-heading";
  heading.tabIndex = -1;

  const desc = el(
    "p",
    null,
    "Para calcular o IVA corretamente, precisamos de saber em que região vives. Só se pergunta uma vez — podes mudar mais tarde nas definições."
  );

  const form = el("form");
  form.noValidate = true;

  const fieldset = document.createElement("fieldset");
  fieldset.className = "onboarding-regioes";
  const legend = document.createElement("legend");
  legend.textContent = "A tua região";
  fieldset.append(legend);

  REGIOES.forEach((regiao, index) => {
    const label = document.createElement("label");
    label.className = "onboarding-regiao-option";

    const input = document.createElement("input");
    input.type = "radio";
    input.name = "regiao";
    input.value = regiao.value;
    input.id = `regiao-${regiao.value}`;
    if (index === 0) input.checked = true;

    const textWrapper = el("span");
    const nome = el("strong", null, regiao.label);
    const taxas = el("span", "stat-label", regiao.desc);
    textWrapper.append(nome, document.createElement("br"), taxas);

    label.append(input, textWrapper);
    fieldset.append(label);
  });

  form.append(fieldset);

  const disclaimer = el(
    "p",
    "disclaimer",
    "Esta aplicação fornece estimativas para fins informativos e educativos. Não constitui aconselhamento fiscal, financeiro ou jurídico e não substitui o cálculo oficial da Autoridade Tributária."
  );

  const submitBtn = el("button", "btn btn--primary", "Continuar");
  submitBtn.type = "submit";

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const selecionada = form.querySelector('input[name="regiao"]:checked');
    if (!selecionada) return;
    await setSetting("region", selecionada.value);
    onComplete(selecionada.value);
  });

  form.append(submitBtn);
  card.append(heading, desc, form, disclaimer);
  container.append(card);
  heading.focus({ preventScroll: false });
}

function el(tag, className, textContent) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (textContent !== undefined) node.textContent = textContent;
  return node;
}
