// Liberdade Fiscal — Testes do parser de QR de faturas (Fase 5)
// Executar: node --test tests/
//
// Os 4 fixtures abaixo são os exemplos OFICIAIS literais da Portaria
// n.º 195/2020 (secção 5, "Exemplos de construção do código QR"), lidos
// diretamente do PDF técnico da AT — não são inventados nem
// parafraseados. Isto permite verificar o parser contra a fonte
// primária, não contra a nossa própria interpretação dela.

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { parseInvoiceQR } from "../data/qr-parser.js";

// Exemplo 1 — Fatura, com 3 espaços fiscais (PT, PT-AC, PT-MA)
const EXEMPLO_1_FATURA =
  "A:123456789*B:999999990*C:PT*D:FT*E:N*F:20191231*G:FT AB2019/0035*H:CSDF7T5H0035*I1:PT*I2:12000.00*I3:15000.00*I4:900.00*I5:50000.00*I6:6500.00*I7:80000.00*I8:18400.00*J1:PTAC*J2:10000.00*J3:25000.56*J4:1000.02*J5:75000.00*J6:6750.00*J7:100000.00*J8:18000.00*K1:PTMA*K2:5000.00*K3:12500.00*K4:625.00*K5:25000.00*K6:3000.00*K7:40000.00*K8:8800.00*L:100.00*M:25.00*N:64000.02*O:513600.58*P:100.00*Q:kLp0*R:9999*S:TB;PT00000000000000000000000;513500.58";

// Exemplo 2 — Fatura simplificada, só espaço fiscal PT
const EXEMPLO_2_FATURA_SIMPLIFICADA =
  "A:123456789*B:999999990*C:PT*D:FS*E:N*F:20190812*G:FS CDVF/12345*H:CDF7T5HD12345*I1:PT*I7:0.65*I8:0.15*N:0.15*O:0.80*Q:YhGV*R:9999*S:NU;0.80";

// Exemplo 3 — Fatura pró-forma
const EXEMPLO_3_PRO_FORMA =
  "A:500000000*B:123456789*C:PT*D:PF*E:N*F:20190123*G:PF G2019CB/145789*H:HB6FT7RV145789*I1:PT*I2:12345.34*I3:12532.65*I4:751.96*I5:52789.00*I6:6862.57*I7:32425.69*I8:7457.91*N:15072.44*O:125165.12*Q:r/fY*R:9999";

// Exemplo 4 — Documento de transporte, sem valor (I1:0)
const EXEMPLO_4_TRANSPORTE =
  "A:500000000*B:123456789*C:PT*D:GT*E:N*F:20190720*G:GT G234CB/50987*H:GTVX4Y8B-50987*I1:0*N:0.00*O:0.00*Q:5uIg*R:9999";

describe("parseInvoiceQR — fixtures oficiais da Portaria 195/2020", () => {
  test("Exemplo 1 (Fatura): campos de identificação básicos", () => {
    const r = parseInvoiceQR(EXEMPLO_1_FATURA);
    assert.equal(r.ok, true);
    assert.equal(r.emitenteNIF, "123456789");
    assert.equal(r.adquirenteNIF, "999999990");
    assert.equal(r.tipoDocumento, "FT");
    assert.equal(r.data, "2019-12-31");
    assert.equal(r.totalDocumento, 513600.58);
    assert.equal(r.totalImpostos, 64000.02);
  });

  test("Exemplo 1: reconhece os três espaços fiscais (Continente, Açores, Madeira)", () => {
    const r = parseInvoiceQR(EXEMPLO_1_FATURA);
    assert.equal(r.espacosFiscais.length, 3);

    const continente = r.espacosFiscais.find((e) => e.codigoEspacoFiscal === "PT");
    assert.equal(continente.regiao, "continente");
    assert.equal(continente.baseNormal, 80000.0);
    assert.equal(continente.ivaNormal, 18400.0);

    const acores = r.espacosFiscais.find((e) => e.codigoEspacoFiscal === "PTAC");
    assert.equal(acores.regiao, "acores");
    assert.equal(acores.baseReduzida, 25000.56);

    const madeira = r.espacosFiscais.find((e) => e.codigoEspacoFiscal === "PTMA");
    assert.equal(madeira.regiao, "madeira");
    assert.equal(madeira.ivaIntermedia, 3000.0);
  });

  test("Exemplo 2 (Fatura simplificada): valores pequenos e um único espaço fiscal", () => {
    const r = parseInvoiceQR(EXEMPLO_2_FATURA_SIMPLIFICADA);
    assert.equal(r.ok, true);
    assert.equal(r.tipoDocumento, "FS");
    assert.equal(r.espacosFiscais.length, 1);
    assert.equal(r.espacosFiscais[0].baseNormal, 0.65);
    assert.equal(r.espacosFiscais[0].ivaNormal, 0.15);
    assert.equal(r.totalDocumento, 0.8);
  });

  test("Exemplo 3 (Fatura pró-forma): as três taxas de IVA presentes no mesmo espaço fiscal", () => {
    const r = parseInvoiceQR(EXEMPLO_3_PRO_FORMA);
    assert.equal(r.ok, true);
    const pt = r.espacosFiscais[0];
    assert.equal(pt.baseIsenta, 12345.34);
    assert.equal(pt.baseReduzida, 12532.65);
    assert.equal(pt.baseIntermedia, 52789.0);
    assert.equal(pt.baseNormal, 32425.69);
    assert.equal(r.totalDocumento, 125165.12);
  });

  test("Exemplo 4 (Documento de transporte): I1:0 sem valores associados, não rebenta", () => {
    const r = parseInvoiceQR(EXEMPLO_4_TRANSPORTE);
    assert.equal(r.ok, true);
    assert.equal(r.espacosFiscais.length, 1);
    assert.equal(r.espacosFiscais[0].codigoEspacoFiscal, "0");
    assert.equal(r.espacosFiscais[0].regiao, null); // "0" não mapeia para nenhuma região
    assert.equal(r.totalDocumento, 0);
  });
});

describe("parseInvoiceQR — robustez e casos de erro", () => {
  test("texto vazio devolve erro sem rebentar", () => {
    const r = parseInvoiceQR("");
    assert.equal(r.ok, false);
  });

  test("texto que não é um QR de fatura (falta campos obrigatórios) devolve erro claro", () => {
    const r = parseInvoiceQR("isto nao e um qr valido");
    assert.equal(r.ok, false);
    assert.match(r.error, /Campos obrigatórios em falta/);
  });

  test("aceita input não-string sem rebentar", () => {
    assert.equal(parseInvoiceQR(null).ok, false);
    assert.equal(parseInvoiceQR(undefined).ok, false);
    assert.equal(parseInvoiceQR(12345).ok, false);
  });

  test("campos malformados (sem ':') são ignorados, não fazem o parser rebentar", () => {
    const r = parseInvoiceQR(EXEMPLO_2_FATURA_SIMPLIFICADA + "*CAMPO_SEM_DOIS_PONTOS");
    assert.equal(r.ok, true);
  });

  test("formato de data AAAAMMDD é convertido para AAAA-MM-DD", () => {
    const r = parseInvoiceQR(EXEMPLO_1_FATURA);
    assert.equal(r.data, "2019-12-31");
  });
});
