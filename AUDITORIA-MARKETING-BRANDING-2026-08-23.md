# Liberdade Fiscal — Auditoría de marketing, marca y diseño

**Fecha:** 23 de agosto de 2026
**Perspectiva:** equipo de marketing + branding + diseño de producto, con la misma disciplina que se aplicaría a una app de consumo antes de un lanzamiento público — no solo "¿funciona?", sino "¿genera confianza, se entiende en 3 segundos, y da ganas de compartirla?".
**Metodología:** navegación real de la app en producción (onboarding, quiz, rendimentos, gastos, resultado del Dia da Liberdade Fiscal), lectura del código de marca (`data/share-card.js`, `style.css`, `index.html`, meta tags), y contraste contra el propio manual de marca del proyecto (`CLAUDE.md` §4).

**Aviso importante antes de empezar:** durante esta sesión, `https://delfos-iq.github.io/` respondió correctamente las primeras veces que lo visité (pude completar todo el recorrido descrito abajo), pero en los últimos cuatro intentos de recarga —incluyendo en una pestaña nueva— devolvió **"Site not found · GitHub Pages"**. Puede ser un despliegue en curso, un problema puntual de DNS/caché de GitHub Pages, o algo que se resuelva solo en minutos — pero te recomiendo comprobarlo tú mismo cuanto antes, porque un enlace roto es lo peor que le puede pasar a cualquier esfuerzo de marketing (alguien hace clic desde una red social o WhatsApp y aterriza en un 404). Si sigue así, revisa Settings → Pages del repo y si hay algún despliegue reciente fallido en Actions.

---

## 1. Resumen ejecutivo

Liberdade Fiscal tiene los ingredientes de una marca sólida: nombre evocador y fácil de recordar, paleta de color deliberada y con buen contraste, un logo propio (no genérico), y — lo más raro de encontrar en este tipo de proyectos — una historia de marca ya redactada y coherente (los cuatro pilares "Transparente / Privada / Independente / Empoderadora" del onboarding son, honestamente, mejor copy de posicionamiento que el de muchas startups con equipo de marketing dedicado).

Pero hay una distancia real entre "la marca está bien definida en el spec" y "la marca se siente así en cada pantalla". Encontré un patrón que se repite de forma sistemática y que es, con diferencia, el hallazgo más importante de esta auditoría: **texto largo escrito en mayúsculas sostenidas**, aplicado a frases completas (no a etiquetas cortas), en al menos 4 pantallas distintas — incluyendo el mensaje de privacidad, que es literalmente el argumento de venta más fuerte de la app, y que hoy se lee como si estuviera siendo gritado en vez de dicho con calma y autoridad. También hay contenido duplicado (el disclaimer legal aparece dos veces seguidas en casi todas las pantallas) y una fricción de retención real en el onboarding (se repite en cada visita, no solo la primera vez).

Ninguno de estos hallazgos requiere rediseñar nada — son ajustes de CSS y de un par de líneas de texto, no una nueva identidad visual. Esa es la buena noticia: la base es buena, lo que falta es pulido de ejecución, no una nueva estrategia de marca.

**Nota global: 6,8 / 10.** No es una nota baja por falta de criterio de diseño — es una nota que refleja que el "80% fácil" (paleta, tipografía, logo, tono editorial) está muy bien resuelto, pero el "20% que se nota" (jerarquía tipográfica en el detalle, consistencia de mayúsculas, primera impresión repetida) todavía no.

---

## 2. Hallazgos, por severidad

### 🔴 Alto impacto

**H-1. Mayúsculas sostenidas en frases largas, en al menos 4 pantallas — rompe el tono de "calma y autoridad" que el resto de la marca sí logra.**

La clase `.stat-label` (pensada para etiquetas cortas de 2-4 palabras, tipo "SALÁRIO LÍQUIDO MENSAL ESTIMADO" o "TOTAL ESTIMADO DE GASTOS POR MÊS" — ahí funciona bien) se está reutilizando para frases completas y hasta párrafos:

