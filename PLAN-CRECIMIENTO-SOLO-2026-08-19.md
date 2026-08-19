# Liberdade Fiscal — Plan de crecimiento en solitario (19/08/2026)

Ámbito deliberado: **solo tácticas que puedes ejecutar tú solo, sin depender de prensa, comunidades ajenas ni influencers.** Todo lo de aquí abajo lo puede hacer una persona con un móvil y diez minutos al día. Cero presupuesto asumido.

---

## 0. Ya hecho hoy: mejora real a la tarjeta

`data/share-card.js` ya mostraba solo el texto del cartón dentro del `Web Share API`, no en la propia imagen. Problema: en Instagram Stories, si alguien reenvía o hace captura del cartón, la imagen viaja sola — **el enlace desaparece**. Añadí el dominio (`delfos-iq.github.io`) directamente en el pie de la imagen, discreto, sin competir con el número principal. Commit `355541b`, 325/325 tests en verde. Recuerda hacer `git push` desde tu terminal.

Dos mejoras más que puedo hacer si quieres, no las he tocado hoy para no acumular cambios sin pedir:
- **Variante cuadrada (1:1)** del cartón para feed/carrusel — hoy solo existe el formato vertical 1080×1920 pensado para Stories.
- **Segundo tipo de cartón**: comparación contra la media OCDE (ya tienes los datos en `data/oecd-benchmark-2025.js`), con el aviso de metodología que exige el spec §6.6 — da más pie a conversación que un solo número.

---

## 1. Por qué esto es viable en solitario

Tienes tres ventajas que no dependen de nadie más:
- **El producto es la historia.** Eres el único desarrollador de una PWA fiscal real, en producción, con motor de cálculo verificado contra fuentes primarias. Eso es contenido "building in public" de forma nativa — no tienes que inventarlo.
- **El resultado personal es infinitamente reutilizable.** Cada persona que use la app genera *su propio* cartón — tú solo necesitas dar el primer empujón para que la gente empiece a compartir el suyo.
- **Cero coordinación.** Todo lo de este plan lo publicas tú, cuando quieras, sin esperar aprobación de nadie.

---

## 2. Instagram: qué publicar, sin depender de audiencia previa

### Pilares de contenido (rota entre estos 4)

1. **"Descobre o teu Dia da Liberdade Fiscal"** — el cartón en sí, como Reel/Story con voz en off explicando 1 cifra concreta ("este ano trabalhei X dias só para impostos"). Es tu propio resultado, sirve de ejemplo.
2. **Mitos fiscales rápidos** — un dato sorprendente por vídeo ("Sabias que o IVA nos Açores é mais baixo que no Continente?"). Formato carrusel de 3-4 slides funciona igual de bien si no quieres grabarte.
3. **Building in public** — capturas de pantalla del código, del test suite en verde, de una fuente oficial (Diário da República) al lado del dato que confirma. A la gente le engancha ver el proceso, no solo el resultado.
4. **Pregunta del quiz del día** — sacas una de las 60 preguntas de `data/quiz-questions.js`, la publicas como pregunta con respuesta oculta ("desliza para a resposta"), y al final CTA a hacer el quiz completo en la app.

### Reglas de encuadre (no negociables, vienen del propio CLAUDE.md)

- Nunca "trabajas X días gratis para el Estado" — usa siempre "dedicados a impostos e contribuições, segundo esta simulação".
- Nunca tono partidista ni "esto está mal/bien". Muestra el número, explica el método.
- Disclaimer visible o mencionado cuando el contenido invite a compartir el cartón: "estimativa educativa, não é aconselhamento fiscal".

### Formato y cadencia realista para una persona sola

- **Reels > carrusel > foto suelta**, en ese orden de alcance con cero seguidores — el algoritmo de Instagram empuja Reels a "no seguidores" mucho más que cualquier otro formato.
- 2-3 publicaciones/semana es sostenible en solitario sin quemarte. Mejor 2 constantes durante meses que 7 la primera semana y ninguna la segunda.
- Duración de Reel ideal para este contenido: 15-30s, gancho en el primer segundo (muestra ya el número, no lo dejes para el final).

