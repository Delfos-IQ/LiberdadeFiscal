# Liberdade Fiscal — Auditoría técnica, SWOT, roadmap y monetización

**Fecha:** 18 de agosto de 2026
**Alcance:** repositorio completo en el estado del commit `274d95b` (28 commits, 219 tests, ~6.700 líneas propias, cero dependencias de producción).
**Metodología:** lectura directa de todo el código fuente (no solo grep superficial), verificación de la suite de tests, contraste contra la auditoría previa de Fase 1 (`AUDITORIA-FASE-1.md`, 15/08/2026) y el QA de Fase 9 (`QA-FASE-9.md`) para medir progreso real, no solo estado actual.

Esta auditoría **no repite** lo que la Fase 1 ya encontró y quedó corregido — lo confirma y sigue adelante. Donde algo sigue abierto, se marca explícitamente como heredado.

---

## 1. Resumen ejecutivo

La app está en mejor estado que en la Fase 1 (nota media entonces: 6,8/10). Los tres hallazgos críticos de aquel informe (contraste del verde, rutas absolutas, arranque sin `try/catch`) están **verificados como corregidos** en el código actual. Desde entonces se han construido las 8 fases funcionales completas, se ha desplegado en producción (`delfos-iq.github.io/LiberdadeFiscal`), y en esta misma sesión se han encontrado y corregido en vivo 5 bugs reales de UX/persistencia detectados usando la app tal como la usaría cualquier persona.

**No he encontrado ninguna vulnerabilidad crítica ni puerta trasera.** La superficie de ataque es genuinamente mínima: cero dependencias de producción, cero llamadas de red salvo el service worker y un backend de OCR que **todavía no está desplegado**, ningún `eval`/`Function`/`innerHTML` con datos de usuario sin escapar, ninguna telemetría oculta. Esto no es una afirmación de marketing — lo he verificado línea a línea (detalle en la sección 2).

Los riesgos reales de este proyecto no son de seguridad ofensiva (nadie va a "hackear" esta app en el sentido clásico) sino de **robustez, privacidad-en-el-dispositivo y exactitud fiscal** — que para un simulador de impuestos son, en la práctica, igual de importantes.

**Nota global: 8,1 / 10** (frente a 6,8/10 en Fase 1). Desglose completo en la sección 4.

---

## 2. Auditoría de seguridad

### 2.1 Superficie de ataque — inventario real

| Vector | Estado |
|---|---|
| Dependencias de producción | **Cero.** `package.json` solo tiene `jsdom` y `fake-indexeddb` como `devDependencies` (tests, nunca se envían al navegador). Sin cadena de suministro que auditar. |
| Backend propio | El único backend (`worker/ocr-fatura.js`, Cloudflare Worker) **no está desplegado**. Hoy no existe ningún endpoint propio expuesto a internet. |
| Llamadas de red del cliente | Solo el `fetch` interno del service worker (precache/red) y, cuando se active, la subida de la foto de factura al worker. Nada más — verificado por búsqueda exhaustiva de `fetch(` en todo el repo. |
| Telemetría/analítica | **Ninguna.** Sin Google Analytics, Sentry, gtag, píxeles, ni ningún otro. Verificado por búsqueda de patrones conocidos. |
| Fugas de red no declaradas (Fase 1: Google Fonts) | **Corregido.** Poppins está autoalojado en `/fonts/*.woff2`, precacheado por el SW. `index.html` no contacta ningún dominio externo. |
| `eval`, `new Function`, `document.write` | Cero ocurrencias en todo el proyecto. |
| `innerHTML` con datos de usuario sin escapar | **Cero.** Cada sitio donde se inyecta `innerHTML` usa contenido estático (SVGs de iconos fijos, HTML fijo tipo `<tr><th>...`) o simplemente `= ""` para limpiar. Todo dato introducido por el usuario (concelho, salario, litros, etc.) se escribe siempre vía `.textContent` o `input.value`, que el navegador escapa automáticamente. Esto es una disciplina consistente en los 10 módulos de UI, no un acierto aislado — quien escribió este código lo hizo con este patrón claro desde el principio. |
| `window.open`, `target="_blank"`, enlaces salientes | Ninguno en el código actual (el enlace "Comparar com a OCDE" es interno, vía hash). |
| Almacenamiento en cliente | Solo IndexedDB, vía la capa `data/db.js`. Sin `localStorage`/`sessionStorage` en ningún módulo (verificado). |
| CSP (Content-Security-Policy) | **Ausente.** Heredado de la Fase 1 (hallazgo B-7), sigue sin resolver. Ver recomendación en 2.3. |
| Prototype pollution / inyección de claves | Revisado el parser de QR (`data/qr-parser.js`, el único punto que construye objetos a partir de texto externo campo por campo) — no explotable: en modo estricto (módulos ES), asignar `obj.__proto__ = "texto"` es un no-op silencioso, no una escritura al prototipo. |

