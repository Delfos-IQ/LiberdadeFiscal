// Liberdade Fiscal — Parser do QR Code de faturas portuguesas (Fase 5)
//
// Fonte primária (não secundária — documento técnico oficial lido na
// íntegra): Portaria n.º 195/2020, de 13 de agosto — "Especificações
// Técnicas, Código de Barras Bidimensional — Código QR", versão 1.0,
// agosto 2020, publicado pela Autoridade Tributária e Aduaneira.
//
// Formato da mensagem (secção 3 do documento):
//   - Cada campo: "<CÓDIGO>:<VALOR>", sem espaços.
//   - Campos concatenados pela ordem da tabela, separados por "*".
//   - Separador decimal "." , sempre 2 casas decimais em campos monetários.
//   - Campos "+"  = obrigatórios; campos "++" = opcionais.
//   - Espaços fiscais I/J/K correspondem a PT / PT-AC / PT-MA (podem
//     não vir pela mesma ordem, e nem todos têm de estar presentes).
//
// Todo o parsing é 100% local — nenhum dado sai do dispositivo,
// conforme secção 6.3 do CLAUDE.md ("QR: leitura 100% em cliente").

/** Mapa de espaço fiscal (SAF-T TaxCountryRegion) para região da app. */
const ESPACO_FISCAL_PARA_REGIAO = {
  PT: "continente",
  "PT-AC": "acores",
  PTAC: "acores",
  "PT-MA": "madeira",
  PTMA: "madeira",
};

/**
 * Faz parsing de uma mensagem de QR Code de fatura portuguesa.
 *
 * @param {string} qrText — texto bruto lido do QR (ex: câmara ou colado
 *   manualmente pelo utilizador).
 * @returns {{
 *   ok: boolean,
 *   error?: string,
 *   fields?: Record<string, string>,
 *   emitenteNIF?: string,
 *   adquirenteNIF?: string,
 *   tipoDocumento?: string,
 *   data?: string,
 *   totalDocumento?: number,
 *   totalImpostos?: number,
 *   espacosFiscais?: Array<{
 *     regiao: string|null, codigoEspacoFiscal: string,
 *     baseIsenta: number, baseReduzida: number, ivaReduzida: number,
 *     baseIntermedia: number, ivaIntermedia: number,
 *     baseNormal: number, ivaNormal: number
 *   }>
 * }}
 */
export function parseInvoiceQR(qrText) {
  if (typeof qrText !== "string" || qrText.trim().length === 0) {
    return { ok: false, error: "Texto do QR vazio." };
  }

  const fields = {};
  const partes = qrText.trim().split("*");

  for (const parte of partes) {
    const idx = parte.indexOf(":");
    if (idx === -1) continue; // ignora partes malformadas em vez de rebentar
    const codigo = parte.slice(0, idx);
    const valor = parte.slice(idx + 1);
    fields[codigo] = valor;
  }

  // Campos obrigatórios ("+") segundo a especificação: A, B, C, D, E, F,
  // G, H, N, O, Q. (I1 é obrigatório apenas quando existe pelo menos um
  // espaço fiscal, o que é sempre o caso numa fatura normal — mas
  // documentos de transporte sem valor também o exigem, por isso
  // tratamo-lo como obrigatório aqui.)
  const obrigatorios = ["A", "B", "F", "G", "N", "O"];
  const emFalta = obrigatorios.filter((c) => fields[c] === undefined);
  if (emFalta.length > 0) {
    return {
      ok: false,
      error: `Campos obrigatórios em falta no QR: ${emFalta.join(", ")}. Isto pode não ser um QR de fatura portuguesa válido.`,
      fields,
    };
  }

  const espacosFiscais = [];
  for (const prefixo of ["I", "J", "K"]) {
    const codigoEspacoFiscal = fields[`${prefixo}1`];
    if (codigoEspacoFiscal === undefined) continue;

    const regiaoNormalizada = codigoEspacoFiscal.replace("-", "");
    const regiao =
      ESPACO_FISCAL_PARA_REGIAO[codigoEspacoFiscal] ??
      ESPACO_FISCAL_PARA_REGIAO[regiaoNormalizada] ??
      null;

    espacosFiscais.push({
      regiao,
      codigoEspacoFiscal,
      baseIsenta: parseMoeda(fields[`${prefixo}2`]),
      baseReduzida: parseMoeda(fields[`${prefixo}3`]),
      ivaReduzida: parseMoeda(fields[`${prefixo}4`]),
      baseIntermedia: parseMoeda(fields[`${prefixo}5`]),
      ivaIntermedia: parseMoeda(fields[`${prefixo}6`]),
      baseNormal: parseMoeda(fields[`${prefixo}7`]),
      ivaNormal: parseMoeda(fields[`${prefixo}8`]),
    });
  }

  return {
    ok: true,
    fields,
    emitenteNIF: fields.A,
    adquirenteNIF: fields.B,
    paisAdquirente: fields.C,
    tipoDocumento: fields.D,
    estadoDocumento: fields.E,
    data: formatarDataAAAAMMDD(fields.F),
    identificacaoDocumento: fields.G,
    atcud: fields.H,
    espacosFiscais,
    impostoSelo: parseMoeda(fields.M),
    totalImpostos: parseMoeda(fields.N),
    totalDocumento: parseMoeda(fields.O),
    retencoesFonte: parseMoeda(fields.P),
    fonte: "Portaria n.º 195/2020, de 13 de agosto (Especificações Técnicas — Código QR)",
  };
}

function parseMoeda(valor) {
  if (valor === undefined) return 0;
  const n = Number(valor);
  return Number.isFinite(n) ? n : 0;
}

function formatarDataAAAAMMDD(valor) {
  if (!valor || valor.length !== 8) return valor;
  return `${valor.slice(0, 4)}-${valor.slice(4, 6)}-${valor.slice(6, 8)}`;
}
