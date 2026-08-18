// Liberdade Fiscal — Impostos Patrimoniais e de Veículo, ano fiscal 2026
// IMI, IUC, ISV, Imposto de Selo
//
// Atualizado após ronda de investigação adicional (15/08/2026, sessão
// "Vamos a buscar datos fiscales para verificarlos"): ISV e IUC deixam
// de estar completamente UNKNOWN — passam a ter tabelas numéricas
// completas, mas continuam classificados como ESTIMATE porque a fonte
// primária usada foi um agregador especializado (não o texto do
// Código do ISV/IUC diretamente, que devolveu conteúdo vazio/paywalled
// nesta pesquisa) e foram apenas verificadas por reprodução aritmética
// dos exemplos fornecidos pela fonte, não por confirmação cruzada
// direta com o Portal das Finanças. O Imposto de Selo passa a ✅
// Verified: fonte primária direta (Autoridade Tributária e Aduaneira,
// info.portaldasfinancas.gov.pt), Tabela Geral completa.

export const PATRIMONIAIS_2026 = {
  year: 2026,
  source: "Código do IMI, Código do ISV, Código do IUC, Código do Imposto de Selo",
  sourceUrl: "https://www.portaldasfinancas.gov.pt",
  retrievedNote:
    "Estrutura e fórmulas confirmadas via pesquisa web em 15/08/2026. Tabelas numéricas de ISV/IUC/Imposto de Selo atualizadas em ronda de verificação adicional na mesma data — ver notas de fonte por figura abaixo.",

  imi: {
    prediosUrbanos: {
      min: 0.003,
      max: 0.0045,
      unit: "fração do VPT/ano",
      notes:
        "Intervalo legal nacional. A taxa concreta é fixada por cada município (308 municípios) dentro deste intervalo, podendo chegar a 0,5% em circunstâncias específicas (prédios devolutos, degradados). A maioria aplica a taxa mínima (0,3%) em 2026. A app deve pedir o concelho ao utilizador — nunca assumir a taxa mínima silenciosamente.",
    },
    prediosRusticos: { value: 0.008, unit: "fração do VPT/ano" },
    tabelaPorConcelho: {
      // 🟡 ESTIMATE — não "verified" apesar de a fonte imediata citar o
      // Portal das Finanças como origem, porque esta app não leu o
      // Portal das Finanças diretamente (fetch/pesquisa não conseguem
      // atravessar a interface JS do simulador de IMI, mesmo com
      // browser real — não encontrámos um endpoint tabular público
      // equivalente). Confirmação em 18/08/2026, ronda "verificação em
      // mundo real": lista completa por concelho lida diretamente, via
      // browser real (Claude in Chrome), do artigo da Economia e
      // Finanças, que por sua vez declara ter extraído os dados do
      // Portal das Finanças em 02/01/2026 — uma fonte secundária, mas
      // agora com o texto integral em vez de só 3 exceções pontuais.
      status: "ESTIMATE",
      source:
        "Economia e Finanças, \"Taxas de IMI por Município a pagar em 2026\" (02/01/2026), que declara ter extraído os dados do Portal das Finanças — consultado diretamente via browser em 18/08/2026",
      sourceUrl: "https://economiafinancas.com/2026/taxas-de-imi-por-municipio-a-pagar-em-2026/",
      notes:
        "Lista com 299 dos 308 municípios de Portugal. Os 6 concelhos com taxa diferenciada por freguesia (Freixo de Espada à Cinta, Idanha-a-Nova, Lagos, Porto Santo, Aguiar da Beira, Sesimbra) aparecem na tabela com taxa = null — a própria fonte não publica um valor único para eles. Os restantes ~9 concelhos não aparecem de todo na fonte (a própria fonte diz \"há ainda oito municípios para os quais não encontrámos informação no Portal das Finanças\" — não é possível para esta app saber quais são sem consultar o Portal das Finanças diretamente). Continua ESTIMATE porque não houve confirmação cruzada direta com o Portal das Finanças (site com simulador em JavaScript, sem tabela/endpoint public a que esta app tenha conseguido aceder) nem com a Portaria/deliberação camarária de cada município. A app usa esta tabela para SUGERIR a taxa quando o utilizador identifica o concelho, mas pede sempre para confirmar/corrigir contra o Portal das Finanças ou a Câmara Municipal — nunca assume silenciosamente.",
      taxaSugeridaPorOmissao: 0.003,
      // [distrito, nome do concelho, taxa (fração do VPT) | null se
      // diferenciada por freguesia]. Nomes tal como publicados na fonte
      // (maiúsculas, sem acentuação padronizada) — a app normaliza
      // (minúsculas, sem diacríticos) antes de comparar com o que o
      // utilizador escreve.
      lista: [
        ["Angra do Heroísmo", "Angra do Heroísmo", 0.003],
        ["Angra do Heroísmo", "Calheta (Açores)", 0.003],
        ["Angra do Heroísmo", "Santa Cruz da Graciosa", 0.003],
        ["Angra do Heroísmo", "Velas", 0.003],
        ["Angra do Heroísmo", "Vila Praia da Vitória", 0.003],
        ["Aveiro", "Águeda", 0.003],
        ["Aveiro", "Albergaria-a-Velha", 0.003],
        ["Aveiro", "Anadia", 0.003],
        ["Aveiro", "Arouca", 0.003],
        ["Aveiro", "Aveiro", 0.0035],
        ["Aveiro", "Castelo de Paiva", 0.003],
        ["Aveiro", "Estarreja", 0.003],
        ["Aveiro", "Ílhavo", 0.003],
        ["Aveiro", "Mealhada", 0.003],
        ["Aveiro", "Murtosa", 0.0032],
        ["Aveiro", "Oliveira de Azeméis", 0.003],
        ["Aveiro", "Oliveira do Bairro", 0.003],
        ["Aveiro", "Ovar", 0.0034],
        ["Aveiro", "S. João da Madeira", 0.0035],
        ["Aveiro", "Santa Maria da Feira", 0.0037],
        ["Aveiro", "Sever do Vouga", 0.003],
        ["Aveiro", "Vagos", 0.004],
        ["Aveiro", "Vale de Cambra", 0.003],
        ["Beja", "Aljustrel", 0.003],
        ["Beja", "Almodôvar", 0.003],
        ["Beja", "Alvito", 0.003],
        ["Beja", "Barrancos", 0.003],
        ["Beja", "Beja", 0.003],
        ["Beja", "Castro Verde", 0.003],
        ["Beja", "Cuba", 0.003],
        ["Beja", "Ferreira do Alentejo", 0.003],
        ["Beja", "Mértola", 0.003],
        ["Beja", "Moura", 0.003],
        ["Beja", "Odemira", 0.003],
        ["Beja", "Ourique", 0.003],
        ["Beja", "Serpa", 0.003],
        ["Beja", "Vidigueira", 0.003],
        ["Braga", "Amares", 0.003],
        ["Braga", "Barcelos", 0.0033],
        ["Braga", "Braga", 0.0032],
        ["Braga", "Cabeceiras de Basto", 0.003],
        ["Braga", "Celorico de Basto", 0.003],
        ["Braga", "Esposende", 0.003],
        ["Braga", "Fafe", 0.003],
        ["Braga", "Guimarães", 0.0031],
        ["Braga", "Póvoa de Lanhoso", 0.0034],
        ["Braga", "Terras de Bouro", 0.003],
        ["Braga", "Vieira do Minho", 0.003],
        ["Braga", "Vila Nova de Famalicão", 0.0034],
        ["Braga", "Vila Verde", 0.003],
        ["Braga", "Vizela", 0.0035],
        ["Bragança", "Bragança", 0.003],
        ["Bragança", "Carrazeda de Ansiães", 0.003],
        ["Bragança", "Freixo de Espada à Cinta", null],
        ["Bragança", "Macedo de Cavaleiros", 0.003],
        ["Bragança", "Miranda do Douro", 0.003],
        ["Bragança", "Mirandela", 0.003],
        ["Bragança", "Mogadouro", 0.003],
        ["Bragança", "Torre de Moncorvo", 0.003],
        ["Bragança", "Vila Flor", 0.003],
        ["Bragança", "Vimioso", 0.003],
        ["Bragança", "Vinhais", 0.003],
        ["Castelo Branco", "Castelo Branco", 0.003],
        ["Castelo Branco", "Covilhã", 0.003],
        ["Castelo Branco", "Fundão", 0.0038],
        ["Castelo Branco", "Idanha-a-Nova", null],
        ["Castelo Branco", "Oleiros", 0.003],
        ["Castelo Branco", "Penamacor", 0.003],
        ["Castelo Branco", "Proença-a-Nova", 0.003],
        ["Castelo Branco", "Sertã", 0.003],
        ["Castelo Branco", "Vila de Rei", 0.003],
        ["Castelo Branco", "Vila Velha de Ródão", 0.003],
        ["Coimbra", "Cantanhede", 0.0038],
        ["Coimbra", "Coimbra", 0.003],
        ["Coimbra", "Condeixa-a-Nova", 0.003],
        ["Coimbra", "Figueira da Foz", 0.004],
        ["Coimbra", "Góis", 0.0033],
        ["Coimbra", "Lousã", 0.0038],
        ["Coimbra", "Mira", 0.003],
        ["Coimbra", "Miranda do Corvo", 0.003],
        ["Coimbra", "Montemor-o-Velho", 0.0034],
        ["Coimbra", "Oliveira do Hospital", 0.0031],
        ["Coimbra", "Pampilhosa da Serra", 0.003],
        ["Coimbra", "Penacova", 0.003],
        ["Coimbra", "Penela", 0.0038],
        ["Coimbra", "Soure", 0.0034],
        ["Coimbra", "Tábua", 0.0035],
        ["Coimbra", "Vila Nova de Poiares", 0.0039],
        ["Évora", "Alandroal", 0.0042],
        ["Évora", "Arraiolos", 0.003],
        ["Évora", "Borba", 0.0035],
        ["Évora", "Estremoz", 0.003],
        ["Évora", "Évora", 0.0037],
        ["Évora", "Montemor-o-Novo", 0.003],
        ["Évora", "Mora", 0.003],
        ["Évora", "Mourão", 0.0033],
        ["Évora", "Portel", 0.003],
        ["Évora", "Redondo", 0.003],
        ["Évora", "Reguengos de Monsaraz", 0.0035],
        ["Évora", "Vendas Novas", 0.0033],
        ["Évora", "Viana do Alentejo", 0.003],
        ["Évora", "Vila Viçosa", 0.003],
        ["Faro", "Albufeira", 0.003],
        ["Faro", "Alcoutim", 0.003],
        ["Faro", "Aljezur", 0.003],
        ["Faro", "Castro Marim", 0.0039],
        ["Faro", "Faro", 0.003],
        ["Faro", "Lagoa (Algarve)", 0.0036],
        ["Faro", "Lagos", null],
        ["Faro", "Loulé", 0.003],
        ["Faro", "Monchique", 0.003],
        ["Faro", "Olhão", 0.0037],
        ["Faro", "Portimão", 0.0037],
        ["Faro", "S. Brás de Alportel", 0.0041],
        ["Faro", "Silves", 0.003],
        ["Faro", "Tavira", 0.003],
        ["Faro", "Vila do Bispo", 0.003],
        ["Faro", "Vila Real de Santo António", 0.0045],
        ["Funchal (Madeira)", "Calheta (Madeira)", 0.003],
        ["Funchal (Madeira)", "Câmara de Lobos", 0.003],
        ["Funchal (Madeira)", "Funchal", 0.003],
        ["Funchal (Madeira)", "Machico", 0.003],
        ["Funchal (Madeira)", "Ponta do Sol", 0.003],
        ["Funchal (Madeira)", "Porto Moniz", 0.003],
        ["Funchal (Madeira)", "Porto Santo", null],
        ["Funchal (Madeira)", "Ribeira Brava", 0.003],
        ["Funchal (Madeira)", "S. Vicente", 0.003],
        ["Funchal (Madeira)", "Santa Cruz", 0.003],
        ["Funchal (Madeira)", "Santana", 0.003],
        ["Guarda", "Aguiar da Beira", null],
        ["Guarda", "Almeida", 0.003],
        ["Guarda", "Celorico da Beira", 0.0035],
        ["Guarda", "Figueira de Castelo Rodrigo", 0.003],
        ["Guarda", "Fornos de Algodres", 0.0041],
        ["Guarda", "Gouveia", 0.0036],
        ["Guarda", "Guarda", 0.0038],
        ["Guarda", "Mêda", 0.003],
        ["Guarda", "Pinhel", 0.003],
        ["Guarda", "Sabugal", 0.003],
        ["Guarda", "Seia", 0.0034],
        ["Guarda", "Trancoso", 0.003],
        ["Guarda", "Vila Nova de Foz Côa", 0.003],
        ["Horta", "Horta", 0.003],
        ["Horta", "Lajes das Flores", 0.003],
        ["Horta", "Lajes do Pico", 0.003],
        ["Horta", "Madalena", 0.003],
        ["Horta", "S. Roque do Pico", 0.003],
        ["Horta", "Santa Cruz das Flores", 0.003],
        ["Leiria", "Alcobaça", 0.003],
        ["Leiria", "Alvaiázere", 0.003],
        ["Leiria", "Ansião", 0.003],
        ["Leiria", "Batalha", 0.003],
        ["Leiria", "Bombarral", 0.003],
        ["Leiria", "Caldas da Rainha", 0.003],
        ["Leiria", "Castanheira de Pêra", 0.003],
        ["Leiria", "Figueiró dos Vinhos", 0.003],
        ["Leiria", "Leiria", 0.003],
        ["Leiria", "Marinha Grande", 0.003],
        ["Leiria", "Nazaré", 0.0045],
        ["Leiria", "Óbidos", 0.0036],
        ["Leiria", "Pedrógão Grande", 0.003],
        ["Leiria", "Peniche", 0.0031],
        ["Leiria", "Pombal", 0.003],
        ["Leiria", "Porto de Mós", 0.003],
        ["Lisboa", "Alenquer", 0.0036],
        ["Lisboa", "Amadora", 0.003],
        ["Lisboa", "Arruda dos Vinhos", 0.0036],
        ["Lisboa", "Azambuja", 0.0035],
        ["Lisboa", "Cadaval", 0.0035],
        ["Lisboa", "Cascais", 0.0035],
        ["Lisboa", "Lisboa", 0.003],
        ["Lisboa", "Loures", 0.0036],
        ["Lisboa", "Lourinhã", 0.0035],
        ["Lisboa", "Mafra", 0.0043],
        ["Lisboa", "Odivelas", 0.0033],
        ["Lisboa", "Oeiras", 0.0045],
        ["Lisboa", "Sintra", 0.003],
        ["Lisboa", "Sobral de Monte Agraço", 0.003],
        ["Lisboa", "Torres Vedras", 0.0035],
        ["Lisboa", "Vila Franca de Xira", 0.003],
        ["Ponta Delgada", "Lagoa (Açores)", 0.003],
        ["Ponta Delgada", "Nordeste", 0.0043],
        ["Ponta Delgada", "Ponta Delgada", 0.003],
        ["Ponta Delgada", "Povoação", 0.003],
        ["Ponta Delgada", "Ribeira Grande", 0.003],
        ["Ponta Delgada", "Vila do Porto", 0.003],
        ["Ponta Delgada", "Vila Franca do Campo", 0.0043],
        ["Portalegre", "Alter do Chão", 0.003],
        ["Portalegre", "Arronches", 0.003],
        ["Portalegre", "Avis", 0.003],
        ["Portalegre", "Campo Maior", 0.003],
        ["Portalegre", "Castelo de Vide", 0.003],
        ["Portalegre", "Crato", 0.003],
        ["Portalegre", "Elvas", 0.0035],
        ["Portalegre", "Fronteira", 0.003],
        ["Portalegre", "Gavião", 0.003],
        ["Portalegre", "Marvão", 0.003],
        ["Portalegre", "Monforte", 0.0034],
        ["Portalegre", "Nisa", 0.003],
        ["Portalegre", "Ponte de Sor", 0.003],
        ["Portalegre", "Portalegre", 0.003],
        ["Portalegre", "Sousel", 0.0035],
        ["Porto", "Amarante", 0.003],
        ["Porto", "Baião", 0.003],
        ["Porto", "Felgueiras", 0.003],
        ["Porto", "Lousada", 0.003],
        ["Porto", "Maia", 0.0035],
        ["Porto", "Marco de Canaveses", 0.003],
        ["Porto", "Matosinhos", 0.0037],
        ["Porto", "Paços de Ferreira", 0.003],
        ["Porto", "Paredes", 0.003],
        ["Porto", "Penafiel", 0.003],
        ["Porto", "Porto", 0.0032],
        ["Porto", "Póvoa de Varzim", 0.003],
        ["Porto", "Santo Tirso", 0.003],
        ["Porto", "Trofa", 0.0039],
        ["Porto", "Valongo", 0.0034],
        ["Porto", "Vila do Conde", 0.003],
        ["Porto", "Vila Nova de Gaia", 0.0036],
        ["Santarém", "Abrantes", 0.004],
        ["Santarém", "Alcanena", 0.0037],
        ["Santarém", "Almeirim", 0.0038],
        ["Santarém", "Alpiarça", 0.0036],
        ["Santarém", "Benavente", 0.003],
        ["Santarém", "Cartaxo", 0.0045],
        ["Santarém", "Chamusca", 0.003],
        ["Santarém", "Constância", 0.003],
        ["Santarém", "Coruche", 0.003],
        ["Santarém", "Entroncamento", 0.003],
        ["Santarém", "Ferreira do Zêzere", 0.003],
        ["Santarém", "Golegã", 0.0033],
        ["Santarém", "Mação", 0.003],
        ["Santarém", "Ourém", 0.0033],
        ["Santarém", "Rio Maior", 0.0038],
        ["Santarém", "Salvaterra de Magos", 0.0035],
        ["Santarém", "Santarém", 0.0037],
        ["Santarém", "Sardoal", 0.0033],
        ["Santarém", "Tomar", 0.0034],
        ["Santarém", "Torres Novas", 0.0034],
        ["Santarém", "Vila Nova da Barquinha", 0.003],
        ["Setúbal", "Alcácer do Sal", 0.003],
        ["Setúbal", "Alcochete", 0.0034],
        ["Setúbal", "Almada", 0.0035],
        ["Setúbal", "Barreiro", 0.0035],
        ["Setúbal", "Grândola", 0.003],
        ["Setúbal", "Moita", 0.0037],
        ["Setúbal", "Montijo", 0.0031],
        ["Setúbal", "Palmela", 0.003],
        ["Setúbal", "Santiago do Cacém", 0.003],
        ["Setúbal", "Seixal", 0.0033],
        ["Setúbal", "Sesimbra", null],
        ["Setúbal", "Setúbal", 0.0037],
        ["Setúbal", "Sines", 0.0033],
        ["Viana do Castelo", "Arcos de Valdevez", 0.0034],
        ["Viana do Castelo", "Caminha", 0.0039],
        ["Viana do Castelo", "Melgaço", 0.0032],
        ["Viana do Castelo", "Monção", 0.003],
        ["Viana do Castelo", "Paredes de Coura", 0.003],
        ["Viana do Castelo", "Ponte da Barca", 0.0034],
        ["Viana do Castelo", "Ponte de Lima", 0.0032],
        ["Viana do Castelo", "Valença", 0.003],
        ["Viana do Castelo", "Viana do Castelo", 0.0035],
        ["Viana do Castelo", "Vila Nova de Cerveira", 0.003],
        ["Vila Real", "Alijó", 0.0032],
        ["Vila Real", "Boticas", 0.003],
        ["Vila Real", "Chaves", 0.003],
        ["Vila Real", "Mesão Frio", 0.004],
        ["Vila Real", "Mondim de Basto", 0.003],
        ["Vila Real", "Montalegre", 0.003],
        ["Vila Real", "Murça", 0.003],
        ["Vila Real", "Peso da Régua", 0.0037],
        ["Vila Real", "Ribeira de Pena", 0.003],
        ["Vila Real", "Sabrosa", 0.003],
        ["Vila Real", "Santa Marta de Penaguião", 0.003],
        ["Vila Real", "Valpaços", 0.003],
        ["Vila Real", "Vila Pouca de Aguiar", 0.003],
        ["Vila Real", "Vila Real", 0.0039],
        ["Viseu", "Armamar", 0.003],
        ["Viseu", "Carregal do Sal", 0.003],
        ["Viseu", "Castro Daire", 0.003],
        ["Viseu", "Cinfães", 0.003],
        ["Viseu", "Lamego", 0.0037],
        ["Viseu", "Mangualde", 0.003],
        ["Viseu", "Moimenta da Beira", 0.003],
        ["Viseu", "Mortágua", 0.003],
        ["Viseu", "Nelas", 0.003],
        ["Viseu", "Oliveira de Frades", 0.003],
        ["Viseu", "Penalva do Castelo", 0.003],
        ["Viseu", "Penedono", 0.003],
        ["Viseu", "Resende", 0.0038],
        ["Viseu", "S. Pedro do Sul", 0.003],
        ["Viseu", "Santa Comba Dão", 0.0039],
        ["Viseu", "Satão", 0.003],
        ["Viseu", "Sernancelhe", 0.003],
        ["Viseu", "Tabuaço", 0.004],
        ["Viseu", "Tarouca", 0.003],
        ["Viseu", "Tondela", 0.003],
        ["Viseu", "Vila Nova de Paiva", 0.003],
        ["Viseu", "Viseu", 0.003],
        ["Viseu", "Vouzela", 0.003],
      ],
      excecoesConhecidas: {
        // Achado desta ronda (18/08/2026): a lista de 3 concelhos
        // usada anteriormente (fonte: Doutor Finanças, 06/01/2026)
        // estava desatualizada/incompleta — a leitura direta da tabela
        // completa (Economia e Finanças, 02/01/2026) mostra um 4.º
        // concelho com a taxa máxima de 0,45%: Nazaré.
        taxaMaxima045: ["Vila Real de Santo António", "Oeiras", "Cartaxo", "Nazaré"],
      },
    },
  },

  // ---------------------------------------------------------------
  // ISV — Imposto sobre Veículos (pago uma única vez, na matrícula)
  // ---------------------------------------------------------------
  // Fonte original: EcoImport, "ISV 2026: Novas Regras, Tabelas
  // Oficiais e o Que Realmente Mudou" (ecoimport.pt/isv-2026-novas-
  // regras/), consultado 15/08/2026, confirmando que o OE2026 não
  // alterou as tabelas de cilindrada/CO2 face a 2025.
  //
  // Verificação direta (18/08/2026, roadmap P1-8): a tabela completa de
  // componenteCilindrada e componenteCO2Wltp abaixo foi cruzada,
  // número a número, contra o folheto oficial da Autoridade Tributária
  // "Sistema Fiscal Português — Taxas Aplicáveis 2025"
  // (info.portaldasfinancas.gov.pt/pt/apoio_contribuinte/
  // Folhetos_informativos/Documents/SFP-Taxas-2025.pdf), secção 4 (ISV)
  // — todos os valores (taxa/cm3, taxa/grama CO2, parcela a abater)
  // batem exatamente. Como o OE2026 não alterou estas tabelas (fonte
  // EcoImport acima), esta confirmação de 2025 vale para 2026. Por
  // isso passa de ESTIMATE a ✅ Verified — mesmo padrão já aplicado ao
  // Imposto de Selo nesta secção.
  isv: {
    status: "verified",
    source:
      "EcoImport (estrutura e confirmação de ausência de alteração no OE2026) + Autoridade Tributária e Aduaneira, \"Sistema Fiscal Português — Taxas Aplicáveis 2025\", secção ISV (valores numéricos, cruzados um a um), consultado 18/08/2026",
    sourceUrl:
      "https://info.portaldasfinancas.gov.pt/pt/apoio_contribuinte/Folhetos_informativos/Documents/SFP-Taxas-2025.pdf",
    formula:
      "ISV = componente cilindrada + componente ambiental (CO2, tabela WLTP) [+ 500€ se gasóleo] [× 0,25 se PHEV elegível] × (1 - desconto por idade, se usado importado). Só as tabelas WLTP foram recolhidas — veículos homologados em NEDC (normalmente pré-2018) continuam UNKNOWN nesta app.",
    // Componente cilindrada — igual para gasolina/GPL/GN, aplicável à generalidade
    // dos automóveis de passageiros (Tabela A).
    componenteCilindrada: [
      { max: 1000, taxaPorCC: 1.09, parcelaAAbater: 849.03 },
      { min: 1001, max: 1250, taxaPorCC: 1.18, parcelaAAbater: 850.69 },
      { min: 1251, max: Infinity, taxaPorCC: 5.61, parcelaAAbater: 6194.88 },
    ],
    // Componente ambiental (CO2), protocolo WLTP — tabelas distintas por combustível.
    componenteCO2Wltp: {
      gasolina: [
        { max: 110, taxaPorGrama: 0.44, parcelaAAbater: 43.02 },
        { min: 111, max: 115, taxaPorGrama: 1.1, parcelaAAbater: 115.8 },
        { min: 116, max: 120, taxaPorGrama: 1.38, parcelaAAbater: 147.79 },
        { min: 121, max: 130, taxaPorGrama: 5.27, parcelaAAbater: 619.17 },
        { min: 131, max: 145, taxaPorGrama: 6.38, parcelaAAbater: 762.73 },
        { min: 146, max: 175, taxaPorGrama: 41.54, parcelaAAbater: 5819.56 },
        { min: 176, max: 195, taxaPorGrama: 51.38, parcelaAAbater: 7247.39 },
        { min: 196, max: 235, taxaPorGrama: 193.01, parcelaAAbater: 34190.52 },
        { min: 236, max: Infinity, taxaPorGrama: 233.81, parcelaAAbater: 41910.96 },
      ],
      gasoleo: [
        { max: 110, taxaPorGrama: 1.72, parcelaAAbater: 11.5 },
        { min: 111, max: 120, taxaPorGrama: 18.96, parcelaAAbater: 1906.19 },
        { min: 121, max: 140, taxaPorGrama: 65.04, parcelaAAbater: 7360.85 },
        { min: 141, max: 150, taxaPorGrama: 127.4, parcelaAAbater: 16080.57 },
        { min: 151, max: 160, taxaPorGrama: 160.81, parcelaAAbater: 21176.06 },
        { min: 161, max: 170, taxaPorGrama: 221.69, parcelaAAbater: 29227.38 },
        { min: 171, max: 190, taxaPorGrama: 274.08, parcelaAAbater: 36987.98 },
        { min: 191, max: Infinity, taxaPorGrama: 282.35, parcelaAAbater: 38271.32 },
      ],
    },
    taxaAdicionalGasoleo: {
      ligeiroPassageiros: 500,
      ligeiroMercadorias: 250,
      notes: "Aplica-se a veículos a gasóleo com emissões de partículas acima de 0,001 g/km — simplificação: esta app assume que todo o gasóleo paga o adicional.",
    },
    descontoPHEV: {
      percentagemPago: 0.25,
      notes:
        "Híbridos plug-in com bateria recarregável, autonomia elétrica mínima de 50 km (ou 25 km para matrículas UE 2015-2020), e emissões ≤ 50 g/km (Euro 6 ou anterior) ou ≤ 80 g/km (Euro 6e-bis, novo em 2026) pagam só 25% do ISV calculado. O utilizador tem de autodeclarar a elegibilidade — a app não valida homologação.",
    },
    isencaoEletricos: true,
    descontoPorIdade: [
      { min: 0, max: 1, desconto: 0.1 },
      { min: 1, max: 2, desconto: 0.2 },
      { min: 2, max: 3, desconto: 0.28 },
      { min: 3, max: 4, desconto: 0.35 },
      { min: 4, max: 5, desconto: 0.43 },
      { min: 5, max: 6, desconto: 0.52 },
      { min: 6, max: 7, desconto: 0.6 },
      { min: 7, max: 8, desconto: 0.65 },
      { min: 8, max: 9, desconto: 0.7 },
      { min: 9, max: 10, desconto: 0.75 },
      { min: 10, max: Infinity, desconto: 0.8 },
    ],
  },

  // ---------------------------------------------------------------
  // IUC — Imposto Único de Circulação (pago anualmente)
  // ---------------------------------------------------------------
  // Fonte original: DECO PROteste, "Tabelas IUC 2026: quanto paga e até
  // quando" (deco.proteste.pt/dinheiro/impostos/noticias/tabelas-iuc-
  // quanto-paga), consultado 15/08/2026.
  //
  // Verificação direta (18/08/2026, roadmap P1-8): categoriaB (cilindrada,
  // CO2 NEDC/WLTP, coeficientes por ano de matrícula) e categoriaAPre2007
  // (gasóleo 1996-2007/1990-1995/1981-1989 completo; gasolina/GPL/
  // elétrico só 1996-2007) foram cruzadas número a número contra o
  // mesmo folheto oficial da AT usado para o ISV acima, secção 3
  // (IUC) — todos os valores batem exatamente, incluindo o adicional
  // de gasóleo. Confirmado também que as taxas de IUC de 2026 são
  // iguais às de 2024/2025 (sem alteração no OE2026). categoriaB e
  // categoriaAPre2007 passam por isso a ✅ Verified. categoriaEMotociclos
  // não foi re-cruzada nesta ronda — mantém-se como estava. Categorias
  // C/D (mercadorias, por peso bruto) e F (potência em kW), e as
  // colunas de gasolina 1990-1995/1981-1989, continuam sem tabela
  // recolhida.
  iuc: {
    status: "verified",
    source:
      "DECO PROteste (estrutura) + Autoridade Tributária e Aduaneira, \"Sistema Fiscal Português — Taxas Aplicáveis 2025\", secção IUC (valores numéricos de categoriaB e categoriaAPre2007, cruzados um a um), consultado 18/08/2026",
    sourceUrl:
      "https://info.portaldasfinancas.gov.pt/pt/apoio_contribuinte/Folhetos_informativos/Documents/SFP-Taxas-2025.pdf",
    notes:
      "Estrutura de 6 categorias (A-F) mencionada no spec original. categoriaB (ligeiros de passageiros/mistos, 1.ª matrícula desde 1/7/2007 — a mais comum) e categoriaAPre2007 (gasóleo completo; gasolina/GPL/elétrico só 1996-2007) verificadas diretamente contra a AT nesta ronda — ver nota acima. categoriaEMotociclos (triciclos/quadriciclos) mantém-se ESTIMATE, fonte DECO PROteste, não re-cruzada. Categorias C/D (mercadorias, por peso bruto) e F (potência em kW) continuam sem tabela numérica recolhida.",
    isencaoVeiculosEletricos: true,
    isencaoDeficiencia60PorCento: true,
    limiarDispensaCobranca: 10, // se o imposto calculado for < 10€, não é cobrado
    categoriaB: {
      aplicavelA: "Automóveis ligeiros de passageiros e mistos, 1.ª matrícula a partir de 1 de julho de 2007",
      componenteCilindrada: [
        { max: 1250, taxa: 31.77 },
        { min: 1251, max: 1750, taxa: 63.74 },
        { min: 1751, max: 2500, taxa: 127.35 },
        { min: 2501, max: Infinity, taxa: 435.84 },
      ],
      componenteCO2: {
        nedc: [
          { max: 120, taxa: 65.15 },
          { min: 121, max: 180, taxa: 97.63 },
          { min: 181, max: 250, taxa: 212.04 },
          { min: 251, max: Infinity, taxa: 363.25 },
        ],
        wltp: [
          { max: 140, taxa: 65.15 },
          { min: 141, max: 205, taxa: 97.63 },
          { min: 206, max: 260, taxa: 212.04 },
          { min: 261, max: Infinity, taxa: 363.25 },
        ],
      },
      coeficienteAnoMatricula: [
        { ano: 2007, coeficiente: 1 },
        { ano: 2008, coeficiente: 1.05 },
        { ano: 2009, coeficiente: 1.1 },
        { anoMin: 2010, coeficiente: 1.15 },
      ],
      adicionalGasoleo: [
        { max: 1250, valor: 5.02 },
        { min: 1251, max: 1750, valor: 10.07 },
        { min: 1751, max: 2500, valor: 20.12 },
        { min: 2501, max: Infinity, valor: 68.85 },
      ],
      formula: "IUC = (taxa cilindrada + taxa CO2) × coeficiente do ano de matrícula [+ adicional gasóleo, por cilindrada]",
    },
    categoriaAPre2007: {
      aplicavelA: "Veículos com 1.ª matrícula até 30 de junho de 2007",
      gasoleo: {
        "1996a2007": [
          { max: 1500, taxa: 19.9, adicional: 3.14 },
          { min: 1501, max: 2000, taxa: 39.95, adicional: 6.31 },
          { min: 2001, max: 3000, taxa: 62.4, adicional: 9.86 },
          { min: 3001, max: Infinity, taxa: 158.31, adicional: 25.01 },
        ],
        "1990a1995": [
          { max: 1500, taxa: 12.55, adicional: 1.98 },
          { min: 1501, max: 2000, taxa: 22.45, adicional: 3.55 },
          { min: 2001, max: 3000, taxa: 34.87, adicional: 5.51 },
          { min: 3001, max: Infinity, taxa: 83.49, adicional: 13.19 },
        ],
        "1981a1989": [
          { max: 1500, taxa: 8.8, adicional: 1.39 },
          { min: 1501, max: 2000, taxa: 12.55, adicional: 1.98 },
          { min: 2001, max: 3000, taxa: 17.49, adicional: 2.76 },
          { min: 3001, max: Infinity, taxa: 36.09, adicional: 5.7 },
        ],
      },
      gasolinaGplEletrico: {
        notes: "Sem adicional. Escalões de cilindrada diferem por tipo de combustível — ver tabela completa na fonte.",
        "1996a2007": [
          { max: 1000, taxa: 19.9 },
          { min: 1001, max: 1300, taxa: 39.95 },
          { min: 1301, max: 1750, taxa: 62.4 },
          { min: 1751, max: 2600, taxa: 158.31 },
          { min: 2601, max: 3500, taxa: 287.49 },
          { min: 3501, max: Infinity, taxa: 512.23 },
        ],
      },
    },
    categoriaEMotociclos: {
      aplicavelA: "Motociclos, triciclos e quadriciclos",
      "aPartirDe1996": [
        { min: 120, max: 250, taxa: 6.19 },
        { min: 251, max: 350, taxa: 8.76 },
        { min: 351, max: 500, taxa: 21.18 },
        { min: 501, max: 750, taxa: 63.62 },
        { min: 751, max: Infinity, taxa: 138.15 },
      ],
    },
  },

  // ---------------------------------------------------------------
  // Imposto de Selo — ✅ Verified (fonte primária direta)
  // ---------------------------------------------------------------
  // Fonte: Autoridade Tributária e Aduaneira, "Tabela Geral do Imposto
  // do Selo" (info.portaldasfinancas.gov.pt/pt/informacao_fiscal/
  // codigos_tributarios/selo/Pages/ccod-selo-tabgiselo.aspx),
  // consultado diretamente 15/08/2026 — versão em vigor nessa data,
  // sem alterações assinaladas pelo Orçamento do Estado 2026.
  impostoSelo: {
    status: "verified",
    source: "Autoridade Tributária e Aduaneira — Tabela Geral do Imposto do Selo",
    sourceUrl:
      "https://info.portaldasfinancas.gov.pt/pt/informacao_fiscal/codigos_tributarios/selo/Pages/ccod-selo-tabgiselo.aspx",
    notes:
      "Só as verbas mais relevantes para um utilizador particular estão modeladas nesta app (aquisição de imóveis, transmissões gratuitas, arrendamento, crédito ao consumo, garantias, seguros). A Tabela Geral completa tem 30 números — o resto fica documentado aqui mas sem função de cálculo dedicada. Nota editorial do spec (§6.3): o Imposto de Selo e o IVA são mutuamente exclusivos, nunca acumulados sobre o mesmo ato.",
    verba1_1_aquisicaoOnerosaImoveis: { taxa: 0.008, descricao: "Aquisição onerosa de imóveis — sobre o maior valor entre preço e VPT. Pago em simultâneo com o IMT, nunca em vez dele." },
    verba1_2_transmissaoGratuita: {
      taxa: 0.1,
      descricao: "Heranças e doações. Isento entre cônjuges/unidos de facto, descendentes e ascendentes (linha reta) — aplica-se a outros graus de parentesco e a terceiros.",
    },
    verba2_arrendamento: { taxa: 0.1, descricao: "Sobre o valor de 1 mês de renda, no início do contrato ou em cada aumento." },
    verba10_garantias: {
      prazoInferior1Ano: { taxa: 0.0004, unidade: "por mês ou fração" },
      prazoIgualOuSuperior1Ano: { taxa: 0.005 },
      semPrazoOuIgualOuSuperior5Anos: { taxa: 0.006 },
    },
    verba17_1_creditoGeral: {
      prazoInferior1Ano: { taxa: 0.0004, unidade: "por mês ou fração" },
      prazoIgualOuSuperior1Ano: { taxa: 0.005 },
      prazoIgualOuSuperior5Anos: { taxa: 0.006 },
    },
    verba17_2_creditoConsumo: {
      descricao: "Crédito a consumidores (DL 133/2009) — cartões de crédito, crédito pessoal, etc.",
      prazoInferior1Ano: { taxa: 0.00141, unidade: "por mês ou fração" },
      prazoIgualOuSuperior1Ano: { taxa: 0.0176 },
    },
    verba17_3_operacoesFinanceiras: {
      jurosEComissoesFinanciamento: { taxa: 0.04 },
      comissoesGarantiasPrestadas: { taxa: 0.03 },
      outrasComissoesServicosFinanceiros: { taxa: 0.04 },
    },
    verba22_seguros: {
      caucao: { taxa: 0.03 },
      acidentesDoencasCreditoAgricola: { taxa: 0.05 },
      mercadoriasTransportadas: { taxa: 0.05 },
      embarcacoesAeronaves: { taxa: 0.05 },
      outrosRamos: { taxa: 0.09 },
    },
  },
};
