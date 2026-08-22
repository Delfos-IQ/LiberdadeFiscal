// Liberdade Fiscal — Módulo de UI "Degradação Monetária"
//
// Rota secundária (22/08/2026, a pedido do autor — ver conversa sobre
// "salseo"/pensamento crítico e a ideia de degradação monetária/progressividade
// fria). Mesmo padrão de acesso que "benchmark-ocde": sem botão próprio
// na navegação principal, acedida a partir de um link no ecrã do Dia da
// Liberdade Fiscal.
//
// O que mostra: como o limite do 1.º escalão de IRS evoluiu, em termos
// nominais, entre 2021 e 2026 — e como essa evolução se compara com a
// inflação acumulada no mesmo período (INE). Não modela o IRS de um
// rendimento específico nem julga se a atualização foi "suficiente" —
// mostra os dois números lado a lado, tal como o benchmark OCDE mostra
// tax wedges lado a lado, e deixa o utilizador tirar as suas conclusões
// (CLAUDE.md §1, neutralidade política).
//
// Dados e fontes: ver o cabeçalho de data/degradacao-monetaria-2026.js.

import {
  DEGRADACAO_MONETARIA_2021_2026,
  calcularInflacaoAcumulada,
  calcularCrescimentoNominalEscalao,
} from "../data/degradacao-monetaria-2026.js";

export function render(container) {
  container.innerHTML = "";
  drawConteudo(container);

  return {
    destroy() {
      container.innerHTML = "";
    },
  };
}

