// Liberdade Fiscal — testes de data/ocr-client.js (roadmap P3-17)
// Executar: node --test tests/

import { test, describe, before } from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";

import {
  MAX_IMAGE_BYTES,
  MIME_TYPES_SUPORTADOS,
  ficheiroParaBase64,
  validarImagem,
  chamarWorkerOCR,
} from "../data/ocr-client.js";

before(() => {
  const dom = new JSDOM("<!DOCTYPE html><html><body></body></html>", { url: "http://localhost/" });
  global.window = dom.window;
  global.document = dom.window.document;
  global.File = dom.window.File;
  global.Blob = dom.window.Blob;
  global.FileReader = dom.window.FileReader;
});

describe("data/ocr-client.js — validarImagem()", () => {
  test("rejeita quando não há ficheiro", () => {
    const resultado = validarImagem(null);
    assert.equal(resultado.ok, false);
  });

  test("rejeita tipo MIME não suportado", () => {
    const ficheiro = new File(["conteudo"], "fatura.gif", { type: "image/gif" });
    const resultado = validarImagem(ficheiro);
    assert.equal(resultado.ok, false);
    assert.match(resultado.erro, /Formato não suportado/);
  });

  test("rejeita ficheiro maior que MAX_IMAGE_BYTES", () => {
    const ficheiroGrande = { type: "image/jpeg", size: MAX_IMAGE_BYTES + 1 };
    const resultado = validarImagem(ficheiroGrande);
    assert.equal(resultado.ok, false);
    assert.match(resultado.erro, /demasiado grande/);
  });

  test("aceita um JPEG dentro do limite", () => {
    const ficheiro = new File(["conteudo"], "fatura.jpg", { type: "image/jpeg" });
    const resultado = validarImagem(ficheiro);
    assert.equal(resultado.ok, true);
  });

  test("MIME_TYPES_SUPORTADOS inclui jpeg/png/webp", () => {
    assert.deepEqual(MIME_TYPES_SUPORTADOS, ["image/jpeg", "image/png", "image/webp"]);
  });
});

describe("data/ocr-client.js — ficheiroParaBase64()", () => {
  test("devolve a parte base64 sem o prefixo data:", async () => {
    const ficheiro = new File(["ola"], "fatura.jpg", { type: "image/jpeg" });
    const base64 = await ficheiroParaBase64(ficheiro);
    assert.equal(typeof base64, "string");
    assert.ok(base64.length > 0);
    assert.ok(!base64.startsWith("data:"));
  });

  test("rejeita quando não recebe um File/Blob", async () => {
    await assert.rejects(() => ficheiroParaBase64(null), TypeError);
  });
});

describe("data/ocr-client.js — chamarWorkerOCR()", () => {
  test("rejeita quando workerUrl não está configurado (worker por publicar)", async () => {
    await assert.rejects(
      () => chamarWorkerOCR({ workerUrl: null, imageBase64: "abc", mimeType: "image/jpeg" }),
      /ainda não está disponível/
    );
  });

  test("rejeita imageBase64 em falta", async () => {
    await assert.rejects(
      () => chamarWorkerOCR({ workerUrl: "https://worker.example/ocr", imageBase64: "", mimeType: "image/jpeg" }),
      TypeError
    );
  });

  test("rejeita mimeType inválido", async () => {
    await assert.rejects(
      () =>
        chamarWorkerOCR({
          workerUrl: "https://worker.example/ocr",
          imageBase64: "abc",
          mimeType: "application/pdf",
        }),
      TypeError
    );
  });

  test("devolve extraido quando o worker responde ok", async () => {
    const extraidoEsperado = { estabelecimento: "Padaria X", data: "2026-08-18", valor_total: 3.5, confianca: "alta" };
    const fetchImpl = async () => ({
      ok: true,
      json: async () => ({ ok: true, extraido: extraidoEsperado }),
    });

    const extraido = await chamarWorkerOCR({
      workerUrl: "https://worker.example/ocr",
      imageBase64: "abc",
      mimeType: "image/jpeg",
      fetchImpl,
    });

    assert.deepEqual(extraido, extraidoEsperado);
  });

  test("propaga a mensagem de erro do worker quando a resposta não é ok", async () => {
    const fetchImpl = async () => ({
      ok: false,
      json: async () => ({ error: "Demasiados pedidos neste momento. Tenta novamente dentro de alguns minutos." }),
    });

    await assert.rejects(
      () =>
        chamarWorkerOCR({
          workerUrl: "https://worker.example/ocr",
          imageBase64: "abc",
          mimeType: "image/jpeg",
          fetchImpl,
        }),
      /Demasiados pedidos/
    );
  });

  test("dá uma mensagem genérica e acionável quando a rede falha", async () => {
    const fetchImpl = async () => {
      throw new Error("network down — detalhe técnico interno que não deve chegar ao utilizador");
    };

    await assert.rejects(
      () =>
        chamarWorkerOCR({
          workerUrl: "https://worker.example/ocr",
          imageBase64: "abc",
          mimeType: "image/jpeg",
          fetchImpl,
        }),
      /Não foi possível contactar o serviço/
    );
  });
});
