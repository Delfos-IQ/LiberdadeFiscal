// Liberdade Fiscal — Banco de perguntas do Quiz (Fase 3)
//
// 30 perguntas, cada uma com fonte rastreável. A maioria assenta nos
// parâmetros já verificados em data/tax-rules/2026/ (Fase 2) — ver
// TAX-METHODOLOGY.md. Perguntas de definição geral (o que é cada
// imposto, prazos) foram confirmadas por pesquisa web adicional em
// 15/08/2026. Nenhuma pergunta usa um valor marcado UNKNOWN ou
// ESTIMATE nos dados da Fase 2 — isso seria ensinar um número não
// verificado como se fosse facto.
//
// Estrutura preparada para escalar a 200 perguntas sem mudanças de
// arquitetura (spec §6.1): basta acrescentar objetos a este array.
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
];