### Bio y link

- Bio: una frase que sea la promesa del claim ("Descobre quanto do teu trabalho fica realmente contigo 🇵🇹") + el link único en bio apuntando a la app.
- Como el dominio actual (`delfos-iq.github.io`) no es memorable, considera un dominio corto propio (`liberdadefiscal.pt` o similar) solo para que quepa bien en pantalla y se pueda decir en voz alta en un Reel — esto es autoejecutable, es una compra de dominio de ~10€/año, no depende de nadie.

### Ejemplos de copy (PT, listos para pegar)

**Reel de resultado propio:**
> "Fiz as contas a sério: este ano, X dias do meu trabalho vão para impostos e contribuições — não é opinião, é o cálculo. Descobre o teu, grátis, sem registo. Link na bio. #LiberdadeFiscal #FinançasPessoais #Portugal"

**Carrusel mito fiscal:**
> Slide 1: "O IVA em Portugal não é sempre 23%. Slide 2: "Nos Açores, a taxa normal é 16%. Na Madeira, 22%." Slide 3: "Isto muda o que realmente pagas por cada compra." Slide 4 (CTA): "Explora o teu consumo real na app Liberdade Fiscal — link na bio."

---

## 3. Otros canales 100% autoejecutables (no son "depender de otros")

Estos no requieren que nadie más coopere — solo que tú publiques siguiendo las reglas del sitio:

- **Reddit, publicado por ti mismo**: `r/portugal`, `r/literaciafinanceira`, `r/PortugalExpats`. Comparte tu propio resultado + enlace a la app, encuadrado como herramienta, no como autopromoción agresiva — revisa las reglas de autopromoción de cada sub antes (normalmente regla 90/10: 9 aportaciones de valor por cada 1 con enlace propio). Es lento pero 100% en tus manos.
- **Product Hunt**: te das de alta tú mismo, sin depender de nadie que te "invite". Público que ya busca herramientas nuevas.
- **SEO orgánico** (esto compone solo, cero esfuerzo continuo): una página `/faq.html` o `/blog/` simple con contenido a búsquedas reales tipo "quanto pago de IVA em Portugal", "dia da liberdade fiscal Portugal", "quanto ganho realmente depois de impostos". Escrito una vez, indexado por Google, trae tráfico meses después sin que hagas nada más.
- **Directorios de PWA/apps independientes** (autoenvío, sin curación de terceros): listas tipo "PWA showcase", `alternativeto.net`, foros de indie makers — inscripción directa, tú controlas el envío.

---

## 4. Calendario de arranque (4 semanas, ejecutable solo)

| Semana | Instagram | Otro canal |
|---|---|---|
| 1 | Reel de tu propio resultado + carrusel mito IVA regional | Comprar dominio corto (opcional); alta en Product Hunt |
| 2 | Reel building-in-public (código + fuente oficial) | Publicar en `r/literaciafinanceira` |
| 3 | Carrusel pregunta del quiz | Escribir 1 página FAQ SEO |
| 4 | Reel de resultado de un "caso" ficticio (ej. "salário médio em Portugal") | Publicar en `r/portugal`, revisar qué funcionó de las 3 semanas anteriores |

---

## 5. Medir sin analítica invasiva (coherente con tu propio principio de privacidad)

No necesitas Google Analytics para saber si esto funciona:
- **Insights nativos de Instagram** (gratis, ya incluidos) — alcance, guardados, compartidos por publicación.
- **GitHub Pages** ya expone tráfico básico de referrers en el propio repo si activas Insights → Traffic (agregado, sin PII).
- Seguimiento manual simple: una hoja con fecha, qué publicaste, alcance, y una nota subjetiva de si generó conversación — más que suficiente a esta escala.

---

¿Quieres que haga ya la variante cuadrada del cartón o el segundo tipo (comparación OCDE), o que redacte 2-3 Reels más de guion completo?
