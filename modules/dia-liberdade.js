// Liberdade Fiscal — Módulo de UI do Dia da Liberdade Fiscal (Fase 7,
// redesenhado em agosto de 2026 — ver CLAUDE.md §6.5)
//
// Spec §6.5: consolida IRS + Segurança Social (trabalhador) + IVA e
// impostos especiais (registados em Gastos) + impostos
// patrimoniais/anuais (registados em Taxas) num único resultado
// explicável — nunca "a partir de hoje deixas de pagar impostos",
// sempre framed como proporção anual segundo hipóteses explícitas.
//
// Redesenho de agosto de 2026: este ecrã deixou de pedir salário/tipo
// de trabalhador outra vez — lê o "Período" acumulado (data/db.js,
// preenchido pelos ecrãs Rendimentos → Gastos → Taxas via "Guardar e
// avançar") e só mostra um botão "Calcular". Se algum passo não foi
// preenchido, o resultado diz explicitamente o que ficou de fora do
// cálculo — nunca calcula em silêncio com dados em falta.
//
// Esta é também a terceira e última presença obrigatória do disclaimer
// legal exigida pelo spec (secção 9): onboarding, footer, e este ecrã.

import { calculateFiscalFreedomDay } from "../data/tax-engine.js";
import { getPeriodoAtual, fecharPeriodoAtual } from "../data/db.js";
import { buildShareText, desenharCartaoCanvas } from "../data/share-card.js";

// Ano fiscal ativo — tem de acompanhar data/tax-rules/2026/*.js. Não
// existe ainda um mecanismo de seleção de ano fiscal (fora do âmbito
// da v1, spec §5: "parâmetros fiscais versionados por ano").
const ANO_FISCAL = 2026;

