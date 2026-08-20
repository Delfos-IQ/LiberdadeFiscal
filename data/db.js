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
// v2: adiciona o store periodosFechados (histórico de "Períodos" — ver
// getPeriodoAtual/fecharPeriodoAtual) para o fluxo acumulativo
// Rendimentos → Gastos → Taxas → Dia da Liberdade Fiscal.
const DB_VERSION = 2;

// Auditoria 2026-08 (hallazgo M-5/B-2): até agora `onupgradeneeded` só
// cria stores que ainda não existem — nunca houve uma migração que
// TRANSFORMASSE registos já guardados quando a forma de um registo
// muda (ex.: se um campo obrigatório passasse a ter outro nome). Isto
// não era um problema enquanto não havia utilizadores reais com dados
// para perder; deixa de ser seguro assim que houver.
//
// Padrão adotado a partir de agora: cada migração de dados (não de
// esquema — criar stores continua a tratar-se à parte, acima) é uma
// função `{ versaoAlvo, executar(db, tx) }` nesta lista, executada por
// ordem crescente apenas quando `event.oldVersion < versaoAlvo`.
// Migrações têm de ser idempotentes (seguras de correr mais do que uma
// vez) porque `onupgradeneeded` pode, em teoria, ser interrompido a
// meio (falha de energia, fecho do browser) e retomado depois.
//
// Exemplo (ainda não usado em produção — fica como referência para a
// próxima vez que a forma de um registo mudar):
//   {
//     versaoAlvo: 3,
//     executar(db, tx) {
//       const store = tx.objectStore("periodicTaxes");
//       store.openCursor().onsuccess = (e) => {
//         const cursor = e.target.result;
//         if (!cursor) return;
//         const registo = cursor.value;
//         if (registo.novoCampo === undefined) {
//           cursor.update({ ...registo, novoCampo: valorPorOmissao });
//         }
//         cursor.continue();
//       };
//     },
//   }
//
// Exportado (19/08/2026, ronda "vamos a por ello") para poder ser
// exercitado por um teste de integração real (ver
// tests/db-migracao.integration.test.js) — antes desta ronda, o padrão
// tinha zero cobertura de teste: só se saberia se funcionava mesmo
// quando a primeira migração real de produção corresse contra dados de
// utilizadores verdadeiros. O teste empurra uma migração sintética para
// este array, força uma reabertura da BD a partir de uma versão antiga
// simulada, e confirma que `executar()` é mesmo chamado e transforma os
// registos — depois remove a migração sintética, para nunca ficar
// incluída na app real.
export const MIGRACOES_DE_DADOS = [];