- Rendimentos: `🔒 ESTE CÁLCULO ACONTECE SÓ NESTE DISPOSITIVO. NADA DO QUE INTRODUZIRES É ENVIADO PARA NENHUM SERVIDOR.`
- Gastos: `🔒 ESTES VALORES FICAM SÓ NESTE DISPOSITIVO. NADA É ENVIADO PARA NENHUM SERVIDOR.`
- Dia da Liberdade Fiscal: `🔒 TODO ESTE CÁLCULO ACONTECEU SÓ NESTE DISPOSITIVO — NADA FOI ENVIADO PARA NENHUM SERVIDOR.` y también `23,3% DO ANO (85 DE 365 DIAS) — SEGUNDO AS HIPÓTESES DESTA SIMULAÇÃO.`
- Nota de partilha por WhatsApp: una frase de **27 palabras**, íntegra en mayúsculas — `SE O WHATSAPP NÃO APARECER NO MENU DE PARTILHA, OU MOSTRAR ERRO AO TENTAR ENVIAR, ABRE "MAIS FORMATOS DE PARTILHA" ACIMA E USA "DESCARREGAR IMAGEM" PARA ANEXAR MANUALMENTE NUMA CONVERSA.`

Por qué importa más de lo que parece: el mensaje de privacidad ("tus datos nunca salen de tu dispositivo") es, según tu propio spec, el diferenciador de marca más fuerte del proyecto frente a cualquier competidor con cuenta obligatoria. Es exactamente el mensaje que debería sentirse más tranquilizador — y hoy es el que grita más fuerte. Además, es un problema de legibilidad real y medible, no solo de gusto: leer texto largo en mayúsculas es entre un 10-20% más lento que en minúsculas (el ojo pierde la silueta de las palabras), y es peor todavía para personas con dislexia — un detalle que choca con el objetivo de accesibilidad AA que el proyecto ya persigue en el resto del código.

**Arreglo:** reservar mayúsculas para etiquetas cortas (2-5 palabras) y pasar todo lo demás a una clase nueva (ej. `.nota-privacidade` o reutilizar `.disclaimer`) en formato oración normal, quizá con el 🔒 delante como único elemento visual de énfasis.

**H-2. El disclaimer legal aparece duplicado, seguido, en casi todas las pantallas.**

En Gastos, Taxas y Dia da Liberdade, el texto "Esta aplicação fornece estimativas para fins informativos e educativos..." aparece dos veces seguidas: una vez dentro de la tarjeta de contenido, y otra vez justo debajo en el pie de página persistente (`app-footer`). No es un error de código — cada una cumple una función distinta en el spec (aviso local vs. aviso permanente) — pero visualmente, al usuario le llega como si la app tartamudeara. Es el tipo de detalle que un usuario no puede nombrar pero que sí nota: "esto no está tan cuidado como parecía".

**Arreglo:** cuando el disclaimer local de una pantalla y el del footer queden pegados (sin nada entre medias), suprimir uno de los dos programáticamente, o separar visualmente con más aire/una línea divisoria clara para que no se lean como repetición literal.

### 🟡 Impacto medio

**H-3. El onboarding de 4 tarjetas se repite en cada visita, no solo la primera vez.**

Confirmé en el código (`modules/boas-vindas.js`) que la casilla "Não mostrar esta introdução da próxima vez" empieza **desmarcada** por defecto. Esto significa que cualquier persona que vuelva a abrir la app —para actualizar sus gastos del mes, por ejemplo— tiene que volver a pasar por las 4 tarjetas de "Transparente / Privada / Independente / Empoderadora" antes de llegar a la herramienta. El copy de esas tarjetas es bueno como primera impresión, pero como fricción repetida en cada sesión de un usuario recurrente, juega en contra de la retención — es exactamente el tipo de paso que los usuarios activos aprenden a odiar y a saltarse a toda prisa, perdiendo el efecto que se buscaba.

**Arreglo:** invertir el comportamiento por defecto (mostrar solo la primera vez; casilla para "mostrar siempre" en vez de "no mostrar más"), o mover el contenido a un enlace "Sobre este proyecto" accesible pero no bloqueante.

