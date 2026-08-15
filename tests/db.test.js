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