/** @type {Record<string, string>} nome lógico -> keyPath */
export const STORES = {
  invoices: "id", // Invoice[]
  periodicTaxes: "id", // PeriodicTax[]
  quizResults: "id", // { id, date, score, answers[] }
  userSettings: "key", // { key, value } — região, onboarding concluído, etc.
  taxParameterCache: "id", // TaxParameter[] cache local do ano ativo, opcional
  periodosFechados: "id", // Período[] — histórico de períodos fechados (ver getPeriodoAtual/fecharPeriodoAtual)
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
      const tx = request.transaction;

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

      // Migrações de dados (ver MIGRACOES_DE_DADOS acima) — só correm
      // para quem está a atualizar de uma versão anterior, nunca numa
      // instalação nova (event.oldVersion === 0).
      for (const migracao of MIGRACOES_DE_DADOS) {
        if (event.oldVersion > 0 && event.oldVersion < migracao.versaoAlvo) {
          migracao.executar(db, tx);
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
  // "photo_ocr" removido como valor válido (19/08/2026, a pedido do
  // autor: eliminação do fallback de foto+IA — ver worker/README.md no
  // histórico do git para o que existia antes). "manual" e "qr"
  // continuam válidos porque nunca dependeram de nenhum servidor.
  if (!["manual", "qr"].includes(invoice.source)) {
    throw new Error(`source inválido: ${invoice.source}. Use "manual" ou "qr".`);
  }

  return dbPut("invoices", invoice);
}

/**
 * Guarda um PeriodicTax (imposto anual/patrimonial: IMI, IUC, ISV, IMT,
 * Imposto de Selo, CAV, Taxa_Turistica — secção 6.4 do CLAUDE.md). Ao contrário das
 * Invoices, estes valores não são calculados pela app (as tabelas
 * completas de ISV/IUC/Imposto de Selo estão marcadas UNKNOWN/ESTIMATE
 * em data/tax-rules/2026/patrimoniais.js) — o utilizador introduz o
 * valor que já sabe que pagou (p.ex. da nota de liquidação de IMI), e
 * este ponto único de escrita só valida a forma do registo.
 *
 * @param {import('./db.js').PeriodicTax} periodicTax
 */
export async function savePeriodicTax(periodicTax) {
  if (!periodicTax || typeof periodicTax !== "object") {
    throw new TypeError("periodicTax deve ser um objeto.");
  }
  const camposObrigatorios = ["id", "type", "amount", "date", "recurrence"];
  const emFalta = camposObrigatorios.filter(
    (c) => periodicTax[c] === undefined || periodicTax[c] === null
  );
  if (emFalta.length > 0) {
    throw new Error(`PeriodicTax incompleto — faltam campos: ${emFalta.join(", ")}`);
  }
  const tiposValidos = ["IMI", "IUC", "ISV", "IMT", "Imposto_Selo", "CAV", "Taxa_Turistica"];
  if (!tiposValidos.includes(periodicTax.type)) {
    throw new Error(`type inválido: ${periodicTax.type}. Use um de: ${tiposValidos.join(", ")}.`);
  }
  if (typeof periodicTax.amount !== "number" || !Number.isFinite(periodicTax.amount) || periodicTax.amount < 0) {
    throw new Error("amount deve ser um número >= 0.");
  }
  if (!["annual", "one_time"].includes(periodicTax.recurrence)) {
    throw new Error('recurrence inválida. Use "annual" ou "one_time".');
  }

  return dbPut("periodicTaxes", periodicTax);
}

/**
 * "Período" — o acumulador do fluxo Rendimentos → Gastos → Taxas →
 * Dia da Liberdade Fiscal (redesenho de agosto de 2026, a pedido do
 * autor). Não substitui `invoices`/`periodicTaxes` — é uma camada
 * fina por cima, guardada em userSettings sob a chave "periodoAtual",
 * que o ecrã do Dia da Liberdade lê para decidir o que já foi
 * preenchido e o que falta (nunca calcula em silêncio com dados em
 * falta — ver módulo dia-liberdade.js).
 *
 * Forma do período atual:
 * {
 *   criadoEm: string (ISO),
 *   rendimentos: null | { salarioLiquidoMensal, custoTotalEmpregadorMensal, ... } (resultado de calcularCadeiaSalarial)
 *   gastosMensal: null | { categorias: [{ id, valorMensal }], totalMensal }
 *   taxasAnuais: null | { total, items: [{ tipo, valor }] }
 * }
 */
const PERIODO_ATUAL_KEY = "periodoAtual";

function periodoVazio() {
  return {
    criadoEm: new Date().toISOString(),
    rendimentos: null,
    gastosMensal: null,
    taxasAnuais: null,
  };
}

/** @returns {Promise<object>} o período atual, criando um vazio se ainda não existir */
export async function getPeriodoAtual() {
  const existente = await getSetting(PERIODO_ATUAL_KEY);
  return existente ?? periodoVazio();
}

/**
 * Mistura `patch` no período atual e persiste. Uso típico:
 * `atualizarPeriodoAtual({ rendimentos: resultado })` a partir do
 * botão "Guardar e avançar" de cada módulo.
 * @param {Partial<{rendimentos: object, gastosMensal: object, taxasAnuais: object}>} patch
 */
export async function atualizarPeriodoAtual(patch) {
  const atual = await getPeriodoAtual();
  const atualizado = { ...atual, ...patch };
  await setSetting(PERIODO_ATUAL_KEY, atualizado);
  return atualizado;
}

/**
 * Fecha o período atual: guarda uma cópia no histórico
 * (`periodosFechados`, com o resultado final do Dia da Liberdade
 * Fiscal anexado) e reinicia o período atual para um novo, vazio.
 *
 * Auditoria 2026-08 (hallazgo B-3): as duas escritas (guardar no
 * histórico + reiniciar o período atual) fazem-se numa ÚNICA
 * transação IndexedDB span­ning os dois stores envolvidos
 * (`periodosFechados` e `userSettings`), em vez de duas chamadas
 * `dbPut`/`setSetting` separadas. Isto elimina a janela em que uma
 * interrupção a meio (fecho abrupto do browser, queda de energia)
 * podia deixar o período fechado duplicado no histórico sem reiniciar,
 * ou reiniciado sem ficar no histórico — as duas escritas agora
 * sucedem ou falham em bloco.
 *
 * @param {object} resultadoDiaLiberdade
 */
export async function fecharPeriodoAtual(resultadoDiaLiberdade) {
  const atual = await getPeriodoAtual();
  const fechado = {
    id: `periodo-${Date.now()}`,
    ...atual,
    fechadoEm: new Date().toISOString(),
    resultadoDiaLiberdade,
  };

  const db = await openDb();
  await new Promise((resolve, reject) => {
    const tx = db.transaction(["periodosFechados", "userSettings"], "readwrite");
    tx.objectStore("periodosFechados").put(fechado);
    tx.objectStore("userSettings").put({ key: PERIODO_ATUAL_KEY, value: periodoVazio() });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });

  return fechado;
}

/**
 * @param {object} periodo o período atual (ver getPeriodoAtual)
 * @returns {boolean} true se houver rendimentos ou gastos mensais
 * guardados — ou seja, se há uma simulação em curso que faz sentido
 * perguntar "continuar ou começar de novo?" ao reabrir a app.
 *
 * Não conta `taxasAnuais`: esse campo é só um resumo calculado a
 * partir dos registos reais em `periodicTaxes` (IMI/IUC/ISV/IMT/Selo,
 * ver impostos-anuais.js) — não é uma "simulação" descartável, é
 * histórico de pagamentos que o utilizador já fez. Recalcula-se
 * sozinho na próxima visita ao ecrã de Taxas, mesmo depois de
 * `reiniciarPeriodoAtual()`.
 */
export function periodoTemAnaliseEmCurso(periodo) {
  return Boolean(periodo && (periodo.rendimentos || periodo.gastosMensal));
}

/**
 * "Começar nova análise" (19/08/2026, a pedido do autor: o
 * utilizador via o Taxímetro/Gastos reaparecerem já preenchidos ao
 * reabrir a app e queria poder recomeçar do zero, com confirmação).
 *
 * Limpa APENAS `rendimentos` e `gastosMensal` — os dois campos que são
 * uma simulação/estimativa preenchida num formulário, barata de
 * refazer. NÃO mexe em `taxasAnuais` nem nos registos em
 * `periodicTaxes`: esses representam impostos anuais reais que o
 * utilizador já pagou (IMI, IUC...) e apagá-los silenciosamente aqui
 * seria perda de dados reais, não o reset de uma simulação — ver
 * `periodoTemAnaliseEmCurso` acima. Quem quiser apagar esses registos
 * fá-lo explicitamente em Impostos anuais ou em "Os teus dados".
 *
 * Ao contrário de `fecharPeriodoAtual`, isto NÃO guarda cópia no
 * histórico — é um descarte, não um fecho com resultado.
 *
 * @returns {Promise<object>} o período atualizado
 */
export async function reiniciarPeriodoAtual() {
  const atual = await getPeriodoAtual();
  const reiniciado = { ...atual, criadoEm: new Date().toISOString(), rendimentos: null, gastosMensal: null };
  await setSetting(PERIODO_ATUAL_KEY, reiniciado);
  return reiniciado;
}

/** @returns {Promise<object[]>} histórico de períodos fechados, mais recente primeiro */
export async function getHistoricoPeriodos() {
  const todos = await dbGetAll("periodosFechados");
  return todos.sort((a, b) => (b.fechadoEm ?? "").localeCompare(a.fechadoEm ?? ""));
}

/* -----------------------------
   Exportação / importação (Auditoria 2026-08, hallazgo B-1)
   -----------------------------
   Local-first significa que o utilizador é o único guardião dos seus
   dados — e por isso também tem de poder tirar uma cópia. Sem isto,
   limpar os dados do browser, mudar de telemóvel, ou o próprio browser
   a purgar armazenamento (o Safari é conhecido por apagar IndexedDB ao
   fim de dias sem uso em certas condições) significa perder um ano
   inteiro de dados introduzidos à mão, sem qualquer recurso.

   Ficheiro de exportação: um único JSON, com todos os stores, mais um
   cabeçalho com a versão do esquema e a data de exportação — para que
   uma futura migração de dados (ver MIGRACOES_DE_DADOS acima) também
   saiba como interpretar um ficheiro exportado por uma versão antiga
   da app.
*/

const FORMATO_EXPORTACAO = "liberdade-fiscal-export";
const VERSAO_EXPORTACAO = 1;

/**
 * Exporta todos os stores para um único objeto serializável em JSON.
 * Não sai do dispositivo por si só — quem chama decide o que fazer com
 * o resultado (ex.: transformar em ficheiro para download).
 * @returns {Promise<object>}
 */
export async function exportarTodosDados() {
  const stores = {};
  for (const storeName of Object.keys(STORES)) {
    stores[storeName] = await dbGetAll(storeName);
  }
  return {
    formato: FORMATO_EXPORTACAO,
    versaoExportacao: VERSAO_EXPORTACAO,
    versaoEsquema: DB_VERSION,
    exportadoEm: new Date().toISOString(),
    stores,
  };
}

/**
 * Valida a forma de um objeto de exportação sem escrever nada — usado
 * pelo ecrã de importação para mostrar um resumo ("isto tem N faturas,
 * M taxas...") antes de o utilizador confirmar a substituição dos
 * dados atuais.
 * @param {unknown} dados
 * @returns {{ ok: true, resumo: Record<string, number> } | { ok: false, erro: string }}
 */
export function validarDadosImportacao(dados) {
  if (!dados || typeof dados !== "object") {
    return { ok: false, erro: "O ficheiro não contém um objeto JSON válido." };
  }
  if (dados.formato !== FORMATO_EXPORTACAO) {
    return { ok: false, erro: "Este ficheiro não parece ser uma exportação do Liberdade Fiscal." };
  }
  if (!dados.stores || typeof dados.stores !== "object") {
    return { ok: false, erro: "O ficheiro não contém dados (campo 'stores' em falta)." };
  }

  const resumo = {};
  for (const storeName of Object.keys(STORES)) {
    const registos = dados.stores[storeName];
    resumo[storeName] = Array.isArray(registos) ? registos.length : 0;
  }
  return { ok: true, resumo };
}

/**
 * Substitui TODOS os dados atuais pelos do objeto de exportação — cada
 * store envolvido é limpo e depois repovoado, numa única transação por
 * store (não entre stores, por simplicidade; um ficheiro de importação
 * mal formado é detetado por validarDadosImportacao() antes de chegar
 * aqui, por isso o risco de uma escrita parcial é baixo).
 *
 * Destrutivo por design — quem chama tem de confirmar com o utilizador
 * antes de invocar isto (ver modules/dados.js).
 * @param {object} dados — validado previamente com validarDadosImportacao()
 */
export async function importarTodosDados(dados) {
  const validacao = validarDadosImportacao(dados);
  if (!validacao.ok) {
    throw new Error(validacao.erro);
  }

  const db = await openDb();
  for (const storeName of Object.keys(STORES)) {
    const registos = Array.isArray(dados.stores[storeName]) ? dados.stores[storeName] : [];
    await new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, "readwrite");
      const store = tx.objectStore(storeName);
      store.clear();
      for (const registo of registos) {
        store.put(registo);
      }
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  return validacao.resumo;
}