**H-4. Vacíos visuales grandes en pantallas con poco contenido (viewport ancho/tablet/desktop).**

En el Quiz y en el paso "Antes de começares" de Gastos, la tarjeta de contenido ocupa la parte superior y deja una zona de fondo gris vacía, sin decoración ni contenido, de varios cientos de píxeles antes de llegar al pie de página. La app está bien resuelta mobile-first (que es lo correcto dado el público), pero en cualquier pantalla más ancha que un móvil — tablet, o alguien que la prueba primero en el navegador de escritorio antes de instalarla — se percibe como "una pantalla a la que le falta algo", no como una decisión de diseño.

**Arreglo:** no es prioritario resolverlo con layout complejo — con centrar verticalmente la tarjeta en pantallas altas, o añadir el tipo de ilustración ligera que ya existe en el resultado del Dia da Liberdade (el calendario SVG) a otras pantallas con poco contenido, ya se nota mucho menos.

**H-5. Imagen de Open Graph / Twitter Card es el icono de la app (512×512), no un banner dedicado.**

Ya está señalado como pendiente en el propio código (`index.html`, comentario junto a `og:image`). Cuando alguien comparta un enlace a la app en WhatsApp, X o LinkedIn, la previsualización mostrará el icono cuadrado estirado o recortado en vez de una imagen pensada para ese formato (1200×630, horizontal). Para una app cuyo mecanismo de crecimiento más natural es "alguien comparte su resultado", la primera pieza que ve un desconocido — la previsualización del link antes incluso de abrir la app — hoy no representa bien la marca.

**Arreglo:** un banner 1200×630 con el logo, el claim, y quizá una vista del cartão de resultado — reutilizando la misma paleta y composición que ya existe en `data/share-card.js`, así que no hace falta diseño desde cero.

### 🟢 Impacto bajo / pulido

**H-6. Sin `robots.txt`, `sitemap.xml`, ni `<link rel="canonical">`.** No bloquean nada hoy, pero para una app que se beneficia de tráfico de búsqueda estacional (IRS en primavera, Orçamento do Estado en otoño — ya identificado como oportunidad en la auditoría técnica previa), son gratis de añadir y ayudan a que Google indexe la página correcta sin ambigüedad.

**H-7. El nombre "Dia da Liberdade Fiscal" hereda, lo quieras o no, la connotación del concepto internacional "Tax Freedom Day"** — históricamente promovido por think tanks de orientación fiscal-conservadora en varios países. El propio spec del proyecto (CLAUDE.md §1) es explícito y cuidadoso en evitar ese framing dentro del contenido ("prohibido decir que el usuario trabaja gratis para el Estado"), y el copy que vi en la app cumple esa disciplina de verdad. Pero el nombre del producto por sí solo, antes de que nadie lea una sola palabra de contenido, ya activa esa asociación en quien lo conozca. No es necesariamente un problema — puede ser justo el gancho que atrae la atención inicial — pero es una tensión de posicionamiento que vale la pena tener nombrada y consciente, no asumida.

---

## 3. Lo que ya funciona bien (para no tocarlo sin querer)

- **Paleta de marca** (`Navy #0D1321`, `Green #22C55E`, `Mint #7EEBC1`, `Gold #F6C453`) aplicada con disciplina real en toda la app, con variantes verificadas para contraste AA y modo oscuro — no es solo una paleta bonita, está pensada para funcionar.
- **Logo** (pájaro estilizado + barras de crecimiento) con una versión a color y una en blanco para el header navy — ejecutado, no un placeholder.
- **Jerarquía "números > explicação > decoração"** (CLAUDE.md §4) se cumple de verdad en las pantallas de resultado: el número grande es lo primero que ve el ojo, la explicación viene después, con buen contraste tipográfico entre ambos.
- **El storytelling de las 4 tarjetas del onboarding** — contenido, no solo forma: es una explicación de por qué existe el proyecto que un usuario recordaría, con lenguaje claro y sin jerga.
- **El cartão de partilha** (`data/share-card.js`) tiene composición cuidada: card blanca con sombra sobre fondo de marca, barra de progreso visual, footer con dominio — pensado de verdad para que se vea bien en una Story de Instagram, no un pantallazo cualquiera.
- **Copy consistente en tono** en el resto de la app (fuera de los puntos de H-1): cercano, sin jerga innecesaria, explica el "porqué" antes que el "qué".

