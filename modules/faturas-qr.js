// Liberdade Fiscal — Atalho QR para registo de faturas (Fase 5, task #47)
//
// Spec §6.3: "QR: opcional, atajo secundario. Lectura 100% en cliente
// ... parseando el código estructurado que ya llevan las facturas
// portuguesas por ley. Sin servidor, sin envío de datos."
//
// Esta versão implementa a colagem manual do texto do código QR (o
// utilizador copia o texto lido por qualquer leitor de QR do sistema,
// ou pela câmara do telemóvel via a funcionalidade nativa de OS) e
// analisa-o localmente com data/qr-parser.js — zero rede, zero
// servidor, exatamente como o spec exige. A leitura por câmara em
// direto (via jsQR) fica marcada como melhoria futura (não bloqueante
// para o MVP, já que o texto pode sempre ser colado manualmente).

import { parseInvoiceQR } from "../data/qr-parser.js";

/**
 * @param {HTMLElement} container
 * @param {{ regiao: string, onDadosLidos: (dados: object) => void, onCancelar: () => void }} opcoes
 */
export function render(container, { regiao, onDadosLidos, onCancelar }) {
  container.innerHTML = "";

  const card = el("section", "card");
  card.setAttribute("aria-labelledby", "qr-heading");

  const heading = el("h1", null, "Ler código QR da fatura");
  heading.id = "qr-heading";
  heading.tabIndex = -1;

  const instrucoes = el(
    "p",
    null,
    "Cola aqui o texto do código QR da tua fatura. A leitura acontece só neste dispositivo — nada é enviado para nenhum servidor."
  );

  const form = el("form");
  form.noValidate = true;

  const campoLabel = document.createElement("label");
  campoLabel.htmlFor = "qr-texto";
  campoLabel.textContent = "Texto do código QR";

  const textarea = document.createElement("textarea");
  textarea.id = "qr-texto";
  textarea.rows = 4;
  textarea.setAttribute(
    "placeholder",
    "A:123456789*B:987654321*C:PT*..."
  );

  form.append(campoLabel, textarea);

  let erroEl = null;

  const analisarBtn = el("button", "btn btn--primary", "Analisar código");
  analisarBtn.type = "submit";

  const cancelarBtn = el("button", "btn btn--secondary", "Cancelar");
  cancelarBtn.type = "button";
  cancelarBtn.addEventListener("click", () => onCancelar());

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    if (erroEl) {
      erroEl.remove();
      erroEl = null;
    }

    const texto = textarea.value.trim();
    if (!texto) {
      mostrarErro("Cola o texto do código QR antes de continuar.");
      return;
    }

    const resultado = parseInvoiceQR(texto);
    if (!resultado.ok) {
      mostrarErro(
        `Não foi possível ler este código: ${resultado.error || "formato não reconhecido"}. ` +
          "Verifica se copiaste o texto completo, ou regista a despesa manualmente."
      );
      return;
    }

    onDadosLidos({
      valorTotal: resultado.totalDocumento ?? null,
      totalImpostos: resultado.totalImpostos ?? null,
      data: resultado.data ?? null,
      regiaoSugerida: resultado.espacosFiscais?.[0]?.regiao ?? regiao,
      raw: resultado,
    });
  });

  function mostrarErro(msg) {
    erroEl = el("p", "form-error", msg);
    erroEl.setAttribute("role", "alert");
    form.append(erroEl);
  }

  form.append(analisarBtn, cancelarBtn);
  card.append(heading, instrucoes, form);
  container.append(card);
  heading.focus({ preventScroll: false });

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
