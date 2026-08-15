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
  const percentagem = Math.round(resultado.percentage * 1000) / 10; // 1 casa decimal

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
 * módulo chamador. Usa só a paleta de marca (secção 4 do CLAUDE.md).
 *
 * @param {HTMLCanvasElement} canvas
 * @param {{ ano: number, date: string, dayOfYear: number, percentage: number }} resultado
 */
export function desenharCartaoCanvas(canvas, resultado) {
  const ctx = canvas.getContext("2d");
  const W = canvas.width;
  const H = canvas.height;

  // Fundo navy — paleta confirmada (secção 4 do CLAUDE.md).
  ctx.fillStyle = "#0D1321";
  ctx.fillRect(0, 0, W, H);

  ctx.textAlign = "center";
  ctx.fillStyle = "#7EEBC1";
  ctx.font = "600 42px Poppins, sans-serif";
  ctx.fillText("Liberdade Fiscal", W / 2, H * 0.16);

  ctx.fillStyle = "#F1F3F5";
  ctx.font = "400 32px Poppins, sans-serif";
  ctx.fillText(`Portugal · ${resultado.ano}`, W / 2, H * 0.22);

  ctx.fillStyle = "#22C55E";
  ctx.font = "700 96px Poppins, sans-serif";
  const dataFormatada = formatarDataPT(resultado.date);
  quebrarTexto(ctx, dataFormatada, W / 2, H * 0.42, W * 0.85, 100);

  ctx.fillStyle = "#FFFFFF";
  ctx.font = "400 36px Poppins, sans-serif";
  const percentagem = Math.round(resultado.percentage * 1000) / 10;
  ctx.fillText(`${resultado.dayOfYear} dias do ano · ≈${percentagem}%`, W / 2, H * 0.58);

  ctx.fillStyle = "#F6C453";
  ctx.font = "400 26px Poppins, sans-serif";
  quebrarTexto(
    ctx,
    "Estimativa educativa, segundo as hipóteses da simulação — não é aconselhamento fiscal.",
    W / 2,
    H * 0.88,
    W * 0.8,
    36
  );
}

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
}

function formatarDataPT(isoDate) {
  const [ano, mes, dia] = isoDate.split("-").map(Number);
  const data = new Date(Date.UTC(ano, mes - 1, dia));
  return new Intl.DateTimeFormat("pt-PT", { day: "numeric", month: "long", timeZone: "UTC" }).format(data);
}
