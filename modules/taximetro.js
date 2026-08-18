// Liberdade Fiscal — Módulo de UI do Taxímetro (Fase 4)
//
// Modo Rápido: formulário mínimo (salário bruto, estado civil,
// dependentes, tipo de trabalhador, região) — pensado para <60s de
// preenchimento (spec §6.2). Modo Avançado acrescenta precisão: idade
// exata de cada dependente em vez de uma contagem simples (afeta o
// valor real da dedução, ver TAX-METHODOLOGY.md).
//
// Âmbito consciente desta fase: "tipo de contrato" (spec §6.2, Modo
// Avançado) não é modelado porque, verificado o Código do Trabalho e
// o CIRS, o tipo de vínculo contratual (efetivo/termo) não altera o
// cálculo de IRS ou TSU de 2026 por si só — só o TIPO de trabalhador
// (dependente vs. independente) o faz, e esse já está coberto. Incluir
// um seletor de tipo de contrato sem ligação nenhuma ao cálculo seria
// enganar o utilizador a pensar que influencia o resultado. Fica
// registado aqui para não parecer um esquecimento.

import { calcularCadeiaSalarial, calcularCadeiaSalarialConjunta } from "../data/tax-engine.js";
import { atualizarPeriodoAtual, getPeriodoAtual } from "../data/db.js";

const REGIOES = [
  { value: "continente", label: "Continente" },
  { value: "acores", label: "Açores" },
  { value: "madeira", label: "Madeira" },
];

