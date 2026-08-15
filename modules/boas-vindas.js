// Liberdade Fiscal — Ecrã de boas-vindas (storytelling de marca)
//
// Não confundir com modules/onboarding.js: aquele pede a região porque
// é um requisito funcional (spec §6.3, precisa-se para calcular o IVA
// certo). Este ecrã não pede nada — existe só para apresentar o
// símbolo e os valores do produto (CLAUDE.md §4, brand board do
// autor) a quem abre a app pela primeira vez.
//
// Mostra-se uma única vez, antes de qualquer rota (ver app.js,
// showBrandIntro), e fica persistido via setSetting("introVista",
// true) para nunca mais interromper o arranque depois disso. Se o
// armazenamento local falhar, o próprio init() em app.js já trata
// esse caso (modo efémero) — aqui basta não deixar a app presa: um
// erro ao gravar a flag não deve impedir onComplete().

import { setSetting } from "../data/db.js";

const PROMESSAS = [
  {
    icon: iconEscudo,
    titulo: "Transparente",
    texto:
      "Mostramos sempre a fórmula, a fonte oficial e o ano fiscal por trás de cada número. Nenhuma estimativa aparece disfarçada de facto.",
  },
  {
    icon: iconCadeado,
    titulo: "Privada",
    texto:
      "Os teus dados ficam no teu dispositivo. Sem contas, sem servidores nossos a guardar o que introduzes — a única exceção é opcional e sempre avisada no momento em que a usas.",
  },
  {
    icon: iconFolha,
    titulo: "Independente",
    texto:
      "Não defendemos que os impostos são justos, altos ou baixos. Mostramos os números, explicamos o método, e deixamos-te tirar as tuas próprias conclusões.",
  },
  {
    icon: iconSeta,
    titulo: "Empoderadora",
    texto:
      "O objetivo é simples: que saibas, com precisão, quanto do teu trabalho fica realmente contigo — e que essa informação seja tua, para decidires o que quiseres com ela.",
  },
];

/**
 * @param {HTMLElement} container
 * @param {{ onComplete: () => void }} opcoes
 */
export function render(container, { onComplete }) {
  container.innerHTML = "";

  const section = el("section", "welcome-hero");
  section.setAttribute("aria-labelledby", "welcome-hero-heading");

  const logo = document.createElement("img");
  logo.className = "welcome-hero__logo";
  // Caminho relativo à raiz da app (resolvido a partir de index.html,
  // não deste módulo — module scripts não afetam a base de URLs
  // relativos no DOM).
  logo.src = "./icons/logo-mark.png";
  logo.alt = "";
  logo.width = 96;
  logo.height = 130;

  const heading = el("h1", "welcome-hero__heading", "Bem-vindo ao Liberdade Fiscal");
  heading.id = "welcome-hero-heading";
  heading.tabIndex = -1;

  const lead = el(
    "p",
    "welcome-hero__lead",
    "Escolhemos uma ave para símbolo — voa livre, sem depender de ninguém. As barras de crescimento na base representam dados: claros, verificáveis, teus. Antes de começares, os quatro princípios que guiam este projeto."
  );

  const list = el("div", "welcome-promises");
  PROMESSAS.forEach((promessa) => {
    const item = el("div", "welcome-promise");
    const iconWrap = el("div", "welcome-promise__icon");
    iconWrap.innerHTML = promessa.icon();
    iconWrap.setAttribute("aria-hidden", "true");
    const titulo = el("h2", "welcome-promise__titulo", promessa.titulo);
    const texto = el("p", "welcome-promise__texto", promessa.texto);
    item.append(iconWrap, titulo, texto);
    list.append(item);
  });

  const cta = el("button", "btn btn--primary welcome-hero__cta", "Vamos começar");
  cta.type = "button";
  cta.addEventListener("click", async () => {
    try {
      await setSetting("introVista", true);
    } catch (err) {
      // Armazenamento indisponível — não bloqueia a navegação, apenas
      // significa que este ecrã pode voltar a aparecer numa próxima
      // visita. app.js já trata a falha de armazenamento em geral.
      console.error("Não foi possível guardar que a introdução já foi vista:", err);
    }
    onComplete();
  });

  section.append(logo, heading, lead, list, cta);
  container.append(section);
  heading.focus({ preventScroll: false });
}

/* -----------------------------
   Ícones — traços simples, sem dependências externas (spec §2: stack
   vanilla, sem bibliotecas de ícones). Inspirados nos ícones do brand
   board do autor (escudo, cadeado, folha, seta ascendente), não são
   cópias pixel-a-pixel.
   ----------------------------- */
function iconEscudo() {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="28" height="28">
    <path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6z"/>
    <path d="M9 12l2 2 4-4"/>
  </svg>`;
}

function iconCadeado() {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="28" height="28">
    <rect x="4" y="11" width="16" height="9" rx="2"/>
    <path d="M8 11V7a4 4 0 0 1 8 0v4"/>
  </svg>`;
}

function iconFolha() {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="28" height="28">
    <path d="M4 20c8 0 14-6 16-16C10 5 4 11 4 20z"/>
    <path d="M4 20c4-4 7-8 16-16"/>
  </svg>`;
}

function iconSeta() {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="28" height="28">
    <path d="M4 17l6-6 4 4 6-8"/>
    <path d="M14 6h6v6"/>
  </svg>`;
}

function el(tag, className, textContent) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (textContent !== undefined) node.textContent = textContent;
  return node;
}
