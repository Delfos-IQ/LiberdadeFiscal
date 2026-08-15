// Liberdade Fiscal — entrypoint (Fase 1: Foundation)
//
// Responsabilidades desta fase:
//   1. Registar o service worker (offline shell).
//   2. Inicializar a base de dados local (IndexedDB) e garantir que o
//      onboarding de região só corre uma vez.
//   3. Router mínimo baseado em botões de navegação — os módulos reais
//      (Quiz, Taxímetro, Faturas, Impostos anuais, Dia da Liberdade
//      Fiscal) serão importados aqui a partir da Fase 3+.
//   4. Banner de estado offline/online.
//
// Nada de lógica fiscal vive neste ficheiro — isso pertence a
// data/tax-rules/ e aos módulos de motor de cálculo das próximas fases.

import { getSetting } from "./data/db.js";

/* -----------------------------
   1. Service worker
   ----------------------------- */
async function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return;

  try {
    await navigator.serviceWorker.register("./sw.js");
  } catch (err) {
    console.error("Falha ao registar o service worker:", err);
  }
}

/* -----------------------------
   2. Banner offline/online
   ----------------------------- */
function initOfflineBanner() {
  const banner = document.getElementById("offline-banner");
  if (!banner) return;

  const update = () => {
    banner.dataset.visible = String(!navigator.onLine);
  };

  window.addEventListener("online", update);
  window.addEventListener("offline", update);
  update();
}

/* -----------------------------
   3. Router — carregamento dinâmico por rota, sem framework
   ----------------------------- */
const DEFAULT_ROUTE = "quiz";

// Cada rota mapeia para um import() dinâmico do seu módulo. Módulos
// ainda não construídos (Fases 4-8) ficam como `null` e mostram um
// placeholder — nunca um ecrã em branco nem um erro.
const ROUTE_MODULES = {
  quiz: () => import("./modules/quiz.js"),
  taximetro: () => import("./modules/taximetro.js"),
  faturas: () => import("./modules/faturas.js"),
  "impostos-anuais": () => import("./modules/impostos-anuais.js"),
  "dia-liberdade": () => import("./modules/dia-liberdade.js"),
};

let currentModuleInstance = null;

async function renderRoute(route) {
  const main = document.getElementById("app-main");
  if (!main) return;

  const isValidRoute = Object.prototype.hasOwnProperty.call(ROUTE_MODULES, route);
  const resolvedRoute = isValidRoute ? route : DEFAULT_ROUTE;

  // Limpa o módulo anterior antes de trocar de rota — evita listeners
  // ou estado da vista antiga a interferir com a nova.
  if (currentModuleInstance && typeof currentModuleInstance.destroy === "function") {
    currentModuleInstance.destroy();
    currentModuleInstance = null;
  }

  updateNavCurrent(resolvedRoute);

  const loader = ROUTE_MODULES[resolvedRoute];
  if (!loader) {
    renderPlaceholder(main, resolvedRoute);
    return;
  }

  try {
    const mod = await loader();
    main.innerHTML = "";
    currentModuleInstance = mod.render(main);
  } catch (err) {
    console.error(`Falha ao carregar o módulo da rota "${resolvedRoute}":`, err);
    renderPlaceholder(main, resolvedRoute, true);
  }
}

function renderPlaceholder(main, route, isError = false) {
  main.innerHTML = "";
  const card = document.createElement("section");
  card.className = "card";
  const heading = document.createElement("h1");
  heading.textContent = isError ? "Não foi possível carregar esta secção" : "Em construção";
  const p = document.createElement("p");
  p.textContent = isError
    ? "Tenta novamente mais tarde ou volta ao Quiz."
    : `O módulo "${route}" chega numa próxima fase de construção da app.`;
  card.append(heading, p);
  main.append(card);
}

function updateNavCurrent(route) {
  document.querySelectorAll("[data-route]").forEach((button) => {
    if (button.dataset.route === route) {
      button.setAttribute("aria-current", "page");
    } else {
      button.removeAttribute("aria-current");
    }
  });
}

function initNav() {
  document.querySelectorAll("[data-route]").forEach((button) => {
    button.addEventListener("click", () => {
      const route = button.dataset.route;
      if (!Object.prototype.hasOwnProperty.call(ROUTE_MODULES, route)) return;
      window.location.hash = route;
    });
  });

  // Sincroniza a UI com o histórico do navegador (botão atrás/avançar,
  // ou entrar diretamente numa URL com #rota) — sem isto o router fica
  // desligado do histórico, um problema identificado na auditoria da
  // Fase 1 (M-2).
  window.addEventListener("hashchange", () => {
    renderRoute(currentRouteFromHash());
  });
}

function currentRouteFromHash() {
  const hash = window.location.hash.replace(/^#/, "");
  return hash || DEFAULT_ROUTE;
}

/* -----------------------------
   4. Onboarding mínimo — região
   ----------------------------- */
async function ensureOnboarding() {
  const region = await getSetting("region");
  if (region) return region;

  // Fase 1: sem UI de onboarding ainda (chega com o módulo de Faturas,
  // Fase 5). Por agora não assume região nenhuma — os módulos de
  // cálculo devem tratar "sem região definida" como estado explícito,
  // nunca assumir "continente" silenciosamente.
  return null;
}

/* -----------------------------
   4b. Modo efémero — fallback quando o IndexedDB falha
   ----------------------------- */
// Se o armazenamento local não estiver disponível (modo privado em
// alguns navegadores, armazenamento bloqueado por política, etc.), a
// app não pode simplesmente morrer: isso trairia a promessa
// local-first. Em vez disso, avisa o utilizador e continua — os dados
// introduzidos nessa sessão não serão guardados, mas o simulador
// continua a funcionar.
function enterEphemeralMode(error) {
  console.error("Armazenamento local indisponível — a app continua em modo efémero:", error);

  document.documentElement.dataset.storageMode = "ephemeral";

  const banner = document.getElementById("offline-banner");
  if (banner) {
    banner.textContent =
      "Não foi possível aceder ao armazenamento local. A app funciona, mas os dados desta sessão não vão ser guardados.";
    banner.dataset.visible = "true";
    banner.setAttribute("role", "alert");
  }
}

/* -----------------------------
   5. Bootstrap
   ----------------------------- */
async function init() {
  initOfflineBanner();
  initNav();
  await registerServiceWorker();

  try {
    await ensureOnboarding();
  } catch (err) {
    enterEphemeralMode(err);
  }

  await renderRoute(currentRouteFromHash());
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    init().catch((err) => console.error("Falha inesperada no arranque da app:", err));
  });
} else {
  init().catch((err) => console.error("Falha inesperada no arranque da app:", err));
}
