// Liberdade Fiscal — Cartão para partilhar (Fase 8, spec §6.7)
//
// Separado em duas partes deliberadamente:
//   1. buildShareText() — função pura, testável em Node, gera o texto
//      que acompanha a partilha (Web Share API `text`, e fallback de
//      cópia para a área de transferência).
//   2. desenharCartaoCanvas() — depende da Canvas API do browser (não
//      disponível em jsdom/Node), por isso não é testada por unit
//      tests; é um wrapper fino chamado só a partir de modules/*.js.
//
// Conteúdo do cartão (spec §6.7): nome da app, país/ano, Dia da
// Liberdade Fiscal, dias trabalhados para impostos, % de carga
// estimada. SEM dados pessoais (nem salário, nem valores em euros).

/**
 * @param {{ ano: number, date: string, dayOfYear: number, percentage: number }} resultado
 * @returns {string}
 */
export function buildShareText(resultado) {
  const dataFormatada = formatarDataPT(resultado.date);
  const percentagem = formatarPercentagemPT(resultado.percentage);

  return (
    `Liberdade Fiscal — Portugal ${resultado.ano}\n` +
    `O meu Dia da Liberdade Fiscal: ${dataFormatada}\n` +
    `${resultado.dayOfYear} dias do ano dedicados a impostos e contribuições (≈${percentagem}%).\n` +
    `Descobre o teu em liberdade-fiscal (estimativa educativa, não é aconselhamento fiscal).`
  );
}

/**
 * Desenha o cartão de partilha (formato vertical, otimizado para
 * Stories: 1080×1920) num <canvas> já existente no DOM, fornecido pelo
 * módulo chamador. Usa só a paleta de marca (secção 4 do CLAUDE.md) —
 * mas agora sobre fundo claro, para bater certo com o resto da app
 * (que é toda clara), em vez do navy escuro da primeira versão. Uma
 * "card" branca com sombra, no mesmo espírito visual dos cartões da
 * própria app (.card em style.css), com uma barra de progresso que
 * visualiza a percentagem do ano.
 *
 * @param {HTMLCanvasElement} canvas
 * @param {{ ano: number, date: string, dayOfYear: number, percentage: number }} resultado
 */
