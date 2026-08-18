// Liberdade Fiscal — Fallback foto+IA para registo de faturas (Fase 5 /
// roadmap P3-17, 18/08/2026)
//
// Spec §6.3: "Foto + IA: fallback, solo cuando no hay QR ni se quiere
// teclear ... Debe mostrarse aviso claro: la imagen se procesa de
// forma temporal para extraer texto y no se almacena en ningún
// servidor."
//
// Mesmo padrão de modules/faturas-qr.js: componente autónomo,
// controlado por callbacks (`onDadosExtraidos`/`onCancelar`), NÃO
// importado pelo router nem por modules/faturas.js — fica fora da
// navegação ativa até o autor decidir publicar o worker e ativar este
// "modo avançado". Ver data/ocr-client.js para a lógica de rede pura.
//
// Funciona sem o worker estar publicado: se `workerUrl` não for
// passado, o ecrã mostra-o claramente como indisponível em vez de
// tentar (e falhar) um pedido de rede — ver renderIndisponivel().

import { ficheiroParaBase64, validarImagem, chamarWorkerOCR } from "../data/ocr-client.js";

/**
 * @param {HTMLElement} container
 * @param {{
 *   workerUrl?: string|null,
 *   onDadosExtraidos: (dados: object) => void,
 *   onCancelar: () => void,
 * }} opcoes
 */
export function render(container, { workerUrl = null, onDadosExtraidos, onCancelar }) {
  container.innerHTML = "";

  if (!workerUrl) {
    return renderIndisponivel(container, { onCancelar });
  }

  const card = el("section", "card");
  card.setAttribute("aria-labelledby", "foto-ocr-heading");

  const heading = el("h1", null, "Ler fatura por foto");
  heading.id = "foto-ocr-heading";
  heading.tabIndex = -1;

  const aviso = el(
    "p",
    "disclaimer",
    "A imagem é enviada para um serviço externo (Groq/Claude Vision, via Cloudflare Worker) só para extrair o texto — é processada de forma temporária e não fica guardada em nenhum servidor. É o único ponto desta app onde dados saem do teu dispositivo."
  );

  const form = el("form");
  form.noValidate = true;

  const campoLabel = document.createElement("label");
  campoLabel.htmlFor = "foto-ocr-input";
  campoLabel.textContent = "Foto da fatura ou recibo";

  const input = document.createElement("input");
  input.type = "file";
  input.id = "foto-ocr-input";
  input.accept = "image/jpeg,image/png,image/webp";
  input.setAttribute("capture", "environment");

  form.append(campoLabel, input);

  let erroEl = null;
  let estadoEl = null;

  const analisarBtn = el("button", "btn btn--primary", "Analisar foto");
  analisarBtn.type = "submit";

  const cancelarBtn = el("button", "btn btn--secondary", "Cancelar");
  cancelarBtn.type = "button";
  cancelarBtn.addEventListener("click", () => onCancelar());

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    limparMensagens();

    const ficheiro = input.files && input.files[0];
    const validacao = validarImagem(ficheiro);
    if (!validacao.ok) {
      mostrarErro(validacao.erro);
      return;
    }

    analisarBtn.disabled = true;
    mostrarEstado("A analisar a imagem…");

    try {
      const imageBase64 = await ficheiroParaBase64(ficheiro);
      const extraido = await chamarWorkerOCR({
        workerUrl,
        imageBase64,
        mimeType: ficheiro.type,
      });

      limparMensagens();
      onDadosExtraidos({
        estabelecimento: extraido?.estabelecimento ?? null,
        data: extraido?.data ?? null,
        valorTotal: typeof extraido?.valor_total === "number" ? extraido.valor_total : null,
        confianca: extraido?.confianca ?? "baixa",
        raw: extraido,
      });
    } catch (err) {
      mostrarErro(
        `${err.message} Também podes registar esta despesa manualmente, sem foto.`
      );
    } finally {
      analisarBtn.disabled = false;
    }
  });

  function mostrarEstado(msg) {
    estadoEl = el("p", null, msg);
    estadoEl.setAttribute("role", "status");
    form.append(estadoEl);
  }

  function mostrarErro(msg) {
    erroEl = el("p", "form-error", msg);
    erroEl.setAttribute("role", "alert");
    form.append(erroEl);
  }

  function limparMensagens() {
    if (erroEl) {
      erroEl.remove();
      erroEl = null;
    }
    if (estadoEl) {
      estadoEl.remove();
      estadoEl = null;
    }
  }

  form.append(analisarBtn, cancelarBtn);
  card.append(heading, aviso, form);
  container.append(card);
  heading.focus({ preventScroll: false });

  return {
    destroy() {
      container.innerHTML = "";
    },
  };
}

function renderIndisponivel(container, { onCancelar }) {
  const card = el("section", "card");
  card.setAttribute("aria-labelledby", "foto-ocr-indisponivel-heading");

  const heading = el("h1", null, "Ler fatura por foto");
  heading.id = "foto-ocr-indisponivel-heading";
  heading.tabIndex = -1;

  const aviso = el(
    "p",
    null,
    "Esta funcionalidade ainda não está disponível — requer um serviço externo que o autor ainda não publicou. Regista a despesa manualmente, ou usa o atalho de código QR."
  );

  const voltarBtn = el("button", "btn btn--secondary", "Voltar");
  voltarBtn.type = "button";
  voltarBtn.addEventListener("click", () => onCancelar());

  card.append(heading, aviso, voltarBtn);
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
