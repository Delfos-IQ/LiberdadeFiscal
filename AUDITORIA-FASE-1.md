# Auditoría profunda — Liberdade Fiscal (Fase 1: Foundation)

**Fecha:** 15 de agosto de 2026
**Alcance auditado:** `index.html`, `app.js`, `style.css`, `sw.js`,
`manifest.json`, `data/db.js`, `icons/`
**Base de contraste:** el proyecto tiene 39,5 KB de código propio. Todo
hallazgo de este informe fue verificado ejecutando comprobaciones
(cálculo de ratios WCAG, análisis de imports, chequeo de sintaxis,
inventario de ficheros), no por inspección visual.

> **Nota de encuadre.** Esto es una Fase 1 (andamiaje). Muchos "huecos"
> aquí listados son trabajo planificado para fases posteriores y **no**
> son defectos. Este informe los separa explícitamente: sólo la sección
> de *Hallazgos* contiene cosas que están mal **hoy**; los huecos de
> roadmap van marcados como `[PLANIFICADO]`.

---

## 1. Resumen ejecutivo

La base es sólida: arquitectura correcta, vanilla JS sin dependencias,
separación limpia de capas, y una capa de persistencia bien diseñada.
El código está bien comentado y es coherente con el spec en lo
estructural.

Sin embargo, la auditoría encontró **3 defectos críticos** que romperían
la app o incumplirían un principio no negociable del spec, y **6 de
severidad media**. El más grave no es un bug de código sino una
**contradicción entre la identidad visual y el objetivo WCAG 2.2 AA**:
el verde de marca, usado como color de texto, tiene un contraste de
2,28:1 — muy por debajo del mínimo de 4,5:1, y por debajo incluso del
umbral relajado de 3:1 para texto grande.

Esto importa especialmente porque el elemento que más lo sufre es
`.stat-hero--green`: el número del Dia da Liberdade Fiscal, es decir, el
remate de todo el producto.

---

## 2. Hallazgos por severidad

### CRÍTICO

#### C-1. El verde de marca falla WCAG como color de texto (2,28:1)

Ratios calculados sobre la paleta real del spec:

| Uso | Par de color | Ratio | AA texto (4,5:1) | AA grande (3:1) |
|---|---|---|---|---|
| `.stat-hero--green` (número principal) | `#22C55E` sobre `#FFFFFF` | **2,28:1** | FALLA | **FALLA** |
| Nav item activo | `#22C55E` sobre `#FFFFFF` | **2,28:1** | FALLA | **FALLA** |
| Enlaces (`a`) | `#22C55E` sobre `#FFFFFF` | **2,28:1** | FALLA | **FALLA** |
| Enlaces sobre fondo | `#22C55E` sobre `#F1F3F5` | **2,05:1** | FALLA | FALLA |

**La paleta no es el problema — el uso sí.** El mismo verde como *fondo*
con texto navy encima da 8,14:1 (excelente). El fallo aparece sólo
cuando el verde es el color de primer plano.

Punto importante: `.stat-hero` mide 2,75rem (44px), así que se le aplica
el umbral relajado de texto grande (3:1). Aun así falla. No hay tamaño
al que este verde sobre blanco cumpla.

**Además, WCAG 1.4.1 (Uso del color):** el estado activo de la
navegación se señaliza *únicamente* con color. Un usuario con
daltonismo (deuteranopia, ~6% de hombres) no puede saber en qué sección
está.

Corrección sugerida — introducir un verde específico para texto,
manteniendo `#22C55E` para fondos y rellenos:

```css
--color-green: #22C55E;        /* fondos, barras, rellenos — NO texto */
--color-green-text: #15803D;   /* 4,54:1 sobre blanco — cumple AA */
```

Y añadir un indicador no cromático al nav activo (barra superior, peso
tipográfico, o icono relleno vs contorno).

Otros dos hallazgos menores del mismo cálculo: `--color-danger`
(`#E5484D`, 3,91:1) no cumple AA como texto normal, y el anillo de foco
(`#0D6EFD`, 4,05:1 sobre fondo) queda justo por debajo de 4,5:1 aunque
cumple el 3:1 exigible a componentes de UI.

---

#### C-2. Rutas absolutas incompatibles con GitHub Pages de proyecto

