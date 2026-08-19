// Liberdade Fiscal — Cartão para partilhar (Fase 8, spec §6.7)
//
// Separado em duas partes deliberadamente:
//   1. buildShareText() — função pura, testável em Node, gera o texto
//      que acompanha a partilha (Web Share API `text`, e fallback de
//      cópia para a área de transferência).
//   2. desenharCartaoCanvas() / desenharCartaoCanvasQuadrado() /
//      desenharCartaoComparacaoOCDE() — dependem da Canvas API do
//      browser (não disponível em jsdom/Node), por isso não são
//      testadas por unit tests; são wrappers finos chamados só a
//      partir de modules/*.js.
//
// Conteúdo do cartão principal (spec §6.7): nome da app, país/ano, Dia
// da Liberdade Fiscal, dias trabalhados para impostos, % de carga
// estimada. SEM dados pessoais (nem salário, nem valores em euros).
//
// Três formatos disponíveis, todos partilhando a mesma paleta/tom
// visual (secção 4 do CLAUDE.md):
//   - desenharCartaoCanvas: 1080×1920, vertical, pensado para Stories
//     (formato original, Fase 8).
//   - desenharCartaoCanvasQuadrado: 1080×1080, para feed/carrossel —
//     mesmo conteúdo do cartão principal, tipografia e espaçamento
//     comprimidos para caber num quadrado.
//   - desenharCartaoComparacaoOCDE: 1080×1920, mostra o resultado do
//     utilizador ao lado do tax wedge da OCDE por país (spec §6.6) —
//     com o aviso obrigatório de que as duas métricas usam metodologias
//     diferentes e não são diretamente equiparáveis (adicionado
//     19/08/2026, pedido do autor: "algo que eu possa fazer sozinho
//     para melhorar a tarjeta de redes").

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

// Paleta de marca (secção 4 do CLAUDE.md) — extraída para o topo do
// módulo para ser partilhada pelos três desenhadores de cartão, em vez
// de redeclarada dentro de cada função.
const CORES = {
  NAVY: "#0D1321",
  NAVY_MUTED: "#4B5566",
  GREEN: "#22C55E",
  GREEN_TEXT: "#15803D",
  MINT: "#7EEBC1",
  GOLD: "#F6C453",
  BACKGROUND: "#F1F3F5",
  WHITE: "#FFFFFF",
  BORDER: "#D9DEE3",
};

// Etiqueta curta mostrada no rodapé de todos os cartões (fora da card
// branca), para quem vir a imagem sem o texto/link que a acompanha
// (ex.: Story repostada por terceiros, ou screenshot). Mantida como
// constante única — ver nota em index.html sobre ALLOWED_ORIGIN/og:url
// quando o domínio final mudar de delfos-iq.github.io para um domínio
// próprio.
const SITE_LABEL = "delfos-iq.github.io";

/**
 * Desenha o cartão de partilha (formato vertical, otimizado para
 * Stories: 1080×1920) num <canvas> já existente no DOM, fornecido pelo
 * módulo chamador. Uma "card" branca com sombra, no mesmo espírito
 * visual dos cartões da própria app (.card em style.css), com uma
 * barra de progresso que visualiza a percentagem do ano.
 *
 * @param {HTMLCanvasElement} canvas
 * @param {{ ano: number, date: string, dayOfYear: number, percentage: number }} resultado
 */
export function desenharCartaoCanvas(canvas, resultado) {
  const ctx = canvas.getContext("2d");
  const W = canvas.width;
  const H = canvas.height;
  const { NAVY, NAVY_MUTED, GREEN, GREEN_TEXT, MINT, GOLD, BACKGROUND, WHITE, BORDER } = CORES;

  // Fundo claro — igual ao --color-background da app, para o cartão
  // não destoar do resto da experiência.
  ctx.fillStyle = BACKGROUND;
  ctx.fillRect(0, 0, W, H);

  // "Card" branca central, com sombra suave. A altura é dimensionada
  // para o conteúdo real (incluindo o pior caso de uma data que quebra
  // para 2 linhas — ver quebrarTexto mais abaixo), não um valor
  // arbitrário grande: uma card demasiado alta para o que lá vai dentro
  // deixava uma zona vazia enorme por baixo do disclaimer. Ao centrar
  // verticalmente uma card mais compacta no canvas, sobra espaço claro
  // equilibrado em cima e em baixo, em vez de um bloco branco oco.
  const cardX = W * 0.07;
  const cardW = W * 0.86;
  const cardH = 1000;
  const cardY = (H - cardH) / 2;
  const cardRadius = 56;

  desenharFundoDaCard(ctx, cardX, cardY, cardW, cardH, cardRadius, WHITE, MINT);

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
  // decimal), como o resto da app.
  ctx.fillStyle = NAVY_MUTED;
  ctx.font = "500 38px Poppins, sans-serif";
  const percentagem = formatarPercentagemPT(resultado.percentage);
  const subLineY = heroFimY + 100;
  ctx.fillText(`${resultado.dayOfYear} dias do ano · ≈${percentagem}%`, centerX, subLineY);

  // Barra de progresso em cápsula — visualiza a percentagem do ano.
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
  // barra de progresso (barY + barH), não ao fundo fixo da card.
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

  desenharRodapeDominio(ctx, W, H, NAVY_MUTED, GOLD);
}