export function desenharCartaoCanvas(canvas, resultado) {
  const ctx = canvas.getContext("2d");
  const W = canvas.width;
  const H = canvas.height;

  const NAVY = "#0D1321";
  const NAVY_MUTED = "#4B5566";
  const GREEN = "#22C55E";
  const GREEN_TEXT = "#15803D";
  const MINT = "#7EEBC1";
  const GOLD = "#F6C453";
  const BACKGROUND = "#F1F3F5";
  const WHITE = "#FFFFFF";
  const BORDER = "#D9DEE3";

  // Fundo claro — igual ao --color-background da app, para o cartão
  // não destoar do resto da experiência (antes era navy escuro).
  ctx.fillStyle = BACKGROUND;
  ctx.fillRect(0, 0, W, H);

  // "Card" branca central, com sombra suave — o mesmo tratamento
  // visual de qualquer .card da app. A altura é dimensionada para o
  // conteúdo real (incluindo o pior caso de uma data que quebra para 2
  // linhas — ver quebrarTexto mais abaixo), não um valor arbitrário
  // grande: uma card demasiado alta para o que lá vai dentro deixava
  // uma zona vazia enorme por baixo do disclaimer, o mesmo problema de
  // "vazio" que já tínhamos corrigido nos cartões de Gastos. Ao centrar
  // verticalmente uma card mais compacta no canvas, sobra espaço claro
  // equilibrado em cima e em baixo, em vez de um bloco branco oco.
  const cardX = W * 0.07;
  const cardW = W * 0.86;
  const cardH = 1000;
  const cardY = (H - cardH) / 2;
  const cardRadius = 56;

  ctx.save();
  ctx.shadowColor = "rgba(13, 19, 33, 0.18)";
  ctx.shadowBlur = 60;
  ctx.shadowOffsetY = 24;
  ctx.fillStyle = WHITE;
  desenharRetanguloArredondado(ctx, cardX, cardY, cardW, cardH, cardRadius);
  ctx.fill();
  ctx.restore();

  // Mancha decorativa subtil no canto superior direito da card — um
  // único toque de cor, nada mais (princípio "números > explicação >
  // decoração" do CLAUDE.md).
  ctx.save();
  desenharRetanguloArredondado(ctx, cardX, cardY, cardW, cardH, cardRadius);
  ctx.clip();
  const blob = ctx.createRadialGradient(
    cardX + cardW * 0.92,
    cardY + cardH * 0.02,
    0,
    cardX + cardW * 0.92,
    cardY + cardH * 0.02,
    cardW * 0.35
  );
  blob.addColorStop(0, "rgba(126, 235, 193, 0.4)");
  blob.addColorStop(1, "rgba(126, 235, 193, 0)");
  ctx.fillStyle = blob;
  ctx.fillRect(cardX, cardY, cardW, cardH * 0.4);
  ctx.restore();

  const centerX = W / 2;
  ctx.textAlign = "center";

  // Cabeçalho: nome da app + país/ano.
  ctx.fillStyle = GREEN_TEXT;
  ctx.font = "700 46px Poppins, sans-serif";
  ctx.fillText("Liberdade Fiscal", centerX, cardY + 96);

  ctx.fillStyle = NAVY_MUTED;
  ctx.font = "400 32px Poppins, sans-serif";
  ctx.fillText(`Portugal · ${resultado.ano}`, centerX, cardY + 148);

  // Linha divisória fina.
  ctx.strokeStyle = BORDER;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(cardX + 80, cardY + 196);
  ctx.lineTo(cardX + cardW - 80, cardY + 196);
  ctx.stroke();

  // Rótulo em pílula, como o .badge da app.
  const label = "O TEU DIA DA LIBERDADE FISCAL";
  ctx.font = "600 26px Poppins, sans-serif";
  const labelWidth = ctx.measureText(label).width;
  const pillPaddingX = 32;
  const pillH = 56;
  const pillY = cardY + 244;
  ctx.fillStyle = MINT;
  desenharRetanguloArredondado(
    ctx,
    centerX - labelWidth / 2 - pillPaddingX,
    pillY,
    labelWidth + pillPaddingX * 2,
    pillH,
    pillH / 2
  );
  ctx.fill();
  ctx.fillStyle = NAVY;
  ctx.fillText(label, centerX, pillY + pillH / 2 + 9);

  // Data — o número principal do cartão. Nem todas as datas cabem
  // numa linha à mesma largura ("14 de junho" cabe; "15 de fevereiro"
  // é bem mais comprida e costuma quebrar para 2 linhas) — por isso
  // quebrarTexto() devolve a posição Y onde ficou a ÚLTIMA linha
  // desenhada, e é a partir dela que posicionamos o resto do cartão,
  // nunca com um deslocamento fixo que assuma sempre 1 linha.
  ctx.fillStyle = NAVY;
  ctx.font = "700 116px Poppins, sans-serif";
  const dataFormatada = formatarDataPT(resultado.date);
  const heroY = pillY + pillH + 140;
  const heroFimY = quebrarTexto(ctx, dataFormatada, centerX, heroY, cardW * 0.85, 122);

  // Sub-linha: dias do ano + percentagem. Formatada em pt-PT (vírgula
  // decimal), como o resto da app — o Number.toString() do JS usa
  // ponto, o que destoava do "30,6%" já mostrado no ecrã de resultado.
  ctx.fillStyle = NAVY_MUTED;
  ctx.font = "500 38px Poppins, sans-serif";
  const percentagem = formatarPercentagemPT(resultado.percentage);
  const subLineY = heroFimY + 100;
  ctx.fillText(`${resultado.dayOfYear} dias do ano · ≈${percentagem}%`, centerX, subLineY);

  // Barra de progresso em cápsula — visualiza a percentagem do ano,
  // no mesmo estilo das barras do benchmark OCDE na app.
  const barY = subLineY + 60;
  const barW = cardW * 0.78;
  const barH = 28;
  const barX = centerX - barW / 2;
  ctx.fillStyle = BORDER;
  desenharRetanguloArredondado(ctx, barX, barY, barW, barH, barH / 2);
  ctx.fill();
  ctx.fillStyle = GREEN;
  const preenchido = Math.max(barH, barW * Math.min(1, resultado.percentage));
  desenharRetanguloArredondado(ctx, barX, barY, preenchido, barH, barH / 2);
  ctx.fill();

  // Rodapé: disclaimer legal, sempre presente (spec §9). Ancorado à
  // barra de progresso (barY + barH), não ao fundo fixo da card — assim
  // acompanha o conteúdo real em vez de deixar um vão vazio quando a
  // data coube numa só linha, ou de arriscar sobrepor-se à barra no
  // pior caso (data em 2 linhas).
  ctx.fillStyle = NAVY_MUTED;
  ctx.font = "400 24px Poppins, sans-serif";
  quebrarTexto(
    ctx,
    "Estimativa educativa, segundo as hipóteses da simulação — não é aconselhamento fiscal.",
    centerX,
    barY + barH + 90,
    cardW * 0.78,
    34
  );

  // Pequeno acento dourado no fundo, fora da card — assinatura visual
  // discreta, sem competir com o conteúdo.
  ctx.fillStyle = GOLD;
  ctx.beginPath();
  ctx.arc(W / 2, H * 0.965, 7, 0, Math.PI * 2);
  ctx.fill();
}