Todas las referencias internas usan raíz absoluta (`/style.css`,
`/app.js`, `/manifest.json`, `/icons/…`, `start_url: "/index.html"`,
y los 5 assets de `STATIC_ASSETS` en `sw.js`).

Esto **sólo funciona** si el despliegue es la página raíz de la
organización (`delfos-iq.github.io`). Si se publica como página de
proyecto — `delfos-iq.github.io/liberdade-fiscal/`, que es el caso por
defecto — **todos los assets dan 404**: no carga el CSS, no carga el JS,
el service worker no instala y el manifest no resuelve. La app queda en
blanco.

El spec (§2) dice "Despliegue: GitHub Pages, bajo la organización
`delfos-iq`", lo que no aclara cuál de los dos modos. Es una decisión
que hay que tomar **antes** de seguir construyendo, porque afecta a
cada ruta del proyecto.

Corrección: usar rutas relativas (`./style.css`, `"./index.html"`) y en
el service worker derivar la base de `self.registration.scope` en lugar
de asumir `/`. Añadir también un `.nojekyll` en la raíz (GitHub Pages
ignora por defecto ficheros y carpetas que empiezan por `_`, y el
procesado Jekyll es innecesario aquí).

---

#### C-3. Fallo de IndexedDB tumba el arranque de la app

`init()` no tiene `try/catch`:

```js
async function init() {
  initOfflineBanner();
  initNav();
  await registerServiceWorker();
  await ensureOnboarding();   // <-- puede rechazar
}
```

`ensureOnboarding()` llama a `getSetting()`, que abre IndexedDB. Si
IndexedDB no está disponible o falla, la promesa se rechaza sin captura
y el arranque muere con un *unhandled rejection*.

Cuándo pasa en la práctica: modo privado en algunos navegadores, Safari
con almacenamiento restringido, usuarios con cookies/almacenamiento
bloqueados por política, o una pestaña vieja bloqueando un upgrade de
esquema (`onblocked`, que `db.js` sí contempla y rechaza correctamente).

Esto es especialmente grave dada la promesa del producto: una app
local-first y offline no puede quedar inutilizable porque falle el
almacenamiento. Debería degradar a modo efímero (sesión en memoria) con
un aviso claro de que los datos no se guardarán, nunca a pantalla rota.

---

### MEDIO

#### M-1. `min-height: 44px` aplicado a todos los `<a>` rompe texto en línea

```css
button, [role="button"], a, input, select, summary {
  min-height: var(--tap-target-min);   /* 44px */
}
```

La intención (objetivos táctiles WCAG 2.2) es correcta, pero el selector
es demasiado amplio: alcanza también a los enlaces *dentro de párrafos*.
Un enlace en medio de una frase pasa a tener 44px de alto, rompiendo el
interlineado del párrafo.

Todavía no se nota porque no hay enlaces en línea en la UI actual —
aparecerá en cuanto se escriban las pantallas de metodología y fuentes
fiscales, que estarán llenas de enlaces a la Autoridade Tributária. Es
una bomba de relojería, no un bug latente inofensivo.

Corrección: limitar la regla a enlaces con rol de acción
(`a.btn`, `.app-nav a`), no a todos.

#### M-2. Router desincronizado del historial del navegador

`initNav()` escribe `window.location.hash` pero no hay ningún listener
de `hashchange` ni `popstate` (verificado: 0 ocurrencias). Consecuencias:

- El botón "atrás" cambia la URL pero no la UI ni el `aria-current`.
- Entrar directo a `…/#faturas` (enlace compartido, marcador) no
  selecciona esa sección.

Es un esqueleto de router, así que no está "roto" hoy — pero la
arquitectura de navegación se decide ahora y arrastrarla a Fase 3
significa reescribir cinco módulos.

#### M-3. Google Fonts en tensión con el principio de privacidad

`index.html` carga Poppins desde `fonts.googleapis.com` /
`fonts.gstatic.com`. Cada visita envía la IP del usuario a Google antes
de que la app haga nada.

El spec (§1) declara privacidad por diseño y (§9) que el **único** flujo
con salida de datos a terceros es la foto+OCR. Estrictamente, esto es un
segundo flujo de salida no declarado. En contexto europeo hay además
precedente jurídico incómodo: un tribunal alemán (LG München I, 2022)
consideró que incrustar Google Fonts sin consentimiento vulneraba el
RGPD. No es jurisprudencia vinculante en Portugal ni convierte esto en
ilegal — pero para un producto que hace de la privacidad su argumento,
el riesgo reputacional es desproporcionado frente al coste de
arreglarlo.

