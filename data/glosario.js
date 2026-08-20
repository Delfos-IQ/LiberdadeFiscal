// Liberdade Fiscal — Glossário fiscal (19/08/2026, a pedido do autor:
// "para aquellas personas que quieran más", sem tocar no fluxo
// principal — ver conversa sobre fricção vs. profundidade opcional).
//
// Conteúdo curado à mão, em linguagem simples, reescrito a partir do
// que já está verificado em data/tax-rules/2026/*.js e
// TAX-METHODOLOGY.md — nenhum valor novo, nenhuma fonte nova. O
// `status` de cada entrada espelha o status do campo correspondente
// no ficheiro de dados de origem (ver `sourceField` em cada entrada,
// só como referência para quem for atualizar isto — não é lido pelo
// código). Onde o ficheiro de origem tem partes "verified" e partes
// "ESTIMATE"/"UNKNOWN" (ex.: IMI, IMT), o status aqui reflete a parte
// mais fraca — nunca arredondar "para cima" a confiança de uma figura.
//
// Fora do âmbito desta app (CLAUDE.md §0/§1): pensões, benefícios
// sociais, planeamento financeiro. O glossário cobre só as figuras da
// tabela do CLAUDE.md §7 (carga fiscal de trabalhar/consumir/ter
// património em Portugal), nunca temas de segurança social como
// prestações ou reforma — ver decisão explícita do autor de manter
// esse limite.

/**
 * @typedef {Object} GlossarioEntrada
 * @property {string} id
 * @property {string} sigla
 * @property {string} nome
 * @property {"Direto"|"Indireto geral"|"Indireto especial"|"Patrimonial"} tipo
 * @property {string} categoria - agrupa a UI (mesma ideia das categorias do quiz)
 * @property {string} pagaQuem_pt
 * @property {string} explicacao_pt
 * @property {string} comoSeCalcula_pt
 * @property {"verified"|"estimate"|"unknown"} status
 * @property {string} source
 * @property {string} [sourceUrl]
 * @property {string} sourceField - onde vive o dado original, para quem atualizar isto a par de data/tax-rules/
 */

