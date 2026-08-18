// Liberdade Fiscal — Cliente do fallback foto+IA (Fase 5 / roadmap P3-17)
//
// Spec §6.3: "Foto + IA: fallback, solo cuando no hay QR ni se quiere
// teclear. Único punto de la app con salida de datos a terceros
// (Cloudflare Worker → Groq/Claude Vision)."
//
// Este ficheiro implementa só o lado do CLIENTE desta chamada — as
// funções puras que preparam a imagem e falam com o worker. Não toca
// no DOM (isso vive em modules/faturas-foto-ocr.js) e não sabe nada
// sobre onde guardar o resultado (isso é decisão de quem chama).
//
// ESTADO (roadmap P3-17, 18/08/2026): o worker (worker/ocr-fatura.js)
// continua por publicar — ver a nota "AINDA NÃO DESPLOYADO" no topo
// desse ficheiro. Este cliente foi escrito e testado (com fetch
// mockado) contra o contrato desse worker, para que o dia em que o
// autor publicar o worker (conta Cloudflare, wrangler, secret
// GROQ_API_KEY) baste configurar `workerUrl` — sem reescrever nada
// aqui. Até lá, `chamarWorkerOCR()` funciona, mas contra um endpoint
// que não existe: quem chama deve tratar isso como "funcionalidade
// ainda não disponível", não como um bug (ver
// modules/faturas-foto-ocr.js, que já faz exatamente isto).

export const MAX_IMAGE_BYTES = 6 * 1024 * 1024; // 6 MB — igual ao limite do worker
export const MIME_TYPES_SUPORTADOS = ["image/jpeg", "image/png", "image/webp"];

/**
 * Converte um File/Blob de imagem para uma string base64 "pura" (sem o
 * prefixo "data:image/...;base64,"), tal como o worker espera no campo
 * `imageBase64` do corpo do pedido.
 *
 * @param {File|Blob} ficheiro
 * @returns {Promise<string>}
 */
export function ficheiroParaBase64(ficheiro) {
  return new Promise((resolve, reject) => {
    if (!ficheiro || typeof ficheiro.size !== "number") {
      reject(new TypeError("ficheiroParaBase64 espera um File ou Blob."));
      return;
    }

    const leitor = new FileReader();
    leitor.onerror = () => reject(new Error("Não foi possível ler o ficheiro de imagem."));
    leitor.onload = () => {
      const resultado = String(leitor.result || "");
      const virgula = resultado.indexOf(",");
      resolve(virgula >= 0 ? resultado.slice(virgula + 1) : resultado);
    };
    leitor.readAsDataURL(ficheiro);
  });
}

/**
 * Valida localmente um ficheiro de imagem antes de sequer tentar
 * enviá-lo — evita um pedido de rede condenado a falhar (imagem
 * demasiado grande ou tipo não suportado) e dá feedback imediato.
 *
 * @param {File|Blob} ficheiro
 * @returns {{ ok: true } | { ok: false, erro: string }}
 */
export function validarImagem(ficheiro) {
  if (!ficheiro) {
    return { ok: false, erro: "Nenhuma imagem selecionada." };
  }
  if (ficheiro.type && !MIME_TYPES_SUPORTADOS.includes(ficheiro.type)) {
    return { ok: false, erro: "Formato não suportado. Usa uma foto JPEG, PNG ou WebP." };
  }
  if (typeof ficheiro.size === "number" && ficheiro.size > MAX_IMAGE_BYTES) {
    return { ok: false, erro: "Imagem demasiado grande (máx. 6 MB) — tira a foto com menos zoom ou resolução." };
  }
  return { ok: true };
}

/**
 * Chama o worker de OCR de fatura. Espelha exatamente o contrato de
 * worker/ocr-fatura.js: POST { imageBase64, mimeType } → { ok, extraido, fonte, nota }.
 *
 * @param {{
 *   workerUrl: string,
 *   imageBase64: string,
 *   mimeType: string,
 *   fetchImpl?: typeof fetch,
 * }} opcoes
 * @returns {Promise<{
 *   estabelecimento: string|null,
 *   data: string|null,
 *   valor_total: number|null,
 *   moeda: string,
 *   confianca: "alta"|"media"|"baixa",
 *   texto_bruto_relevante: string,
 * }>}
 */
export async function chamarWorkerOCR({ workerUrl, imageBase64, mimeType, fetchImpl }) {
  if (!workerUrl || typeof workerUrl !== "string") {
    throw new Error(
      "Esta funcionalidade ainda não está disponível: o worker de foto+IA não está configurado/publicado."
    );
  }
  if (!imageBase64 || typeof imageBase64 !== "string") {
    throw new TypeError("imageBase64 em falta.");
  }
  if (!mimeType || !MIME_TYPES_SUPORTADOS.includes(mimeType)) {
    throw new TypeError(`mimeType inválido: ${mimeType}`);
  }

  const doFetch = fetchImpl || (typeof fetch !== "undefined" ? fetch : null);
  if (!doFetch) {
    throw new Error("fetch não está disponível neste ambiente.");
  }

  let response;
  try {
    response = await doFetch(workerUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ imageBase64, mimeType }),
    });
  } catch {
    // Falha de rede (worker não publicado, offline, CORS bloqueado,
    // etc.) — mensagem genérica e acionável, nunca o erro técnico bruto.
    throw new Error(
      "Não foi possível contactar o serviço de leitura de fatura. Verifica a tua ligação, ou regista a despesa manualmente."
    );
  }

  let corpo;
  try {
    corpo = await response.json();
  } catch {
    throw new Error("O serviço de leitura de fatura devolveu uma resposta inválida.");
  }

  if (!response.ok || !corpo?.ok) {
    throw new Error(corpo?.error || "Não foi possível processar a imagem. Tenta novamente ou introduz os dados manualmente.");
  }

  return corpo.extraido;
}