export function render(container) {
  let state = {
    phase: "form",
    modo: "rapido",
    salarioBruto: "",
    salarioBrutoConjuge: "", // roadmap P3-15 — só usado quando estadoCivil === "conjunta"
    estadoCivil: "individual",
    tipoTrabalhador: "dependente",
    regiao: "continente",
    numDependentesRapido: 0,
    dependentesAvancado: [],
    erro: null,
    resultado: null,
  };
  let destroyed = false;

  // O render() em si é síncrono (desenha o formulário vazio de
  // imediato), mas se o período atual já tiver um resultado de
  // Rendimentos guardado (ex.: o utilizador já preencheu isto e só
  // está a voltar a este ecrã vindo de Gastos/Taxas), voltamos a
  // desenhar em "result" assim que o IndexedDB responder — sem isto o
  // ecrã parecia ter "esquecido" os dados, mesmo com o período a
  // manter tudo internamente (o Dia da Liberdade continuava correto).
  getPeriodoAtual()
    .then((periodo) => {
      if (destroyed || state.phase !== "form" || !periodo.rendimentos) return;
      state.resultado = periodo.rendimentos;
      state.usouSimplificacaoDependentes = Boolean(periodo.rendimentos.usouSimplificacaoDependentes);
      state.phase = "result";
      draw();
    })
    // Se o IndexedDB não estiver disponível (ex.: navegação privada em
    // certos browsers), falha em silêncio — o formulário vazio já
    // desenhado continua a funcionar, só sem re-hidratação.
    .catch(() => {});

  function draw() {
    container.innerHTML = "";
    if (state.phase === "form") drawForm();
    else drawResult();
  }

  function handleSubmit(event) {
    event.preventDefault();

    const salario = Number(state.salarioBruto);
    if (!Number.isFinite(salario) || salario <= 0) {
      state.erro = "Introduz um salário bruto mensal válido, maior que zero.";
      draw();
      return;
    }

    const dependentes =
      state.modo === "avancado"
        ? state.dependentesAvancado
        : Array.from({ length: state.numDependentesRapido }, () => ({ idade: 10 }));
    // No Modo Rápido assumimos idade > 3 anos para cada dependente
    // (dedução de 600€/ano cada) como simplificação conservadora —
    // comunicado explicitamente no ecrã de resultado, nunca escondido.

    // Roadmap P3-15 (agregado familiar): se o utilizador escolheu
    // declaração conjunta E preencheu um segundo rendimento, usamos a
    // cadeia de dois rendimentos (soma os coletáveis antes de aplicar
    // o quociente familiar — Art. 69.º CIRS). Se deixou o campo do
    // cônjuge em branco, mantemos o comportamento anterior (quociente
    // aplicado a um único rendimento) — não obrigamos ninguém a
    // preencher um segundo salário só porque assinalou "conjunta".
    const salarioConjuge = Number(state.salarioBrutoConjuge);
    const temSegundoRendimento =
      state.estadoCivil === "conjunta" && state.salarioBrutoConjuge !== "" && Number.isFinite(salarioConjuge);

    if (state.estadoCivil === "conjunta" && state.salarioBrutoConjuge !== "" && (!Number.isFinite(salarioConjuge) || salarioConjuge < 0)) {
      state.erro = "O rendimento do cônjuge/unido de facto tem de ser um número válido, maior ou igual a zero (ou deixa o campo em branco).";
      draw();
      return;
    }

    try {
      const resultado = temSegundoRendimento
        ? calcularCadeiaSalarialConjunta(salario, salarioConjuge, {
            regiao: state.regiao,
            dependentes,
          })
        : calcularCadeiaSalarial(salario, {
            tipoTrabalhador: state.tipoTrabalhador,
            estadoCivil: state.estadoCivil,
            dependentes,
            regiao: state.regiao,
          });
      state.erro = null;
      state.resultado = resultado;
      state.usouSimplificacaoDependentes = state.modo === "rapido" && dependentes.length > 0;
      state.phase = "result";
    } catch (err) {
      state.erro = `Não foi possível calcular: ${err.message}`;
    }
    draw();
  }

  function voltarAoFormulario() {
    state.phase = "form";
    draw();
  }

  function drawForm() {
    const card = el("section", "card");
    card.setAttribute("aria-labelledby", "taximetro-heading");

    const heading = el("h1", null, "Rendimentos");
    heading.id = "taximetro-heading";
    heading.tabIndex = -1;

    const desc = el(
      "p",
      null,
      "Descobre, em menos de um minuto, quanto do teu salário bruto fica realmente contigo."
    );

    const modeToggle = el("div", "taximetro-mode-toggle");
    modeToggle.setAttribute("role", "group");
    modeToggle.setAttribute("aria-label", "Modo do simulador");
    const rapidoBtn = el("button", state.modo === "rapido" ? "btn btn--primary" : "btn btn--secondary", "Modo Rápido");
    const avancadoBtn = el("button", state.modo === "avancado" ? "btn btn--primary" : "btn btn--secondary", "Modo Avançado");
    rapidoBtn.type = "button";
    avancadoBtn.type = "button";
    rapidoBtn.setAttribute("aria-pressed", String(state.modo === "rapido"));
    avancadoBtn.setAttribute("aria-pressed", String(state.modo === "avancado"));
    rapidoBtn.addEventListener("click", () => {
      state.modo = "rapido";
      draw();
    });
    avancadoBtn.addEventListener("click", () => {
      state.modo = "avancado";
      draw();
    });
    modeToggle.append(rapidoBtn, avancadoBtn);

    const form = el("form");
    form.noValidate = true;
    form.addEventListener("submit", handleSubmit);

    form.append(
      fieldNumber(
        "salario-bruto",
        "Salário bruto mensal",
        state.salarioBruto,
        (v) => {
          state.salarioBruto = v;
        },
        { euro: true }
      ),
      fieldSelect(
        "tipo-trabalhador",
        "Tipo de trabalhador",
        [
          { value: "dependente", label: "Por conta de outrem" },
          { value: "independente", label: "Independente (recibos verdes)" },
        ],
        state.tipoTrabalhador,
        (v) => {
          state.tipoTrabalhador = v;
        }
      ),
      fieldSelect(
        "estado-civil",
        "Estado civil (para efeitos de IRS)",
        [
          { value: "individual", label: "Solteiro(a) / declaração individual" },
          { value: "conjunta", label: "Casado(a) ou união de facto — declaração conjunta" },
        ],
        state.estadoCivil,
        (v) => {
          state.estadoCivil = v;
          draw();
        }
      ),
      fieldSelect("regiao", "Região", REGIOES, state.regiao, (v) => {
        state.regiao = v;
      })
    );

    if (state.estadoCivil === "conjunta") {
      // Roadmap P3-15: campo opcional para o rendimento do
      // cônjuge/unido de facto. Se ficar em branco, mantemos o
      // comportamento anterior (quociente familiar sobre um único
      // rendimento) — só ativamos a cadeia de dois rendimentos quando
      // este campo tem um valor.
      form.append(
        fieldNumber(
          "salario-bruto-conjuge",
          "Rendimento bruto mensal do cônjuge/unido de facto (opcional)",
          state.salarioBrutoConjuge,
          (v) => {
            state.salarioBrutoConjuge = v;
          },
          { euro: true }
        )
      );
      form.append(
        el(
          "p",
          "stat-label",
          "Se preencheres este campo, somamos os dois rendimentos coletáveis antes de aplicar o quociente familiar (Art. 69.º CIRS) — mais rigoroso do que assumir que só há um rendimento no agregado. A Segurança Social continua a ser calculada em separado para cada pessoa."
        )
      );
    }

    if (state.modo === "rapido") {
      form.append(
        fieldNumber("num-dependentes", "Número de dependentes", state.numDependentesRapido, (v) => {
          state.numDependentesRapido = Math.max(0, Math.round(Number(v) || 0));
        }, { min: 0, step: 1 })
      );
      const nota = el(
        "p",
        "stat-label",
        "Modo Rápido: assume que cada dependente tem mais de 3 anos. Para um valor mais preciso, usa o Modo Avançado."
      );
      form.append(nota);
    } else {
      form.append(drawDependentesAvancado());
    }

    if (state.erro) {
      const erroEl = el("p", "form-error", state.erro);
      erroEl.setAttribute("role", "alert");
      form.append(erroEl);
    }

    const submitBtn = el("button", "btn btn--primary", "Calcular");
    submitBtn.type = "submit";
    form.append(submitBtn);

    card.append(heading, desc, modeToggle, form);
    container.append(card);
    focusHeading(heading);
  }

  function drawDependentesAvancado() {
    const wrapper = el("div", "taximetro-dependentes");
    const label = el("p", "stat-label", "Dependentes (idade de cada um)");
    wrapper.append(label);

    state.dependentesAvancado.forEach((dep, index) => {
      const row = el("div", "taximetro-dependente-row");
      const input = document.createElement("input");
      input.type = "number";
      input.min = "0";
      input.max = "30";
      input.value = String(dep.idade);
      input.setAttribute("aria-label", `Idade do dependente ${index + 1}`);
      input.addEventListener("input", (e) => {
        state.dependentesAvancado[index].idade = Number(e.target.value) || 0;
      });

      const removeBtn = el("button", "btn btn--secondary", "Remover");
      removeBtn.type = "button";
      removeBtn.addEventListener("click", () => {
        state.dependentesAvancado.splice(index, 1);
        draw();
      });

      row.append(input, removeBtn);
      wrapper.append(row);
    });

    const addBtn = el("button", "btn btn--secondary", "+ Adicionar dependente");
    addBtn.type = "button";
    addBtn.addEventListener("click", () => {
      state.dependentesAvancado.push({ idade: 10 });
      draw();
    });
    wrapper.append(addBtn);

    return wrapper;
  }

  function drawResult() {
    const r = state.resultado;
    const card = el("section", "card");
    card.setAttribute("aria-labelledby", "taximetro-result-heading");

    const heading = el("h1", null, "O teu Rendimento");
    heading.id = "taximetro-result-heading";
    heading.tabIndex = -1;

    const ehAgregado = r.modo === "conjunta-dois-rendimentos";

    const liquido = el("p", "stat-hero stat-hero--green", formatEUR(r.salarioLiquidoMensal));
    const liquidoLabel = el(
      "p",
      "stat-label",
      ehAgregado ? "Rendimento líquido mensal estimado do agregado" : "Salário líquido mensal estimado"
    );

    // Cadeia completa e explícita — nunca um único número sem dizer o
    // que representa (spec §6.2).
    const cadeia = el("dl", "taximetro-cadeia");
    appendCadeiaItem(cadeia, "Custo total para o empregador", r.custoTotalEmpregadorMensal, r.tipoTrabalhador === "independente");
    appendCadeiaItem(cadeia, ehAgregado ? "Rendimento bruto combinado do agregado" : "Salário bruto", r.salarioBrutoMensal);
    appendCadeiaItem(cadeia, "Segurança Social", -r.descontoSSMensal);
    appendCadeiaItem(cadeia, "IRS estimado", -r.irsEstimadoMensal);
    appendCadeiaItem(cadeia, ehAgregado ? "Rendimento líquido combinado" : "Salário líquido", r.salarioLiquidoMensal, false, true);

    let porPessoa = null;
    if (ehAgregado) {
      porPessoa = el("dl", "taximetro-cadeia");
      appendCadeiaItem(porPessoa, "Pessoa A — rendimento bruto", r.pessoaA.salarioBrutoMensal);
      appendCadeiaItem(porPessoa, "Pessoa A — Segurança Social", -r.pessoaA.descontoSSMensal);
      appendCadeiaItem(porPessoa, "Pessoa B — rendimento bruto", r.pessoaB.salarioBrutoMensal);
      appendCadeiaItem(porPessoa, "Pessoa B — Segurança Social", -r.pessoaB.descontoSSMensal);
    }

    let perguntasCusto = null;
    if (r.tipoTrabalhador !== "independente") {
      perguntasCusto = drawPerguntasCustoEmpregador(r);
    }

    const detalhes = el("details");
    const summary = document.createElement("summary");
    summary.textContent = "Como chegámos a este número?";
    const explicacao = el(
      "div",
      null
    );
    explicacao.innerHTML = "";
    explicacao.append(
      el("p", null, r.metodologia),
      el(
        "p",
        null,
        `Rendimento coletável anual: ${formatEUR(r.detalheAnual.rendimentoColetavelAnual)} · Taxa efetiva de IRS: ${(r.detalheAnual.irs.taxaEfetiva * 100).toFixed(2)}%`
      )
    );

    // Tabela de escalões de IRS efetivamente aplicados — cada escalão
    // com a sua taxa marginal em %, já com o diferencial regional
    // descontado quando aplicável (pedido explícito: mostrar os
    // tramos/escalões em percentagem, não só a taxa efetiva agregada).
    const escaloesTabela = document.createElement("table");
    escaloesTabela.className = "taximetro-escaloes";
    const thead = document.createElement("thead");
    thead.innerHTML = "<tr><th>Escalão</th><th>Rendimento</th><th>Taxa</th><th>Imposto</th></tr>";
    const tbody = document.createElement("tbody");
    r.detalheAnual.irs.decomposicaoPorEscalao.forEach((esc) => {
      const tr = document.createElement("tr");
      const limiteSup = esc.max === Infinity ? "∞" : formatEUR(esc.max);
      tr.innerHTML = `<td>${esc.escalao}.º</td><td>${formatEUR(esc.min)} – ${limiteSup}</td><td>${(esc.taxa * 100).toFixed(2)}%</td><td>${formatEUR(esc.imposto)}</td>`;
      tbody.append(tr);
    });
    escaloesTabela.append(thead, tbody);
    explicacao.append(escaloesTabela);

    explicacao.append(
      el(
        "p",
        "disclaimer",
        "Fonte: Lei n.º 73-A/2025 (Orçamento do Estado 2026), Art. 68.º e 68.º-A do CIRS (escalões de IRS) e taxas de TSU da Segurança Social 2026."
      )
    );

    if (r.deducaoAnualPorDependentes > 0) {
      explicacao.append(
        el(
          "p",
          null,
          `Dedução anual por dependentes aplicada: ${formatEUR(r.deducaoAnualPorDependentes)}${state.usouSimplificacaoDependentes ? " (Modo Rápido: assumiu-se idade superior a 3 anos para cada dependente)" : ""}.`
        )
      );
    }

    if (r.taxaSolidariedadeAnual > 0) {
      const avisoSolidariedade = el(
        "p",
        "disclaimer",
        `Este cálculo inclui a Taxa Adicional de Solidariedade (Art. 68.º-A do CIRS), que incide sobre rendimentos coletáveis mais elevados: ${formatEUR(r.taxaSolidariedadeAnual)}/ano, já somados ao IRS estimado acima. Aplicámos o quociente familiar e a redução regional confirmada para os Açores, mas a forma exata como esta taxa interage com a dedução por dependentes ainda não está totalmente esclarecida na fonte legal — trata este valor como uma estimativa nossa (🟡 ESTIMATE), não como um valor oficial.`
      );
      explicacao.append(avisoSolidariedade);
    }

    if (r.detalheAnual.irs.diferencialRegionalAplicado) {
      const avisoRegional = el(
        "p",
        null,
        "Este cálculo inclui uma redução de IRS para a região autónoma que escolheste (já refletida na tabela de escalões acima). Ainda não conseguimos confirmar o mecanismo exato deste diferencial regional contra a fonte legal primária — trata este valor como uma estimativa nossa, não como um valor oficial."
      );
      avisoRegional.className = "disclaimer";
      explicacao.append(avisoRegional);
    }

    detalhes.append(summary, explicacao);

    const backBtn = el("button", "btn btn--secondary", "Simular outro valor");
    backBtn.type = "button";
    backBtn.addEventListener("click", voltarAoFormulario);

    const avancarBtn = el("button", "btn btn--primary", "Guardar e avançar →");
    avancarBtn.type = "button";
    avancarBtn.addEventListener("click", async () => {
      // usouSimplificacaoDependentes vive em state, não no resultado do
      // motor fiscal — anexamo-lo aqui para sobreviver à persistência e
      // podermos mostrar o mesmo aviso quando o ecrã for re-hidratado.
      await atualizarPeriodoAtual({
        rendimentos: { ...r, usouSimplificacaoDependentes: state.usouSimplificacaoDependentes },
      });
      window.location.hash = "faturas";
    });

    const botoes = el("div", "taximetro-botoes");
    botoes.append(avancarBtn, backBtn);

    const privacidade = el(
      "p",
      "stat-label",
      "🔒 Este cálculo acontece só neste dispositivo. Nada do que introduzires é enviado para nenhum servidor."
    );

    card.append(heading, liquido, liquidoLabel, cadeia);
    if (porPessoa) {
      card.append(
        el(
          "p",
          "stat-label",
          "Por pessoa (a Segurança Social é sempre individual — só o IRS é calculado em conjunto):"
        ),
        porPessoa
      );
    }
    if (perguntasCusto) card.append(perguntasCusto);
    card.append(detalhes, privacidade, botoes);
    container.append(card);
    focusHeading(heading);
  }

  /**
   * Bloco educativo em formato pergunta/resposta sobre o "custo total
   * para o empregador" — pedido explícito do autor (agosto de 2026): o
   * trabalhador só vê o salário bruto e o líquido, mas contratar
   * alguém custa mais do que o bruto por causa da TSU patronal (23,75%
   * dos 34,75% de TSU total são pagos pela entidade patronal, não
   * descontados ao trabalhador — ver TAX-METHODOLOGY.md secção 2).
   *
   * NOTA IMPORTANTE (verificado 15/08/2026): o utilizador presumiu que
   * o FGCT (0,075%) e o FCT (0,925%) também fariam parte deste custo.
   * Investigação contra fontes primárias mostra o contrário para 2026:
   * o FCT terminou definitivamente a 1/1/2024 (DL 115/2023) e o FGCT
   * está suspenso desde 1/5/2023 até final de 2026 (Lei 13/2023, Art.
   * 32.º) — o custo real destes dois fundos é €0 este ano. Por isso
   * NÃO entram na conta abaixo; ficam mencionados para não desaparecer
   * silenciosamente do raciocínio, com uma nota para reconfirmar em
   * janeiro de 2027.
   */
  function drawPerguntasCustoEmpregador(r) {
    const wrap = el("div", "taximetro-perguntas");
    const heading = el("h2", null, "O que é o \"custo total para o empregador\"?");

    const tsuPatronalMensal = round2(r.salarioBrutoMensal * 0.2375);
    const tsuTrabalhadorMensal = round2(r.salarioBrutoMensal * 0.11);

    const p1 = el(
      "p",
      null,
      "Contratar-te custa mais à empresa do que o teu salário bruto. A Segurança Social (TSU) tem uma taxa total de 34,75% sobre o teu salário bruto, mas repartida: 11% descontados a ti (já contado acima, em \"Segurança Social\") e 23,75% pagos pela empresa, por cima do teu bruto — um custo que nunca aparece no teu recibo de vencimento."
    );

    const dl = el("dl", "taximetro-cadeia");
    appendCadeiaItem(dl, "TSU paga por ti (11%, já descontada)", -tsuTrabalhadorMensal);
    appendCadeiaItem(dl, "TSU paga pela empresa (23,75%, por cima do bruto)", tsuPatronalMensal);

    const p2 = el(
      "p",
      null,
      "Existem também dois fundos que, em anos normais, a empresa paga por cima disto — o Fundo de Compensação do Trabalho (FCT, 0,925%) e o Fundo de Garantia de Compensação do Trabalho (FGCT, 0,075%). Em 2026 o seu custo real é €0: o FCT terminou em 2024 e o FGCT está suspenso até ao final de 2026 — por isso não entram na conta acima. Fonte: Decreto-Lei 115/2023 e Lei 13/2023, Art. 32.º. Este é o tipo de detalhe que pode mudar de um ano para o outro sem que ninguém avise o trabalhador — vale a pena voltar a olhar para isto de vez em quando."
    );

    wrap.append(heading, p1, dl, p2);
    return wrap;
  }

  draw();

  return {
    destroy() {
      destroyed = true;
      container.innerHTML = "";
    },
  };
}

