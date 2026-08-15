// Liberdade Fiscal — Testes da camada de persistência (data/db.js)
// Executar: node --test tests/
//
// Usa fake-indexeddb (dependência de desenvolvimento, só para testes)
// para exercitar IndexedDB real sem precisar de um browser. Isto
// testa o comportamento verdadeiro do módulo, não uma simulação da
// nossa própria lógica.

import "fake-indexeddb/auto";
import { test, describe, beforeEach } from "node:test";
import assert from "node:assert/strict";

describe("data/db.js — saveInvoice", () => {
  let saveInvoice, dbGetAll, dbClear;

  beforeEach(async () => {
    // Cada teste importa o módulo "fresco" via query string única, para
    // evitar reutilizar a mesma promise de conexão (dbPromise é module-
    // level) entre testes que idealmente deviam começar com uma BD limpa.
    const mod = await import(`../data/db.js?t=${Date.now()}-${Math.random()}`);
    saveInvoice = mod.saveInvoice;
    dbGetAll = mod.dbGetAll;
    dbClear = mod.dbClear;
    await dbClear("invoices");
  });

  function invoiceValida(overrides = {}) {
    return {
      id: "inv-1",
      date: "2026-08-15",
      source: "manual",
      goodServiceId: "pao",
      region: "continente",
      amount_total: 2.5,
      amount_base: 2.36,
      amount_tax: 0.14,
      confirmed_by_user: true,
      ...overrides,
    };
  }

  test("guarda uma invoice válida e confirmada com sucesso", async () => {
    await saveInvoice(invoiceValida());
    const todas = await dbGetAll("invoices");
    assert.equal(todas.length, 1);
    assert.equal(todas[0].id, "inv-1");
  });

  test("rejeita uma invoice com confirmed_by_user === false", async () => {
    await assert.rejects(
      () => saveInvoice(invoiceValida({ confirmed_by_user: false })),
      /confirmed_by_user/
    );
  });

  test("rejeita uma invoice sem confirmed_by_user (undefined)", async () => {
    const inv = invoiceValida();
    delete inv.confirmed_by_user;
    await assert.rejects(() => saveInvoice(inv), /confirmed_by_user/);
  });

  test("nunca persiste uma invoice não confirmada, mesmo que pareça completa", async () => {
    await assert.rejects(() => saveInvoice(invoiceValida({ confirmed_by_user: false })));
    const todas = await dbGetAll("invoices");
    assert.equal(todas.length, 0, "nenhuma invoice deveria ter sido persistida");
  });

  test("rejeita invoice com campos obrigatórios em falta", async () => {
    const inv = invoiceValida();
    delete inv.region;
    await assert.rejects(() => saveInvoice(inv), /faltam campos/);
  });

  test("rejeita source inválido", async () => {
    await assert.rejects(() => saveInvoice(invoiceValida({ source: "telepatia" })), /source inválido/);
  });

  test("aceita as três origens válidas: manual, qr, photo_ocr", async () => {
    await saveInvoice(invoiceValida({ id: "a", source: "manual" }));
    await saveInvoice(invoiceValida({ id: "b", source: "qr" }));
    await saveInvoice(invoiceValida({ id: "c", source: "photo_ocr" }));
    const todas = await dbGetAll("invoices");
    assert.equal(todas.length, 3);
  });

  test("rejeita invoice que não é um objeto", async () => {
    await assert.rejects(() => saveInvoice(null), TypeError);
    await assert.rejects(() => saveInvoice("nao-e-objeto"), TypeError);
  });
});

describe("data/db.js — savePeriodicTax", () => {
  let savePeriodicTax, dbGetAll, dbClear;

  beforeEach(async () => {
    const mod = await import(`../data/db.js?t=${Date.now()}-${Math.random()}`);
    savePeriodicTax = mod.savePeriodicTax;
    dbGetAll = mod.dbGetAll;
    dbClear = mod.dbClear;
    await dbClear("periodicTaxes");
  });

  function taxaValida(overrides = {}) {
    return {
      id: "tax-1",
      type: "IMI",
      amount: 350,
      date: "2026-04-01",
      recurrence: "annual",
      ...overrides,
    };
  }

  test("guarda um PeriodicTax válido", async () => {
    await savePeriodicTax(taxaValida());
    const todos = await dbGetAll("periodicTaxes");
    assert.equal(todos.length, 1);
    assert.equal(todos[0].type, "IMI");
  });

  test("rejeita type inválido", async () => {
    await assert.rejects(() => savePeriodicTax(taxaValida({ type: "IRS" })), /type inválido/);
  });

  test("aceita os cinco tipos válidos", async () => {
    for (const [i, type] of ["IMI", "IUC", "ISV", "IMT", "Imposto_Selo"].entries()) {
      await savePeriodicTax(taxaValida({ id: `tax-${i}`, type }));
    }
    const todos = await dbGetAll("periodicTaxes");
    assert.equal(todos.length, 5);
  });

  test("rejeita amount negativo ou não numérico", async () => {
    await assert.rejects(() => savePeriodicTax(taxaValida({ amount: -10 })), /amount deve ser/);
    await assert.rejects(() => savePeriodicTax(taxaValida({ amount: "cem" })), /amount deve ser/);
  });

  test("rejeita recurrence inválida", async () => {
    await assert.rejects(() => savePeriodicTax(taxaValida({ recurrence: "mensal" })), /recurrence inválida/);
  });

  test("rejeita campos obrigatórios em falta", async () => {
    const t = taxaValida();
    delete t.date;
    await assert.rejects(() => savePeriodicTax(t), /faltam campos/);
  });

  test("rejeita valor que não é objeto", async () => {
    await assert.rejects(() => savePeriodicTax(null), TypeError);
  });
});
