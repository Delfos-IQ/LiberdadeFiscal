// Liberdade Fiscal — camada de armazenamento local (IndexedDB)
//
// Local-first por design (secção 1 e 9 do CLAUDE.md): nenhum dado
// fiscal do utilizador sai do dispositivo, exceto o fluxo explícito de
// foto+OCR (Fase 5), que nunca passa por aqui.
//
// Este módulo expõe uma API mínima em Promises sobre IndexedDB, com um
// object store por entidade do modelo de dados (secção 5). Os módulos
// de UI de fases futuras (Quiz, Taxímetro, Faturas, Impostos anuais)
// importam apenas as funções `dbGet/dbPut/dbGetAll/dbDelete` — nunca
// tocam em IndexedDB diretamente.

const DB_NAME = "liberdade-fiscal";
const DB_VERSION = 1;

/** @type {Record<string, string>} nome lógico -> keyPath */
export const STORES = {
  invoices: "id", // Invoice[]
  periodicTaxes: "id", // PeriodicTax[]
  quizResults: "id", // { id, date, score, answers[] }
  userSettings: "key", // { key, value } — região, onboarding concluído, etc.
  taxParameterCache: "id", // TaxParameter[] cache local do ano ativo, opcional
};

let dbPromise = null;

/**
 * Abre (ou cria/migra) a base de dados. Idempotente — chamadas
 * concorrentes partilham a mesma promise.
 * @returns {Promise<IDBDatabase>}
 */
function openDb() {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    // globalThis, não window: mais robusto (funciona em qualquer
    // contexto com IndexedDB — inclui ambientes de teste como
    // fake-indexeddb, que não definem `window`).
    if (!("indexedDB" in globalThis)) {
      reject(new Error("IndexedDB não suportado neste navegador."));
      return;
    }

    const request = globalThis.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = request.result;

      for (const [storeName, keyPath] of Object.entries(STORES)) {
        if (!db.objectStoreNames.contains(storeName)) {
          const store = db.createObjectStore(storeName, { keyPath });

          // Índices úteis para queries frequentes por data/tipo.
          if (storeName === "invoices") {
            store.createIndex("by_date", "date");
            store.createIndex("by_region", "region");
          }
          if (storeName === "periodicTaxes") {
            store.createIndex("by_type", "type");
            store.createIndex("by_date", "date");
          }
        }
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    request.onblocked = () =>
      reject(new Error("Atualização da base de dados bloqueada por outra aba aberta."));
  });

  return dbPromise;
}

/**
 * Guarda (cria ou substitui) um registo num store.
 * @param {keyof typeof STORES} storeName
 * @param {object} value
 */
export async function dbPut(storeName, value) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, "readwrite");
    tx.objectStore(storeName).put(value);
    tx.oncomplete = () => resolve(value);
    tx.onerror = () => reject(tx.error);
  });
}

/**
 * Lê um registo por chave primária.
 * @param {keyof typeof STORES} storeName
 * @param {string} key
 */
export async function dbGet(storeName, key) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, "readonly");
    const request = tx.objectStore(storeName).get(key);
    request.onsuccess = () => resolve(request.result ?? null);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Lê todos os registos de um store.
 * @param {keyof typeof STORES} storeName
 */
export async function dbGetAll(storeName) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, "readonly");
    const request = tx.objectStore(storeName).getAll();
    request.onsuccess = () => resolve(request.result ?? []);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Apaga um registo por chave primária.
 * @param {keyof typeof STORES} storeName
 * @param {string} key
 */
export async function dbDelete(storeName, key) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, "readwrite");
    tx.objectStore(storeName).delete(key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/**
 * Apaga todos os registos de um store (usado por ex. em "reset de dados"
 * nas definições de privacidade).
 * @param {keyof typeof STORES} storeName
 */
export async function dbClear(storeName) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, "readwrite");
    tx.objectStore(storeName).clear();
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/**
 * Atalhos de conveniência para userSettings (key/value simples),
 * usados p.ex. para guardar a região escolhida no onboarding.
 */
export async function getSetting(key, fallback = null) {
  const record = await dbGet("userSettings", key);
  return record ? record.value : fallback;
}

export async function setSetting(key, value) {
  return dbPut("userSettings", { key, value });
}

/**
 * Guarda uma Invoice (fatura) — ponto único de escrita para este
 * store. Valida o invariante do modelo de dados (secção 5 do
 * CLAUDE.md): `confirmed_by_user` tem de ser `true` antes de
 * persistir, seja qual for a origem (manual, QR, foto+OCR). Isto
 * fecha o hallazgo M-4 da auditoria da Fase 1 — o invariante estava
 * documentado no spec mas não tinha ponto de aplicação no código.
 *
 * @param {import('./db.js').Invoice} invoice
 */
export async function saveInvoice(invoice) {
  if (!invoice || typeof invoice !== "object") {
    throw new TypeError("invoice deve ser um objeto.");
  }
  if (invoice.confirmed_by_user !== true) {
    throw new Error(
      "Não é permitido persistir uma fatura sem confirmed_by_user === true. " +
        "Isto aplica-se a TODAS as origens (manual, QR, foto+OCR) — o utilizador " +
        "tem sempre de rever e confirmar antes de guardar."
    );
  }
  const camposObrigatorios = ["id", "date", "source", "goodServiceId", "region", "amount_total"];
  const emFalta = camposObrigatorios.filter((c) => invoice[c] === undefined || invoice[c] === null);
  if (emFalta.length > 0) {
    throw new Error(`Invoice incompleta — faltam campos: ${emFalta.join(", ")}`);
  }
  if (!["manual", "photo_ocr", "qr"].includes(invoice.source)) {
    throw new Error(`source inválido: ${invoice.source}. Use "manual", "photo_ocr" ou "qr".`);
  }

  return dbPut("invoices", invoice);
}