/**
 * Variante quadrada (1080×1080) do cartão principal, para feed/
 * carrossel do Instagram (o formato vertical acima é pensado para
 * Stories e fica cortado/mal enquadrado num post normal). Mesmo
 * conteúdo, tipografia e espaçamento comprimidos para caber num
 * quadrado em vez de um retângulo alto.
 *
 * @param {HTMLCanvasElement} canvas
 * @param {{ ano: number, date: string, dayOfYear: number, percentage: number }} resultado
 */
export function desenharCartaoCanvasQuadrado(canvas, resultado) {
  const ctx = canvas.getContext("2d");
  const W = canvas.width;
  const H = canvas.height;
  const { NAVY, NAVY_MUTED, GREEN, GREEN_TEXT, MINT, GOLD, BACKGROUND, WHITE, BORDER } = CORES;

  ctx.fillStyle = BACKGROUND;
  ctx.fillRect(0, 0, W, H);

  const cardX = W * 0.06;
  const cardW = W * 0.88;
  const cardH = H * 0.85;
  const cardY = (H - cardH) / 2;
  const cardRadius = 48;

  desenharFundoDaCard(ctx, cardX, cardY, cardW, cardH, cardRadius, WHITE, MINT);

  const centerX = W / 2;
  ctx.textAlign = "center";

  ctx.fillStyle = GREEN_TEXT;
  ctx.font = "700 40px Poppins, sans-serif";
  ctx.fillText("Liberdade Fiscal", centerX, cardY + 78);

  ctx.fillStyle = NAVY_MUTED;
  ctx.font = "400 26px Poppins, sans-serif";
  ctx.fillText(`Portugal · ${resultado.ano}`, centerX, cardY + 118);

  ctx.strokeStyle = BORDER;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(cardX + 64, cardY + 152);
  ctx.lineTo(cardX + cardW - 64, cardY + 152);
  ctx.stroke();

  const label = "O TEU DIA DA LIBERDADE FISCAL";
  ctx.font = "600 22px Poppins, sans-serif";
  const labelWidth = ctx.measureText(label).width;
  const pillPaddingX = 26;
  const pillH = 46;
  const pillY = cardY + 190;
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
  ctx.fillText(label, centerX, pillY + pillH / 2 + 8);

  ctx.fillStyle = NAVY;
  ctx.font = "700 92px Poppins, sans-serif";
  const dataFormatada = formatarDataPT(resultado.date);
  const heroY = pillY + pillH + 100;
  const heroFimY = quebrarTexto(ctx, dataFormatada, centerX, heroY, cardW * 0.85, 98);

  ctx.fillStyle = NAVY_MUTED;
  ctx.font = "500 32px Poppins, sans-serif";
  const percentagem = formatarPercentagemPT(resultado.percentage);
  const subLineY = heroFimY + 76;
  ctx.fillText(`${resultado.dayOfYear} dias do ano · ≈${percentagem}%`, centerX, subLineY);

  const barY = subLineY + 46;
  const barW = cardW * 0.78;
  const barH = 22;
  const barX = centerX - barW / 2;
  ctx.fillStyle = BORDER;
  desenharRetanguloArredondado(ctx, barX, barY, barW, barH, barH / 2);
  ctx.fill();
  ctx.fillStyle = GREEN;
  const preenchido = Math.max(barH, barW * Math.min(1, resultado.percentage));
  desenharRetanguloArredondado(ctx, barX, barY, preenchido, barH, barH / 2);
  ctx.fill();

  ctx.fillStyle = NAVY_MUTED;
  ctx.font = "400 20px Poppins, sans-serif";
  quebrarTexto(
    ctx,
    "Estimativa educativa, segundo as hipóteses da simulação — não é aconselhamento fiscal.",
    centerX,
    barY + barH + 60,
    cardW * 0.8,
    28
  );

  desenharRodapeDominio(ctx, W, H, NAVY_MUTED, GOLD);
}