Corrección: auto-alojar Poppins (`woff2` en `/fonts/`) y precachearlo en
el service worker. Beneficio colateral: la tipografía funcionaría también
en la primera carga offline, cosa que hoy no ocurre.

*(No soy abogado y esto no es asesoramiento jurídico — es una señal de
riesgo que conviene contrastar si el proyecto llega a producción.)*

#### M-4. `db.js` no valida `confirmed_by_user` antes de persistir

El spec (§5) marca `confirmed_by_user: boolean` como **obligatorio antes
de persistir** una factura. `dbPut()` es genérico y no valida nada
(verificado: 0 menciones de `confirmed_by_user` en `db.js`).

Hoy no hay daño porque nada escribe facturas todavía. Pero la garantía
del spec —que ningún dato OCR sin confirmar contamine el cálculo fiscal—
no tiene punto de aplicación en el código. Cuando llegue la Fase 5 con
el flujo de OCR, esa validación tiene que existir en la capa de
persistencia, no confiada a que cada pantalla se acuerde.

Corrección: una función `saveInvoice()` que valide el invariante y
rechace, dejando `dbPut()` como primitiva de bajo nivel.

#### M-5. Sin estrategia de migración de esquema en IndexedDB

`onupgradeneeded` sólo crea stores que no existen. No hay ruta para
transformar registros ya guardados cuando cambie el modelo de datos.

Dado que este producto pide al usuario **un año entero de facturas**
introducidas a mano, y que el modelo casi seguro evolucionará entre
Fase 5 y Fase 7, una migración mal resuelta significa pedirle a alguien
que vuelva a teclear cientos de registros. Conviene definir el patrón
(migraciones por versión, idempotentes) antes de que existan datos
reales que perder.

#### M-6. Sin exportación de datos — el usuario no puede hacer copia

Local-first significa que el usuario es el único custodio de sus datos.
Hoy no hay export/import (verificado: 0 ocurrencias). Si limpia los
datos del navegador, cambia de móvil, o el navegador purga el
almacenamiento por presión de espacio (Safari borra IndexedDB tras 7
días sin uso en ciertos casos), pierde todo su historial fiscal sin
recurso.

Un export/import JSON es barato de implementar y convierte una promesa
de privacidad en una promesa de *propiedad* de los datos. Es de las
mejoras con mejor relación valor/esfuerzo del informe.

---

### BAJO

- **B-1.** `setSetting` se importa en `app.js` y nunca se usa (import
  muerto verificado). Fallaría un linter.
- **B-2.** `console.info` de depuración del router queda en producción
  (`app.js:66`).
- **B-3.** Sin fallback de `100dvh` para navegadores sin soporte de
  unidades dinámicas; conviene `min-height: 100vh` como declaración
  previa.
- **B-4.** `apple-mobile-web-app-capable` está obsoleto; falta el
  estándar `mobile-web-app-capable`.
- **B-5.** Sin `<noscript>`. Un usuario con JS desactivado ve un shell
  mudo sin explicación.
- **B-6.** Sin meta Open Graph / Twitter Card, pese a que §6.7 del spec
  es una funcionalidad de compartir en redes.
- **B-7.** Sin `Content-Security-Policy`. Relevante de cara al Worker de
  OCR de Fase 5.
- **B-8.** Sin soporte `prefers-color-scheme`; `theme_color` fijo.
- **B-9.** Jerarquía de encabezados floja: el `<h1>` es "Bem-vindo" y la
  marca vive en un `<p>`.
- **B-10.** `"/"` e `"/index.html"` se cachean por separado en
  `STATIC_ASSETS` — mismo recurso, dos entradas.
- **B-11.** `skipWaiting()` + `clients.claim()` inmediatos pueden activar
  un SW nuevo bajo una página ya cargada, con riesgo de desajuste entre
  el HTML en pantalla y los módulos cacheados.
- **B-12.** Las respuestas 503 de fallback offline devuelven texto plano
  sin `Content-Type` donde se esperaba HTML.