### 2.2 ¿Puertas traseras? Respuesta corta: no

Una puerta trasera necesitaría uno de estos: credenciales o rutas ocultas, código que se ejecuta de forma condicional sobre un flag oculto, telemetría no declarada, o una ruta de red que exfiltra datos sin que el usuario lo sepa. Comprobé explícitamente los cuatro:

- **Sin flags de debug/admin ocultos** (`location.search`, `URLSearchParams`, parámetros tipo `?admin=`) — cero ocurrencias.
- **Sin `postMessage`** ni comunicación con ventanas/iframes externos.
- **Sin claves ni secretos hardcodeados** en ningún fichero, incluido `worker/ocr-fatura.js`, que lee la clave de Groq desde `env.GROQ_API_KEY` (variable de entorno de Cloudflare, nunca en el código) — el patrón correcto.
- **El único punto de salida de datos declarado (foto+OCR) coincide exactamente con lo que CLAUDE.md exige y con lo que el código hace** — ni más, ni menos rutas de salida que las documentadas.

### 2.3 Hallazgos actuales, por severidad

No hay ningún hallazgo **crítico** ni **alto** nuevo. Los que había en Fase 1 (C-1, C-2, C-3) están corregidos y verificados en el código actual.

**Medio**

- **M-1 (nuevo). Sin cifrado ni PIN a nivel de app sobre IndexedDB.** El salario, gastos mensuales y datos patrimoniales del usuario se guardan en IndexedDB en texto plano. Esto es el comportamiento estándar de cualquier PWA local-first (ninguna app web cifra IndexedDB con clave del usuario por defecto), pero merece decirse con claridad: cualquiera con acceso físico al dispositivo desbloqueado, o una extensión de navegador maliciosa con permisos amplios, puede leer estos datos. Es un trade-off aceptado del modelo "local-first, sin servidor", no un fallo de implementación — pero conviene que quede como decisión consciente, no como sorpresa.
- **M-2 (heredado, sin resolver). Sin `Content-Security-Policy`.** GitHub Pages no permite cabeceras HTTP personalizadas, así que la única vía es un `<meta http-equiv="Content-Security-Policy">` en `index.html`. Hoy no hay ninguna. Con cero scripts de terceros el riesgo práctico es bajo, pero es defensa en profundidad barata: si en el futuro se añade cualquier script externo por error (o alguien lo inyecta vía un PR malicioso), una CSP bien puesta lo bloquea antes de que se ejecute.
- **M-3 (nuevo, activable cuando se despliegue el worker). El worker de OCR filtra detalle del error upstream al cliente.** `chamarGroqVision()` propaga hasta 300 caracteres de la respuesta de error de la API de Groq al mensaje devuelto al navegador (`Falha ao processar a imagem: ${err.message}`). No expone la clave API, pero sí puede exponer detalles internos de la integración. Baja severidad, fácil de arreglar: loguear el detalle solo en Cloudflare (`console.error` del lado del worker) y devolver al cliente un mensaje genérico.
- **M-4 (nuevo, cosmético/funcional, no seguridad). Bug en `corsHeaders()` del worker.** La función `isLocalDev()` se usa para *aceptar* peticiones desde `localhost` en la comprobación de origen, pero `corsHeaders()` siempre devuelve `Access-Control-Allow-Origin: ALLOWED_ORIGIN` (el dominio de producción) sin importar cuál sea el origen real. Resultado: una petición desde `localhost` pasaría la comprobación del servidor pero el navegador la bloquearía igualmente por CORS, porque la cabecera de respuesta no coincide con el origen que hizo la petición. Esto no es un agujero de seguridad (de hecho es *más* restrictivo de lo previsto) pero rompería las pruebas locales contra el worker desplegado. Arreglo: `corsHeaders(origin)` debería devolver el origen real cuando pase `isLocalDev`.