function drawConteudo(container) {
  const { periodo, escaloesIRS } = DEGRADACAO_MONETARIA_2021_2026;

  const inflacao = calcularInflacaoAcumulada(periodo.inicio, periodo.fim);
  const nominal = calcularCrescimentoNominalEscalao(periodo.inicio, inflacao.anoFimReal);

  const card = el("section", "card");
  card.setAttribute("aria-labelledby", "degradacao-monetaria-heading");

  const heading = el("h1", null, "Degradação Monetária — a inflação e o IRS");
  heading.id = "degradacao-monetaria-heading";
  heading.tabIndex = -1;

  const desc = el(
    "p",
    null,
    "100€ de 2021 já não compram o mesmo que compravam nesse ano — os preços subiram. O IRS também tem um valor de referência que devia subir ao mesmo ritmo: o limite do 1.º escalão, que define até quanto se paga a taxa mais baixa de IRS. Se esse limite sobe menos do que os preços, uma pessoa cujo salário só acompanhou a inflação acaba a pagar um pouco mais de IRS do que antes — sem que nenhuma lei tenha subido nenhuma taxa."
  );

  const notaTermo = el(
    "p",
    "disclaimer",
    'Este efeito tem um nome técnico, caso queiras pesquisar mais sobre ele: "fiscal drag" ou "progressividade fria".'
  );

  const nota = el(
    "p",
    "disclaimer",
    "Esta secção compara a evolução do limite do 1.º escalão com a subida acumulada dos preços no mesmo período. Não recalcula o IRS de nenhum rendimento específico, nem diz se a atualização dos escalões foi insuficiente ou excessiva — mostra os números; a leitura é tua."
  );

  const voltarBtn = el("button", "btn btn--secondary", "← Voltar ao Dia da Liberdade");
  voltarBtn.type = "button";
  voltarBtn.addEventListener("click", () => {
    window.location.hash = "dia-liberdade";
  });

  card.append(heading, desc, notaTermo, nota, voltarBtn);
  container.append(card);

  // --- Comparação principal: nominal vs. inflação acumulada ---
  const compCard = el("section", "card");
  compCard.setAttribute("aria-labelledby", "degradacao-monetaria-comparacao-heading");
  const compHeading = el("h2", null, `${periodo.inicio}–${inflacao.anoFimReal}: o limite subiu tanto como os preços?`);
  compHeading.id = "degradacao-monetaria-comparacao-heading";

  const compWrapper = el("div", "benchmark-lista");
  const maiorValor = Math.max(nominal ? nominal.percent : 0, inflacao.percent);

  compWrapper.append(
    criarLinhaBarra(
      `Limite do 1.º escalão de IRS (${nominal.valorInicio.toLocaleString("pt-PT")} € → ${nominal.valorFim.toLocaleString(
        "pt-PT"
      )} €)`,
      nominal.percent,
      maiorValor
    ),
    criarLinhaBarra("Inflação acumulada (IPC, INE)", inflacao.percent, maiorValor, true)
  );

  const gap = Math.round((nominal.percent - inflacao.percent) * 10) / 10;
  const leituraTexto =
    gap < 0
      ? `Entre ${periodo.inicio} e ${inflacao.anoFimReal}, o limite subiu ${formatPercent(
          nominal.percent
        )} — mas os preços subiram mais, ${formatPercent(inflacao.percent)}. O limite ficou ${formatPercent(
          Math.abs(gap)
        )} atrás dos preços.`
      : gap > 0
      ? `Entre ${periodo.inicio} e ${inflacao.anoFimReal}, o limite subiu ${formatPercent(
          nominal.percent
        )} — mais do que os preços, que subiram ${formatPercent(inflacao.percent)}. O limite ficou ${formatPercent(
          gap
        )} à frente dos preços.`
      : `Entre ${periodo.inicio} e ${inflacao.anoFimReal}, o limite subiu exatamente ao mesmo ritmo dos preços (${formatPercent(
          inflacao.percent
        )}).`;

  const leitura = el("p", null, leituraTexto);

  const notaAnoCorrente = el(
    "p",
    "disclaimer",
    `A comparação usa ${inflacao.anoFimReal} como último ano fechado — ${periodo.fim} ainda está em curso à data desta investigação (22/08/2026) e o INE ainda não publicou a inflação média anual completa.`
  );

  compCard.append(compHeading, compWrapper, leitura, notaAnoCorrente);
  container.append(compCard);

  // --- Tabela ano a ano ---
  const tabelaCard = el("section", "card");
  tabelaCard.setAttribute("aria-labelledby", "degradacao-monetaria-tabela-heading");
  const tabelaHeading = el("h2", null, "Ano a ano");
  tabelaHeading.id = "degradacao-monetaria-tabela-heading";

  const tabela = document.createElement("table");
  tabela.className = "taximetro-escaloes";
  const thead = document.createElement("thead");
  thead.innerHTML =
    "<tr><th scope=\"col\">Ano</th><th scope=\"col\">Limite 1.º escalão</th><th scope=\"col\">Taxa normal</th><th scope=\"col\">Inflação (IPC)</th></tr>";
  const tbody = document.createElement("tbody");

  escaloesIRS.forEach((escalao) => {
    const ipcEntrada = DEGRADACAO_MONETARIA_2021_2026.inflacaoIPC.find((i) => i.ano === escalao.ano);
    const tr = document.createElement("tr");
    const ipcTexto =
      ipcEntrada && ipcEntrada.fechado
        ? `${formatPercent(ipcEntrada.taxaVariacaoMediaAnualPercent)}`
        : "ano em curso";
    tr.innerHTML = `<td>${escalao.ano}</td><td>${escalao.limite1Escalao.toLocaleString("pt-PT")} €</td><td>${formatPercent(
      escalao.taxaNormalPercent
    )}</td><td>${ipcTexto}</td>`;
    tbody.append(tr);
  });

  tabela.append(thead, tbody);
  tabelaCard.append(tabelaHeading, tabela);

  const notaFonte = el(
    "p",
    "disclaimer",
    `Fonte do limite de escalão e taxa: ${DEGRADACAO_MONETARIA_2021_2026.fonteIRS}. Fonte da inflação: ${DEGRADACAO_MONETARIA_2021_2026.fonteIPC}. ${DEGRADACAO_MONETARIA_2021_2026.retrievedNote}`
  );
  const notaTaxa2024 = escaloesIRS.find((e) => e.notaTaxa);
  tabelaCard.append(notaFonte);
  if (notaTaxa2024) {
    tabelaCard.append(el("p", "disclaimer", `${notaTaxa2024.ano}: ${notaTaxa2024.notaTaxa}`));
  }

  container.append(tabelaCard);

  const voltarCard = el("section", "card");
  const voltarBtnFundo = el("button", "btn btn--secondary", "← Voltar ao Dia da Liberdade");
  voltarBtnFundo.type = "button";
  voltarBtnFundo.addEventListener("click", () => {
    window.location.hash = "dia-liberdade";
  });
  voltarCard.append(voltarBtnFundo);
  container.append(voltarCard);

  focusHeading(heading);
}

function criarLinhaBarra(nome, percent, maiorValor, destaque = false) {
  const linha = el("div", "benchmark-linha");
  if (destaque) linha.classList.add("benchmark-linha--utilizador");

  const label = el("span", "benchmark-linha__label", nome);
  const barraWrapper = el("span", "benchmark-linha__barra-wrapper");
  const barra = el("span", "benchmark-linha__barra");
  const largura = maiorValor > 0 ? Math.min(100, (percent / maiorValor) * 100) : 0;
  barra.style.width = `${largura}%`;
  barraWrapper.append(barra);
  const valor = el("span", "benchmark-linha__valor", formatPercent(percent));

  linha.append(label, barraWrapper, valor);
  return linha;
}

/* ----------------------------- Utilitários ----------------------------- */

function el(tag, className, textContent) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (textContent !== undefined) node.textContent = textContent;
  return node;
}

function formatPercent(value) {
  return `${new Intl.NumberFormat("pt-PT", { maximumFractionDigits: 1 }).format(value)}%`;
}

function focusHeading(headingEl) {
  if (headingEl) headingEl.focus({ preventScroll: false });
}