- **B-13.** Cinco elementos de navegación con etiquetas largas
  ("Impostos anuais", "Dia da Liberdade") se comprimirán en pantallas de
  320px. Sin iconos, el riesgo de solapamiento es alto.

### Huecos de roadmap (no son defectos)

`[PLANIFICADO]` Sin `TAX-METHODOLOGY.md` (Fase 2) · sin tests ni arnés de
pruebas (Fase 9) · sin catálogo de bienes/servicios (Fase 5) · sin
onboarding de región (Fase 5) · sin módulos funcionales (Fases 3-8).

`[PENDIENTE DEL AUTOR]` Los tres ficheros de icono. Hasta que existan,
la PWA **no es instalable** y Lighthouse no puede superar el umbral de
90 exigido por el spec — no por un fallo del código, sino porque faltan
los assets.

**Higiene de repositorio ausente:** no hay repo git inicializado, ni
`README.md`, ni `.gitignore`, ni `LICENSE`, ni `.nojekyll`.

---

## 3. Análisis SWOT

### Fortalezas

- **Disciplina arquitectónica real.** Cero dependencias, cero build
  step, 39,5 KB totales. Esto envejece bien: dentro de tres años seguirá
  compilando sin `npm install` que se rompa.
- **Capa de persistencia bien diseñada.** `db.js` expone una API en
  Promises limpia, con índices pensados (`by_date`, `by_region`,
  `by_type`), promesa de apertura compartida e idempotente, y manejo
  explícito de `onblocked` — un detalle que mucho código de IndexedDB
  omite.
- **Separación de capas respetada.** Ninguna tasa fiscal está hardcodeada
  en la UI; el compromiso del spec se sostiene.
- **La neutralidad política del spec está viva en el código.** El texto
  de la UI describe sin editorializar; el disclaimer aparece literal.
- **Buena decisión de diseño sobre la región:** `ensureOnboarding()`
  devuelve `null` explícito en vez de asumir "continente" por defecto,
  con el comentario que explica por qué. Es exactamente el tipo de rigor
  que un simulador fiscal necesita.
- **Comentarios que explican el *porqué*, no el *qué*** — útiles para
  el yo futuro y para cualquier colaborador.

### Debilidades

- Fallo de contraste que afecta al elemento estrella del producto (C-1).
- Ambigüedad de despliegue sin resolver que invalidaría todas las rutas
  (C-2).
- Arranque frágil ante fallo de almacenamiento (C-3).
- Sin red de seguridad: ni tests, ni linter, ni CI, ni repo git.
- Sin propiedad de los datos por parte del usuario (M-6).
- Router embrionario que condicionará cinco módulos futuros (M-2).

### Oportunidades

- **La deuda es baratísima ahora.** 39,5 KB y cero usuarios: cada
  corrección de este informe cuesta minutos hoy y días después de la
  Fase 5.
- **La accesibilidad puede ser un diferenciador**, no una casilla.
  Cumplir AA de verdad en una app fiscal portuguesa es raro y defendible
  públicamente.
- **Auto-alojar la tipografía resuelve tres cosas de una vez**:
  privacidad, offline real en primera carga, y rendimiento.
- **El export/import convierte "no tenemos tus datos" en "tus datos son
  tuyos"** — una diferencia de posicionamiento notable frente a
  cualquier competidor con cuenta obligatoria.
- El presupuesto de rendimiento actual permite aspirar a Lighthouse
  ~100, no sólo al >90 del spec.

### Amenazas

- **Riesgo de exactitud fiscal (el mayor del proyecto, aún no
  materializado).** Un error de tasa en Fase 2 destruye la credibilidad
  de todo lo demás. El spec ya lo mitiga bien exigiendo fuente y año por
  parámetro; el peligro es relajar esa disciplina bajo presión de
  entrega.
- **Purga de almacenamiento del navegador** (especialmente iOS/Safari)
  frente a datos introducidos manualmente y sin copia posible: el peor
  escenario de experiencia de usuario del producto.
- **Desfase temporal de los datos.** Cada enero cambian tablas de IRS,
  IVA y tipos unitarios de IEC. Sin un proceso definido de actualización
  anual, la app pasa de útil a incorrecta sin previo aviso.