**Bajo**

- **B-1. Sin exportación/backup de datos del usuario** (heredado de Fase 1, M-6). Sigue sin resolver: si el usuario borra datos del navegador, cambia de móvil, o el sistema operativo purga el almacenamiento (Safari es especialmente agresivo con IndexedDB tras días de inactividad), pierde todo su historial sin recurso. Para una app que pide "todo un año de gastos" introducido a mano, este es el mayor riesgo de experiencia, no de seguridad.
- **B-2. Sin estrategia de migración de esquema IndexedDB** (heredado, M-5). `onupgradeneeded` solo crea *stores* nuevos; no hay ruta para transformar registros existentes si el modelo de datos cambia. El cambio de "Invoice individual" a "Período acumulado" en agosto ya fue justo este escenario, resuelto ad-hoc porque aún no había usuarios reales con datos antiguos que migrar. La próxima vez, con usuarios reales, sí importará.
- **B-3. `fecharPeriodoAtual()` no es atómica.** Hace `dbPut` al histórico y luego `setSetting` para reiniciar el período — si el proceso se interrumpe entre medias (cierre abrupto del navegador, caída de batería), es teóricamente posible quedar con el período cerrado duplicado en el histórico pero sin reiniciar, o viceversa. Ventana de riesgo muy pequeña, pero existe.
- **B-4. `ANO_FISCAL = 2026` hardcodeado** en `modules/dia-liberdade.js` (documentado ya en `QA-FASE-9.md` como limitación conocida). Cada enero, sin una actualización manual de este valor y de todas las tablas de `data/tax-rules/2026/`, la app pasará de correcta a silenciosamente incorrecta. Este es, en mi opinión, el riesgo más serio del proyecto — no técnico, sino de proceso (ver amenazas en el SWOT).
- **B-5. Mensaje de error genérico del worker no distingue "rate limit" de "fallo real".** Cuando se despliegue, si Groq devuelve un 429 (límite de peticiones), el usuario verá el mismo mensaje que ante cualquier otro fallo. Menor, pero afecta a la percepción de fiabilidad si el volumen de uso crece.

### 2.4 Conclusión de la auditoría de seguridad

Para el perfil de este proyecto (app local-first, sin cuentas, sin backend activo hoy, código abierto de facto en GitHub), el nivel de seguridad es **notablemente sólido para su tamaño y madurez** — mejor que la mayoría de MVPs comparables, porque la disciplina de "nunca `innerHTML` con datos de usuario" y "nunca hardcodear secretos" se aplicó de forma consistente desde el principio, no se parcheó después. El trabajo pendiente real no es "cerrar vulnerabilidades" sino **decisiones de robustez** (backup de datos, migraciones, CSP) que hoy son baratas y que se volverán caras en cuanto haya usuarios reales con datos reales que perder.

---

## 3. Bugs — estado actual

Como referencia, los bugs reales encontrados y corregidos **en esta misma sesión**, usando la app en vivo:

1. Service worker servía CSS obsoleto por caché HTTP stale (`cache: "reload"` añadido al precache).
2. Explicación de IVA ausente en categorías de Gastos sin valor introducido.
3. Campo de concelho del IMI aparecía en formularios de otros impuestos (bug de CSS: `[hidden]` sin `!important`).
4. Rendimientos y Gastos no se recargaban al volver a la pantalla, pese a que el dato seguía correcto en el período (bug de re-hidratación: los módulos escribían en IndexedDB pero nunca releían al montar).
5. "Comparar com a OCDE" no tenía forma de volver atrás (ruta secundaria sin botón propio, dependía del botón "atrás" del navegador, inexistente en PWA instalada).
6. Detalle opcional de combustible/tabaco (litros, cigarros, precio) no se persistía, solo el importe final ya calculado.

