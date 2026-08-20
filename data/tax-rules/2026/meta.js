// Liberdade Fiscal — Metadados de revisão dos parâmetros fiscais
// (19/08/2026, a pedido do autor: "um alerta ... para saber quando os
// dados foram atualizados").
//
// Fonte única de verdade para a data mostrada no footer/Acerca de
// (app.js injeta este texto no arranque) e em TAX-METHODOLOGY.md — em
// vez de escrever a data em dois sítios e arriscar ficarem
// dessincronizados.
//
// Cadência: revisão semestral (1ª semana de janeiro — coincide com a
// entrada em vigor de alterações do Orçamento do Estado — e 1ª semana
// de julho, seis meses depois). Ver scheduled task
// "liberdade-fiscal-revisao-semestral" (mcp__scheduled-tasks), que
// dispara nessas datas e inclui instruções explícitas para atualizar
// este ficheiro sempre que reveja os dados.
//
// IMPORTANTE: atualizar `ultimaRevisao` e `proximaRevisaoPrevista`
// sempre que se reveja qualquer parâmetro em data/tax-rules/2026/,
// mesmo que a conclusão seja "sem alterações" — a data reflete quando
// a revisão aconteceu, não só quando algo mudou.

export const REVISAO_DADOS_2026 = {
  ultimaRevisao: "2026-08-19",
  proximaRevisaoPrevista: "2027-01-05",
  nota:
    "Revisão semestral (1ª semana de janeiro e de julho). \"Última revisão\" reflete a data em que os parâmetros fiscais foram verificados contra as fontes, mesmo nos semestres em que nada mudou.",
};
