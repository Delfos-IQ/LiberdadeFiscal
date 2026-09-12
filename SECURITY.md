# Segurança e privacidade — decisões documentadas

Este documento formaliza decisões de segurança/privacidade da app que
não são óbvias só de ler o código, para que fiquem como decisão
consciente e revisável — não como omissão. Escrito no âmbito do
roadmap P2-10 da `AUDITORIA-2026-08.md` (hallazgo M-1).

## 1. IndexedDB não é cifrado. Não há PIN/senha de acesso à app.

**Decisão: não implementar, por agora.** Os dados que o utilizador
introduz — salário, gastos mensais estimados, impostos patrimoniais
pagos — ficam guardados em texto plano no IndexedDB do navegador,
tal como ficariam em qualquer app local-first equivalente. Não há
ecrã de PIN, biometria ou password ao abrir a app, nem cifragem da
base de dados com uma chave derivada do utilizador.

### Porque é que isto é aceitável (e não um esquecimento)

- **É o comportamento padrão do modelo "local-first, sem servidor"**
  descrito em `CLAUDE.md` §1/§2/§9. Praticamente nenhuma PWA cifra
  IndexedDB com uma chave do utilizador por defeito — fazê-lo é raro
  mesmo em apps financeiras nativas fora do sistema operativo.
- **O modelo de ameaça real é acesso físico ao dispositivo
  desbloqueado**, ou uma extensão de browser maliciosa com permissões
  amplas de leitura de armazenamento. Nenhuma destas duas ameaças é
  mitigada de forma robusta por cifragem client-side com chave
  derivada de um PIN guardado... no mesmo dispositivo — um atacante
  com acesso ao dispositivo desbloqueado normalmente também consegue
  aceder ao PIN ou contornar a proteção da própria app.
- **Os dados não saem do dispositivo** (exceto o fluxo opcional e
  explícito de foto+IA, ver `CLAUDE.md` §6.3/§9) — não há o risco de
  uma fuga em trânsito ou num servidor de terceiros que a cifragem em
  repouso tipicamente protege.
- Introduzir um PIN cria fricção de produto (mais um passo antes de
  ver o resultado, o oposto do princípio "Modo Rápido em <60s" de
  `CLAUDE.md` §6.2) para uma mitigação de segurança de valor marginal
  neste modelo de ameaça concreto.

### O que isto significa na prática para quem usa a app

- Qualquer pessoa com acesso físico ao dispositivo desbloqueado do
  utilizador pode abrir o browser e ler estes dados (salário
  aproximado, padrão de gastos).
- Num computador partilhado, ou num dispositivo sem bloqueio de ecrã,
  este é um risco real e o utilizador deve estar ciente — daí este
  documento existir.

### Mitigação recomendada ao utilizador (fora do código da app)

A app não pode impor isto, mas o disclaimer e a documentação devem
deixar claro que a proteção destes dados depende do bloqueio de ecrã
do próprio dispositivo do utilizador (PIN/biometria do telemóvel ou
password do computador) — não de nenhuma funcionalidade interna da
app. Ver a funcionalidade "Os teus dados" (`modules/dados.js`) para
apagar tudo localmente a qualquer momento, incluindo antes de emprestar
ou vender um dispositivo.

### Quando reconsiderar esta decisão

- Se a app vier a suportar sincronização entre dispositivos ou backup
  na cloud (fora do âmbito de v1, `CLAUDE.md` §1) — nesse caso, os
  dados passariam a sair do dispositivo e cifragem em repouso e em
  trânsito passaria a ser necessária, não opcional.
- Se surgir evidência de uso em contextos de maior risco (ex.: app
  usada por vítimas de violência doméstica onde o abusador tem acesso
  ao dispositivo) — nesse caso, mesmo um PIN fraco muda o cálculo de
  custo/benefício. Não há evidência disso à data desta decisão
  (18/08/2026).

## 2. Analítica agregada (GoatCounter) — não é "analítica invasiva"

**Decisão (01/09/2026): adicionar GoatCounter**, um contador de
páginas vistas open source, alojado em `liberdadefiscalpt.goatcounter.com`.
É a primeira e única origem externa que esta app carrega — até agora,
CLAUDE.md §2 e a CSP garantiam zero dependências de terceiros sem
exceção nenhuma.

### Porque é que isto não contradiz "sem analítica invasiva" (CLAUDE.md §1)

- **Mede só páginas vistas agregadas, nunca comportamento individual.**
  GoatCounter não usa cookies, não faz fingerprinting, não guarda o IP
  completo (trunca-o antes de o gravar), e não permite identificar uma
  pessoa concreta entre duas visitas — só um total de visualizações e
  a origem (referrer, país, tipo de dispositivo).
- **Não tem acesso a nenhum dado fiscal.** O contador dispara ao
  carregar a página (`index.html`), antes de qualquer interação com o
  simulador — nunca vê salário, gastos, ou qualquer valor introduzido
  pelo utilizador. Esses dados continuam exclusivamente no IndexedDB
  do dispositivo, exatamente como descrito em CLAUDE.md §9.
- **É a exceção mínima possível, não uma porta aberta.** A CSP só
  permite este domínio concreto para `script-src` (o próprio contador)
  e `connect-src` (o endpoint que recebe a visualização) — nenhum
  outro script de terceiros passa a estar autorizado.
- **A diferença com "analítica invasiva"** (Google Analytics e
  equivalentes) é o modelo de negócio subjacente: o GoatCounter não
  vende dados a terceiros, não faz perfilamento publicitário, e o
  próprio serviço é open source e auditável — ao contrário de um SDK
  fechado que agrega dados entre milhares de sites para construir
  perfis de utilizador.

### Quando reconsiderar esta decisão

- Se o GoatCounter alguma vez mudar o seu modelo de dados para incluir
  algo mais granular que visualizações agregadas (ex.: sessões
  individuais rastreáveis), esta decisão deve ser revista.
- Se surgir um motivo para medir algo além de "quantas visualizações,
  de onde vêm" — nesse caso, qualquer adição nova exige o mesmo
  escrutínio documentado aqui, não uma extensão silenciosa do escopo.

## 3. Ver também

- `AUDITORIA-2026-08.md` secção 2.3 (achado M-1) — análise original
  que motivou este documento.
- `CLAUDE.md` §9 — política de privacidade e aviso legal do produto.
- `modules/dados.js` — exportar/importar/apagar todos os dados
  localmente (P0-1 do roadmap).