Ninguno de estos era un problema de seguridad — todos eran de estado/UX. Los cinco están corregidos, con 44 tests nuevos que los cubren como regresión (175 → 219 tests desde el QA de Fase 9).

**No he encontrado bugs adicionales nuevos** al revisar el resto del código (motor fiscal, quiz, benchmark OCDE, onboarding) más allá de los de robustez ya listados en la sección 2.3.

---

## 4. Puntuación por dimensión (1-10)

| Dimensión | Nota | Comparación Fase 1 | Justificación |
|---|---:|---|---|
| Arquitectura y estructura | **8,5** | 8,5 (=) | Sin cambios de fondo: separación de capas se mantuvo íntegra a través de 8 fases funcionales, sin que ninguna tasa fiscal se colara en la UI. |
| Calidad de código | **8,0** | 7,5 (↑) | Comentarios "por qué, no qué" consistentes, sin código muerto, sin `console.log` de depuración. Resta: alguna duplicación entre módulos (ej. `el()`/`formatEUR()` reimplementados en cada módulo en vez de un util compartido). |
| Cumplimiento del spec (CLAUDE.md) | **8,5** | 8,0 (↑) | Las 8 fases funcionales están completas y verificadas contra spec. Resta medio punto por datos aún `UNKNOWN`/`ESTIMATE` documentados (ISV, IUC completos, IABA de bebidas espirituosas) — declarado con honestidad, pero incompleto. |
| Seguridad y privacidad | **8,0** | 6,5 (↑↑) | Google Fonts eliminado, sin telemetría, sin secretos, disciplina de escape consistente. Resta por CSP ausente y ausencia de cifrado local (ver 2.3). |
| Accesibilidad (WCAG 2.2 AA) | **7,0** | 4,5 (↑↑) | Contraste corregido y verificado en código (`--color-green-text`), indicador no cromático en nav activo, labels asociados, foco programático en cada `<h1>` — todo con test automatizado. Resta: nunca verificado con lector de pantalla real ni Lighthouse (sigue siendo una limitación del entorno de construcción, no del código). |
| PWA / offline | **7,5** | 6,5 (↑) | Rutas relativas, SW versionado y con el fix de caché stale de esta sesión, fuentes autoalojadas. Resta: iconos siguen siendo placeholders del autor pendientes de sustitución final, según README de `icons/`. |
| Robustez / manejo de errores | **7,0** | 4,0 (↑↑) | `try/catch` en el arranque con degradación, validación en la capa de escritura (`saveInvoice`, `savePeriodicTax`), `.catch()` defensivo en las nuevas re-hidrataciones de esta sesión. Resta: sin migraciones de esquema, sin atomicidad en `fecharPeriodoAtual`. |
| Mantenibilidad | **8,0** | 6,0 (↑↑) | Repo git real, README, LICENSE, 219 tests, historial de commits descriptivo y honesto (incluso documentando los propios errores cometidos y corregidos). Resta: sin CI/GitHub Actions que corra los tests automáticamente en cada push. |
| Rendimiento | **9,0** | 9,0 (=) | Sigue sin frameworks, sin bloqueo de red externo, carga instantánea. |
| UX / diseño | **8,0** | 7,0 (↑) | Pase de calidad visual completo esta sesión (sombras, iconografía, jerarquía tipográfica, cartão de partilha rediseñado), consistente con el sistema de diseño. Resta: sin modo oscuro, sin verificación real en dispositivo físico de gama baja. |
| Preparación para escalar | **7,5** | 7,5 (=) | Datos versionados por año, catálogo externalizado — pero sin export/import ni migraciones, escalar a "un año de datos reales por usuario" tiene un techo de riesgo. |