export function render(container) {
  let state = {
    phase: "loading", // "loading" | "falta-rendimentos" | "pronto" | "resultado"
    periodo: null,
    erro: null,
    resultado: null,
  };

  async function iniciar() {
    state.periodo = await getPeriodoAtual();
    state.phase = state.periodo.rendimentos ? "pronto" : "falta-rendimentos";
    draw();
  }

  function draw() {
    container.innerHTML = "";
    if (state.phase === "loading") {
      drawLoading();
    } else if (state.phase === "falta-rendimentos") {
      drawFaltaRendimentos();
    } else if (state.phase === "resultado") {
      drawResult();
    } else {
      drawPronto();
    }
  }

  function drawLoading() {
    const card = el("section", "card");
    card.append(el("p", null, "A carregar o teu período…"));
    container.append(card);
  }

  function drawFaltaRendimentos() {
    const card = el("section", "card");
    card.setAttribute("aria-labelledby", "dia-liberdade-heading");

    const heading = el("h1", null, "Dia da Liberdade Fiscal");
    heading.id = "dia-liberdade-heading";
    heading.tabIndex = -1;

    const desc = el(
      "p",
      null,
      "Ainda não há rendimento registado neste período. O Dia da Liberdade Fiscal precisa de um rendimento de referência para calcular a proporção do ano — sem isso não há denominador para a percentagem."
    );

    const irBtn = document.createElement("a");
    irBtn.href = "#taximetro";
    irBtn.className = "btn btn--primary";
    irBtn.textContent = "Ir a Rendimentos →";

    card.append(heading, desc, irBtn);
    container.append(card);
    heading.focus({ preventScroll: false });
  }

  function drawPronto() {
    const p = state.periodo;
    const card = el("section", "card");
    card.setAttribute("aria-labelledby", "dia-liberdade-heading");

    const heading = el("h1", null, "Dia da Liberdade Fiscal");
    heading.id = "dia-liberdade-heading";
    heading.tabIndex = -1;

    const desc = el(
      "p",
      null,
      "Junta o que já preencheste em Rendimentos, Gastos e Taxas para descobrir a que dia do ano corresponde a proporção do teu ano dedicada a impostos e contribuições."
    );

    const resumo = el("dl", "taximetro-cadeia");
    appendItem(resumo, "Rendimentos", p.rendimentos ? "✅ preenchido" : "— por preencher");
    appendItem(resumo, "Gastos mensais", p.gastosMensal ? "✅ preenchido" : "— por preencher (opcional)");
    appendItem(resumo, "Taxas anuais", p.taxasAnuais ? "✅ preenchido" : "— por preencher (opcional)");

    const avisoIncompleto =
      !p.gastosMensal || !p.taxasAnuais
        ? el(
            "p",
            "disclaimer",
            "Podes calcular já — o resultado vai indicar claramente o que ficou de fora. Para um número mais completo, volta a Gastos e/ou Taxas antes de calcular."
          )
        : null;

    const calcularBtn = el("button", "btn btn--primary", "Calcular o meu Dia da Liberdade Fiscal");
    calcularBtn.type = "button";
    calcularBtn.addEventListener("click", () => calcular());

    if (state.erro) {
      const erroEl = el("p", "form-error", state.erro);
      erroEl.setAttribute("role", "alert");
      card.append(erroEl);
    }

    const disclaimer = el(
      "p",
      "disclaimer",
      "Esta aplicação fornece estimativas para fins informativos e educativos. Não constitui aconselhamento fiscal, financeiro ou jurídico e não substitui o cálculo oficial da Autoridade Tributária."
    );

    card.append(heading, desc, resumo);
    if (avisoIncompleto) card.append(avisoIncompleto);
    card.append(calcularBtn, disclaimer);
    container.append(card);
    heading.focus({ preventScroll: false });
  }

  function calcular() {
    const p = state.periodo;
    const r = p.rendimentos;

    try {
      const irsAnual = round2(Math.max(0, r.irsAnualAntesDeDeducoes - r.deducaoAnualPorDependentes));
      const ssTrabalhadorAnual = round2(r.descontoSSMensal * 12);
      const rendimentoBrutoAnual = r.detalheAnual.rendimentoBrutoAnual;

      const ivaEEspeciaisRegistado = p.gastosMensal
        ? round2(((p.gastosMensal.totalIvaMensal || 0) + (p.gastosMensal.totalImpostoEspecialMensal || 0)) * 12)
        : 0;
      const patrimoniaisRegistado = p.taxasAnuais ? round2(p.taxasAnuais.total || 0) : 0;

      const resultado = calculateFiscalFreedomDay({
        ano: ANO_FISCAL,
        rendimentoBrutoAnual,
        irsAnual,
        ssTrabalhadorAnual,
        ivaEEspeciaisRegistado,
        patrimoniaisRegistado,
      });

      state.erro = null;
      state.resultado = resultado;
      state.phase = "resultado";
    } catch (err) {
      state.erro = `Não foi possível calcular: ${err.message}`;
    }
    draw();
  }

  function drawResult() {
    const r = state.resultado;
    const p = state.periodo;

    const card = el("section", "card");
    card.setAttribute("aria-labelledby", "resultado-dia-heading");

    const heading = el("h1", null, "O teu Dia da Liberdade Fiscal");
    heading.id = "resultado-dia-heading";
    heading.tabIndex = -1;

    card.append(desenharIlustracao());

    const dataFormatada = formatarDataPT(r.date);
    const dataHero = el("p", "stat-hero", dataFormatada);
    const percentagemLabel = el(
      "p",
      "stat-label",
      `${formatPercentagem(r.percentage)} do ano (${r.dayOfYear} de ${isAnoBissexto(r.ano) ? 366 : 365} dias) — segundo as hipóteses desta simulação`
    );

    const framing = el(
      "p",
      null,
      "Esta é a data correspondente à proporção anual do valor destinado a impostos e contribuições, segundo as hipóteses usadas nesta simulação — não significa que deixes de pagar impostos a partir de hoje."
    );

    const pensarCritico = el(
      "p",
      null,
      "Um número como este só ganha sentido quando percebes a fórmula por trás dele — e é exatamente por isso que este resultado vem sempre acompanhado da sua metodologia, nunca sozinho. Quanto mais claro o método, mais informada é a tua opinião sobre ele."
    );
    pensarCritico.className = "disclaimer";

    const breakdown = el("dl", "taximetro-cadeia");
    appendItem(breakdown, "IRS anual", formatEUR(r.breakdown.irs));
    appendItem(breakdown, "Segurança Social (trabalhador)", formatEUR(r.breakdown.segurancaSocial));
    appendItem(
      breakdown,
      p.gastosMensal ? "IVA e impostos especiais (estimado a partir de Gastos)" : "IVA e impostos especiais — NÃO incluído",
      formatEUR(r.breakdown.ivaEEspeciais)
    );
    appendItem(
      breakdown,
      p.taxasAnuais ? "Impostos patrimoniais/anuais (registados em Taxas)" : "Impostos patrimoniais/anuais — NÃO incluído",
      formatEUR(r.breakdown.patrimoniais)
    );
    appendItem(breakdown, "Total de impostos e contribuições", formatEUR(r.totalImpostos));
    appendItem(breakdown, "Rendimento bruto anual de referência", formatEUR(r.rendimentoBase));

    const faltantes = [];
    if (!p.gastosMensal) faltantes.push("Gastos (IVA e impostos especiais de consumo)");
    if (!p.taxasAnuais) faltantes.push("Taxas (IMI, IUC, ISV, IMT, Imposto de Selo)");

    let avisoFaltantes = null;
    if (faltantes.length > 0) {
      avisoFaltantes = el(
        "p",
        "disclaimer",
        `⚠️ Este resultado NÃO inclui: ${faltantes.join("; ")} — porque ainda não preencheste essa secção neste período. O teu Dia da Liberdade Fiscal real é, com estes dados incluídos, mais tarde no ano do que o mostrado aqui.`
      );
    }

    const detalhes = document.createElement("details");
    const summary = document.createElement("summary");
    summary.textContent = "Como chegámos a este número?";
    const metodologiaTexto = el("p", null, r.methodology);
    const fonteRendimentos = el(
      "p",
      "disclaimer",
      "Fonte do IRS e Segurança Social: CIRS (Código do IRS) e taxas de TSU da Segurança Social, 2026."
    );
    detalhes.append(summary, metodologiaTexto, fonteRendimentos);

    const privacidade = el(
      "p",
      "stat-label",
      "🔒 Todo este cálculo aconteceu só neste dispositivo — nada foi enviado para nenhum servidor."
    );

    const disclaimer = el(
      "p",
      "disclaimer",
      "Esta aplicação fornece estimativas para fins informativos e educativos. Não constitui aconselhamento fiscal, financeiro ou jurídico e não substitui o cálculo oficial da Autoridade Tributária."
    );

    const acoes = el("div", "faturas-actions");

    const voltarBtn = el("button", "btn btn--secondary", "Recalcular");
    voltarBtn.type = "button";
    voltarBtn.addEventListener("click", () => {
      state.phase = "pronto";
      draw();
    });
    acoes.append(voltarBtn);

    if (typeof document !== "undefined" && "createElement" in document) {
      const partilharBtn = el("button", "btn btn--primary", "Partilhar resultado");
      partilharBtn.type = "button";
      partilharBtn.addEventListener("click", () => partilharResultado(r));
      acoes.append(partilharBtn);

      // Via manual sempre disponível: em alguns Android/Chrome o menu
      // de partilha nativo abre mas o WhatsApp não aparece na lista
      // (normalmente uma cache desatualizada do próprio Chrome, fora do
      // nosso controlo) — este botão garante sempre um caminho para
      // partilhar manualmente, independentemente do que o menu do
      // sistema mostrar.
      const descarregarBtn = el("button", "btn btn--secondary", "Descarregar imagem");
      descarregarBtn.type = "button";
      descarregarBtn.addEventListener("click", () => descarregarCartao(r));
      acoes.append(descarregarBtn);
    }

    const compararLink = document.createElement("a");
    compararLink.href = "#benchmark-ocde";
    compararLink.className = "btn btn--secondary";
    compararLink.textContent = "Comparar com a OCDE →";
    acoes.append(compararLink);

    const notaPartilha = el(
      "p",
      "stat-label",
      "Se o WhatsApp não aparecer no menu de partilha do teu telemóvel, usa \"Descarregar imagem\" e anexa-a manualmente numa conversa."
    );

    const fecharBtn = el("button", "btn btn--secondary", "Fechar este período e começar um novo");
    fecharBtn.type = "button";
    fecharBtn.addEventListener("click", async () => {
      await fecharPeriodoAtual(r);
      state.periodo = await getPeriodoAtual();
      state.phase = "falta-rendimentos";
      draw();
    });

    card.append(heading, dataHero, percentagemLabel, framing, pensarCritico, breakdown);
    if (avisoFaltantes) card.append(avisoFaltantes);
    card.append(detalhes, privacidade, acoes, notaPartilha, fecharBtn, disclaimer);
    container.append(card);
    heading.focus({ preventScroll: false });
  }

  function desenharIlustracao() {
    // Ilustração simples em SVG inline (sem dependências externas, sem
    // pedir ficheiros de logo ao autor) para o resultado "não ser tão
    // seco" — pedido explícito do autor. Um calendário estilizado com
    // a paleta da marca.
    const wrap = el("div", "dia-liberdade-ilustracao");
    wrap.innerHTML = `
      <svg viewBox="0 0 200 140" role="img" aria-label="Ilustração de um calendário" width="160" height="112">
        <rect x="20" y="24" width="160" height="106" rx="12" fill="#FFFFFF" stroke="#0D1321" stroke-width="4"/>
        <rect x="20" y="24" width="160" height="34" rx="12" fill="#22C55E"/>
        <rect x="20" y="46" width="160" height="12" fill="#22C55E"/>
        <circle cx="55" cy="16" r="8" fill="#0D1321"/>
        <circle cx="145" cy="16" r="8" fill="#0D1321"/>
        <rect x="51" y="8" width="8" height="24" rx="4" fill="#0D1321"/>
        <rect x="141" y="8" width="8" height="24" rx="4" fill="#0D1321"/>
        <circle cx="100" cy="96" r="26" fill="#F6C453"/>
        <path d="M90 96 l7 7 l14 -16" stroke="#0D1321" stroke-width="5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    `;
    return wrap;
  }

  /**
   * Gera o cartão de partilha em canvas e devolve o blob PNG, ou null
   * se a Canvas API não existir (ex.: testes headless).
   */
  async function gerarCartaoBlob(resultado) {
    try {
      const canvas = document.createElement("canvas");
      canvas.width = 1080;
      canvas.height = 1920;
      if (!canvas.getContext) return null;
      desenharCartaoCanvas(canvas, resultado);
      return await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
    } catch {
      return null;
    }
  }

  async function partilharResultado(resultado) {
    const texto = buildShareText(resultado);
    const blob = await gerarCartaoBlob(resultado);
    const temShareNativo = typeof navigator !== "undefined" && typeof navigator.share === "function";

    // Tentamos partilhar com a imagem diretamente, sem usar
    // navigator.canShare() como filtro prévio: em vários Android/Chrome
    // esse método dá falsos negativos (recusa uma partilha que o
    // próprio share() depois aceita sem problema) — é mais fiável
    // deixar o share() decidir e só cair para texto simples se ele
    // recusar por um motivo real.
    if (temShareNativo && blob) {
      try {
        await navigator.share({ text: texto, files: [ficheiroDe(blob)] });
        return;
      } catch (err) {
        if (err && err.name === "AbortError") return; // utilizador cancelou — não insistir com mais nada
      }
    }

    if (temShareNativo) {
      try {
        await navigator.share({ text: texto });
        return;
      } catch (err) {
        if (err && err.name === "AbortError") return;
      }
    }

    // Sem Web Share API disponível, ou falhou por um motivo real (não
    // cancelamento do utilizador): cai para descarregar a imagem +
    // copiar o texto, para nunca deixar o botão sem efeito nenhum.
    await descarregarECopiar(blob, texto);
  }

  /**
   * Via manual, sempre disponível a partir do seu próprio botão — não
   * depende do menu de partilha nativo (nem do que ele decide mostrar
   * ou não mostrar, ex.: um Android/Chrome com a lista de apps
   * partilháveis desatualizada em cache). Descarrega a imagem e copia
   * o texto, para o utilizador anexar manualmente numa conversa.
   */
  async function descarregarCartao(resultado) {
    const texto = buildShareText(resultado);
    const blob = await gerarCartaoBlob(resultado);
    await descarregarECopiar(blob, texto);
  }

  async function descarregarECopiar(blob, texto) {
    if (blob) {
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "liberdade-fiscal.png";
      link.click();
      URL.revokeObjectURL(url);
    }
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(texto);
      } catch {
        // Clipboard pode falhar por permissões — não é crítico, a
        // imagem já foi descarregada (ou tentou sê-lo).
      }
    }
  }

  function ficheiroDe(blob) {
    return new File([blob], "liberdade-fiscal.png", { type: "image/png" });
  }

  iniciar();

  return {
    destroy() {
      container.innerHTML = "";
    },
  };
}

/* ----------------------------- Utilitários ----------------------------- */

function el(tag, className, textContent) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (textContent !== undefined) node.textContent = textContent;
  return node;
}

function appendItem(dl, label, value) {
  dl.append(el("dt", null, label), el("dd", null, value));
}

function formatEUR(value) {
  return new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" }).format(value);
}

function formatPercentagem(fracao) {
  return new Intl.NumberFormat("pt-PT", { style: "percent", maximumFractionDigits: 1 }).format(fracao);
}

function formatarDataPT(isoDate) {
  const [ano, mes, dia] = isoDate.split("-").map(Number);
  const data = new Date(Date.UTC(ano, mes - 1, dia));
  return new Intl.DateTimeFormat("pt-PT", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(
    data
  );
}

function isAnoBissexto(ano) {
  return (ano % 4 === 0 && ano % 100 !== 0) || ano % 400 === 0;
}

function round2(value) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}
