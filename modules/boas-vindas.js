// Liberdade Fiscal — Ecrã de boas-vindas (storytelling de marca)
//
// Não confundir com modules/onboarding.js: aquele pede a região porque
// é um requisito funcional (spec §6.3, precisa-se para calcular o IVA
// certo). Este ecrã não pede nada — existe só para apresentar o
// símbolo e os valores do produto (CLAUDE.md §4, brand board do
// autor).
//
// Comportamento (revisto a pedido do autor, 18/08/2026): mostra-se
// SEMPRE ao abrir a app, antes de qualquer rota (ver app.js,
// showBrandIntro) — não só na primeira visita. Só deixa de aparecer se
// a própria pessoa marcar explicitamente a opção "Não mostrar esta
// introdução da próxima vez", que persiste via
// setSetting("introVista", true). Sem essa marcação, o valor
// guardado é sempre `false`/ausente, por isso o ecrã volta a
// aparecer em cada arranque. Se o armazenamento local falhar, o
// próprio init() em app.js já trata esse caso (modo efémero) — aqui
// basta não deixar a app presa: um erro ao gravar a flag não deve
// impedir onComplete().
//
// Propósito/valor (18/08/2026, a pedido do autor): o ecrã passou a
// abrir com um parágrafo de propósito antes da explicação do símbolo
// — "porque existe esta app", não só "o que significa o logótipo".
// Escrito deliberadamente para motivar literacia fiscal e pensamento
// crítico sem sugerir qualquer conclusão política; ver a mesma
// disciplina reforçada no ecrã de resultado (modules/dia-liberdade.js).

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
      "Os teus dados ficam sempre no teu dispositivo. Sem contas, sem servidores nossos — nada do que introduzes sai daqui.",
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

  // Propósito do produto — vem antes da explicação do símbolo de
  // propósito. Escrito para dar "gancho" sem tomar partido: o objetivo
  // é motivar literacia fiscal e participação crítica no debate
  // público, nunca sugerir uma conclusão política (CLAUDE.md §1, §10 —
  // neutralidade e proibição de linguagem partidária são não
  // negociáveis neste projeto).
  const proposito = el(
    "p",
    "welcome-hero__proposito",
    "Sabes mesmo quanto do teu trabalho fica contigo depois de todos os impostos — diretos, indiretos, especiais e patrimoniais? A maioria das pessoas nunca fez essa conta. Esta app existe para tornar essa resposta clara, verificável e tua, para que possas formar a tua própria opinião sobre os temas fiscais que moldam o debate público — com dados, não com slogans."
  );

  const lead = el(
    "p",
    "welcome-hero__lead",
    "Escolhemos uma ave para símbolo — voa livre, sem depender de ninguém. Antes de começares, os quatro princípios que guiam este projeto."
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

  // Opção explícita para deixar de ver este ecrã — desmarcada por
  // omissão, porque o comportamento por defeito passou a ser mostrar
  // sempre (ver nota de cabeçalho). Só quando a pessoa marca isto é
  // que gravamos introVista=true.
  const naoMostrarWrap = el("div", "welcome-hero__opcao");
  const naoMostrarCheckbox = document.createElement("input");
  naoMostrarCheckbox.type = "checkbox";
  naoMostrarCheckbox.id = "welcome-nao-mostrar";
  const naoMostrarLabel = document.createElement("label");
  naoMostrarLabel.htmlFor = "welcome-nao-mostrar";
  naoMostrarLabel.textContent = "Não mostrar esta introdução da próxima vez";
  naoMostrarWrap.append(naoMostrarCheckbox, naoMostrarLabel);

  const cta = el("button", "btn btn--primary welcome-hero__cta", "Vamos começar");
  cta.type = "button";
  cta.addEventListener("click", async () => {
    if (naoMostrarCheckbox.checked) {
      try {
        await setSetting("introVista", true);
      } catch (err) {
        // Armazenamento indisponível — não bloqueia a navegação, apenas
        // significa que este ecrã pode voltar a aparecer numa próxima
        // visita. app.js já trata a falha de armazenamento em geral.
        console.error("Não foi possível guardar que a introdução não deve voltar a aparecer:", err);
      }
    }
    onComplete();
  });

  section.append(logo, heading, proposito, lead, list, naoMostrarWrap, cta);
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