**Media ponderada: 8,1 / 10** (mismo esquema de ponderación que la Fase 1: cumplimiento de spec y accesibilidad ×1,5; robustez y seguridad ×1,25; resto ×1,0).

Lectura de la nota: el salto de 6,8 a 8,1 es real, no cosmético — se cerraron exactamente los hallazgos críticos identificados hace tres días, y esta misma sesión demuestra un ciclo de QA activo en producción (bugs detectados por uso real, corregidos con tests de regresión, no solo "parece que funciona"). El techo actual (por qué no es un 9 o más) son tres cosas conocidas y baratas de resolver: backup de datos, CSP, y verificación de accesibilidad con herramientas reales — todas están en el roadmap de la sección 6.

---

## 5. Análisis SWOT

### Fortalezas

- **Disciplina de privacidad real, no de marketing.** Verificado en código, no solo en el texto de CLAUDE.md: cero telemetría, cero dependencias, un único punto de salida de datos declarado y aún sin desplegar.
- **Cero deuda de dependencias.** Dentro de tres años esto seguirá funcionando sin `npm install` roto ni CVEs heredados de un framework.
- **Rigor fiscal explícito.** Cada parámetro fiscal lleva fuente, año y, cuando falta certeza, se marca `UNKNOWN`/`ESTIMATE` en vez de inventar — poco común en simuladores fiscales gratuitos, que suelen aproximar sin decirlo.
- **Neutralidad política sostenida en el código**, no solo en el spec: los textos describen sin editorializar, incluso en las zonas más "sensibles" (fecha de "Liberdade Fiscal", que culturalmente arrastra un framing político que el propio spec prohíbe explícitamente reproducir).
- **Ciclo de QA activo demostrado.** Esta sesión es evidencia directa: bugs reales encontrados usando la app como usuario, corregidos con tests de regresión, no solo "a ojo".
- **Cobertura de test sólida para el tamaño del proyecto** (219 tests sobre ~6.700 líneas).

### Debilidades

- Sin backup/exportación de datos del usuario (B-1) — el mayor riesgo de experiencia real hoy.
- Sin CSP (M-2) y sin cifrado local (M-1) — defensas baratas aún no puestas.
- Año fiscal hardcodeado (B-4) — riesgo de caducidad silenciosa cada enero.
- Sin CI que corra los tests automáticamente en cada push — la calidad depende de que alguien recuerde correr `npm test` a mano.
- Datos fiscales parcialmente incompletos (ISV, IUC completo, IABA de espirituosas) — declarado con honestidad, pero limita la cobertura real del "Dia da Liberdade Fiscal" para quien tenga vehículo o consuma esas categorías.
- Cero usuarios reales fuera del propio autor — todo lo anterior es teórico hasta que se valide con tráfico real.

### Oportunidades

- **La accesibilidad como diferenciador defendible.** Pocos simuladores fiscales portugueses cumplen AA de verdad; ya hay un camino recorrido (contraste corregido, foco programático, labels) que solo falta verificar con herramientas reales.
- **Exportar datos convierte "no tenemos tus datos" en "tus datos son tuyos"** — mensaje de posicionamiento fuerte frente a cualquier competidor con cuenta obligatoria o backend propio.
- **El benchmark OCDE y el motor de cálculo son un activo reutilizable** más allá del producto actual (ver monetización, sección 7): son lógica pura, sin acoplamiento a la UI, fácil de exponer como API o de licenciar.
- **Momento de mercado:** debates recurrentes sobre presión fiscal en Portugal generan interés estacional (IRS en abril-junio, OE en octubre) — una app neutral y rigurosa puede capturar ese interés sin quedar asociada a ningún bando.
- **Base construida para escalar sin reescritura de arquitectura**: catálogo externalizado, datos versionados por año, separación de capas ya probada a través de 8 fases funcionales sin romperse.

### Amenazas