/* -----------------------------
   Utilitários de DOM
   ----------------------------- */

function el(tag, className, textContent) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (textContent !== undefined) node.textContent = textContent;
  return node;
}

function fieldNumber(id, labelText, value, onChange, attrs = {}) {
  const wrapper = el("div", "taximetro-field");
  const label = document.createElement("label");
  label.htmlFor = id;
  label.textContent = labelText;
  const input = document.createElement("input");
  input.type = "number";
  input.id = id;
  input.name = id;
  input.value = value === "" ? "" : String(value);
  input.min = attrs.min !== undefined ? String(attrs.min) : "0";
  if (attrs.step !== undefined) input.step = String(attrs.step);
  input.addEventListener("input", (e) => onChange(e.target.value));
  if (attrs.euro) {
    const inputWrap = el("div", "input-euro");
    inputWrap.append(input);
    wrapper.append(label, inputWrap);
  } else {
    wrapper.append(label, input);
  }
  return wrapper;
}

function fieldSelect(id, labelText, options, value, onChange) {
  const wrapper = el("div", "taximetro-field");
  const label = document.createElement("label");
  label.htmlFor = id;
  label.textContent = labelText;
  const select = document.createElement("select");
  select.id = id;
  select.name = id;
  options.forEach((opt) => {
    const optionEl = document.createElement("option");
    optionEl.value = opt.value;
    optionEl.textContent = opt.label;
    optionEl.selected = opt.value === value;
    select.append(optionEl);
  });
  select.addEventListener("change", (e) => onChange(e.target.value));
  wrapper.append(label, select);
  return wrapper;
}

function appendCadeiaItem(dl, label, value, oculto = false, destaque = false) {
  if (oculto) return;
  const dt = el("dt", destaque ? "stat-label" : null, label);
  const sinal = value < 0 ? "− " : "";
  const dd = el("dd", destaque ? "stat-label" : null, `${sinal}${formatEUR(Math.abs(value))}`);
  dl.append(dt, dd);
}

function formatEUR(value) {
  return new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" }).format(value);
}

function round2(value) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function focusHeading(headingEl) {
  headingEl.focus({ preventScroll: false });
}