/** @type {GlossarioEntrada[]} */
export const GLOSSARIO = [
  {
    id: "irs",
    sigla: "IRS",
    nome: "Imposto sobre o Rendimento das Pessoas Singulares",
    tipo: "Direto",
    categoria: "Rendimento",
    pagaQuem_pt: "Quem tem rendimento — trabalho, pensões, rendas, negócio próprio — acima do mínimo de existência.",
    explicacao_pt:
      "O IRS incide sobre o teu rendimento anual. É progressivo: quem ganha mais paga uma percentagem maior, mas só sobre a parte do rendimento que excede cada limiar — nunca sobre o total ao subir de escalão.",
    comoSeCalcula_pt:
      "Ao rendimento bruto subtraem-se deduções específicas (ex.: 4.587,09€/ano para trabalho dependente). Ao rendimento coletável resultante aplicam-se 9 escalões (12,5% a 48%), cada um só sobre a sua fatia. Depois subtraem-se deduções à coleta (por dependente, entre outras). Acima de 80.000€/ano soma-se ainda a taxa adicional de solidariedade (2,5% ou 5%, consoante o valor). Açores e Madeira aplicam uma redução uniforme de 30% sobre a taxa marginal de todos os escalões.",
    status: "verified",
    source: "Lei n.º 73-A/2025 (Orçamento do Estado 2026), Art. 68.º e 68.º-A do CIRS",
    sourceUrl: "https://www.portaldasfinancas.gov.pt",
    sourceField: "data/tax-rules/2026/irs.js",
  },
  {
    id: "seguranca-social",
    sigla: "TSU",
    nome: "Segurança Social — Taxa Social Única",
    tipo: "Direto",
    categoria: "Rendimento",
    pagaQuem_pt: "Trabalhadores por conta de outrem, entidades patronais, e trabalhadores independentes.",
    explicacao_pt:
      "Financia pensões de reforma e invalidez, subsídio de desemprego, subsídio de doença, subsídio parental e outros apoios sociais. Não é um imposto sobre o Estado em geral — é especificamente a contribuição para este sistema.",
    comoSeCalcula_pt:
      "No regime geral (trabalho por conta de outrem), a TSU total é 34,75%: 11% descontado ao trabalhador, 23,75% pago pela entidade patronal como custo adicional (não sai do salário do trabalhador). Trabalhadores independentes no regime simplificado pagam 21,4% sobre o \"rendimento relevante\" — 70% da faturação de serviços prestados (20% para venda de bens), não sobre o total faturado.",
    status: "verified",
    source: "Código dos Regimes Contributivos (Lei n.º 110/2009)",
    sourceUrl: "https://www.seg-social.pt",
    sourceField: "data/tax-rules/2026/seguranca-social.js",
  },
  {
    id: "iva",
    sigla: "IVA",
    nome: "Imposto sobre o Valor Acrescentado",
    tipo: "Indireto geral",
    categoria: "Consumo",
    pagaQuem_pt: "Quem compra bens e serviços — está incluído no preço final, pago pelo vendedor ao Estado.",
    explicacao_pt:
      "Ao contrário do IRS, não depende de quanto ganhas — todos pagam a mesma taxa sobre a mesma compra. Portugal tem três taxas, diferentes por região: Continente, Açores e Madeira.",
    comoSeCalcula_pt:
      "Continente: 6% (reduzida, bens essenciais) / 13% (intermédia, ex.: restauração) / 23% (normal). Açores: 4% / 9% / 16%. Madeira: 4% / 12% / 22% — nota: a taxa reduzida é igual (4%) nas duas regiões autónomas, só a intermédia e a normal diferem entre elas.",
    status: "verified",
    source: "Código do IVA (CIVA), Art. 18.º e Listas I/II anexas",
    sourceUrl: "https://www.portaldasfinancas.gov.pt",
    sourceField: "data/tax-rules/2026/iva.js",
  },
  {
    id: "isp",
    sigla: "ISP",
    nome: "Imposto sobre os Produtos Petrolíferos e Energéticos",
    tipo: "Indireto especial",
    categoria: "Consumo",
    pagaQuem_pt: "Quem compra combustíveis — está incluído no preço à bomba, antes do IVA.",
    explicacao_pt:
      "É a componente do preço da gasolina/gasóleo que vai para o Estado, além do preço base do combustível. O IVA, por sua vez, incide sobre o preço já com o ISP incluído — por isso há \"imposto sobre imposto\" nesta figura.",
    comoSeCalcula_pt:
      "Um valor fixo por litro, diferente para gasolina e gasóleo. Este é o parâmetro mais volátil de todo o motor fiscal: pode ser ajustado por portaria do Governo com frequência semanal ou mensal, como mecanismo de estabilização do preço dos combustíveis — por isso este glossário não mostra um valor concreto, que ficaria desatualizado rapidamente. Consulta o preço à bomba do dia para saberes o valor exato.",
    status: "estimate",
    source: "Código dos Impostos Especiais de Consumo (CIEC) + Portarias mensais/semanais",
    sourceUrl: "https://diariodarepublica.pt",
    sourceField: "data/tax-rules/2026/impostos-especiais.js",
  },
  {
    id: "iaba",
    sigla: "IABA",
    nome: "Imposto sobre o Álcool e as Bebidas Alcoólicas",
    tipo: "Indireto especial",
    categoria: "Consumo",
    pagaQuem_pt: "Quem compra bebidas alcoólicas — está incluído no preço final.",
    explicacao_pt:
      "Varia muito por tipo de bebida: o vinho tranquilo e o espumante estão isentos, enquanto a cerveja e as bebidas espirituosas pagam taxas específicas — nada disto aparece separado do preço na prateleira, mas está lá.",
    comoSeCalcula_pt:
      "Vinho tranquilo/espumante: isentos (0€/hl). Outras bebidas fermentadas (ex.: sidra): 12,06€/hl. Produtos intermédios (ex.: vinhos generosos): 87,92€/hl. Álcool etílico e bebidas espirituosas: 1.602,51€/hl de álcool puro contido — a mesma base para as duas. Cerveja: por escalões de teor alcoólico/grau Plato, de 9,64€ a 33,85€/hl. Pequenas cervejeiras/destilarias pagam só 50% da taxa normal.",
    status: "verified",
    source: "Autoridade Tributária e Aduaneira, \"Sistema Fiscal Português — Taxas Aplicáveis\", secção IABA (Art.os 71.º-76.º do CIEC)",
    sourceUrl: "https://info.portaldasfinancas.gov.pt/pt/apoio_contribuinte/Folhetos_informativos/Documents/SFP-Taxas-2025.pdf",
    sourceField: "data/tax-rules/2026/impostos-especiais.js",
  },
  {
    id: "it",
    sigla: "IT",
    nome: "Imposto do Tabaco",
    tipo: "Indireto especial",
    categoria: "Consumo",
    pagaQuem_pt: "Quem compra produtos de tabaco e nicotina — está incluído no preço final.",
    explicacao_pt:
      "Cobre não só cigarros tradicionais, mas também tabaco aquecido, charutos, líquidos de cigarro eletrónico e, desde 2026, bolsas de nicotina — uma figura fiscal nova.",
    comoSeCalcula_pt:
      "A maioria dos produtos combina dois elementos: um valor fixo (\"específico\", por 1000 cigarros ou por grama) mais uma percentagem do preço de venda (\"ad valorem\"). Cigarros: 151,88€/1000 + 1%. Tabaco aquecido: 0,0935€/grama + 15%. Charutos: 0,091€/grama + 15%. Tabaco de fumar/rapé/mascar e tabaco para cachimbo de água: só ad valorem (25% e 75%, respetivamente — o mais alto de todos). Bolsas de nicotina: 0,065€/grama. Líquido de e-cigarette: 0,351€/ml com nicotina, 0,175€/ml sem.",
    status: "verified",
    source: "Autoridade Tributária e Aduaneira, \"Sistema Fiscal Português — Taxas Aplicáveis\", secção IT",
    sourceUrl: "https://info.portaldasfinancas.gov.pt/pt/apoio_contribuinte/Folhetos_informativos/Documents/SFP-Taxas-2025.pdf",
    sourceField: "data/tax-rules/2026/impostos-especiais.js",
  },
  {
    id: "imi",
    sigla: "IMI",
    nome: "Imposto Municipal sobre Imóveis",
    tipo: "Patrimonial",
    categoria: "Património",
    pagaQuem_pt: "Quem é proprietário de um imóvel a 31 de dezembro do ano anterior — pago anualmente.",
    explicacao_pt:
      "Ao contrário do IRS ou do IVA, não é nacional na taxa exata: cada um dos 308 municípios decide, dentro de um intervalo legal, quanto cobrar.",
    comoSeCalcula_pt:
      "Prédios urbanos: entre 0,3% e 0,45% do valor patrimonial tributário (VPT), podendo chegar a 0,5% para prédios devolutos ou degradados — a taxa exata depende do município. Prédios rústicos: taxa fixa nacional de 0,8%. A app sugere uma taxa a partir do concelho que indicares, mas pede sempre para confirmares contra o Portal das Finanças ou a Câmara Municipal — a tabela por concelho usada aqui é uma estimativa, não uma fonte oficial direta.",
    status: "verified",
    source: "Código do IMI",
    sourceUrl: "https://www.portaldasfinancas.gov.pt",
    sourceField: "data/tax-rules/2026/patrimoniais.js (imi)",
  },
  {
    id: "imt",
    sigla: "IMT",
    nome: "Imposto Municipal sobre Transmissões Onerosas",
    tipo: "Patrimonial",
    categoria: "Património",
    pagaQuem_pt: "Quem compra um imóvel — pago uma única vez, no momento da compra.",
    explicacao_pt:
      "É o imposto que se paga ao comprar casa, sobre o maior valor entre o preço de compra e o valor patrimonial tributário do imóvel — distinto do Imposto de Selo, que também se paga na mesma transação (os dois coexistem aqui, ao contrário de IVA e Selo, que nunca se acumulam).",
    comoSeCalcula_pt:
      "As taxas são progressivas e variam consoante o imóvel se destina a habitação própria e permanente, habitação secundária, ou outros fins, com escalões de valor diferentes para cada caso. Esta app ainda não tem uma tabela numérica verificada destas taxas — regista-se o valor já pago, lido da nota de liquidação, em vez de calculado aqui.",
    status: "unknown",
    source: "Código do IMT — tabela de taxas ainda não verificada nesta app",
    sourceUrl: "https://www.portaldasfinancas.gov.pt",
    sourceField: "não modelado em data/tax-rules/2026/ — registo manual em modules/impostos-anuais.js",
  },
  {
    id: "isv",
    sigla: "ISV",
    nome: "Imposto sobre Veículos",
    tipo: "Patrimonial",
    categoria: "Veículo",
    pagaQuem_pt: "Quem matricula um veículo pela primeira vez em Portugal — pago uma única vez.",
    explicacao_pt:
      "Soma duas componentes: uma pela cilindrada do motor, outra pelas emissões de CO2 — quanto mais poluente, mais caro. Elétricos estão isentos; híbridos plug-in elegíveis pagam só 25%.",
    comoSeCalcula_pt:
      "Componente cilindrada: taxa por cm³, crescente por escalões (muito mais alta acima de 1.250cc). Componente CO2: taxa por grama de CO2/km, em tabelas diferentes para gasolina e gasóleo, e diferentes consoante o veículo esteja homologado em WLTP (mais recente) ou NEDC (mais antigo, até cerca de 2018). Gasóleo paga ainda um adicional fixo (500€ para ligeiros de passageiros). Veículos usados importados têm um desconto por idade, de 10% no 1.º ano até 80% a partir dos 10 anos.",
    status: "verified",
    source: "Autoridade Tributária e Aduaneira, \"Sistema Fiscal Português — Taxas Aplicáveis\", secção ISV",
    sourceUrl: "https://info.portaldasfinancas.gov.pt/pt/apoio_contribuinte/Folhetos_informativos/Documents/SFP-Taxas-2025.pdf",
    sourceField: "data/tax-rules/2026/patrimoniais.js (isv)",
  },
  {
    id: "iuc",
    sigla: "IUC",
    nome: "Imposto Único de Circulação",
    tipo: "Patrimonial",
    categoria: "Veículo",
    pagaQuem_pt: "Quem é proprietário de um veículo — pago anualmente, no mês do aniversário da matrícula.",
    explicacao_pt:
      "É o \"selo do carro\" de cada ano, ao contrário do ISV, que só se paga uma vez, na matrícula. Elétricos e pessoas com incapacidade ≥60% estão isentos; se o valor calculado for inferior a 10€, não é cobrado.",
    comoSeCalcula_pt:
      "A categoria mais comum (ligeiros de passageiros com 1.ª matrícula desde 1/7/2007) combina cilindrada e CO2, com coeficientes que variam por ano de matrícula. Gasóleo paga um adicional fixo. Desde 2017, veículos com emissões de CO2 muito altas pagam ainda um recargo extra. Categorias menos comuns: F (potência, €/kW) e G (peso, €/kg, com um teto máximo). Veículos pesados de mercadorias (categorias C/D) ficam UNKNOWN nesta app — a fonte consultada não reproduzia essas tabelas.",
    status: "verified",
    source: "Autoridade Tributária e Aduaneira, \"Sistema Fiscal Português — Taxas Aplicáveis\", secção IUC",
    sourceUrl: "https://info.portaldasfinancas.gov.pt/pt/apoio_contribuinte/Folhetos_informativos/Documents/SFP-Taxas-2025.pdf",
    sourceField: "data/tax-rules/2026/patrimoniais.js (iuc)",
  },
  {
    id: "imposto-selo",
    sigla: "Imposto de Selo",
    nome: "Imposto de Selo",
    tipo: "Patrimonial",
    categoria: "Património",
    pagaQuem_pt: "Depende do ato: quem compra um imóvel, quem recebe uma herança/doação fora da linha reta, quem arrenda, quem contrata crédito ou seguros.",
    explicacao_pt:
      "É o imposto \"apanha-tudo\" para atos jurídicos que não são vendas de bens/serviços comuns — por isso nunca se acumula com o IVA sobre o mesmo ato (são mutuamente exclusivos). Cônjuge/unido de facto, descendentes e ascendentes estão isentos na transmissão gratuita (herança/doação).",
    comoSeCalcula_pt:
      "Aquisição de imóveis: 0,8% (pago junto com o IMT, nunca em vez dele). Herança/doação a terceiros: 10%. Arrendamento: 10% sobre 1 mês de renda. Crédito ao consumo (cartões, crédito pessoal): taxa mais alta que o crédito em geral (regime específico). Seguros: entre 3% (caução) e 9% (\"outros ramos\"), consoante o tipo.",
    status: "verified",
    source: "Autoridade Tributária e Aduaneira — Tabela Geral do Imposto do Selo",
    sourceUrl: "https://info.portaldasfinancas.gov.pt/pt/informacao_fiscal/codigos_tributarios/selo/Pages/ccod-selo-tabgiselo.aspx",
    sourceField: "data/tax-rules/2026/patrimoniais.js (impostoSelo)",
  },
  {
    id: "cav",
    sigla: "CAV",
    nome: "Contribuição Audiovisual",
    tipo: "Patrimonial",
    categoria: "Outras taxas",
    pagaQuem_pt: "Quase todos os consumidores de eletricidade em Portugal Continental — cobrada mensalmente.",
    explicacao_pt:
      "Financia o serviço público de rádio e televisão (RTP). Aparece discretamente numa linha da fatura da luz, por isso muita gente não sabe que a paga.",
    comoSeCalcula_pt:
      "2,85€/mês (antes de IVA), ou 3,02€ já com o IVA reduzido de 6% incluído. Tarifa reduzida de 1,00€/mês para beneficiários do complemento solidário para idosos, do rendimento social de inserção, do subsídio social de desemprego, do 1.º escalão do abono de família, ou da pensão social de invalidez. Isenção total para consumo anual inferior a 400 kWh.",
    status: "verified",
    source: "Lei n.º 30/2003, de 22 de agosto, Art. 4.º — texto consolidado lido diretamente via Diário da República",
    sourceUrl: "https://diariodarepublica.pt/dr/legislacao-consolidada/lei/2003-105700797-105720191",
    sourceField: "data/tax-rules/2026/outras-taxas.js (cav)",
  },
  {
    id: "coeficiente-regime-simplificado",
    sigla: "Regime Simplificado",
    nome: "Coeficiente do Regime Simplificado (trabalhadores independentes)",
    tipo: "Direto",
    categoria: "Rendimento",
    pagaQuem_pt: "Trabalhadores independentes (recibos verdes) que optem pelo regime simplificado de IRS.",
    explicacao_pt:
      "Em vez de deduzir despesas reais uma a uma, o regime simplificado aplica um coeficiente fixo à faturação — só essa fração é que conta como rendimento tributável em sede de IRS. O coeficiente varia por tipo de atividade (Art. 31.º CIRS): 0,75 para prestação de serviços em geral, mas outros valores para venda de mercadorias, alojamento local, atividades hoteleiras, entre outros — não é um número único.",
    comoSeCalcula_pt:
      "Só está confirmado o coeficiente-regra de 0,75 (prestação de serviços, Art. 151.º CIRS). A tabela completa por atividade do Art. 31.º CIRS não foi verificada nesta app — por isso o Taxímetro (Rendimentos) não simula trabalhadores independentes: aplicar só o coeficiente de 0,75 a qualquer atividade daria um valor errado para quem não presta serviços em regime geral (ex.: venda de mercadorias tem coeficiente bem mais baixo).",
    status: "estimate",
    source: "Art. 151.º e 31.º do CIRS — só o coeficiente-regra confirmado, tabela completa por atividade (CAE) por confirmar",
    sourceUrl: "https://diariodarepublica.pt/dr/legislacao-consolidada/lei/2014-70048167-902120232",
    sourceField: "data/tax-rules/2026/irs.js (coeficienteRegimeSimplificado) — dormant, não usado a partir da UI desde 19/08/2026",
  },
  {
    id: "taxa-turistica",
    sigla: "Taxa Turística",
    nome: "Taxa Municipal Turística",
    tipo: "Patrimonial",
    categoria: "Outras taxas",
    pagaQuem_pt: "Quem se hospeda em alojamento turístico num município que a cobre — normalmente incluída na fatura do alojamento.",
    explicacao_pt:
      "Ao contrário do IMI, não existe uma tabela nacional: cada município decide, dentro da sua autonomia regulamentar, se cobra esta taxa e quanto. Por isso esta app não tenta embutir uma lista completa de todos os municípios — regista-se o que a fatura mostrar.",
    comoSeCalcula_pt:
      "Um valor fixo por noite, geralmente com um número máximo de noites tributadas por estadia. Exemplos usados nesta app: Lisboa, 4€/noite até 7 noites; Porto, 3€/noite até 7 noites — outros municípios têm valores e regras de isenção diferentes.",
    status: "estimate",
    source: "Host Wise; Doutor Finanças/DECO PROteste; Câmaras Municipais de Lisboa e do Porto",
    sourceUrl: "https://www.hostwise.pt/blog/taxa-turistica-alojamento-local-portugal",
    sourceField: "data/tax-rules/2026/outras-taxas.js (taxaTuristica)",
  },
];
