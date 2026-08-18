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

## 2. Ver também

- `AUDITORIA-2026-08.md` secção 2.3 (achado M-1) — análise original
  que motivou este documento.
- `CLAUDE.md` §9 — política de privacidade e aviso legal do produto.
- `modules/dados.js` — exportar/importar/apagar todos os dados
  localmente (P0-1 do roadmap).