- **Malinterpretación del resultado.** Aunque el spec prohíbe el framing
  de "trabajar gratis para el Estado", el concepto de "Día de la
  Libertad Fiscal" arrastra ese bagaje culturalmente. La tarjeta para
  compartir (§6.7) es donde más fácilmente se pierde el matiz: un número
  sin contexto, viajando solo por redes sociales.
- Falta de iconos bloquea el criterio de instalabilidad del spec.

---

## 4. Puntuación por dimensiones (1-10)

Evaluado como *lo que pretende ser*: un andamiaje de Fase 1. No se
penaliza por módulos aún no construidos; sí por decisiones tomadas hoy
que costarán caro después.

| Dimensión | Nota | Justificación |
|---|---:|---|
| **Arquitectura y estructura** | **8,5** | Separación limpia, sin dependencias, capa de datos bien pensada. Resta: `db.js` vive en `data/`, que el spec reserva para contenido estructurado, no para lógica de persistencia. |
| **Calidad de código** | **7,5** | Legible, bien comentado, sintaxis validada. Resta: import muerto, `console.info` residual, `init()` sin protección. |
| **Cumplimiento del spec** | **8,0** | Fase 1 entregada íntegra. Resta: privacidad comprometida por Google Fonts (§1/§9) e invariante `confirmed_by_user` sin punto de aplicación (§5). |
| **Accesibilidad (WCAG 2.2 AA)** | **4,5** | Buenos cimientos: skip-link, `focus-visible`, `prefers-reduced-motion`, ARIA correcto, objetivos táctiles. Pero tres fallos reales de contraste, color como único indicador de estado, y `min-height` que romperá el texto. La intención está; la verificación no se hizo. |
| **PWA / offline** | **6,5** | SW correcto en estrategia y versionado, limpieza de caché bien resuelta. Penalizado por rutas absolutas frágiles, ausencia de iconos (no instalable hoy) y tipografía que depende de la red. |
| **Seguridad y privacidad** | **6,5** | Local-first genuino, sin cuentas, sin analítica, superficie de ataque mínima. Resta: fuga a Google Fonts no declarada y ausencia de CSP. |
| **Rendimiento** | **9,0** | 39,5 KB, sin frameworks, sin JS bloqueante. Único lastre: CSS de terceros bloqueando el render. |
| **Robustez / manejo de errores** | **4,0** | La dimensión más débil. Sin try/catch en el arranque, sin degradación cuando IndexedDB falla, sin migraciones, sin validación en la capa de datos. |
| **Mantenibilidad** | **6,0** | Código claro y bien documentado, pero sin repo git, sin README, sin tests, sin linter, sin CI y sin fuente única de versión. |
| **UX / diseño** | **7,0** | Sistema de tokens coherente y fiel a la identidad; jerarquía "números > explicación" bien materializada en `.stat-hero`. Resta: riesgo de compresión del nav a 320px y ausencia de modo oscuro. |
| **Preparación para escalar** | **7,5** | Los datos versionados por año y el catálogo externalizado están bien encaminados. El router es el cuello de botella a resolver antes de Fase 3. |

### **Media ponderada: 6,8 / 10**

*Ponderación aplicada: Cumplimiento del spec y Accesibilidad ×1,5
(objetivos explícitos y no negociables del proyecto); Robustez y
Seguridad/Privacidad ×1,25 (un simulador fiscal local-first vive de la
confianza); resto ×1,0.*

**Lectura de la nota.** Un 6,8 en Fase 1 con cero usuarios es una
posición buena, no mala: los cimientos son correctos y todo lo señalado
es reparable en horas. La nota está deprimida por dos dimensiones
(Accesibilidad 4,5 y Robustez 4,0) que comparten una misma causa —
**se escribió con buena intención pero sin verificación**. Los tokens de
accesibilidad están todos ahí; nadie había calculado los contrastes. El
manejo de errores está en `db.js`; nadie lo había conectado al arranque.
Corregir eso sube la media por encima de 8 sin tocar la arquitectura.

---

## 5. Roadmap de mejoras

### Fase 1.5 — Correcciones antes de seguir (≈ medio día)

Todo esto debería cerrarse **antes** de la Fase 2, porque son decisiones
que se propagan a cada fase posterior.

