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

  test("aceita as duas origens válidas: manual, qr", async () => {
    // "photo_ocr" removido como origem válida (19/08/2026, eliminação
    // do fallback de foto+IA).
    await saveInvoice(invoiceValida({ id: "a", source: "manual" }));
    await saveInvoice(invoiceValida({ id: "b", source: "qr" }));
    const todas = await dbGetAll("invoices");
    assert.equal(todas.length, 2);
  });

  test("rejeita \"photo_ocr\" como source (removido, já não é válido)", async () => {
    await assert.rejects(() => saveInvoice(invoiceValida({ source: "photo_ocr" })), /source inválido/);
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

  test("aceita os sete tipos válidos (inclui CAV e Taxa_Turistica, adicionados 18/08/2026)", async () => {
    for (const [i, type] of ["IMI", "IUC", "ISV", "IMT", "Imposto_Selo", "CAV", "Taxa_Turistica"].entries()) {
      await savePeriodicTax(taxaValida({ id: `tax-${i}`, type }));
    }
    const todos = await dbGetAll("periodicTaxes");
    assert.equal(todos.length, 7);
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

describe("data/db.js — Período acumulativo (getPeriodoAtual/atualizarPeriodoAtual/fecharPeriodoAtual)", () => {
  let getPeriodoAtual,
    atualizarPeriodoAtual,
    fecharPeriodoAtual,
    getHistoricoPeriodos,
    dbClear,
    periodoTemAnaliseEmCurso,
    reiniciarPeriodoAtual;

  beforeEach(async () => {
    const mod = await import(`../data/db.js?t=${Date.now()}-${Math.random()}`);
    getPeriodoAtual = mod.getPeriodoAtual;
    atualizarPeriodoAtual = mod.atualizarPeriodoAtual;
    fecharPeriodoAtual = mod.fecharPeriodoAtual;
    getHistoricoPeriodos = mod.getHistoricoPeriodos;
    dbClear = mod.dbClear;
    periodoTemAnaliseEmCurso = mod.periodoTemAnaliseEmCurso;
    reiniciarPeriodoAtual = mod.reiniciarPeriodoAtual;
    await dbClear("userSettings");
    await dbClear("periodosFechados");
  });

  test("período atual começa vazio (rendimentos/gastosMensal/taxasAnuais a null)", async () => {
    const p = await getPeriodoAtual();
    assert.equal(p.rendimentos, null);
    assert.equal(p.gastosMensal, null);
    assert.equal(p.taxasAnuais, null);
  });

  test("atualizarPeriodoAtual acumula sem apagar os outros campos já guardados", async () => {
    await atualizarPeriodoAtual({ rendimentos: { salarioLiquidoMensal: 1500 } });
    await atualizarPeriodoAtual({ gastosMensal: { totalMensal: 800 } });
    const p = await getPeriodoAtual();
    assert.equal(p.rendimentos.salarioLiquidoMensal, 1500);
    assert.equal(p.gastosMensal.totalMensal, 800);
  });

  test("fecharPeriodoAtual guarda no histórico e reinicia o período atual", async () => {
    await atualizarPeriodoAtual({ rendimentos: { salarioLiquidoMensal: 1500 } });
    const fechado = await fecharPeriodoAtual({ dayOfYear: 162, percentage: 0.444 });
    assert.equal(fechado.rendimentos.salarioLiquidoMensal, 1500);
    assert.equal(fechado.resultadoDiaLiberdade.dayOfYear, 162);

    const historico = await getHistoricoPeriodos();
    assert.equal(historico.length, 1);
    assert.equal(historico[0].id, fechado.id);

    const novoAtual = await getPeriodoAtual();
    assert.equal(novoAtual.rendimentos, null, "o período atual deve reiniciar vazio após fechar");
  });

  test("histórico devolve os períodos mais recentes primeiro", async () => {
    await fecharPeriodoAtual({ dayOfYear: 100 });
    await new Promise((r) => setTimeout(r, 5));
    await fecharPeriodoAtual({ dayOfYear: 200 });
    const historico = await getHistoricoPeriodos();
    assert.equal(historico.length, 2);
    assert.equal(historico[0].resultadoDiaLiberdade.dayOfYear, 200);
  });

  test("fecharPeriodoAtual persiste no histórico E reinicia numa só transação (regressão B-3)", async () => {
    // Não há forma direta de simular uma interrupção a meio de uma
    // transação IndexedDB num teste — mas podemos confirmar que as
    // duas escritas ficam sempre em sincronia: nunca um histórico sem
    // reset, nem um reset sem histórico.
    await atualizarPeriodoAtual({ rendimentos: { salarioLiquidoMensal: 2000 } });
    await fecharPeriodoAtual({ dayOfYear: 50 });
    const [historico, atual] = await Promise.all([getHistoricoPeriodos(), getPeriodoAtual()]);
    assert.equal(historico.length, 1);
    assert.equal(atual.rendimentos, null);
  });

  test("periodoTemAnaliseEmCurso é false para um período vazio", async () => {
    const p = await getPeriodoAtual();
    assert.equal(periodoTemAnaliseEmCurso(p), false);
  });

  test("periodoTemAnaliseEmCurso é true com rendimentos ou gastosMensal preenchidos", async () => {
    assert.equal(periodoTemAnaliseEmCurso({ rendimentos: { salarioLiquidoMensal: 1500 } }), true);
    assert.equal(periodoTemAnaliseEmCurso({ gastosMensal: { totalMensal: 800 } }), true);
  });

  test("periodoTemAnaliseEmCurso ignora taxasAnuais (não é uma simulação descartável)", async () => {
    assert.equal(periodoTemAnaliseEmCurso({ taxasAnuais: { total: 500 } }), false);
  });

  test("reiniciarPeriodoAtual limpa rendimentos e gastosMensal mas preserva taxasAnuais", async () => {
    await atualizarPeriodoAtual({
      rendimentos: { salarioLiquidoMensal: 1500 },
      gastosMensal: { totalMensal: 800 },
      taxasAnuais: { total: 300 },
    });
    const reiniciado = await reiniciarPeriodoAtual();
    assert.equal(reiniciado.rendimentos, null);
    assert.equal(reiniciado.gastosMensal, null);
    assert.equal(reiniciado.taxasAnuais.total, 300, "taxasAnuais é histórico de pagamentos reais, não deve ser apagado aqui");

    const p = await getPeriodoAtual();
    assert.equal(p.rendimentos, null);
  });

  test("reiniciarPeriodoAtual não guarda cópia no histórico (é um descarte, não um fecho)", async () => {
    await atualizarPeriodoAtual({ rendimentos: { salarioLiquidoMensal: 1500 } });
    await reiniciarPeriodoAtual();
    const historico = await getHistoricoPeriodos();
    assert.equal(historico.length, 0);
  });
});

describe("data/db.js — exportação e importação (Auditoria 2026-08, hallazgo B-1)", () => {
  let saveInvoice, savePeriodicTax, setSetting, dbClear, exportarTodosDados, validarDadosImportacao, importarTodosDados;

  beforeEach(async () => {
    const mod = await import(`../data/db.js?t=${Date.now()}-${Math.random()}`);
    ({ saveInvoice, savePeriodicTax, setSetting, dbClear, exportarTodosDados, validarDadosImportacao, importarTodosDados } =
      mod);
    for (const store of ["invoices", "periodicTaxes", "quizResults", "userSettings", "taxParameterCache", "periodosFechados"]) {
      await dbClear(store);
    }
  });

  function invoiceValida(overrides = {}) {
    return {
      id: "inv-1",
      date: "2026-08-15",
      source: "manual",
      goodServiceId: "pao",
      region: "continente",
      amount_total: 2.5,
      confirmed_by_user: true,
      ...overrides,
    };
  }

  test("exportarTodosDados devolve todos os stores, incluindo os vazios", async () => {
    await saveInvoice(invoiceValida());
    await setSetting("region", "continente");

    const exportado = await exportarTodosDados();
    assert.equal(exportado.formato, "liberdade-fiscal-export");
    assert.equal(exportado.stores.invoices.length, 1);
    assert.ok(Array.isArray(exportado.stores.periodicTaxes), "stores vazios devem aparecer como array vazio, não em falta");
    assert.equal(exportado.stores.periodicTaxes.length, 0);
    const settingRegiao = exportado.stores.userSettings.find((s) => s.key === "region");
    assert.equal(settingRegiao.value, "continente");
  });

  test("validarDadosImportacao rejeita um ficheiro que não é uma exportação desta app", () => {
    const r1 = validarDadosImportacao({ algo: "aleatorio" });
    assert.equal(r1.ok, false);
    const r2 = validarDadosImportacao(null);
    assert.equal(r2.ok, false);
    const r3 = validarDadosImportacao("texto");
    assert.equal(r3.ok, false);
  });

  test("validarDadosImportacao aceita uma exportação válida e resume as contagens", async () => {
    await saveInvoice(invoiceValida());
    await savePeriodicTax({ id: "t1", type: "IMI", amount: 300, date: "2026-01-01", recurrence: "annual" });
    const exportado = await exportarTodosDados();

    const validado = validarDadosImportacao(exportado);
    assert.equal(validado.ok, true);
    assert.equal(validado.resumo.invoices, 1);
    assert.equal(validado.resumo.periodicTaxes, 1);
  });

  test("importarTodosDados substitui os dados atuais pelos do ficheiro (round-trip completo)", async () => {
    await saveInvoice(invoiceValida({ id: "original" }));
    const exportado = await exportarTodosDados();

    // Simula "outro dispositivo": limpa tudo e confirma que fica vazio.
    await dbClear("invoices");
    const { dbGetAll } = await import(`../data/db.js?t=${Date.now()}-${Math.random()}`);
    assert.equal((await dbGetAll("invoices")).length, 0);

    const resumo = await importarTodosDados(exportado);
    assert.equal(resumo.invoices, 1);
    const restauradas = await dbGetAll("invoices");
    assert.equal(restauradas.length, 1);
    assert.equal(restauradas[0].id, "original");
  });

  test("importarTodosDados rejeita um ficheiro inválido sem escrever nada", async () => {
    await saveInvoice(invoiceValida());
    await assert.rejects(() => importarTodosDados({ formato: "outra-coisa" }));
    const { dbGetAll } = await import(`../data/db.js?t=${Date.now()}-${Math.random()}`);
    assert.equal((await dbGetAll("invoices")).length, 1, "os dados originais não deviam ter sido tocados");
  });
});