/**
 * Cartão de comparação internacional (1080×1920): mostra o resultado
 * pessoal do utilizador ao lado do "tax wedge" da OCDE por país (spec
 * §6.6). Inclui, sempre e sem exceção, o aviso obrigatório de que as
 * duas métricas usam metodologias diferentes — o tax wedge da OCDE
 * mede só IRS+Segurança Social, o Dia da Liberdade Fiscal desta app
 * inclui também IVA, impostos especiais e patrimoniais quando
 * registados. Nunca renderizar este cartão sem esse aviso.
 *
 * @param {HTMLCanvasElement} canvas
 * @param {{ ano: number, date: string, dayOfYear: number, percentage: number }} resultado
 * @param {{ oecdAverage: number, countries: Array<{code: string, name_pt: string, taxWedgePercent: number}> }} oecdData
 */
export function desenharCartaoComparacaoOCDE(canvas, resultado, oecdData) {
  const ctx = canvas.getContext("2d");
  const W = canvas.width;
  const H = canvas.height;
  const { NAVY, NAVY_MUTED, GREEN, GREEN_TEXT, MINT, GOLD, BACKGROUND, WHITE, BORDER } = CORES;

  ctx.fillStyle = BACKGROUND;
  ctx.fillRect(0, 0, W, H);

  const cardX = W * 0.06;
  const cardW = W * 0.88;
  const cardY = 96;
  const cardH = H - cardY * 2;
  const cardRadius = 48;

  desenharFundoDaCard(ctx, cardX, cardY, cardW, cardH, cardRadius, WHITE, MINT);

  const centerX = W / 2;
  ctx.textAlign = "center";

  ctx.fillStyle = GREEN_TEXT;
  ctx.font = "700 42px Poppins, sans-serif";
  ctx.fillText("Liberdade Fiscal", centerX, cardY + 74);

  ctx.fillStyle = NAVY_MUTED;
  ctx.font = "400 28px Poppins, sans-serif";
  ctx.fillText(`Portugal · ${resultado.ano}`, centerX, cardY + 114);

  ctx.strokeStyle = BORDER;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(cardX + 64, cardY + 146);
  ctx.lineTo(cardX + cardW - 64, cardY + 146);
  ctx.stroke();

  // Bloco 1: resultado pessoal, compacto (o protagonista deste cartão
  // é a comparação, não o número pessoal sozinho — já tem o seu
  // próprio cartão dedicado em desenharCartaoCanvas).
  const labelPessoal = "O TEU RESULTADO (IRS+SS+IVA+especiais+patrimoniais)";
  ctx.font = "600 20px Poppins, sans-serif";
  const labelPessoalWidth = ctx.measureText(labelPessoal).width;
  const pillPessoalY = cardY + 178;
  const pillH1 = 40;
  ctx.fillStyle = MINT;
  desenharRetanguloArredondado(
    ctx,
    centerX - labelPessoalWidth / 2 - 22,
    pillPessoalY,
    labelPessoalWidth + 44,
    pillH1,
    pillH1 / 2
  );
  ctx.fill();
  ctx.fillStyle = NAVY;
  ctx.fillText(labelPessoal, centerX, pillPessoalY + pillH1 / 2 + 7);

  ctx.fillStyle = NAVY;
  ctx.font = "700 90px Poppins, sans-serif";
  const percentagemPessoal = formatarPercentagemPT(resultado.percentage);
  const pessoalY = pillPessoalY + pillH1 + 100;
  ctx.fillText(`≈${percentagemPessoal}%`, centerX, pessoalY);

  ctx.fillStyle = NAVY_MUTED;
  ctx.font = "400 26px Poppins, sans-serif";
  ctx.fillText("do ano, segundo esta simulação", centerX, pessoalY + 42);

  // Linha divisória entre os dois blocos.
  const divisoria2Y = pessoalY + 88;
  ctx.strokeStyle = BORDER;
  ctx.beginPath();
  ctx.moveTo(cardX + 64, divisoria2Y);
  ctx.lineTo(cardX + cardW - 64, divisoria2Y);
  ctx.stroke();

  // Bloco 2: tax wedge OCDE por país, ordenado do mais alto para o mais
  // baixo, com Portugal destacado a verde. Inclui a média OCDE como
  // última linha, em itálico/tom diferente, para não se confundir com
  // um país.
  const labelOcde = "TAX WEDGE OCDE 2025 — SÓ IRS + SEGURANÇA SOCIAL";
  ctx.font = "600 20px Poppins, sans-serif";
  ctx.fillStyle = NAVY_MUTED;
  ctx.fillText(labelOcde, centerX, divisoria2Y + 44);

  const paises = [...oecdData.countries].sort((a, b) => b.taxWedgePercent - a.taxWedgePercent);
  const maiorValor = Math.max(...paises.map((p) => p.taxWedgePercent), oecdData.oecdAverage);

  const barsX = cardX + 64;
  const barsW = cardW - 128;
  let linhaY = divisoria2Y + 80;
  const alturaLinha = 74;
  const barH2 = 26;

  ctx.textAlign = "left";
  for (const pais of paises) {
    const ehPortugal = pais.code === "PT";
    ctx.font = ehPortugal ? "700 26px Poppins, sans-serif" : "500 26px Poppins, sans-serif";
    ctx.fillStyle = ehPortugal ? NAVY : NAVY_MUTED;
    ctx.fillText(pais.name_pt, barsX, linhaY);

    ctx.textAlign = "right";
    ctx.fillText(`${formatarPercentagemPT(pais.taxWedgePercent / 100)}%`, barsX + barsW, linhaY);
    ctx.textAlign = "left";

    const barY2 = linhaY + 14;
    ctx.fillStyle = BORDER;
    desenharRetanguloArredondado(ctx, barsX, barY2, barsW, barH2, barH2 / 2);
    ctx.fill();
    ctx.fillStyle = ehPortugal ? GREEN : "#AEB8C4";
    const largura = Math.max(barH2, (barsW * pais.taxWedgePercent) / maiorValor);
    desenharRetanguloArredondado(ctx, barsX, barY2, largura, barH2, barH2 / 2);
    ctx.fill();

    linhaY += alturaLinha;
  }

  // Média OCDE, como referência final, visualmente distinta (sem
  // barra própria — só a etiqueta, para não parecer mais um país).
  ctx.textAlign = "center";
  ctx.fillStyle = NAVY_MUTED;
  ctx.font = "italic 400 22px Poppins, sans-serif";
  ctx.fillText(
    `Média OCDE: ${formatarPercentagemPT(oecdData.oecdAverage / 100)}%`,
    centerX,
    linhaY + 6
  );

  // Aviso obrigatório de metodologia (spec §6.6) — nunca omitir.
  ctx.fillStyle = NAVY_MUTED;
  ctx.font = "400 21px Poppins, sans-serif";
  const disclaimerY = quebrarTexto(
    ctx,
    "O tax wedge da OCDE mede só IRS + Segurança Social. O teu resultado acima inclui também IVA, impostos especiais e patrimoniais — os dois números usam metodologias diferentes e não são diretamente equiparáveis.",
    centerX,
    linhaY + 46,
    cardW * 0.82,
    30
  );

  ctx.font = "400 21px Poppins, sans-serif";
  quebrarTexto(
    ctx,
    "Estimativa educativa — não é aconselhamento fiscal.",
    centerX,
    disclaimerY + 40,
    cardW * 0.82,
    30
  );

  desenharRodapeDominio(ctx, W, H, NAVY_MUTED, GOLD);
}

/**
 * Desenha a "card" branca com sombra + mancha decorativa subtil, usada
 * como fundo pelos três formatos de cartão — evita repetir o mesmo
 * bloco de código canvas três vezes.
 */
function desenharFundoDaCard(ctx, cardX, cardY, cardW, cardH, cardRadius, WHITE, MINT) {
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
}

/**
 * Domínio + acento dourado no rodapé, fora da card branca — sem isto,
 * uma Story/post reposto ou printado perde a hiperligação do Web Share
 * API (que só viaja com o texto, não com a imagem) e fica sem forma de
 * encontrar a app.
 */
function desenharRodapeDominio(ctx, W, H, NAVY_MUTED, GOLD) {
  ctx.textAlign = "center";
  ctx.fillStyle = NAVY_MUTED;
  ctx.font = "500 26px Poppins, sans-serif";
  ctx.fillText(SITE_LABEL, W / 2, H * 0.965);

  ctx.fillStyle = GOLD;
  ctx.beginPath();
  ctx.arc(W / 2, H * 0.982, 6, 0, Math.PI * 2);
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
 * número fixo de linhas (nem todo o texto cabe sempre numa só).
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