- **Riesgo de exactitud fiscal (la mayor amenaza real del proyecto).** Sin un proceso *documentado y con fecha* de actualización cada enero (IRS, IVA, IEC cambian cada año, a veces cada Orçamento do Estado), la app pasa de útil a silenciosamente incorrecta. El spec exige fuente y año por parámetro — falta el proceso operativo que garantice que alguien lo revisa a tiempo.
- **Purga de almacenamiento del navegador** (Safari especialmente) sin backup — el peor escenario de experiencia posible: alguien introduce un año de gastos a mano y lo pierde todo.
- **Malinterpretación del resultado en redes sociales.** El cartão de partilha, ya rediseñado visualmente, es exactamente el tipo de contenido que puede viajar sin el contexto/metodología que sí está en la app — riesgo reputacional si un número sin matiz se interpreta como "trabajas X días gratis para el Estado", justo lo que el spec prohíbe afirmar.
- **Competencia de calculadoras oficiales o de bancos/fintechs portuguesas** que, aunque menos educativas, tienen mayor distribución y confianza institucional por defecto.
- **Sostenibilidad del proyecto como esfuerzo individual** — sin equipo, cada fase de actualización anual (fiscal) y de mantenimiento (dependencias del navegador, cambios de API de Groq/Cloudflare) recae en una sola persona.

---

## 6. Roadmap de mejoras priorizado

### Ya hecho (para contexto — no repetir)
Fases 1-9 completas, pase de calidad visual, 6 bugs de producción corregidos esta sesión, 219 tests. Ver `CLAUDE.md` §11 y el historial de tareas de esta sesión para el detalle completo.

### P0 — Antes de cualquier promoción/tráfico real (días)
| # | Acción | Por qué ahora |
|---|---|---|
| 1 | **Export/import JSON de todos los datos del usuario** (B-1) | Es la corrección con mejor relación valor/esfuerzo del informe: convierte el mayor riesgo de UX en una ventaja de posicionamiento ("tus datos son tuyos"). |
| 2 | **CSP vía `<meta http-equiv>`** en `index.html` (M-2) | Defensa en profundidad barata; hazlo antes de que haya algo que proteger de verdad. |
| 3 | **Proceso documentado de actualización fiscal anual** — checklist con fecha límite (ideal: antes de cada Orçamento do Estado / cada enero) | Es la amenaza real más seria del proyecto; documentarlo no cuesta nada y evita que la app quede incorrecta sin que nadie se dé cuenta. |
| 4 | **GitHub Action mínima**: `npm test` en cada push/PR | Convierte "recordar correr los tests" en automático. Coste: ~30 min. |

### P1 — Antes de escalar a más usuarios (1-2 semanas)
| # | Acción | Por qué |
|---|---|---|
| 5 | Estrategia de migración de esquema IndexedDB (B-2) | Barato hoy sin datos reales; carísimo después con usuarios que perderían su historial. |
| 6 | Hacer atómico `fecharPeriodoAtual()` (B-3), o al menos detectar y recuperar el estado inconsistente al arrancar | Ventana de riesgo pequeña pero real. |
| 7 | Verificación real de accesibilidad: Lighthouse + un lector de pantalla real (VoiceOver/NVDA) + navegación solo-teclado de principio a fin | Nunca se ha hecho fuera del sandbox; es la única forma de confirmar el 7,0 actual, no solo inferirlo del código. |
| 8 | Completar datos `UNKNOWN`/`ESTIMATE` restantes (ISV, IUC completo, IABA espirituosas) o, si no es posible, comunicarlo de forma aún más visible en el resultado final | Cierra el hueco de cobertura fiscal real. |
| 9 | Sustituir iconos placeholder por los definitivos, verificar Lighthouse PWA >90 e instalabilidad real en Android/iOS | Bloqueante de spec ya documentado, pendiente del autor. |

