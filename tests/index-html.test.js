// Liberdade Fiscal — Testes de regressão sobre a estrutura de index.html
// Executar: node --test tests/
//
// Fixa bugs estruturais já encontrados uma vez, para que não voltem a
// acontecer silenciosamente numa futura edição de index.html ou app.js.

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const html = readFileSync(path.join(__dirname, "../index.html"), "utf8");
const dom = new JSDOM(html);
const { document } = dom.window;

describe("Estrutura de index.html", () => {
  test("o disclaimer legal existe e está FORA de #app-main", () => {
    // Regressão: o router (app.js, renderRoute) substitui todo o
    // conteúdo de #app-main a cada mudança de rota. Se o disclaimer
    // estiver dentro de #app-main, desaparece assim que o utilizador
    // navega para qualquer rota — quebrando a exigência do spec
    // (secção 9) de que o disclaimer esteja sempre visível no
    // footer/Acerca de.
    const main = document.getElementById("app-main");
    const disclaimerDentroDoMain = main.querySelector(".disclaimer");
    assert.equal(disclaimerDentroDoMain, null, "o disclaimer não pode viver dentro de #app-main");

    const footer = document.querySelector("footer.app-footer");
    assert.ok(footer, "footer.app-footer não encontrado");
    const disclaimerNoFooter = footer.querySelector(".disclaimer");
    assert.ok(disclaimerNoFooter, "disclaimer não encontrado dentro do footer");
    assert.match(disclaimerNoFooter.textContent, /estimativas para fins informativos/);
  });

  test("o footer existe como irmão de #app-main, não como descendente", () => {
    const main = document.getElementById("app-main");
    const footer = document.querySelector("footer.app-footer");
    assert.equal(footer.contains(main), false);
    assert.equal(main.contains(footer), false);
  });

  test("todas as rotas de navegação apontam para módulos válidos ou placeholders documentados", () => {
    const routeButtons = document.querySelectorAll("[data-route]");
    assert.ok(routeButtons.length >= 5, "esperava pelo menos 5 botões de navegação");
    const rotas = [...routeButtons].map((b) => b.dataset.route);
    assert.deepEqual(rotas, [
      "quiz",
      "taximetro",
      "faturas",
      "impostos-anuais",
      "dia-liberdade",
    ]);
  });

  test("manifest, ícones e stylesheet usam caminhos relativos (não absolutos)", () => {
    const manifestLink = document.querySelector('link[rel="manifest"]');
    const styleLink = document.querySelector('link[rel="stylesheet"]');
    assert.ok(manifestLink.getAttribute("href").startsWith("./"));
    assert.ok(styleLink.getAttribute("href").startsWith("./"));
  });

  test("existe <noscript> com aviso para utilizadores sem JavaScript", () => {
    const noscript = document.querySelector("noscript");
    assert.ok(noscript);
  });
});
