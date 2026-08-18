// Liberdade Fiscal — Cloudflare Worker: OCR de fatura por foto (fallback)
//
// Spec §6.3: "Foto + IA: fallback, solo cuando no hay QR ni se quiere
// teclear. Único punto de la app con salida de datos a terceros
// (Cloudflare Worker → Groq/Claude Vision). Debe mostrarse aviso claro:
// la imagen se procesa de forma temporal para extraer texto y no se
// almacena en ningún servidor."
//
// GARANTIAS DE PRIVACIDADE DESTE WORKER (não negociáveis, spec §9):
//   1. Não escreve a imagem nem o resultado em nenhum storage (sem KV,
//      sem R2, sem D1, sem logs com o conteúdo da imagem).
//   2. Processamento efémero: a imagem só existe na memória do pedido
//      em curso, e é descartada assim que a resposta é enviada.
//   3. Sem autenticação de utilizador, sem cookies, sem tracking —
//      é um proxy stateless para a API de visão.
//   4. CORS restrito à origem da app (ver ALLOWED_ORIGIN abaixo).
//
// ESTADO: código escrito e pronto a rever, mas AINDA NÃO DESPLOYADO.
// Requer: conta Cloudflare do autor, `wrangler` CLI, e um secret
// GROQ_API_KEY (ou ANTHROPIC_API_KEY, ver nota no fim do ficheiro).
// Ver worker/README.md para o passo a passo de deployment.

const ALLOWED_ORIGIN = "https://delfos-iq.github.io"; // ajustar ao domínio real de produção
const MAX_IMAGE_BYTES = 6 * 1024 * 1024; // 6 MB — generoso para uma foto de recibo comprimida

const SYSTEM_PROMPT = `Extrais dados estruturados de fotografias de faturas/recibos portugueses.
Responde APENAS com um objeto JSON válido, sem markdown, sem texto à volta, com exatamente estes campos:
{
  "estabelecimento": string ou null,
  "data": string "AAAA-MM-DD" ou null,
  "valor_total": number ou null,
  "moeda": "EUR",
  "confianca": "alta" | "media" | "baixa",
  "texto_bruto_relevante": string (as linhas do recibo onde encontraste estes dados)
}
Se não conseguires ler algum campo com confiança, usa null nesse campo em vez de adivinhar.
Nunca inventes valores. Nunca incluas dados pessoais do comprador que não sejam necessários (NIF do adquirente, morada) no texto_bruto_relevante.`;

export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin");

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders(origin) });
    }

    if (request.method !== "POST") {
      return jsonResponse({ error: "Método não suportado. Usa POST." }, 405, origin);
    }

    if (origin && origin !== ALLOWED_ORIGIN && !isLocalDev(origin)) {
      return jsonResponse({ error: "Origem não autorizada." }, 403, origin);
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return jsonResponse({ error: "Corpo do pedido tem de ser JSON." }, 400, origin);
    }

    const { imageBase64, mimeType } = body || {};
    if (!imageBase64 || typeof imageBase64 !== "string") {
      return jsonResponse({ error: "Campo 'imageBase64' em falta ou inválido." }, 400, origin);
    }
    if (!mimeType || !["image/jpeg", "image/png", "image/webp"].includes(mimeType)) {
      return jsonResponse({ error: "Campo 'mimeType' inválido. Usa image/jpeg, image/png ou image/webp." }, 400, origin);
    }

    const approxBytes = Math.ceil((imageBase64.length * 3) / 4);
    if (approxBytes > MAX_IMAGE_BYTES) {
      return jsonResponse({ error: "Imagem demasiado grande (máx. 6 MB)." }, 413, origin);
    }

    if (!env.GROQ_API_KEY) {
      return jsonResponse(
        { error: "Worker mal configurado: falta o secret GROQ_API_KEY. Ver worker/README.md." },
        500,
        origin
      );
    }

    try {
      const extraido = await chamarGroqVision({
        apiKey: env.GROQ_API_KEY,
        model: env.OCR_MODEL || "llama-3.2-11b-vision-preview",
        imageBase64,
        mimeType,
      });

      // Resposta devolvida diretamente ao cliente — nada é persistido
      // neste worker. O cliente é que decide (ecrã de confirmação
      // manual, spec §6.3/§5) se guarda isto como Invoice.
      return jsonResponse(
        { ok: true, extraido, fonte: "groq-vision", nota: "Processamento efémero — nada foi guardado no servidor." },
        200,
        origin
      );
    } catch (err) {
      // Mitigação M-3 (AUDITORIA-2026-08.md, roadmap P2-11): o detalhe
      // completo do erro upstream (que pode incluir informação interna
      // da integração com a Groq) fica só no log do lado do worker,
      // nunca é devolvido ao cliente. Ver chamarGroqVision() abaixo,
      // que já limita a mensagem lançada a um resumo curto e sem a
      // resposta bruta da API.
      console.error("Erro ao chamar a API de visão:", err);

      // Mitigação B-5: distinguir rate limit (429, esperado sob volume
      // alto) de uma falha real — o cliente pode agir de forma
      // diferente (tentar mais tarde vs. reportar um bug).
      if (err.status === 429) {
        return jsonResponse(
          { error: "Demasiados pedidos neste momento. Tenta novamente dentro de alguns minutos." },
          429,
          origin
        );
      }

      return jsonResponse(
        { error: "Não foi possível processar a imagem. Tenta novamente ou introduz os dados manualmente." },
        502,
        origin
      );
    }
  },
};

