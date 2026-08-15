// Liberdade Fiscal — Service Worker
// Versionamento explícito: sobe o CACHE_VERSION em cada release que
// altere o shell ou os assets estáticos em cache.

const CACHE_VERSION = "liberdade-fiscal-v0.7";
const STATIC_CACHE = `${CACHE_VERSION}-static`;

// Base do scope do service worker — funciona tanto em GitHub Pages de
// organização (raiz "/") como em página de projeto
// ("/liberdade-fiscal/"), sem hardcodar nenhuma das duas.
const SCOPE = self.registration ? self.registration.scope : self.location.origin + "/";

// Shell mínimo necessário para a app arrancar e funcionar offline.
// Os módulos de dados (data/*.js) são adicionados aqui à medida que
// existam (Fase 2+); entretanto são servidos via network-first com
// fallback para cache, caso já tenham sido visitados.
// "" (raiz do scope) e "index.html" resolvem para o mesmo recurso do
// lado do servidor, mas mantemos as duas entradas porque o browser as
// pode pedir com URLs distintas consoante a navegação.
const STATIC_ASSETS = [
  "",
  "index.html",
  "app.js",
  "style.css",
  "manifest.json",
  "modules/quiz.js",
  "modules/taximetro.js",
  "modules/faturas.js",
  "modules/faturas-qr.js",
  "modules/onboarding.js",
  "modules/impostos-anuais.js",
  "modules/dia-liberdade.js",
  "modules/benchmark-ocde.js",
  "data/oecd-benchmark-2025.js",
  "data/share-card.js",
  "data/quiz-engine.js",
  "data/quiz-questions.js",
  "data/db.js",
  "data/tax-engine.js",
  "data/qr-parser.js",
  "data/goods-services-pt.js",
  "data/tax-rules/2026/irs.js",
  "data/tax-rules/2026/seguranca-social.js",
  "data/tax-rules/2026/iva.js",
  "data/tax-rules/2026/impostos-especiais.js",
  "data/tax-rules/2026/patrimoniais.js",
  "fonts/poppins-light.woff2",
  "fonts/poppins-regular.woff2",
  "fonts/poppins-semibold.woff2",
  "fonts/poppins-bold.woff2",
  "icons/icon-192.png",
  "icons/icon-512.png",
  "icons/icon-maskable.png",
  "icons/logo-mark.png",
  "modules/boas-vindas.js",
].map((path) => new URL(path, SCOPE).pathname);

// --- Instalação: pré-cacheia o shell ---
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
  );
});

// --- Ativação: limpa caches de versões anteriores ---
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith("liberdade-fiscal-") && key !== STATIC_CACHE)
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

// --- Estratégia de fetch ---
// Cache-first para assets estáticos do shell (HTML/CSS/JS da app).
// Network-first para tudo o resto (p.ex. futuras chamadas à API de
// OCR, ou conteúdo de data/ enquanto se itera), com fallback para
// cache de forma a suportar o modo offline.
self.addEventListener("fetch", (event) => {
  const { request } = event;

  // Só intercetamos GET; outros métodos (p.ex. POST ao worker de OCR)
  // vão diretos para a rede e nunca são colocados em cache.
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // Pedidos a outras origens (p.ex. Cloudflare Worker de OCR) não são
  // colocados em cache — sempre rede, sem fallback offline (essa
  // função requer ligação por design).
  if (url.origin !== self.location.origin) return;

  // STATIC_ASSETS já contém pathnames absolutos e resolvidos (ver SCOPE
  // acima), por isso a comparação é direta.
  const isStaticShellAsset = STATIC_ASSETS.includes(url.pathname);

  if (isStaticShellAsset) {
    event.respondWith(cacheFirst(request));
  } else {
    event.respondWith(networkFirst(request));
  }
});

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response && response.ok) {
      const cache = await caches.open(STATIC_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch (err) {
    // Sem rede e sem cache: nada para servir.
    return new Response("Offline e sem versão em cache.", {
      status: 503,
      statusText: "Offline",
    });
  }
}

async function networkFirst(request) {
  try {
    const response = await fetch(request);
    if (response && response.ok) {
      const cache = await caches.open(STATIC_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch (err) {
    const cached = await caches.match(request);
    if (cached) return cached;
    return new Response("Offline e sem versão em cache.", {
      status: 503,
      statusText: "Offline",
    });
  }
}
