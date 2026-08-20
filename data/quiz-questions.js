// Liberdade Fiscal — Banco de perguntas do Quiz (Fase 3)
//
// 36 perguntas originais (Fase 3, 15/08/2026), cada uma com fonte
// rastreável. A maioria assenta nos parâmetros já verificados em
// data/tax-rules/2026/ (Fase 2) — ver TAX-METHODOLOGY.md. Perguntas de
// definição geral (o que é cada imposto, prazos) foram confirmadas por
// pesquisa web adicional em 15/08/2026. Nenhuma pergunta usa um valor
// marcado UNKNOWN ou ESTIMATE nos dados da Fase 2 — isso seria ensinar
// um número não verificado como se fosse facto.
//
// Tanda 2 (18/08/2026, a pedido do autor, +24 perguntas, total 60):
// todas as perguntas novas foram extraídas diretamente dos ficheiros
// de dados já verificados desta app (data/tax-rules/2026/*.js e
// data/oecd-benchmark-2025.js), incluindo factos que só ficaram
// verificados após a ronda de investigação do roadmap P1-8 (IABA,
// ISV, IUC) — sem pesquisa nova nem uso dos PDFs enviados pelo autor
// nessa sessão (um deles tem orientação económica declarada,
// incompatível com a neutralidade política exigida pelo spec §1). Tal
// como na tanda original, nenhuma pergunta usa um valor marcado
// ESTIMATE/UNKNOWN no ficheiro de origem.
//
// Tanda 3 (19/08/2026, a pedido do autor: "aumentar o quiz de 60 a
// 100 perguntas e fechamos aí" — decisão explícita de não escalar até
// às 200 previstas no spec original): +40 perguntas, total 100, teto
// definitivo. Mesma disciplina das tandas anteriores — todas extraídas
// de campos já "verified" em data/tax-rules/2026/*.js e
// data/oecd-benchmark-2025.js (nenhuma pergunta nova usa um valor
// ESTIMATE/UNKNOWN, ex.: o ISP não aparece com nenhum valor numérico
// concreto, só a pergunta conceptual já existente sobre a sua
// volatilidade; a tabela de concelhos do IMI, marcada ESTIMATE, também
// não é usada). Cobre sobretudo conteúdo verificado nas rondas de
// 18-19/08/2026 que ainda não tinha pergunta própria: regime
// simplificado de trabalhadores independentes (IRS e SS), diferencial
// regional de IRS (Açores/Madeira), IVA reduzido/intermédio por
// região, produtos de tabaco e álcool completados no folheto da AT
// (tabaco aquecido, charutos, líquidos de cigarro eletrónico, "outras
// bebidas fermentadas", produtos intermédios), CAV, Taxa Municipal
// Turística, categorias F/G e recargo de altas emissões do IUC,
// critérios do desconto PHEV no ISV, verbas adicionais do Imposto de
// Selo, e mais dois países do benchmark OCDE. Inclui também uma
// pergunta meta sobre a própria disciplina UNKNOWN/ESTIMATE da app
// (categoria "Conceitos Gerais"), para reforçar o princípio de nunca
// inventar dados.
//
// Estrutura preparada para escalar a 200 perguntas sem mudanças de
// arquitetura (spec §6.1) — decisão do autor (19/08/2026): fica em
// 100, não se escala mais.
//
// @typedef {import('../data/db.js')} _unused

