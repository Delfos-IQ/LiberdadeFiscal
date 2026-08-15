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

import { getSetting, setSetting } from "./data/db.js";

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
   3. Router mínimo (placeholder)
   ----------------------------- */
const ROUTES = ["quiz", "taximetro", "faturas", "impostos-anuais", "dia-liberdade"];

function initNav() {
  const buttons = document.querySelectorAll("[data-route]");

  buttons.forEach((button) => {
    button.addEventListener("click", () => {
      const route = button.dataset.route;
      if (!ROUTES.includes(route)) return;

      buttons.forEach((b) => b.removeAttribute("aria-current"));
      button.setAttribute("aria-current", "page");

      // Fase 1: sem render real de módulos ainda. A partir da Fase 3
      // isto substitui o conteúdo de #app-main pelo módulo importado
      // dinamicamente (import() por rota, mantendo tudo vanilla JS).
      window.location.hash = route;
      console.info(`[router] rota selecionada: ${route} (módulo ainda não implementado)`);
    });
  });
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
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    init().catch((err) => console.error("Falha inesperada no arranque da app:", err));
  });
} else {
  init().catch((err) => console.error("Falha inesperada no arranque da app:", err));
}