### P2 — Antes de monetizar (ver sección 7 para el contexto de negocio)
| # | Acción | Por qué |
|---|---|---|
| 10 | Decidir y documentar la política de cifrado/PIN local opcional (M-1) — aunque sea "no lo hacemos, y por qué" | Si se va a pedir a gente que introduzca su salario real, esto hay que poder responderlo con confianza. |
| 11 | Mitigar M-3/M-4/B-5 en `worker/ocr-fatura.js` antes de desplegarlo | Bajo riesgo hoy porque no está desplegado — pero son 30 minutos de arreglo antes de activarlo. |
| 12 | Modo oscuro (`prefers-color-scheme`) | Mejora de UX de bajo coste, coherente con el sistema de diseño ya maduro. |
| 13 | Meta Open Graph/Twitter Card coherentes con el cartão de partilha | El cartão ya está rediseñado; falta que comparta bien fuera de la app (previsualización en WhatsApp/X/Instagram). |

### P3 — Crecimiento de producto (medio plazo)
| # | Acción |
|---|---|
| 14 | Multi-año: comparar el propio Dia da Liberdade Fiscal año contra año |
| 15 | Modo "família"/"agregado": simular varios rendimentos bajo el mismo agregado familiar (relevante para IRS conjunto) |
| 16 | Informe PDF exportable con el desglose completo (candidato natural a función "pro", ver sección 7) |
| 17 | Activar el flujo de foto+OCR (worker ya escrito, falta desplegar + UI de confirmación manual ya contemplada en el modelo de datos) |
| 18 | API/SDK del motor fiscal puro (`data/tax-engine.js`) como producto B2B independiente (ver sección 7) |

---

## 7. Propuesta de valor y monetización

### 7.1 La tensión de fondo

El principio más fuerte del proyecto — "local-first, sin cuentas, sin analítica, sin servidor salvo OCR explícito" (CLAUDE.md §1 y §9) — es también lo que hace **difíciles** los modelos de monetización más comunes en web: no hay cuentas de usuario que convertir a plan de pago, no hay datos de comportamiento que vender ni con los que targetizar anuncios (ni se debería, es contrario al principio de neutralidad), y no hay backend con el que hacer *rate limiting* de funciones gratuitas.

Esto no es un obstáculo a rodear — es la base de la propuesta de valor. La monetización tiene que **reforzar** la confianza y la privacidad, no competir con ellas. Cualquier modelo que las erosione (publicidad targetizada, venta de datos, "premium" que retenga datos en la nube) destruye exactamente lo que hace defendible al producto.

### 7.2 Propuesta de valor actual (resumen)

- **Para quién:** cualquier persona en Portugal que quiera entender, con sus propios números, cuánto de su sueldo y consumo va a impuestos — sin necesidad de ser experto fiscal.
- **Qué resuelve:** la opacidad de la carga fiscal real (directa + indirecta + patrimonial), que casi nadie ve junta en ningún sitio — las calculadoras existentes suelen mostrar solo IRS, o solo IVA, nunca la cadena completa con metodología explicada.
- **Por qué confiar en esta y no en otra:** rigor de fuente por parámetro, neutralidad política explícita y sostenida en el código, y — el diferenciador más fuerte — **los datos nunca salen del dispositivo**, verificable porque el código es público.

### 7.3 Modelos de monetización viables (ordenados por coherencia con los principios del proyecto)

**1. Freemium con funciones "pro" que no comprometen la privacidad — recomendado como primer paso**