/** @type {Array<{id: string, question_pt: string, options: string[], correct_index: number, explanation_pt: string, category: string}>} */
export const QUIZ_QUESTIONS = [
  // ---------- IRS ----------
  {
    id: "irs-001",
    question_pt: "Quantos escalões de IRS existem em Portugal em 2026?",
    options: ["5", "7", "9", "12"],
    correct_index: 2,
    explanation_pt:
      "Em 2026 mantém-se a estrutura de 9 escalões de IRS (Art. 68.º CIRS), com taxas marginais entre 12,5% e 48%.",
    category: "IRS",
  },
  {
    id: "irs-002",
    question_pt: "Se o teu rendimento sobe de escalão de IRS, o que acontece?",
    options: [
      "Todo o rendimento passa a ser tributado à taxa do novo escalão",
      "Apenas a parte do rendimento que excede o limite do escalão anterior é tributada à taxa superior",
      "Não pagas mais imposto nenhum",
      "O escalão anterior deixa de contar",
    ],
    correct_index: 1,
    explanation_pt:
      "Portugal usa tributação progressiva por fatias: cada parte do rendimento é tributada à taxa do seu próprio escalão. Subir de escalão nunca é motivo para recusar rendimento adicional — só a parte excedente paga a taxa mais alta.",
    category: "IRS",
  },
  {
    id: "irs-003",
    question_pt: "Qual é a taxa marginal do 1.º escalão de IRS em 2026?",
    options: ["6%", "12,5%", "21,2%", "23%"],
    correct_index: 1,
    explanation_pt:
      "O 1.º escalão (rendimento coletável até 8.342€) tem taxa marginal de 12,5%.",
    category: "IRS",
  },
  {
    id: "irs-004",
    question_pt: "A partir de que rendimento coletável entra em vigor a taxa marginal de 48%?",
    options: ["Acima de 43.090€", "Acima de 46.566€", "Acima de 86.634€", "Acima de 250.000€"],
    correct_index: 2,
    explanation_pt:
      "O 9.º e último escalão de IRS, com taxa marginal de 48%, aplica-se apenas à parte do rendimento coletável que excede 86.634€.",
    category: "IRS",
  },
  {
    id: "irs-005",
    question_pt: "O que é a taxa adicional de solidariedade?",
    options: [
      "Um desconto para famílias numerosas",
      "Uma taxa extra sobre rendimentos coletáveis elevados, cumulativa com o IRS normal",
      "Uma taxa que substitui o IRS para pensionistas",
      "Um imposto sobre doações a instituições de solidariedade",
    ],
    correct_index: 1,
    explanation_pt:
      "A taxa de solidariedade (Art. 68.º-A CIRS) aplica-se apenas à parte do rendimento coletável acima de 80.000€ (2,5%) e acima de 250.000€ (5,0%), somando-se ao IRS calculado pelos escalões normais.",
    category: "IRS",
  },
  {
    id: "irs-006",
    question_pt: "O que é o \"mínimo de existência\" no IRS?",
    options: [
      "O salário mínimo nacional",
      "O valor de rendimento anual abaixo do qual não há IRS a pagar",
      "O valor mínimo de uma dedução à coleta",
      "O valor mínimo para ser obrigado a entregar a declaração",
    ],
    correct_index: 1,
    explanation_pt:
      "O mínimo de existência (12.880€/ano em 2026) garante que um rendimento coletável igual ou inferior a este valor fica isento de IRS.",
    category: "IRS",
  },
  {
    id: "irs-007",
    question_pt: "Entre que datas decorre normalmente a entrega da declaração anual de IRS?",
    options: ["1 de janeiro a 31 de março", "1 de abril a 30 de junho", "1 de julho a 30 de setembro", "1 de outubro a 31 de dezembro"],
    correct_index: 1,
    explanation_pt:
      "A entrega da declaração de IRS decorre entre 1 de abril e 30 de junho, sem penalizações dentro desse prazo.",
    category: "IRS",
  },
  {
    id: "irs-008",
    question_pt: "Qual é a diferença entre \"taxa marginal\" e \"taxa efetiva\" de IRS?",
    options: [
      "São a mesma coisa com nomes diferentes",
      "A taxa marginal aplica-se só ao último euro ganho; a taxa efetiva é a percentagem real paga sobre o rendimento total, e é sempre inferior à marginal",
      "A taxa efetiva é sempre superior à marginal",
      "A taxa marginal só existe para trabalhadores independentes",
    ],
    correct_index: 1,
    explanation_pt:
      "A taxa marginal é a taxa do escalão em que cai o último euro do rendimento. A taxa efetiva é o total de imposto pago a dividir pelo rendimento total — como o sistema é progressivo, a taxa efetiva é sempre mais baixa que a marginal.",
    category: "IRS",
  },
  {
    id: "irs-009",
    question_pt: "Um casal que entrega a declaração de IRS em conjunto usa que quociente familiar?",
    options: ["0,5", "1", "2", "Depende do número de filhos"],
    correct_index: 2,
    explanation_pt:
      "A tributação conjunta (casados ou unidos de facto) usa quociente familiar 2; a declaração individual usa quociente 1.",
    category: "IRS",
  },
  {
    id: "irs-010",
    question_pt: "Até que idade um filho pode continuar a ser dependente no IRS dos pais, mesmo já não sendo menor?",
    options: ["21 anos, sem condições", "25 anos, se os rendimentos anuais não ultrapassarem 14x a Retribuição Mínima Mensal Garantida", "Não há limite de idade", "18 anos, sem exceções"],
    correct_index: 1,
    explanation_pt:
      "Os filhos são dependentes até aos 18 anos automaticamente, podendo continuar até aos 25 anos se os seus rendimentos anuais não excederem 14 vezes a Retribuição Mínima Mensal Garantida.",
    category: "IRS",
  },

  // ---------- Segurança Social ----------
  {
    id: "ss-001",
    question_pt: "O que significa TSU?",
    options: ["Taxa Social Única", "Tributação Sobre Utilidades", "Taxa de Solidariedade Urgente", "Total de Salário Único"],
    correct_index: 0,
    explanation_pt: "TSU é a Taxa Social Única — a contribuição para a Segurança Social sobre os rendimentos de trabalho.",
    category: "Segurança Social",
  },
  {
    id: "ss-002",
    question_pt: "No regime geral, qual é a percentagem total da TSU sobre o salário de um trabalhador por conta de outrem?",
    options: ["11%", "23,75%", "34,75%", "48%"],
    correct_index: 2,
    explanation_pt:
      "A TSU no regime geral é 34,75% no total, repartida entre trabalhador (11%) e entidade patronal (23,75%).",
    category: "Segurança Social",
  },
  {
    id: "ss-003",
    question_pt: "A parte da TSU paga pela entidade patronal (23,75%)...",
    options: [
      "É descontada do salário bruto do trabalhador",
      "É um custo adicional para a empresa, além do salário bruto",
      "Só se aplica a empresas com mais de 50 trabalhadores",
      "É opcional",
    ],
    correct_index: 1,
    explanation_pt:
      "A TSU patronal soma-se ao salário bruto como custo da entidade empregadora — não sai do bolso do trabalhador nem é descontada do seu salário. É um erro comum confundir esta parcela com um desconto do trabalhador.",
    category: "Segurança Social",
  },
  {
    id: "ss-004",
    question_pt: "Qual é a percentagem de TSU descontada diretamente do salário de um trabalhador por conta de outrem?",
    options: ["9%", "11%", "15%", "23,75%"],
    correct_index: 1,
    explanation_pt: "O trabalhador desconta 11% do seu salário bruto para a Segurança Social no regime geral.",
    category: "Segurança Social",
  },
  {
    id: "ss-005",
    question_pt: "O que financiam as contribuições para a Segurança Social?",
    options: [
      "Apenas as pensões de reforma",
      "Apenas o subsídio de desemprego",
      "Pensões, subsídio de desemprego, subsídio de doença, subsídio parental e outros apoios sociais",
      "Apenas despesas do Estado com saúde",
    ],
    correct_index: 2,
    explanation_pt:
      "A TSU financia um conjunto amplo de proteções: pensões de reforma e invalidez, subsídio de desemprego, subsídio de doença, subsídio parental, entre outros apoios sociais.",
    category: "Segurança Social",
  },

  // ---------- IVA ----------
  {
    id: "iva-001",
    question_pt: "Quantas taxas de IVA diferentes existem em Portugal Continental?",
    options: ["1", "2", "3", "4"],
    correct_index: 2,
    explanation_pt: "Portugal Continental tem três taxas: reduzida (6%), intermédia (13%) e normal (23%).",
    category: "IVA",
  },
  {
    id: "iva-002",
    question_pt: "Qual é a taxa normal de IVA no Continente?",
    options: ["6%", "13%", "22%", "23%"],
    correct_index: 3,
    explanation_pt: "A taxa normal de IVA no Continente é 23%, aplicável à maioria dos bens e serviços.",
    category: "IVA",
  },
  {
    id: "iva-003",
    question_pt: "As taxas de IVA são iguais em todo o território português?",
    options: [
      "Sim, são sempre as mesmas",
      "Não — Continente, Açores e Madeira têm taxas diferentes",
      "Só a taxa normal varia por região",
      "Só existem taxas diferentes para exportação",
    ],
    correct_index: 1,
    explanation_pt:
      "Continente (6/13/23%), Açores (4/9/16%) e Madeira (4/12/22%) têm as três taxas de IVA diferentes entre si, mais baixas nas regiões autónomas.",
    category: "IVA",
  },
  {
    id: "iva-004",
    question_pt: "Qual região tem a taxa normal de IVA mais baixa?",
    options: ["Continente", "Açores", "Madeira", "É igual nas três"],
    correct_index: 1,
    explanation_pt: "A taxa normal de IVA nos Açores é 16%, a mais baixa das três regiões (Continente 23%, Madeira 22%).",
    category: "IVA",
  },
  {
    id: "iva-005",
    question_pt: "A taxa reduzida de IVA (a mais baixa de cada região) aplica-se tipicamente a...",
    options: [
      "Bens de luxo",
      "Bens e serviços considerados essenciais, como certos alimentos e livros",
      "Combustíveis",
      "Serviços de telecomunicações",
    ],
    correct_index: 1,
    explanation_pt:
      "A taxa reduzida (Lista I do CIVA) aplica-se a bens e serviços considerados essenciais — alimentos básicos, livros, entre outros.",
    category: "IVA",
  },

  // ---------- Impostos Especiais de Consumo ----------
  {
    id: "iec-001",
    question_pt: "O que significa a sigla ISP?",
    options: [
      "Imposto Sobre Propriedade",
      "Imposto sobre os Produtos Petrolíferos e Energéticos",
      "Imposto Social sobre Pensões",
      "Imposto de Selo Provisório",
    ],
    correct_index: 1,
    explanation_pt: "ISP é o Imposto sobre os Produtos Petrolíferos e Energéticos — incide sobre combustíveis como gasolina e gasóleo.",
    category: "Impostos Especiais",
  },
  {
    id: "iec-002",
    question_pt: "O ISP sobre combustíveis é atualizado com que frequência?",
    options: [
      "Uma vez por ano, no Orçamento do Estado",
      "Pode ser ajustado por portaria com frequência semanal ou mensal",
      "Nunca muda",
      "De 5 em 5 anos",
    ],
    correct_index: 1,
    explanation_pt:
      "Ao contrário da maioria dos impostos, o ISP pode ser ajustado por portaria do Governo com frequência semanal ou mensal, como mecanismo de estabilização do preço dos combustíveis.",
    category: "Impostos Especiais",
  },
  {
    id: "iec-003",
    question_pt: "O IVA sobre combustíveis incide sobre...",
    options: [
      "Apenas o preço base, sem impostos",
      "O preço final, que já inclui o ISP",
      "Apenas o ISP",
      "Não há IVA sobre combustíveis",
    ],
    correct_index: 1,
    explanation_pt:
      "O IVA incide sobre o preço final ao consumidor, que já tem o ISP incluído — por isso paga-se \"imposto sobre imposto\" nesta figura.",
    category: "Impostos Especiais",
  },
  {
    id: "iec-004",
    question_pt: "O que significa IABA?",
    options: [
      "Imposto sobre o Álcool e as Bebidas Alcoólicas",
      "Imposto Anual sobre Bens Automóveis",
      "Imposto de Apoio a Bens Agrícolas",
      "Imposto sobre Aluguer de Bens e Ativos",
    ],
    correct_index: 0,
    explanation_pt: "IABA é o Imposto sobre o Álcool e as Bebidas Alcoólicas — incide sobre cerveja, vinho, espumantes e bebidas espirituosas.",
    category: "Impostos Especiais",
  },
  {
    id: "iec-005",
    question_pt: "O imposto sobre o tabaco (IT) em cigarros combina que tipo de elementos?",
    options: [
      "Só um valor fixo por maço",
      "Um elemento específico (por 1000 cigarros) e um elemento ad valorem (percentagem do preço de venda)",
      "Só uma percentagem do preço",
      "Não há imposto específico sobre tabaco, só IVA",
    ],
    correct_index: 1,
    explanation_pt:
      "O IT sobre cigarros tem dois elementos: um específico (151,88€ por cada 1000 cigarros) e um ad valorem (1% do preço de venda ao público).",
    category: "Impostos Especiais",
  },
  {
    id: "iec-006",
    question_pt: "Desde 2026, as bolsas de nicotina em Portugal...",
    options: [
      "Continuam isentas de qualquer imposto especial",
      "Passaram a ser tributadas sob o imposto do tabaco",
      "São tributadas como bebidas alcoólicas",
      "Estão proibidas",
    ],
    correct_index: 1,
    explanation_pt:
      "2026 é o primeiro ano em que as bolsas de nicotina são tributadas sob o imposto do tabaco, a uma taxa de 0,065€/grama.",
    category: "Impostos Especiais",
  },

  // ---------- Impostos Patrimoniais e de Veículo ----------
  {
    id: "pat-001",
    question_pt: "O que significa IMI?",
    options: ["Imposto Municipal sobre Imóveis", "Imposto sobre Mais-Valias Imobiliárias", "Imposto Mensal de Investimento", "Imposto sobre Movimentos Internacionais"],
    correct_index: 0,
    explanation_pt: "IMI é o Imposto Municipal sobre Imóveis, cobrado anualmente sobre o valor patrimonial tributário dos imóveis.",
    category: "Impostos Patrimoniais",
  },
  {
    id: "pat-002",
    question_pt: "Quem define a taxa exata de IMI aplicada a um imóvel?",
    options: [
      "O Governo central, de forma igual em todo o país",
      "Cada município, dentro de um intervalo legal nacional",
      "O proprietário do imóvel",
      "A União Europeia",
    ],
    correct_index: 1,
    explanation_pt:
      "A taxa de IMI para prédios urbanos varia entre 0,3% e 0,45% (podendo chegar a 0,5% em casos específicos), mas é cada um dos 308 municípios que fixa a taxa exata dentro desse intervalo.",
    category: "Impostos Patrimoniais",
  },
  {
    id: "pat-003",
    question_pt: "Qual é a taxa de IMI para prédios rústicos?",
    options: ["Varia por município, entre 0,3% e 0,45%", "É fixa em 0,8%", "Não há IMI sobre prédios rústicos", "É sempre 23%"],
    correct_index: 1,
    explanation_pt: "Ao contrário dos prédios urbanos, os prédios rústicos têm uma taxa fixa nacional de 0,8% do valor patrimonial tributário.",
    category: "Impostos Patrimoniais",
  },
  {
    id: "pat-004",
    question_pt: "O que significa IUC?",
    options: ["Imposto Único de Circulação", "Imposto sobre Utilização de Combustível", "Imposto Urbano de Construção", "Imposto sobre Uso Comercial"],
    correct_index: 0,
    explanation_pt: "IUC é o Imposto Único de Circulação, pago anualmente pelos proprietários de veículos.",
    category: "Impostos Patrimoniais",
  },
  {
    id: "pat-005",
    question_pt: "Os veículos 100% elétricos, em relação ao IUC...",
    options: ["Pagam a taxa mais alta", "Estão totalmente isentos", "Pagam metade da taxa normal", "Só pagam se tiverem mais de 5 anos"],
    correct_index: 1,
    explanation_pt: "Os veículos 100% elétricos estão totalmente isentos de IUC.",
    category: "Impostos Patrimoniais",
  },
  {
    id: "pat-006",
    question_pt: "O ISV (Imposto sobre Veículos) é composto por que componentes?",
    options: [
      "Apenas o preço de venda",
      "Componente cilindrada e componente ambiental (CO₂)",
      "Apenas o peso do veículo",
      "Apenas a marca do veículo",
    ],
    correct_index: 1,
    explanation_pt:
      "O ISV soma uma componente relacionada com a cilindrada do motor e uma componente ambiental, baseada nas emissões de CO₂ — para automóveis de passageiros (Tabela A). Motociclos (Tabela B) usam só a componente cilindrada.",
    category: "Impostos Patrimoniais",
  },
  {
    id: "pat-007",
    question_pt: "O Imposto de Selo e o IVA podem, sobre o mesmo ato jurídico...",
    options: [
      "Ser sempre cobrados em conjunto",
      "Ser mutuamente exclusivos — nunca se acumulam sobre o mesmo ato",
      "Substituir-se um ao outro só em casos de exportação",
      "Não têm nenhuma relação",
    ],
    correct_index: 1,
    explanation_pt:
      "O Imposto de Selo e o IVA são mutuamente exclusivos: nunca incidem, em simultâneo, sobre o mesmo ato jurídico. Por exemplo, na compra de um imóvel aplica-se Imposto de Selo, não IVA.",
    category: "Impostos Patrimoniais",
  },

  // ---------- Conceitos gerais / literacia fiscal ----------
  {
    id: "ger-001",
    question_pt: "Qual destas é uma diferença entre impostos diretos e indiretos?",
    options: [
      "Os diretos incidem sobre rendimento/património; os indiretos incidem sobre consumo",
      "Os diretos só existem em Portugal",
      "Os indiretos só pagam empresas",
      "Não há diferença nenhuma",
    ],
    correct_index: 0,
    explanation_pt:
      "Impostos diretos (como IRS e IMI) incidem sobre rendimento ou património. Impostos indiretos (como o IVA) incidem sobre o consumo de bens e serviços, sendo pagos por quem compra.",
    category: "Conceitos Gerais",
  },
  {
    id: "ger-002",
    question_pt: "O \"Dia da Liberdade Fiscal\" representa...",
    options: [
      "O dia a partir do qual deixas de pagar impostos esse ano",
      "A data correspondente à proporção anual do rendimento destinado a impostos e contribuições, segundo as hipóteses da simulação",
      "Um feriado nacional oficial",
      "O dia em que se entrega a declaração de IRS",
    ],
    correct_index: 1,
    explanation_pt:
      "É importante não confundir isto com \"deixar de pagar impostos\" — esse dia continua a existir. O Dia da Liberdade Fiscal é uma forma de visualizar, segundo as hipóteses da simulação, que proporção do ano equivaleria ao valor total pago em impostos e contribuições.",
    category: "Conceitos Gerais",
  },
  {
    id: "ger-003",
    question_pt: "Retenção na fonte de IRS significa...",
    options: [
      "O imposto final e definitivo, sem possibilidade de ajuste",
      "Um adiantamento mensal por conta do IRS anual, que pode ser ajustado (reembolso ou pagamento adicional) na declaração",
      "Um imposto diferente do IRS",
      "Algo que só se aplica a trabalhadores independentes",
    ],
    correct_index: 1,
    explanation_pt:
      "A retenção na fonte é um adiantamento mensal por conta do IRS anual — não é o imposto final. O valor definitivo apura-se na declaração anual, o que pode resultar em reembolso ou pagamento adicional.",
    category: "Conceitos Gerais",
  },

  // ========== TANDA 2 (18/08/2026) ==========

  // ---------- IRS (continuação) ----------
  {
    id: "irs-011",
    question_pt: "Qual é o valor da dedução específica da Categoria A (trabalho dependente) em 2026?",
    options: ["600€/ano", "920€/ano", "4.587,09€/ano", "12.880€/ano"],
    correct_index: 2,
    explanation_pt:
      "A dedução específica da Categoria A (Art. 25.º CIRS) é de 4.587,09€/ano, ou o valor das contribuições efetivas para a Segurança Social, se for superior.",
    category: "IRS",
  },
  {
    id: "irs-012",
    question_pt: "Até que valor mensal de rendimento não há retenção na fonte de IRS em 2026?",
    options: ["537,13€", "920€", "1.695€", "2.326€"],
    correct_index: 1,
    explanation_pt:
      "Abaixo de 920€/mês não há retenção na fonte de IRS — este limiar acompanha a atualização do salário mínimo nacional.",
    category: "IRS",
  },
  {
    id: "irs-013",
    question_pt: "A taxa adicional de solidariedade tem quantos patamares, e a que taxas?",
    options: [
      "Um único patamar, a 5%",
      "Dois patamares: 2,5% acima de 80.000€, e 5% acima de 250.000€",
      "Três patamares, entre 1% e 10%",
      "Não tem patamares — é sempre 2,5%",
    ],
    correct_index: 1,
    explanation_pt:
      "A taxa de solidariedade (Art. 68.º-A CIRS) incide só sobre a fração do rendimento coletável que excede cada limiar: 2,5% entre 80.000€ e 250.000€, e 5% acima de 250.000€.",
    category: "IRS",
  },
  {
    id: "irs-014",
    question_pt: "Um filho de 24 anos ainda pode ser dependente no IRS dos pais se o seu rendimento anual não exceder quanto?",
    options: [
      "O salário mínimo nacional anual",
      "14 vezes a Retribuição Mínima Mensal Garantida",
      "O mínimo de existência",
      "Não pode, o limite é sempre 18 anos",
    ],
    correct_index: 1,
    explanation_pt:
      "Até aos 25 anos, um filho pode continuar a ser dependente se os seus rendimentos anuais não ultrapassarem 14 vezes a Retribuição Mínima Mensal Garantida.",
    category: "IRS",
  },

  // ---------- Segurança Social (continuação) ----------
  {
    id: "ss-006",
    question_pt: "O que é o IAS (Indexante de Apoios Sociais)?",
    options: [
      "Um imposto sobre apoios sociais",
      "Um valor de referência usado como base de cálculo de várias prestações sociais",
      "A taxa de TSU dos trabalhadores independentes",
      "Um subsídio pago a quem está desempregado",
    ],
    correct_index: 1,
    explanation_pt:
      "O IAS (537,13€/mês em 2026) não é um imposto — é um valor de referência que serve de base de cálculo a várias prestações da Segurança Social.",
    category: "Segurança Social",
  },
  {
    id: "ss-007",
    question_pt: "Um trabalhador independente no regime simplificado contribui para a Segurança Social sobre que base?",
    options: [
      "O rendimento relevante, uma percentagem do que faturou (varia consoante o tipo de rendimento)",
      "Sempre sobre o salário mínimo nacional, independentemente do que fatura",
      "Não paga Segurança Social",
      "Sobre o dobro do que faturou",
    ],
    correct_index: 0,
    explanation_pt:
      "No regime simplificado dos trabalhadores independentes, a base de incidência contributiva é o \"rendimento relevante\" — uma percentagem do que foi faturado, que varia consoante o tipo de rendimento (prestação de serviços ou produção/venda de bens), à qual depois se aplica a taxa contributiva.",
    category: "Segurança Social",
  },

  // ---------- IVA (continuação) ----------
  {
    id: "iva-006",
    question_pt: "A taxa intermédia de IVA (a do meio, entre a reduzida e a normal) aplica-se tipicamente a...",
    options: [
      "Todos os bens de luxo",
      "Certos bens e serviços como a restauração, nem tão essenciais quanto os da taxa reduzida, nem \"normais\"",
      "Só a serviços públicos",
      "Só a exportações",
    ],
    correct_index: 1,
    explanation_pt:
      "A taxa intermédia (Lista II do CIVA) cobre uma categoria intermédia de bens e serviços — como a restauração — que não se enquadram nem na taxa reduzida (bens essenciais) nem ficam à taxa normal.",
    category: "IVA",
  },

  // ---------- Impostos Especiais (continuação) ----------
  {
    id: "iec-007",
    question_pt: "Qual é a taxa de IABA sobre o vinho tranquilo e o espumante em Portugal?",
    options: ["9,64€/hl", "12,06€/hl", "87,92€/hl", "0€/hl — estão isentos"],
    correct_index: 3,
    explanation_pt:
      "O vinho tranquilo e o espumante (Art.º 72.º do CIEC) estão isentos de IABA — ao contrário de outras bebidas fermentadas (como a sidra) e das bebidas espirituosas.",
    category: "Impostos Especiais",
  },
  {
    id: "iec-008",
    question_pt: "Sobre que base incide o IABA das bebidas espirituosas (Art.º 76.º do CIEC)?",
    options: [
      "Sobre o preço de venda ao público, tal como o IVA",
      "Sobre o hectolitro de álcool contido (álcool puro, base 100% vol.)",
      "Sobre o peso da garrafa",
      "Não há IABA sobre bebidas espirituosas",
    ],
    correct_index: 1,
    explanation_pt:
      "As bebidas espirituosas são tributadas por hectolitro de álcool contido (1.602,51€/hl de álcool puro, base 100% vol. a 20°C) — a mesma unidade tributável e o mesmo valor do álcool etílico (Art.º 75.º).",
    category: "Impostos Especiais",
  },
  {
    id: "iec-009",
    question_pt: "As pequenas cervejeiras e pequenas destilarias, em relação ao IABA, pagam...",
    options: [
      "A taxa normal, sem exceções",
      "50% da taxa normal",
      "Estão totalmente isentas",
      "O dobro da taxa normal",
    ],
    correct_index: 1,
    explanation_pt:
      "O CIEC prevê um regime especial para pequenas cervejeiras e pequenas destilarias, que pagam 50% da taxa normal de IABA — um apoio a produtores de menor escala.",
    category: "Impostos Especiais",
  },
  {
    id: "iec-010",
    question_pt: "Que bebida tradicional portuguesa pode beneficiar de uma redução de 75% no IABA (pagando só 25% da taxa), em concelhos elegíveis?",
    options: ["Vinho do Porto", "Aguardente de medronho", "Cerveja artesanal", "Licor de Ginja"],
    correct_index: 1,
    explanation_pt:
      "Licores/\"crème de\" e aguardentes destiladas de medronho, produzidos e destilados em concelhos elegíveis, beneficiam de um regime de redução: pagam só 25% da taxa normal de IABA (redução de 75%).",
    category: "Impostos Especiais",
  },

  // ---------- Impostos Patrimoniais e de Veículo (continuação) ----------
  {
    id: "pat-008",
    question_pt: "Em que circunstância a taxa de IMI de um prédio urbano pode ultrapassar o intervalo normal (0,3%-0,45%), chegando a 0,5%?",
    options: [
      "Nunca — o intervalo de 0,3% a 0,45% é sempre um limite absoluto",
      "Prédios devolutos ou degradados",
      "Só para imóveis de luxo acima de 1 milhão de euros",
      "Só no primeiro ano após a compra",
    ],
    correct_index: 1,
    explanation_pt:
      "O intervalo legal nacional para prédios urbanos é 0,3% a 0,45%, mas pode chegar a 0,5% em circunstâncias específicas — nomeadamente prédios devolutos ou degradados.",
    category: "Impostos Patrimoniais",
  },
  {
    id: "pat-009",
    question_pt: "Um veículo híbrido plug-in (PHEV) elegível, em relação ao ISV, paga tipicamente...",
    options: ["A taxa normal, sem desconto", "Só 25% do ISV calculado", "O dobro do ISV normal", "Está totalmente isento"],
    correct_index: 1,
    explanation_pt:
      "Um híbrido plug-in elegível (com autonomia elétrica mínima e emissões dentro dos limites definidos) paga só 25% do ISV calculado — um desconto de 75%.",
    category: "Impostos Patrimoniais",
  },
  {
    id: "pat-010",
    question_pt: "No ISV, o desconto por idade de um veículo usado importado...",
    options: [
      "Diminui à medida que o veículo é mais antigo",
      "Aumenta à medida que o veículo é mais antigo, até um máximo de 80%",
      "É sempre fixo em 50%, independentemente da idade",
      "Só se aplica a veículos com menos de 1 ano",
    ],
    correct_index: 1,
    explanation_pt:
      "O desconto por idade no ISV cresce por escalões: começa em 10% no primeiro ano e vai aumentando até um máximo de 80% para veículos com 10 ou mais anos.",
    category: "Impostos Patrimoniais",
  },
  {
    id: "pat-011",
    question_pt: "O Imposto de Selo sobre o arrendamento (verba 2) incide, a 10%, sobre o valor de quanto tempo de renda?",
    options: ["1 mês", "3 meses", "6 meses", "1 ano"],
    correct_index: 0,
    explanation_pt:
      "A verba 2 da Tabela Geral do Imposto de Selo tributa o arrendamento a 10% sobre o valor de 1 mês de renda, cobrado no início do contrato ou em cada aumento.",
    category: "Impostos Patrimoniais",
  },
  {
    id: "pat-012",
    question_pt: "Qual é a taxa de Imposto de Selo na aquisição onerosa de imóveis (verba 1.1)?",
    options: ["0,3%", "0,8%", "5%", "10%"],
    correct_index: 1,
    explanation_pt:
      "A aquisição onerosa de imóveis (verba 1.1) paga Imposto de Selo à taxa de 0,8%, sobre o maior valor entre o preço e o valor patrimonial tributário — pago em simultâneo com o IMT, nunca em vez dele.",
    category: "Impostos Patrimoniais",
  },
  {
    id: "pat-013",
    question_pt: "Uma herança deixada a um filho (descendente em linha reta) está sujeita a Imposto de Selo pela transmissão gratuita?",
    options: [
      "Sim, sempre à taxa de 10%",
      "Não — descendentes, ascendentes e cônjuge/unido de facto estão isentos desta verba",
      "Só se o valor for superior a 1 milhão de euros",
      "Só se o filho for menor de idade",
    ],
    correct_index: 1,
    explanation_pt:
      "O Art. 6.º, al. e) do Código do Imposto do Selo isenta desta verba (transmissões gratuitas) o cônjuge/unido de facto, os descendentes e os ascendentes — a taxa de 10% aplica-se a outros graus de parentesco e a terceiros.",
    category: "Impostos Patrimoniais",
  },
  {
    id: "pat-014",
    question_pt: "A categoria B do IUC (a mais comum) aplica-se a veículos com 1.ª matrícula a partir de quando?",
    options: ["1 de janeiro de 2000", "1 de julho de 2007", "1 de janeiro de 2015", "1 de janeiro de 2020"],
    correct_index: 1,
    explanation_pt:
      "A categoria B do IUC cobre os automóveis ligeiros de passageiros e mistos com 1.ª matrícula a partir de 1 de julho de 2007 — é a categoria mais comum, para a generalidade dos veículos atuais.",
    category: "Impostos Patrimoniais",
  },
  {
    id: "pat-015",
    question_pt: "Se o IUC calculado para um veículo for inferior a 10€, o que acontece?",
    options: [
      "Paga-se na mesma, sem exceção",
      "Não é cobrado — há um limiar de dispensa de cobrança",
      "Duplica-se automaticamente",
      "Só se aplica a motociclos",
    ],
    correct_index: 1,
    explanation_pt:
      "Existe um limiar de dispensa de cobrança de 10€ no IUC: se o valor calculado for inferior a esse montante, o imposto não é cobrado.",
    category: "Impostos Patrimoniais",
  },
  {
    id: "pat-016",
    question_pt: "Além dos veículos 100% elétricos, quem mais está isento de IUC?",
    options: [
      "Ninguém mais",
      "Pessoas com um grau de incapacidade igual ou superior a 60%",
      "Todos os veículos com mais de 5 anos",
      "Só empresas com frotas grandes",
    ],
    correct_index: 1,
    explanation_pt:
      "Além dos veículos elétricos, há isenção de IUC para pessoas com um grau de incapacidade igual ou superior a 60%, nas condições previstas no Código do IUC.",
    category: "Impostos Patrimoniais",
  },

  // ---------- Comparação Internacional (nova categoria) ----------
  {
    id: "int-001",
    question_pt: "Segundo a OCDE (Taxing Wages 2026), o \"tax wedge\" de Portugal em 2025 está...",
    options: [
      "Bem abaixo da média da OCDE",
      "Acima da média da OCDE (39,3% vs. 35,1%)",
      "Exatamente igual à média da OCDE",
      "A OCDE não calcula este dado para Portugal",
    ],
    correct_index: 1,
    explanation_pt:
      "O tax wedge de Portugal (39,3%) está acima da média da OCDE (35,1%) — mas este indicador só inclui IRS e contribuições de Segurança Social, não IVA nem impostos especiais ou patrimoniais.",
    category: "Comparação Internacional",
  },
  {
    id: "int-002",
    question_pt: "Entre os países comparados no benchmark desta app (PT, ES, FR, DE, IE, NL, CH), qual tem o \"tax wedge\" mais baixo?",
    options: ["França", "Alemanha", "Suíça", "Espanha"],
    correct_index: 2,
    explanation_pt:
      "A Suíça tem o tax wedge mais baixo do grupo comparado (23,0%), bem abaixo da média da OCDE — a Alemanha tem o mais alto (49,3%).",
    category: "Comparação Internacional",
  },
  {
    id: "int-003",
    question_pt: "O \"tax wedge\" da OCDE, ao contrário do Dia da Liberdade Fiscal desta app, NÃO inclui...",
    options: [
      "O IRS",
      "As contribuições de Segurança Social",
      "IVA, impostos especiais de consumo e impostos patrimoniais",
      "Nada — são exatamente a mesma coisa",
    ],
    correct_index: 2,
    explanation_pt:
      "O tax wedge da OCDE mede só a carga sobre o trabalho (IRS + Segurança Social). O Dia da Liberdade Fiscal desta app é mais completo: inclui também o IVA, os impostos especiais e os patrimoniais que registares — por isso os dois números não são diretamente comparáveis.",
    category: "Comparação Internacional",
  },

  // ---------- Conceitos gerais (continuação) ----------
  {
    id: "ger-004",
    question_pt: "Onde ficam guardados os dados que introduzes nesta app (salário, gastos, etc.)?",
    options: [
      "Num servidor central da app, associados à tua conta",
      "Localmente, no teu próprio dispositivo — nunca num servidor, exceto no fluxo opcional de foto+IA",
      "Na cloud de um parceiro comercial",
      "São partilhados automaticamente com a Autoridade Tributária",
    ],
    correct_index: 1,
    explanation_pt:
      "A app é \"local-first\": os teus dados ficam guardados só no teu dispositivo (IndexedDB do navegador), sem conta nem servidor próprio. A única exceção é o fluxo opcional de foto+IA, sempre avisado no momento em que é usado.",
    category: "Conceitos Gerais",
  },

  // ========== TANDA 3 (19/08/2026) — total 100, teto definitivo ==========

  // ---------- IRS (continuação) ----------
  {
    id: "irs-015",
    question_pt: "Qual é o coeficiente-regra do regime simplificado da Categoria B (Art. 31.º CIRS) para prestação de serviços?",
    options: ["0,10", "0,35", "0,75", "0,95"],
    correct_index: 2,
    explanation_pt:
      "O coeficiente-regra para prestação de serviços (Art. 151.º CIRS) é 0,75 — ou seja, 75% do rendimento bruto faturado constitui rendimento coletável. Outras atividades têm coeficientes distintos (0,35, 0,10 ou 0,95 consoante o CAE).",
    category: "IRS",
  },
  {
    id: "irs-016",
    question_pt: "Qual é a dedução à coleta por um dependente com até 3 anos de idade (inclusive)?",
    options: ["600€/ano", "726€/ano", "900€/ano", "1.200€/ano"],
    correct_index: 1,
    explanation_pt:
      "A dedução por dependente é de 600€/ano para dependentes com mais de 3 anos, mas sobe para 726€/ano quando o dependente tem até 3 anos inclusive (Art. 78.º-A CIRS).",
    category: "IRS",
  },
  {
    id: "irs-017",
    question_pt: "O diferencial fiscal de IRS dos Açores e da Madeira, em 2026, funciona como...",
    options: [
      "Uma redução de 30% só no 1.º escalão",
      "Uma redução uniforme de 30% sobre a taxa marginal de todos os 9 escalões",
      "Um valor fixo de desconto, igual para todos os rendimentos",
      "Não existe nenhum diferencial regional",
    ],
    correct_index: 1,
    explanation_pt:
      "Tanto os Açores como a Madeira aplicam, em 2026, uma redução uniforme de 30% sobre a taxa marginal de cada um dos 9 escalões nacionais de IRS — não um mecanismo diferenciado por escalão.",
    category: "IRS",
  },
  {
    id: "irs-018",
    question_pt: "Qual é a taxa marginal de IRS aplicável à fatia de rendimento coletável entre 29.397€ e 43.090€?",
    options: ["24,1%", "31,1%", "34,9%", "43,1%"],
    correct_index: 2,
    explanation_pt:
      "O 6.º escalão de IRS (29.397€ a 43.090€) tem taxa marginal de 34,9% — recorda que só a fatia dentro deste intervalo paga esta taxa, não o rendimento todo.",
    category: "IRS",
  },
  {
    id: "irs-019",
    question_pt: "Em guarda conjunta com residência alternada comunicada à AT, quanto pode deduzir cada progenitor, por dependente?",
    options: ["150€/ano", "300€/ano", "600€/ano", "900€/ano"],
    correct_index: 1,
    explanation_pt:
      "Em guarda conjunta com residência alternada comunicada à Autoridade Tributária, cada progenitor pode deduzir 300€/ano por dependente — metade do valor normal de 600€.",
    category: "IRS",
  },

  // ---------- Segurança Social (continuação) ----------
  {
    id: "ss-008",
    question_pt: "Um trabalhador independente no regime simplificado paga que taxa contributiva sobre o \"rendimento relevante\"?",
    options: ["11%", "14,98%", "21,4%", "34,75%"],
    correct_index: 2,
    explanation_pt:
      "A taxa contributiva-regra dos trabalhadores independentes é 21,4% (Art. 168.º do Código dos Regimes Contributivos), aplicada sobre o \"rendimento relevante\" — não sobre a faturação bruta.",
    category: "Segurança Social",
  },
  {
    id: "ss-009",
    question_pt: "Para um trabalhador independente que presta serviços, que percentagem da faturação constitui o \"rendimento relevante\" para efeitos de Segurança Social?",
    options: ["20%", "50%", "70%", "100%"],
    correct_index: 2,
    explanation_pt:
      "Para prestação de serviços, o rendimento relevante é 70% da faturação (20% para produção/venda de bens) — só depois se aplica a taxa contributiva de 21,4% sobre esse valor, não sobre o total faturado.",
    category: "Segurança Social",
  },
  {
    id: "ss-010",
    question_pt: "Qual é a base máxima mensal de contribuição de um trabalhador independente para a Segurança Social?",
    options: ["1× o IAS", "6× o IAS", "12× o IAS", "24× o IAS"],
    correct_index: 2,
    explanation_pt:
      "A base máxima de incidência contributiva mensal de um trabalhador independente é 12 vezes o IAS — acima disso, a contribuição não aumenta mais, independentemente do rendimento.",
    category: "Segurança Social",
  },
  {
    id: "ss-011",
    question_pt: "Qual é o valor do IAS (Indexante de Apoios Sociais) em 2026?",
    options: ["537,13€/mês", "920€/mês", "4.587,09€/ano", "12.880€/ano"],
    correct_index: 0,
    explanation_pt:
      "O IAS em 2026 é 537,13€/mês — valor de referência usado como base de cálculo de várias prestações sociais e de limites contributivos.",
    category: "Segurança Social",
  },

  // ---------- IVA (continuação) ----------
  {
    id: "iva-007",
    question_pt: "A taxa reduzida de IVA (a mais baixa) é igual em quais destas regiões?",
    options: ["Continente e Açores", "Continente e Madeira", "Açores e Madeira (ambas 4%)", "É diferente nas três regiões"],
    correct_index: 2,
    explanation_pt:
      "A taxa reduzida de IVA é 4% tanto nos Açores como na Madeira — ao contrário das taxas intermédia e normal, que diferem entre as duas regiões autónomas (Açores 9%/16%, Madeira 12%/22%).",
    category: "IVA",
  },
  {
    id: "iva-008",
    question_pt: "Qual é a taxa intermédia de IVA na Madeira?",
    options: ["9%", "12%", "13%", "16%"],
    correct_index: 1,
    explanation_pt: "A taxa intermédia de IVA na Madeira é 12% (Continente: 13%; Açores: 9%).",
    category: "IVA",
  },
  {
    id: "iva-009",
    question_pt: "Qual é a taxa intermédia de IVA nos Açores?",
    options: ["4%", "9%", "13%", "16%"],
    correct_index: 1,
    explanation_pt: "A taxa intermédia de IVA nos Açores é 9% (Continente: 13%; Madeira: 12%).",
    category: "IVA",
  },

  // ---------- Impostos Especiais (continuação) ----------
  {
    id: "iec-011",
    question_pt: "Qual é a taxa de IABA para \"outras bebidas fermentadas\" (como a sidra), distintas do vinho tranquilo?",
    options: ["0€/hl — isentas, tal como o vinho", "12,06€/hl", "87,92€/hl", "1.602,51€/hl"],
    correct_index: 1,
    explanation_pt:
      "Ao contrário do vinho tranquilo e do espumante (isentos), outras bebidas fermentadas como a sidra (Art.º 73.º do CIEC) pagam 12,06€/hl.",
    category: "Impostos Especiais",
  },
  {
    id: "iec-012",
    question_pt: "Qual é a taxa de IABA para \"produtos intermédios\" (Art.º 74.º do CIEC)?",
    options: ["0€/hl", "12,06€/hl", "87,92€/hl", "1.602,51€/hl"],
    correct_index: 2,
    explanation_pt: "Os produtos intermédios pagam 87,92€/hl de IABA — um valor intermédio entre as bebidas fermentadas e as espirituosas.",
    category: "Impostos Especiais",
  },
  {
    id: "iec-013",
    question_pt: "A taxa de IABA do álcool etílico (Art.º 75.º CIEC) é igual à de que outra categoria?",
    options: ["Cerveja", "Vinho tranquilo", "Bebidas espirituosas", "Produtos intermédios"],
    correct_index: 2,
    explanation_pt:
      "O álcool etílico e as bebidas espirituosas partilham a mesma base tributável e o mesmo valor: 1.602,51€/hl de álcool contido (base 100% vol., 20°C).",
    category: "Impostos Especiais",
  },
  {
    id: "iec-014",
    question_pt: "O tabaco aquecido (ex.: dispositivos tipo IQOS) é tributado com que elementos?",
    options: [
      "Só um elemento ad valorem",
      "Não é tributado — só paga IVA",
      "Um elemento específico (por grama) mais um elemento ad valorem, tal como os cigarros",
      "Uma taxa fixa por dispositivo",
    ],
    correct_index: 2,
    explanation_pt:
      "O tabaco aquecido (Art.º 103.º-A CIEC) combina um elemento específico de 0,0935€/grama com um elemento ad valorem de 15% do preço de venda — a mesma lógica dos cigarros, com valores diferentes.",
    category: "Impostos Especiais",
  },
  {
    id: "iec-015",
    question_pt: "O tabaco de fumar (para enrolar), o rapé e o tabaco de mascar são tributados só com que tipo de elemento?",
    options: ["Só elemento específico, por grama", "Ad valorem, 25% do preço de venda ao público", "Não têm imposto especial", "Uma taxa fixa por embalagem"],
    correct_index: 1,
    explanation_pt:
      "Ao contrário dos cigarros e do tabaco aquecido, o tabaco de fumar, o rapé e o tabaco de mascar (Art.º 104.º-A CIEC) não têm elemento específico — são tributados só com um elemento ad valorem de 25%.",
    category: "Impostos Especiais",
  },
  {
    id: "iec-016",
    question_pt: "O líquido para cigarros eletrónicos com nicotina paga uma taxa por mililitro que é, aproximadamente, quantas vezes a do líquido sem nicotina?",
    options: ["Igual", "Metade", "O dobro", "O triplo"],
    correct_index: 2,
    explanation_pt:
      "O líquido com nicotina paga 0,351€/ml, cerca do dobro dos 0,175€/ml do líquido sem nicotina (Art.º 104.º-C CIEC).",
    category: "Impostos Especiais",
  },
  {
    id: "iec-017",
    question_pt: "Charutos e cigarrilhas (Art.º 104.º CIEC) combinam que elementos de tributação?",
    options: [
      "Só ad valorem",
      "Elemento específico (por grama) mais ad valorem, tal como os cigarros",
      "Não há imposto especial sobre charutos",
      "Uma taxa única por unidade, sem relação com o peso",
    ],
    correct_index: 1,
    explanation_pt:
      "Charutos e cigarrilhas combinam um elemento específico de 0,091€/grama com um elemento ad valorem de 15% do preço de venda ao público.",
    category: "Impostos Especiais",
  },
  {
    id: "iec-018",
    question_pt: "Qual destes produtos de tabaco tem a taxa ad valorem mais alta (75% do preço de venda)?",
    options: ["Cigarros (1%)", "Charutos e cigarrilhas (15%)", "Tabaco para cachimbo de água", "Tabaco aquecido (15%)"],
    correct_index: 2,
    explanation_pt:
      "O tabaco para cachimbo de água (Art.º 104.º-B CIEC) tem a taxa ad valorem mais alta de todos os produtos de tabaco desta app: 75% do preço de venda ao público, sem elemento específico.",
    category: "Impostos Especiais",
  },

  // ---------- Impostos Patrimoniais e de Veículo (continuação) ----------
  {
    id: "pat-017",
    question_pt: "A Contribuição Audiovisual (CAV) é cobrada em que fatura?",
    options: ["Água", "Eletricidade", "Gás natural", "Telecomunicações"],
    correct_index: 1,
    explanation_pt: "A CAV é cobrada mensalmente na fatura da eletricidade de (quase) todos os consumidores em Portugal Continental.",
    category: "Impostos Patrimoniais",
  },
  {
    id: "pat-018",
    question_pt: "A CAV paga IVA a que taxa?",
    options: ["6% (reduzida)", "13% (intermédia)", "23% (normal)", "Está isenta de IVA"],
    correct_index: 0,
    explanation_pt: "A CAV é sujeita a IVA à taxa reduzida de 6%, tal como outros bens/serviços essenciais.",
    category: "Impostos Patrimoniais",
  },
  {
    id: "pat-019",
    question_pt: "Um consumidor de eletricidade está isento de CAV se o seu consumo anual for inferior a quantos kWh?",
    options: ["100 kWh", "400 kWh", "1.000 kWh", "2.000 kWh"],
    correct_index: 1,
    explanation_pt: "Consumidores com consumo anual de eletricidade inferior a 400 kWh estão isentos de CAV.",
    category: "Impostos Patrimoniais",
  },
  {
    id: "pat-020",
    question_pt: "A Taxa Municipal Turística em Portugal...",
    options: [
      "É igual em todo o país, definida pelo Governo central",
      "Cada município decide se cobra, e quanto, dentro da sua autonomia regulamentar",
      "Só existe em Lisboa",
      "É uma parcela do IVA sobre alojamento",
    ],
    correct_index: 1,
    explanation_pt:
      "Não existe uma taxa turística nacional única — cada um dos municípios decide, dentro da sua autonomia regulamentar, se cobra a taxa e qual o valor. Por isso esta app não embute uma tabela nacional completa, e pede ao utilizador o que pagou na fatura.",
    category: "Impostos Patrimoniais",
  },
  {
    id: "pat-021",
    question_pt: "Em Lisboa, qual é o valor de referência da Taxa Municipal Turística por noite, e até quantas noites tributadas (exemplo usado nesta app)?",
    options: ["3€, até 7 noites", "4€, até 7 noites", "4€, até 14 noites", "2€, até 5 noites"],
    correct_index: 1,
    explanation_pt: "O exemplo de Lisboa usado nesta app é 4€ por noite, com um máximo de 7 noites tributadas por estadia.",
    category: "Impostos Patrimoniais",
  },
  {
    id: "pat-022",
    question_pt: "No ISV, a componente cilindrada tem uma taxa por cm³ que...",
    options: [
      "É igual para qualquer cilindrada",
      "Aumenta por escalões, sendo bastante mais alta acima de 1.250 cm³",
      "Diminui à medida que a cilindrada aumenta",
      "Só se aplica a motociclos",
    ],
    correct_index: 1,
    explanation_pt:
      "A componente cilindrada do ISV tem 3 escalões com taxas por cm³ crescentes — de 1,09€/cm³ até 1000cc, a 5,61€/cm³ acima de 1250cc, um salto acentuado.",
    category: "Impostos Patrimoniais",
  },
  {
    id: "pat-023",
    question_pt: "Qual é o valor do adicional do ISV para um veículo ligeiro de passageiros a gasóleo?",
    options: ["100€", "250€", "500€", "1.000€"],
    correct_index: 2,
    explanation_pt:
      "Veículos ligeiros de passageiros a gasóleo pagam um adicional de 500€ no ISV (250€ para ligeiros de mercadorias), além das componentes de cilindrada e CO2.",
    category: "Impostos Patrimoniais",
  },
  {
    id: "pat-024",
    question_pt: "Para um híbrido plug-in beneficiar do desconto de 75% no ISV (pagar só 25%), além de emissões baixas, precisa de quê?",
    options: [
      "Ter mais de 5 lugares",
      "Uma autonomia elétrica mínima (50 km, ou 25 km em casos específicos)",
      "Ser um veículo importado",
      "Ter motor a gasóleo",
    ],
    correct_index: 1,
    explanation_pt:
      "Para beneficiar do desconto de 75% no ISV, um híbrido plug-in precisa de uma autonomia elétrica mínima de 50 km (ou 25 km para matrículas UE 2015-2020) e emissões dentro dos limites definidos.",
    category: "Impostos Patrimoniais",
  },
  {
    id: "pat-025",
    question_pt: "As categorias F e G do IUC (menos comuns que a categoria B) tributam os veículos com base em quê, respetivamente?",
    options: [
      "Cilindrada e CO2, tal como a categoria B",
      "Potência (kW) e peso (kg)",
      "Preço de venda e idade",
      "Número de lugares e combustível",
    ],
    correct_index: 1,
    explanation_pt:
      "A categoria F do IUC tributa por potência (2,95€/kW) e a categoria G por peso (0,75€/kg, com um limite máximo de imposto de 13.705,25€) — categorias específicas, fora da generalidade dos ligeiros de passageiros.",
    category: "Impostos Patrimoniais",
  },
  {
    id: "pat-026",
    question_pt: "Desde 2017, veículos da categoria B do IUC com emissões de CO2 muito altas pagam...",
    options: ["Nada extra", "Um desconto adicional", "Um adicional (recargo) sobre o imposto normal", "Ficam totalmente isentos"],
    correct_index: 2,
    explanation_pt:
      "Desde 2017, existe um adicional (recargo) do IUC para veículos da categoria B com emissões de CO2 muito elevadas, que se soma ao imposto calculado normalmente por cilindrada/CO2.",
    category: "Impostos Patrimoniais",
  },
  {
    id: "pat-027",
    question_pt: "O crédito ao consumo (cartões de crédito, crédito pessoal) paga Imposto de Selo a uma taxa...",
    options: [
      "Igual à do crédito em geral",
      "Mais alta que a do crédito em geral, num regime específico (DL 133/2009)",
      "Está isento de Imposto de Selo",
      "Só se aplica a empresas",
    ],
    correct_index: 1,
    explanation_pt:
      "O crédito a consumidores (verba 17.2, ao abrigo do DL 133/2009 — cartões de crédito, crédito pessoal) paga uma taxa de Imposto de Selo mais alta do que o crédito em geral (verba 17.1).",
    category: "Impostos Patrimoniais",
  },
  {
    id: "pat-028",
    question_pt: "Na Tabela Geral do Imposto de Selo, qual destes ramos de seguro (verba 22) paga a taxa mais alta?",
    options: ["Seguro de caução (3%)", "Seguro de acidentes e doenças (5%)", "Seguros de \"outros ramos\" (9%)", "Seguro de mercadorias transportadas (5%)"],
    correct_index: 2,
    explanation_pt:
      "Os seguros de \"outros ramos\" pagam a taxa mais alta de Imposto de Selo desta verba, 9% — mais que o dobro da taxa do seguro de caução (3%).",
    category: "Impostos Patrimoniais",
  },

  // ---------- Comparação Internacional (continuação) ----------
  {
    id: "int-004",
    question_pt: "Entre os países comparados nesta app, qual tem o tax wedge mais próximo da média da OCDE (35,1%)?",
    options: ["Portugal", "Países Baixos", "Irlanda", "Espanha"],
    correct_index: 1,
    explanation_pt: "Os Países Baixos (35,9%) têm o tax wedge mais próximo da média da OCDE (35,1%) entre os 7 países comparados nesta app.",
    category: "Comparação Internacional",
  },
  {
    id: "int-005",
    question_pt: "Segundo o benchmark desta app, a Irlanda tem um tax wedge...",
    options: ["Mais alto que o de Portugal", "Mais baixo que o de Portugal", "Exatamente igual ao de Portugal", "A OCDE não mede a Irlanda"],
    correct_index: 1,
    explanation_pt: "A Irlanda (32,6%) tem um tax wedge mais baixo que o de Portugal (39,3%).",
    category: "Comparação Internacional",
  },
  {
    id: "int-006",
    question_pt: "Qual destes países tem o tax wedge mais alto, segundo o benchmark desta app?",
    options: ["França", "Alemanha", "Espanha", "Suíça"],
    correct_index: 1,
    explanation_pt: "A Alemanha tem o tax wedge mais alto do grupo comparado (49,3%), acima até de França (47,2%).",
    category: "Comparação Internacional",
  },

  // ---------- Conceitos gerais (continuação) ----------
  {
    id: "ger-005",
    question_pt: "Por que esta app marca as categorias C e D do IUC (veículos pesados de mercadorias) como UNKNOWN, em vez de arriscar um valor?",
    options: [
      "Porque esses veículos não existem em Portugal",
      "Porque a fonte consultada não reproduzia as tabelas completas, e a app prefere não inventar valores",
      "Porque estão isentos de IUC",
      "Porque só se aplicam a veículos estrangeiros",
    ],
    correct_index: 1,
    explanation_pt:
      "É a mesma disciplina em toda a app: quando a fonte disponível não permite confirmar um valor com confiança, a figura fica marcada UNKNOWN em vez de se assumir um número plausível — mesmo que isso signifique deixar algo por calcular.",
    category: "Conceitos Gerais",
  },
  {
    id: "ger-006",
    question_pt: "Onde é que o aviso legal (disclaimer) desta app aparece obrigatoriamente?",
    options: [
      "Só no footer",
      "No onboarding, no ecrã do Dia da Liberdade Fiscal, e no footer/Acerca de",
      "Só quando se usa a foto+IA",
      "Nunca aparece de forma explícita",
    ],
    correct_index: 1,
    explanation_pt:
      "O aviso legal tem três presenças obrigatórias nesta app: no onboarding, no ecrã de resultado do Dia da Liberdade Fiscal, e no footer/Acerca de — sempre visível, nunca escondido.",
    category: "Conceitos Gerais",
  },
  {
    id: "ger-007",
    question_pt: "Nesta app, o que significa um parâmetro fiscal estar marcado como \"🟡 ESTIMATE\"?",
    options: [
      "É um erro conhecido que devia ser corrigido",
      "A estrutura/fórmula está confirmada, mas o valor exato ainda precisa de verificação adicional contra a fonte primária",
      "É sempre um valor falso",
      "O utilizador deve ignorar esse dado por completo",
    ],
    correct_index: 1,
    explanation_pt:
      "ESTIMATE não significa \"errado\" — significa que a estrutura está correta mas o valor concreto ainda não foi confirmado diretamente contra a fonte primária (ao contrário de UNKNOWN, onde nem a estrutura está confirmada).",
    category: "Conceitos Gerais",
  },
  {
    id: "ger-008",
    question_pt: "Um imposto \"progressivo\", como o IRS, significa que...",
    options: [
      "Todos pagam exatamente a mesma percentagem do rendimento",
      "A percentagem paga sobe à medida que o rendimento sobe",
      "Só quem tem rendimentos baixos paga imposto",
      "É um imposto pago só uma vez na vida",
    ],
    correct_index: 1,
    explanation_pt:
      "Num imposto progressivo, a percentagem de imposto sobe à medida que o rendimento sobe — ao contrário de um imposto proporcional (taxa fixa, como o IVA) ou regressivo.",
    category: "Conceitos Gerais",
  },
  {
    id: "ger-009",
    question_pt: "De quanto em quanto tempo esta app revê os seus parâmetros fiscais?",
    options: ["Nunca — os dados ficam fixos para sempre", "Semestralmente (1ª semana de janeiro e de julho)", "Só quando há eleições", "Diariamente"],
    correct_index: 1,
    explanation_pt:
      "Os parâmetros fiscais são revistos semestralmente — início de janeiro, quando costumam entrar em vigor alterações do Orçamento do Estado, e início de julho, seis meses depois, com foco especial nos parâmetros mais voláteis como o ISP.",
    category: "Conceitos Gerais",
  },
];
