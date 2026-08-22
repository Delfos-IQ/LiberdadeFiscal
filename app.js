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

import { getSetting, getPeriodoAtual, periodoTemAnaliseEmCurso } from "./data/db.js";
import { REVISAO_DADOS_2026 } from "./data/tax-rules/2026/meta.js";

/* -----------------------------
   0. Ecrã de boas-vindas (storytelling de marca) — mostra-se uma
   única vez, antes de qualquer rota. Ver modules/boas-vindas.js para
   o porquê de ser um módulo separado do onboarding de região.
   ----------------------------- */
function showBrandIntro() {
  return new Promise((resolve) => {
    const main = document.getElementById("app-main");
    if (!main) {
      resolve();
      return;
    }
    import("./modules/boas-vindas.js")
      .then((mod) => mod.render(main, { onComplete: resolve }))
      .catch((err) => {
        console.error("Falha ao carregar o ecrã de boas-vindas:", err);
        resolve();
      });
  });
}

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
   2b. Nota de "última revisão" dos dados fiscais (19/08/2026) — mostra
   no footer quando os parâmetros fiscais foram verificados pela última
   vez, para não deixar a app parecer "definitiva" para sempre. Lê
   REVISAO_DADOS_2026 (fonte única, ver data/tax-rules/2026/meta.js) em
   vez de hardcodar a data aqui.
   ----------------------------- */
function initDataFreshnessNote() {
  const el = document.getElementById("data-freshness-note");
  if (!el) return;

  const formatarDataPT = (isoDate) => {
    const [ano, mes, dia] = isoDate.split("-").map(Number);
    const data = new Date(Date.UTC(ano, mes - 1, dia));
    return new Intl.DateTimeFormat("pt-PT", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(
      data
    );
  };

  el.textContent =
    `Dados fiscais revistos em ${formatarDataPT(REVISAO_DADOS_2026.ultimaRevisao)} · ` +
    `próxima revisão prevista: ${formatarDataPT(REVISAO_DADOS_2026.proximaRevisaoPrevista)}.`;
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
  // Rota secundária, sem botão próprio na navegação principal — acede-se
  // a partir do link "Comparar com a OCDE" no ecrã de resultado do Dia
  // da Liberdade Fiscal (Fase 8, spec §6.6).
  "benchmark-ocde": () => import("./modules/benchmark-ocde.js"),
  // Rota secundária (22/08/2026, a pedido do autor): compara a
  // evolução nominal do 1.º escalão de IRS com a inflação acumulada
  // (INE) — mesmo padrão de acesso que benchmark-ocde, link a partir
  // do ecrã do Dia da Liberdade Fiscal.
  "degradacao-monetaria": () => import("./modules/degradacao-monetaria.js"),
  // Rota secundária (Auditoria 2026-08, hallazgo B-1: exportação de
  // dados) — acede-se a partir do link "Os teus dados" no footer, que
  // sobrevive a todas as trocas de rota. Fora do nav principal pelo
  // mesmo motivo que benchmark-ocde: 5 itens já é o limite confortável
  // a 320px (ver AUDITORIA-2026-08.md, hallazgo B-13 herdado).
  dados: () => import("./modules/dados.js"),
  // Rota secundária (19/08/2026, a pedido do autor: conteúdo opcional
  // "para quem quiser mais", sem tocar no fluxo principal) — mesmo
  // padrão de acesso que "dados": link no footer, fora do nav
  // principal.
  glossario: () => import("./modules/glossario.js"),
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

  // Links secundários fora da navegação principal (ex.: "Os teus
  // dados" no footer) — mesmo mecanismo, atributo diferente para não
  // entrarem no destaque de aria-current de updateNavCurrent(), que só
  // deve marcar os 5 itens da navegação principal.
  document.querySelectorAll("[data-route-link]").forEach((button) => {
    button.addEventListener("click", () => {
      const route = button.dataset.routeLink;
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
   3b. "Continuar ou começar de novo?" (19/08/2026, a pedido do autor)
   — Rendimentos e Gastos rehidratam-se sozinhos a partir do período
   atual (ver taximetro.js/faturas.js), o que é ótimo ao navegar entre
   ecrãs mas confuso ao reabrir a app dias depois e ver tudo já
   preenchido, sem ter pedido isso. Corre uma vez por sessão do
   separador (sessionStorage, não localStorage — cada nova sessão do
   navegador volta a perguntar), só quando há mesmo uma análise em
   curso (periodoTemAnaliseEmCurso).
   ----------------------------- */
const AVISO_RETOMAR_KEY = "avisoRetomarAnaliseMostrado";

async function talvezMostrarAvisoRetomar() {
  const main = document.getElementById("app-main");
  if (!main) return;

  let jaMostrado = false;
  try {
    jaMostrado = sessionStorage.getItem(AVISO_RETOMAR_KEY) === "1";
  } catch {
    // sessionStorage indisponível (ex.: navegação privada nalguns
    // browsers) — trata como "ainda não mostrado" nesta visita; o
    // pior cenário é perguntar de novo depois de um reload, não é
    // crítico.
  }
  if (jaMostrado) return;

  let periodo;
  try {
    periodo = await getPeriodoAtual();
  } catch {
    return; // sem IndexedDB, não há nada para retomar
  }
  if (!periodoTemAnaliseEmCurso(periodo)) return;

  try {
    sessionStorage.setItem(AVISO_RETOMAR_KEY, "1");
  } catch {
    // ignora — pior caso, pergunta outra vez depois de um reload
  }

  await new Promise((resolve) => {
    import("./modules/retomar-analise.js")
      .then((mod) => mod.render(main, { periodo, onDecidido: resolve }))
      .catch((err) => {
        console.error("Falha ao carregar o aviso de retomar análise:", err);
        resolve();
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
  initDataFreshnessNote();
  await registerServiceWorker();

  try {
    const introVista = await getSetting("introVista");
    if (!introVista) {
      await showBrandIntro();
    }
  } catch (err) {
    // Falha ao ler o armazenamento: mostra a introdução na mesma (o
    // pior cenário é reaparecer noutra visita), não bloqueia o arranque.
    console.error("Não foi possível verificar se a introdução já foi vista:", err);
    await showBrandIntro();
  }

  try {
    await ensureOnboarding();
  } catch (err) {
    enterEphemeralMode(err);
  }

  await talvezMostrarAvisoRetomar();

  await renderRoute(currentRouteFromHash());
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    init().catch((err) => console.error("Falha inesperada no arranque da app:", err));
  });
} else {
  init().catch((err) => console.error("Falha inesperada no arranque da app:", err));
}