async function chamarGroqVision({ apiKey, model, imageBase64, mimeType }) {
  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      temperature: 0,
      max_tokens: 500,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: [
            { type: "text", text: "Extrai os dados desta fatura/recibo:" },
            { type: "image_url", image_url: { url: `data:${mimeType};base64,${imageBase64}` } },
          ],
        },
      ],
    }),
  });

  if (!response.ok) {
    // O detalhe completo (até 300 caracteres da resposta upstream) só
    // vai para a mensagem do erro, que o chamador (fetch handler acima)
    // regista com console.error do lado do worker — nunca é devolvido
    // ao cliente tal qual (mitigação M-3). O status é anexado ao erro
    // para permitir distinguir 429 (rate limit, mitigação B-5) de
    // outras falhas sem re-parsear a mensagem.
    const detalhe = await response.text().catch(() => "");
    const erro = new Error(`API de visão respondeu ${response.status}: ${detalhe.slice(0, 300)}`);
    erro.status = response.status;
    throw erro;
  }

  const data = await response.json();
  const conteudo = data?.choices?.[0]?.message?.content;
  if (!conteudo) {
    throw new Error("Resposta da API de visão sem conteúdo utilizável.");
  }

  try {
    return JSON.parse(conteudo);
  } catch {
    throw new Error("A API de visão não devolveu JSON válido.");
  }
}

function isLocalDev(origin) {
  return origin.startsWith("http://localhost") || origin.startsWith("http://127.0.0.1");
}

// Mitigação M-4 (AUDITORIA-2026-08.md, roadmap P2-11): antes,
// corsHeaders() devolvia sempre ALLOWED_ORIGIN, mesmo quando
// isLocalDev(origin) tinha aceitado o pedido — o browser bloqueava a
// resposta na mesma por CORS, porque a cabecera não coincidia com o
// origin real do pedido local. Agora aceita o origin do pedido e
// devolve-o quando é o de produção ou de desenvolvimento local; caso
// contrário (origin ausente ou não reconhecido) usa ALLOWED_ORIGIN como
// fallback seguro.
function corsHeaders(origin) {
  const allowOrigin = origin && (origin === ALLOWED_ORIGIN || isLocalDev(origin)) ? origin : ALLOWED_ORIGIN;
  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}

function jsonResponse(obj, status = 200, origin) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders(origin) },
  });
}

// Nota sobre o modelo: "llama-3.2-11b-vision-preview" é o identificador
// documentado pela Groq à data em que este worker foi escrito. Modelos
// de visão mudam de nome/disponibilidade com frequência nestas APIs —
// antes do deployment real, confirmar o nome atual do modelo na
// documentação da Groq (https://console.groq.com/docs/models) e
// atualizar a variável de ambiente OCR_MODEL em wrangler.toml/secrets
// em conformidade. Alternativa: migrar para a Anthropic Messages API
// com um modelo Claude com visão, trocando apenas chamarGroqVision()
// por uma função equivalente — a interface pública do worker (POST
// {imageBase64, mimeType} → {extraido}) não muda.