function desenharRetanguloArredondado(ctx, x, y, largura, altura, raio) {
  const r = Math.min(raio, largura / 2, altura / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + largura, y, x + largura, y + altura, r);
  ctx.arcTo(x + largura, y + altura, x, y + altura, r);
  ctx.arcTo(x, y + altura, x, y, r);
  ctx.arcTo(x, y, x + largura, y, r);
  ctx.closePath();
}

/**
 * Desenha texto com quebra de linha automática, centrado em x.
 * Devolve o Y onde ficou a ÚLTIMA linha desenhada — quem chama usa
 * este valor para posicionar o que vem a seguir, em vez de assumir um
 * número fixo de linhas (nem toda a data/texto cabe sempre numa só).
 */
function quebrarTexto(ctx, texto, x, y, larguraMax, alturaLinha) {
  const palavras = texto.split(" ");
  let linha = "";
  let linhaY = y;
  for (const palavra of palavras) {
    const testeLinha = linha ? `${linha} ${palavra}` : palavra;
    if (ctx.measureText(testeLinha).width > larguraMax && linha) {
      ctx.fillText(linha, x, linhaY);
      linha = palavra;
      linhaY += alturaLinha;
    } else {
      linha = testeLinha;
    }
  }
  if (linha) ctx.fillText(linha, x, linhaY);
  return linhaY;
}

function formatarDataPT(isoDate) {
  const [ano, mes, dia] = isoDate.split("-").map(Number);
  const data = new Date(Date.UTC(ano, mes - 1, dia));
  return new Intl.DateTimeFormat("pt-PT", { day: "numeric", month: "long", timeZone: "UTC" }).format(data);
}

// Uma casa decimal, vírgula em vez de ponto — para bater certo com o
// "30,6%" já mostrado no ecrã de Dia da Liberdade (Number.toString()
// do JS usa sempre ponto, independentemente do locale).
function formatarPercentagemPT(percentage) {
  return (Math.round(percentage * 1000) / 10).toFixed(1).replace(".", ",");
}