| # | Acción | Origen | Esfuerzo |
|---|---|---|---|
| 1 | **Decidir el modo de despliegue** (raíz de organización vs página de proyecto) y convertir todas las rutas a relativas; derivar la base del SW de `registration.scope`; añadir `.nojekyll` | C-2 | 1 h |
| 2 | **Añadir `--color-green-text: #15803D`** para todo uso en primer plano; mantener `#22C55E` para fondos. Aplicar a `a`, `.stat-hero--green`, nav activo | C-1 | 30 min |
| 3 | **Indicador no cromático** en el nav activo (barra + peso tipográfico) — WCAG 1.4.1 | C-1 | 20 min |
| 4 | **`try/catch` en `init()`** con degradación a modo efímero y aviso al usuario si falla IndexedDB | C-3 | 45 min |
| 5 | **Acotar `min-height`** a enlaces de acción, no a todos los `<a>` | M-1 | 10 min |
| 6 | **Auto-alojar Poppins** en `/fonts/`, precachear en el SW, quitar Google Fonts | M-3 | 45 min |
| 7 | **Higiene de repo**: `git init`, `README.md`, `.gitignore`, `LICENSE` | — | 30 min |
| 8 | Limpiar import muerto y `console.info`; añadir fallback `100vh`; añadir `mobile-web-app-capable` y `<noscript>` | B-1…B-5 | 20 min |

### Fase 1.6 — Red de seguridad (≈ 1 día, en paralelo a Fase 2)

| # | Acción | Origen |
|---|---|---|
| 9 | Arnés de tests sin dependencias (Node `--test`) — crítico **antes** de escribir el motor fiscal, no después | Robustez |
| 10 | ESLint + Prettier con configuración mínima | Mantenibilidad |
| 11 | GitHub Action: lint + tests + Lighthouse CI en cada push | Mantenibilidad |
| 12 | Fuente única de versión (`version.js`) consumida por SW y UI | B-10 |
| 13 | Definir patrón de migraciones de IndexedDB antes de que existan datos reales | M-5 |

> **Nota sobre el orden.** El punto 9 va antes de la Fase 2 a propósito.
> El motor fiscal es la pieza donde un error silencioso hace más daño y
> es, a la vez, la más fácil de testear: funciones puras, entradas y
> salidas numéricas. Escribir los tests después de las tablas es
> desaprovechar el mejor momento del proyecto para tenerlos.

### Fase 2+ — Refuerzos integrados en el roadmap existente

| # | Acción | Fase natural | Origen |
|---|---|---|---|
| 14 | Router real con `hashchange` + carga dinámica por ruta | Antes de Fase 3 | M-2 |
| 15 | `saveInvoice()` que valide `confirmed_by_user` en la capa de datos | Fase 5 | M-4 |
| 16 | Export/import JSON de todos los datos del usuario | Fase 5-6 | M-6 |
| 17 | CSP restrictiva, ajustada al Worker de OCR | Fase 5 | B-7 |
| 18 | Iconos definitivos → verificar instalabilidad y Lighthouse >90 | Cuando estén | Bloqueante spec |
| 19 | Rediseño del nav para 320px (iconos + etiquetas cortas) | Fase 3-4 | B-13 |
| 20 | Modo oscuro vía `prefers-color-scheme` | Fase 8-9 | B-8 |
| 21 | Meta Open Graph coherentes con la tarjeta para compartir | Fase 8 | B-6 |
| 22 | Proceso documentado de actualización fiscal anual (checklist de enero) | Fase 2, revisar en 9 | Amenaza |

---

## 6. Recomendación

Detener la Fase 2 medio día y ejecutar la Fase 1.5. Son ocho
correcciones de bajo esfuerzo, y tres de ellas (rutas de despliegue,
verde de texto, router) son decisiones arquitectónicas que se vuelven
progresivamente más caras con cada módulo que se construya encima.

De la Fase 1.6, el arnés de tests es el que más rendimiento da: entrar
en el motor fiscal con capacidad de verificación es lo que separa "la
app calcula" de "la app calcula bien y podemos demostrarlo" — que es
exactamente lo que el spec exige en §8 al pedir fuente, año y
metodología para cada parámetro.

---

*Auditoría realizada sobre el estado del repositorio a 15/08/2026.
Contrastes calculados según la fórmula de luminancia relativa WCAG 2.x.
Los hallazgos de despliegue (C-2) dependen de una decisión de
publicación aún no tomada y deberían reevaluarse una vez fijada.*
