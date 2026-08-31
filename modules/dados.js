// Liberdade Fiscal — Módulo de UI "Os teus dados" (Auditoria 2026-08,
// hallazgo B-1: sem exportação/backup, o utilizador não tem forma de
// tirar cópia dos seus dados).
//
// Local-first significa que o utilizador é o único guardião dos seus
// dados — e por isso também tem de poder tirar uma cópia, mudar de
// dispositivo sem perder o histórico, ou apagar tudo com confiança de
// que "apagar" significa mesmo apagar. Este ecrã cobre as três coisas.
//
// Acesso: não está na navegação principal (5 itens já é o limite
// confortável a 320px, ver AUDITORIA-2026-08.md B-13 herdado da Fase
// 1) — está num link no footer, que já sobrevive a todas as trocas de
// rota (ver index.html).

import { exportarTodosDados, validarDadosImportacao, importarTodosDados } from "../data/db.js";

const LABELS_STORES = {
  invoices: "Faturas",
  periodicTaxes: "Taxas (IMI/IUC/ISV/IMT/Selo)",
  quizResults: "Resultados do quiz",
  userSettings: "Definições e período atual",
  taxParameterCache: "Cache de parâmetros fiscais",
  periodosFechados: "Histórico de períodos fechados",
};

export function render(container) {
  let state = {
    // "inicial" | "a-exportar" | "exportado" | "erro-exportar"
    // | "ficheiro-lido" | "erro-importar" | "a-importar" | "importado"
    // | "confirmar-apagar" | "a-apagar" | "apagado"
    fase: "inicial",
    erro: null,
    ficheiroValidado: null, // { dados, resumo } depois de ler+validar um ficheiro
    resumoImportado: null,
  };

  function draw() {
    container.innerHTML = "";

    const card = el("section", "card");
    card.setAttribute("aria-labelledby", "dados-heading");

    const heading = el("h1", null, "Os teus dados");
    heading.id = "dados-heading";
    heading.tabIndex = -1;

    const desc = el(
      "p",
      null,
      "Tudo o que introduzes fica só neste dispositivo, na base de dados local do navegador — nunca em nenhum servidor. Isso também significa que és o único responsável por não perderes o teu histórico: se limpares os dados do navegador, mudares de telemóvel, ou o próprio navegador apagar o armazenamento (o Safari é conhecido por fazer isto ao fim de dias sem usar a app), tudo desaparece sem recurso, a não ser que tenhas uma cópia."
    );

    card.append(heading, desc);
    container.append(card);

    container.append(drawExportar());
    container.append(drawImportar());
    container.append(drawApagar());

    focusHeading(heading);
  }

  function drawExportar() {
    const card = el("section", "card");
    const heading = el("h2", null, "Exportar");
    const desc = el("p", null, "Descarrega uma cópia de tudo — faturas, taxas, resultados do quiz e o teu período atual — num único ficheiro. Guarda-o onde quiseres (o teu email, uma pasta na nuvem, uma pen). É só teu.");

    const btn = el("button", "btn btn--primary", "Descarregar os meus dados (.json)");
    btn.type = "button";
    btn.addEventListener("click", exportar);

    const status = el("p", "disclaimer");
    status.setAttribute("role", "status");
    if (state.fase === "exportado") {
      status.textContent = "Ficheiro descarregado. Guarda-o num sítio seguro.";
    } else if (state.fase === "erro-exportar") {
      status.textContent = `Não foi possível exportar: ${state.erro}`;
      status.setAttribute("role", "alert");
    }

    card.append(heading, desc, btn);
    if (status.textContent) card.append(status);
    return card;
  }

  async function exportar() {
    state.fase = "a-exportar";
    try {
      const dados = await exportarTodosDados();
      const json = JSON.stringify(dados, null, 2);
      const blob = new Blob([json], { type: "application/json" });
      // Auditoria 23/08/2026 (equipa iOS/Android): o mesmo bug já
      // encontrado e corrigido em modules/dia-liberdade.js — o <a>
      // nunca ficava no DOM e o URL.revokeObjectURL() corria logo a
      // seguir ao click(), antes de o Android começar a ler o blob, o
      // que em vários Chrome/Android invalida o download a meio,
      // silenciosamente. Esta é a função de exportação/backup — a
      // funcionalidade mais crítica de robustez do B-1 original — por
      // isso o mesmo fix aplica-se aqui: link anexado ao DOM
      // (display:none) e revoke atrasado, dando tempo ao browser para
      // gravar o ficheiro.
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      const dataFicheiro = new Date().toISOString().slice(0, 10);
      link.download = `liberdade-fiscal-${dataFicheiro}.json`;
      link.style.display = "none";
      document.body.append(link);
      link.click();
      setTimeout(() => {
        link.remove();
        URL.revokeObjectURL(url);
      }, 4000);
      state.fase = "exportado";
    } catch (err) {
      state.fase = "erro-exportar";
      state.erro = err.message;
    }
    draw();
  }

  function drawImportar() {
    const card = el("section", "card");
    const heading = el("h2", null, "Importar");
    const desc = el(
      "p",
      null,
      "Restaura um ficheiro exportado anteriormente — por exemplo, ao mudares de telemóvel. Atenção: isto SUBSTITUI todos os dados que já tenhas neste dispositivo, não os junta."
    );
    card.append(heading, desc);

    if (state.fase === "ficheiro-lido" && state.ficheiroValidado) {
      const resumo = el("div", "info-note");
      const lista = document.createElement("ul");
      Object.entries(state.ficheiroValidado.resumo).forEach(([storeName, count]) => {
        if (count > 0) {
          lista.append(el("li", null, `${LABELS_STORES[storeName] || storeName}: ${count}`));
        }
      });
      if (!lista.children.length) {
        lista.append(el("li", null, "Este ficheiro não tem dados em nenhuma categoria."));
      }
      resumo.append(el("p", null, "Este ficheiro contém:"), lista);
      card.append(resumo);

      const confirmarBtn = el("button", "btn btn--primary", "Confirmar — substituir os meus dados atuais");
      confirmarBtn.type = "button";
      confirmarBtn.addEventListener("click", confirmarImportacao);

      const cancelarBtn = el("button", "btn btn--secondary", "Cancelar");
      cancelarBtn.type = "button";
      cancelarBtn.addEventListener("click", () => {
        state.fase = "inicial";
        state.ficheiroValidado = null;
        draw();
      });

      const botoes = el("div", "taximetro-botoes");
      botoes.append(confirmarBtn, cancelarBtn);
      card.append(botoes);
      return card;
    }

    const inputId = "dados-ficheiro-importar";
    const label = document.createElement("label");
    label.htmlFor = inputId;
    label.textContent = "Escolhe o ficheiro .json exportado";
    const input = document.createElement("input");
    input.type = "file";
    input.id = inputId;
    input.accept = "application/json,.json";
    input.addEventListener("change", (e) => lerFicheiro(e.target.files?.[0]));

    const field = el("div", "taximetro-field");
    field.append(label, input);
    card.append(field);

    const status = el("p", "disclaimer");
    if (state.fase === "erro-importar") {
      status.setAttribute("role", "alert");
      status.textContent = `Não foi possível ler este ficheiro: ${state.erro}`;
      card.append(status);
    } else if (state.fase === "importado") {
      status.setAttribute("role", "status");
      status.textContent = "Dados importados com sucesso. Já podes navegar para as outras secções.";
      card.append(status);
    }

    return card;
  }

  function lerFicheiro(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const dados = JSON.parse(String(reader.result));
        const validacao = validarDadosImportacao(dados);
        if (!validacao.ok) {
          state.fase = "erro-importar";
          state.erro = validacao.erro;
        } else {
          state.fase = "ficheiro-lido";
          state.ficheiroValidado = { dados, resumo: validacao.resumo };
        }
      } catch {
        state.fase = "erro-importar";
        state.erro = "o ficheiro não é um JSON válido.";
      }
      draw();
    };
    reader.onerror = () => {
      state.fase = "erro-importar";
      state.erro = "não foi possível ler o ficheiro.";
      draw();
    };
    reader.readAsText(file);
  }

  async function confirmarImportacao() {
    if (!state.ficheiroValidado) return;
    state.fase = "a-importar";
    try {
      await importarTodosDados(state.ficheiroValidado.dados);
      state.fase = "importado";
      state.ficheiroValidado = null;
    } catch (err) {
      state.fase = "erro-importar";
      state.erro = err.message;
      state.ficheiroValidado = null;
    }
    draw();
  }

  function drawApagar() {
    const card = el("section", "card");
    const heading = el("h2", null, "Apagar tudo");

    if (state.fase === "confirmar-apagar") {
      const aviso = el(
        "p",
        null,
        "De certeza? Isto apaga TODOS os teus dados neste dispositivo — faturas, taxas, quiz, período atual e histórico. Não há forma de desfazer, a não ser que já tenhas exportado uma cópia."
      );
      aviso.setAttribute("role", "alert");
      const simBtn = el("button", "btn btn--secondary", "Sim, apagar tudo");
      simBtn.type = "button";
      simBtn.addEventListener("click", apagarTudo);
      const naoBtn = el("button", "btn btn--primary", "Cancelar");
      naoBtn.type = "button";
      naoBtn.addEventListener("click", () => {
        state.fase = "inicial";
        draw();
      });
      const botoes = el("div", "taximetro-botoes");
      botoes.append(naoBtn, simBtn);
      card.append(heading, aviso, botoes);
      return card;
    }

    const desc = el("p", null, "Remove definitivamente todos os teus dados deste dispositivo. Útil se emprestares o telemóvel a alguém ou quiseres começar do zero.");
    const btn = el("button", "btn btn--secondary", "Apagar todos os meus dados");
    btn.type = "button";
    btn.addEventListener("click", () => {
      state.fase = "confirmar-apagar";
      draw();
    });
    card.append(heading, desc, btn);

    if (state.fase === "apagado") {
      const status = el("p", "disclaimer", "Todos os dados foram apagados deste dispositivo.");
      status.setAttribute("role", "status");
      card.append(status);
    }
    return card;
  }

  async function apagarTudo() {
    state.fase = "a-apagar";
    try {
      // Reutiliza importarTodosDados com um ficheiro "vazio" válido —
      // limpa todos os stores num só sítio, sem duplicar a lógica de
      // "para cada store, limpar" que já existe em data/db.js.
      await importarTodosDados({
        formato: "liberdade-fiscal-export",
        stores: {},
      });
      state.fase = "apagado";
    } catch (err) {
      state.fase = "erro-importar";
      state.erro = err.message;
    }
    draw();
  }

  draw();

  return {
    destroy() {
      container.innerHTML = "";
    },
  };
}

function el(tag, className, textContent) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (textContent !== undefined) node.textContent = textContent;
  return node;
}

function focusHeading(headingEl) {
  if (headingEl) headingEl.focus({ preventScroll: false });
}