---

## 4. Plan de mejora priorizado

### P0 — Esta semana, coste bajo, impacto alto
| # | Acción | Referencia |
|---|---|---|
| 1 | Verificar y resolver la caída de `delfos-iq.github.io` observada en esta sesión | Aviso al inicio del informe |
| 2 | Quitar mayúsculas sostenidas de todas las frases largas; reservar `.stat-label` para etiquetas cortas | H-1 |
| 3 | Resolver la duplicación visual del disclaimer legal en pantallas donde queda pegado | H-2 |
| 4 | Cambiar el comportamiento por defecto del onboarding (mostrar solo la 1.ª vez) | H-3 |

### P1 — Antes de cualquier campaña de difusión (2-3 semanas)
| # | Acción | Referencia |
|---|---|---|
| 5 | Diseñar banner OG/Twitter 1200×630 dedicado, reutilizando la composición del cartão | H-5 |
| 6 | `robots.txt` + `sitemap.xml` + `<link rel="canonical">` | H-6 |
| 7 | Reducir los vacíos visuales en pantallas de poco contenido (centrado vertical o ilustración ligera) | H-4 |

### P2 — Reflexión de posicionamiento (sin coste de desarrollo)
| # | Acción | Referencia |
|---|---|---|
| 8 | Decidir conscientemente cómo se quiere gestionar la connotación de "Tax Freedom Day" del nombre — mantenerlo tal cual (y quizá aprovecharlo como gancho de curiosidad, apoyado en la neutralidad real del contenido) o reforzar aún más el framing neutral en cualquier material de difusión externo (redes, notas de prensa) | H-7 |

---

## 5. Puntuación por dimensión (1-10)

| Dimensión | Nota | Justificación |
|---|---:|---|
| Identidad visual (logo, paleta, tipografía) | **8,5** | Ejecutado de verdad, no solo especificado; contraste AA verificado. |
| Consistencia de tono/voz | **6,0** | Muy bueno en el copy largo (onboarding, explicaciones); roto en el patrón de mayúsculas (H-1), que es sistemático, no un desliz aislado. |
| Primera impresión / onboarding | **7,0** | Contenido excelente; penalizado por la fricción de repetirse en cada visita (H-3). |
| Potencial de viralidad / compartir | **7,5** | Cartão de partilha bien resuelto; penalizado por la previsualización OG genérica (H-5). |
| Pulido visual (desktop/tablet) | **6,0** | Sólido en móvil; vacíos visuales notorios en pantallas más anchas (H-4). |
| SEO / descubribilidad | **6,5** | Meta tags y título bien redactados; faltan piezas técnicas gratuitas (H-6). |
| Coherencia de posicionamiento | **7,5** | Neutralidad real y sostenida en el contenido; tensión de fondo con la connotación del propio nombre (H-7), consciente pero no resuelta. |

**Media ponderada: 6,8 / 10.**

---

## 6. Conclusión

Esta auditoría no encontró un problema de estrategia de marca — encontró una distancia entre una identidad bien pensada en el papel y su ejecución consistente en cada pantalla. El hallazgo más valioso (H-1) es, además, el más barato de arreglar: son clases CSS mal reutilizadas, no una decisión de diseño que defender. Corregir los cuatro puntos P0 de esta semana cambiaría de forma notable cómo se siente la app al usarla por segunda o tercera vez, que es exactamente el momento que más importa para que alguien la recomiende.

No he tocado ningún fichero en esta sesión — este es un informe de diagnóstico, para que decidas qué priorizar antes de que implemente los cambios.
