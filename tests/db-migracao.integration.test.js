// Liberdade Fiscal — Teste de integração do padrão de migrações de
// esquema IndexedDB (data/db.js, MIGRACOES_DE_DADOS)
// Executar: node --test tests/
//
// Contexto (19/08/2026, ronda "vamos a por ello", a pedido do autor):
// o padrão de migrações existe desde a Auditoria 2026-08 (hallazgo
// M-5/B-2) mas nunca tinha sido exercitado — `MIGRACOES_DE_DADOS`
// ficava sempre vazio em produção, e nenhum teste chegava a simular
// uma reabertura da base de dados a partir de uma versão antiga. Isto
// significa que, até agora, só se saberia se o mecanismo funciona
// mesmo quando a primeira migração real de produção corresse contra
// dados de utilizadores verdadeiros — tarde demais para corrigir sem
// risco.
//
// Este teste simula o cenário completo: cria a base de dados "à mão"
// numa versão antiga (1), com um registo no formato antigo; empurra
// uma migração sintética para MIGRACOES_DE_DADOS (agora exportado);
// reabre a app a partir de um módulo fresco, o que dispara
// `onupgradeneeded` a sério; e confirma que a migração correu e
// transformou o registo. A migração sintética é removida no fim, para
// nunca ficar incluída na app real — só serve para provar que o
// mecanismo funciona.

import "fake-indexeddb/auto";
import { IDBFactory } from "fake-indexeddb";
import { test, describe, beforeEach } from "node:test";
import assert from "node:assert/strict";

// Tem de bater certo com DB_NAME em data/db.js (não está exportado).
const DB_NAME = "liberdade-fiscal";
// Versão "antiga" simulada — tem de ser inferior ao DB_VERSION atual
// de data/db.js (2, à data desta ronda) para que onupgradeneeded
// dispare ao reabrir com o módulo real.
const VERSAO_ANTIGA_SIMULADA = 1;

// Cada teste recebe um `indexedDB` global completamente novo e vazio,
// em vez de reutilizar/apagar o global partilhado. Tentar apagar e
// recriar a mesma BD entre testes (`indexedDB.deleteDatabase`) bloqueia
// indefinidamente aqui: a ligação aberta pelo teste anterior (via
// `dbGetAll`, que nunca fecha a conexão — dbPromise fica cacheado no
// módulo) impede o `deleteDatabase` de terminar. Uma fábrica nova por
// teste evita o problema por completo, sem precisar de expor uma forma
// de fechar a conexão a partir de data/db.js só para testes.
beforeEach(() => {
  globalThis.indexedDB = new IDBFactory();
});

/**
 * Cria a BD "à mão" numa versão antiga, com o store `periodicTaxes` e
 * um único registo no "formato antigo" (sem o campo que a migração
 * sintética vai adicionar) — simula o que um utilizador real teria em
 * disco antes de uma migração de esquema.
 */
function criarBaseDeDadosAntiga() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, VERSAO_ANTIGA_SIMULADA);
    req.onupgradeneeded = () => {
      const db = req.result;
      // A transação de versionchange (req.transaction) já está ativa
      // aqui — usá-la diretamente para o put(), em vez de esperar por
      // oncomplete e abrir uma segunda transação (isso bloqueava:
      // uma conexão "open" só fica disponível para novas transações
      // depois de onsuccess, que só dispara depois desta função
      // terminar).
      const store = db.createObjectStore("periodicTaxes", { keyPath: "id" });
      store.put({
        id: "imi-antigo",
        type: "IMI",
        amount: 250,
        date: "2026-01-15",
        recurrence: "annual",
        // Propositadamente SEM `migradoEm` — é isto que a migração
        // sintética deve adicionar.
      });
    };
    req.onsuccess = () => {
      req.result.close();
      resolve();
    };
    req.onerror = () => reject(req.error);
  });
}

describe("data/db.js — MIGRACOES_DE_DADOS (padrão de migração de esquema, exercitado a sério)", () => {
  test("uma migração empurrada para MIGRACOES_DE_DADOS corre mesmo quando a BD reabre a partir de uma versão antiga", async () => {
    await criarBaseDeDadosAntiga();

    // Módulo fresco (padrão já usado nos outros testes de db.js) —
    // garante que dbPromise começa null nesta instância do módulo,
    // para que a próxima abertura corra onupgradeneeded de verdade.
    const mod = await import(`../data/db.js?t=${Date.now()}-${Math.random()}`);
    const { MIGRACOES_DE_DADOS, dbGetAll } = mod;

    assert.equal(MIGRACOES_DE_DADOS.length, 0, "MIGRACOES_DE_DADOS deve estar vazio em produção — este teste é que o preenche temporariamente");

    let migracaoFoiChamada = false;
    MIGRACOES_DE_DADOS.push({
      versaoAlvo: 2,
      executar(db, tx) {
        migracaoFoiChamada = true;
        const store = tx.objectStore("periodicTaxes");
        store.openCursor().onsuccess = (e) => {
          const cursor = e.target.result;
          if (!cursor) return;
          const registo = cursor.value;
          if (registo.migradoEm === undefined) {
            cursor.update({ ...registo, migradoEm: "2026-08-19T00:00:00.000Z" });
          }
          cursor.continue();
        };
      },
    });

    try {
      const todos = await dbGetAll("periodicTaxes");

      assert.equal(migracaoFoiChamada, true, "a função executar() da migração tem de ser chamada ao reabrir a partir de uma versão antiga");
      assert.equal(todos.length, 1);
      assert.equal(todos[0].id, "imi-antigo");
      assert.equal(todos[0].migradoEm, "2026-08-19T00:00:00.000Z", "o registo antigo tem de sair transformado pela migração");
    } finally {
      // Nunca deixar a migração sintética no array, mesmo se a
      // asserção acima falhar — este array é só para produção real.
      MIGRACOES_DE_DADOS.length = 0;
    }
  });

  test("uma migração com versaoAlvo <= oldVersion NÃO corre (idempotência entre reaberturas na mesma versão)", async () => {
    await criarBaseDeDadosAntiga();

    const mod = await import(`../data/db.js?t=${Date.now()}-${Math.random()}`);
    const { MIGRACOES_DE_DADOS, dbGetAll } = mod;

    let vezesChamada = 0;
    // versaoAlvo 1: como a BD antiga já está em oldVersion=1, a
    // condição `oldVersion < versaoAlvo` (1 < 1) é falsa — não deve
    // correr. Só serve para confirmar que o filtro de versão realmente
    // filtra, não só que qualquer migração no array corre sempre.
    MIGRACOES_DE_DADOS.push({
      versaoAlvo: 1,
      executar() {
        vezesChamada += 1;
      },
    });

    try {
      await dbGetAll("periodicTaxes");
      assert.equal(vezesChamada, 0, "uma migração com versaoAlvo <= oldVersion não deve correr");
    } finally {
      MIGRACOES_DE_DADOS.length = 0;
    }
  });
});