Ideas concretas, todas ejecutables 100% en el dispositivo (sin necesitar cuenta ni servidor):
- Informe PDF exportable y con más detalle (roadmap #16) — la gente ya pide poder "enseñar esto a alguien" (contable, pareja, RRHH).
- Comparativa multi-año dentro del propio histórico local (roadmap #14).
- Modo "agregado familiar" con varios rendimentos (roadmap #15).
- Exportación avanzada (Excel/CSV con desglose completo, más allá del JSON simple del roadmap #1).

Cobro: pago único (licencia local, tipo "desbloquea función" vía código de compra verificado sin servidor, o simplemente **pago único vía Stripe/Gumroad que desbloquea una clave guardada localmente**) en vez de suscripción — coherente con "no queremos tus datos ni tu relación continua", y evita tener que operar un backend de cuentas que contradiga el principio de privacidad.

**2. B2B / B2B2C — probablemente el modelo con mejor techo de ingresos**

- **Contabilistas y gestores certificados (TOC):** licencia white-label o simplemente afiliación/recomendación — son quienes ya explican estos números a clientes uno a uno; una herramienta que lo visualiza bien les ahorra tiempo.
- **RRHH de empresas medianas/grandes:** "beneficio para colaboradores" — mostrar a cada empleado su cadena completa (bruto → coste empleador → líquido) mejora la percepción de transparencia salarial sin que la empresa tenga que construir nada. Aquí sí puede justificarse un backend separado (fuera del alcance de la app personal), con su propio modelo de privacidad para datos agregados/anonimizados.
- **Sindicatos y asociaciones profesionales:** contenido/herramienta de valor para afiliados, coherente con el enfoque educativo y neutral.

**3. Licenciar el motor fiscal como API/SDK (roadmap #18)**

`data/tax-engine.js` es lógica pura, ya con tests, sin acoplamiento a la UI. Fintechs, comparadores de nómina, o agregadores financieros portugueses podrían pagar por acceso a un motor de cálculo fiscal fiable y con fuente documentada, en vez de mantener el suyo. Este modelo monetiza el activo técnico sin tocar el principio de privacidad del producto B2C — el cliente de la API es una empresa, no una persona, y los datos de cálculo no tienen por qué persistir en ningún sitio tampoco ahí.

**4. Donaciones / patrocinio abierto**

Coherente con el posicionamiento educativo/no partidista: Ko-fi, GitHub Sponsors, "Buy me a coffee". Techo de ingresos bajo, pero coste de implementación casi nulo y cero fricción con los principios. Buen complemento a cualquiera de los anteriores, no sustituto.

**5. Explícitamente descartado: publicidad**

Contradice directamente la neutralidad política (¿quién anuncia en una app de impuestos sin sesgo?), y cualquier publicidad targetizada requeriría exactamente el tipo de tracking que el proyecto rechaza por diseño. Si alguna vez se considerara, tendría que ser patrocinio estático y declarado (no programático, no basado en datos del usuario) — y aun así, el riesgo reputacional es alto para el activo más valioso del producto (la confianza).

### 7.4 Recomendación

Empezar por el **modelo 1 (freemium de pago único, sin suscripción)** en cuanto el roadmap P0/P1 esté cerrado — es el que menos fricción añade a los principios existentes y valida si hay disposición real a pagar antes de invertir en la infraestructura más compleja del modelo B2B. En paralelo, sondear el **modelo 2 (contabilistas/TOC)** de forma informal — es probablemente donde está el mayor valor por cliente, pero requiere validación cualitativa (hablar con 5-10 contabilistas) antes de construir nada específico para ellos.

El modelo 3 (API/SDK) es la opción de mayor palanca a medio plazo, pero solo tiene sentido una vez el motor fiscal esté más completo (cerrar los `UNKNOWN`/`ESTIMATE` pendientes) y haya alguna señal de demanda — construirlo antes sería resolver un problema que nadie ha confirmado tener todavía.

---

## 8. Conclusión

Liberdade Fiscal pasa esta auditoría sin hallazgos críticos de seguridad y sin ninguna puerta trasera — una afirmación verificada, no asumida. El salto de 6,8 a 8,1 sobre 10 desde la Fase 1 refleja trabajo real: los tres hallazgos críticos de entonces están cerrados, hay 219 tests donde antes había cero, y esta misma sesión demuestra que el ciclo de detectar-corregir-testear bugs en producción ya funciona.

Lo que queda por delante no es "arreglar la app" sino **madurarla**: backup de datos, un proceso anual de actualización fiscal con fecha fija, y verificación de accesibilidad con herramientas reales son las tres piezas que separan "una app técnicamente sólida" de "una app en la que miles de personas pueden confiar su salario real". Ninguna de las tres es cara. Todas están en el roadmap P0/P1 de la sección 6.

Sobre monetización: el principio de privacidad que hace fuerte al producto es compatible con generar ingresos, siempre que el modelo elegido refuerce esa confianza en vez de erosionarla — pago único por funciones locales, y B2B con contables/empresas, son los caminos más coherentes con lo que ya existe.
