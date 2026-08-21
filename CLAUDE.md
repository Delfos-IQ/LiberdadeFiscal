# LIBERDADE FISCAL — PROMPT DE CONSTRUCCIÓN (CLAUDE.md)

## 0. ROL
Actúa como equipo senior multidisciplinar: Frontend Engineer, PWA Engineer,
Data/Tax Logic Engineer, UX/UI Designer, Mobile Engineer (Capacitor, fase
posterior), QA Engineer, Security & Privacy Engineer.

Construye **Liberdade Fiscal**, una PWA que hace comprensible la carga
fiscal real de trabajar y consumir en Portugal — impuestos directos,
indirectos, especiales y patrimoniales — culminando en el "Dia da
Liberdade Fiscal" personal del usuario.

No es una calculadora simple. Es un producto de educación y simulación
fiscal, con captura real de datos del usuario (no solo estimaciones).

---

## 1. PRINCIPIOS DEL PRODUCTO (no negociables)

- **Neutralidad política**: la app muestra números y explica el método;
  no opina sobre si los impuestos son buenos o malos, ni afirma que el
  usuario "trabaja gratis para el Estado". Frase guía: *"Mostra os
  números. Explica o método. Deixa o utilizador tirar as suas conclusões."*
- **Rigor de datos fiscales**: NUNCA inventar tasas ni presentar
  estimaciones como datos oficiales. Todo parámetro fiscal debe llevar
  fuente, año de vigencia y estar versionado por año fiscal.
- **Privacidad por diseño**: local-first, sin cuentas obligatorias, sin
  analítica invasiva, sin enviar NUNCA datos fiscales a ningún servidor
  — sin excepciones (el fallback opcional de foto+OCR que existía en
  versiones anteriores del spec fue eliminado el 19/08/2026, decisión
  explícita del autor; ver sección 6.3).
- **Alcance geográfico v1**: Portugal únicamente — Continente, Açores y
  Madeira, con sus tres columnas de tipos de IVA diferenciadas. España u
  otros países quedan fuera de v1 por completo.
- **Lo que no encaja en el simulador va al glosario, no se descarta**
  (regla explícita del autor, 19/08/2026): cuando un parámetro fiscal
  real no cabe en el flujo de <60s del simulador — porque depende de
  demasiadas variables, porque es un caso raro, o porque de momento no
  se pudo confirmar contra una fuente primaria — la respuesta por
  defecto es documentarlo en `data/glosario.js` en vez de mentir con
  una simplificación (ej.: Taxa Turística, IUC categorias C/D). Esto
  no es una excusa para no intentar resolverlo primero: cuando SÍ se
  encuentra la fuente primaria (ej.: coeficientes del Art. 31.º CIRS
  para trabajadores independientes, resuelto el mismo día 19/08/2026
  después de haberse marcado como "fuera del simulador"), el dato
  vuelve a entrar en el motor de cálculo. El glosario es el destino
  por defecto para lo no resuelto, no una forma de cerrar la
  investigación antes de intentarla.

---

## 2. STACK Y ESTRUCTURA (estándar del autor — obligatorio)

- HTML/CSS/JS vanilla con módulos ES. Sin frameworks de build complejos
  (nada de SvelteKit/React/Vite) salvo justificación explícita posterior.
- Estructura en raíz: `index.html` + `app.js` + `style.css` + `sw.js`,
  más carpeta `data/` para todo contenido estructurado (catálogos,
  preguntas del quiz, tablas fiscales, benchmark OCDE).
- Despliegue: GitHub Pages, bajo la organización `delfos-iq`.
- Backend (solo donde se indique): Cloudflare Workers + Groq o
  Anthropic API.
- Almacenamiento de datos del usuario: **local-first**, IndexedDB del
  navegador. Sin Firebase, sin cuentas, sin login.

---

## 3. REQUISITOS PWA (no negociables)

1. `manifest.json` completo desde el primer commit: `name`, `short_name`,
   `start_url`, `display: "standalone"`, `background_color`,
   `theme_color`, iconos 192x192 y 512x512, al menos uno `purpose:
   "maskable"`.
   - **Los ficheros de icono (SVG/PNG) los sube el autor directamente al
     repo** — no generar un logo desde cero. Deja referencias claras en
     el manifest a `/icons/icon-192.png`, `/icons/icon-512.png`,
     `/icons/icon-maskable.png` como placeholders a sustituir.
2. `sw.js` versionado como `liberdade-fiscal-vX.Y`, cache-first para
   assets estáticos, network-first para lo que pueda cambiar.
3. Funcionamiento offline verificado del shell completo (todo el motor
   fiscal debe funcionar sin conexión).
4. Responsive, mobile-first, adaptado también a desktop.
5. Accesibilidad objetivo WCAG 2.2 AA (contraste, navegación por
   teclado, `aria-*`, tamaños táctiles, `prefers-reduced-motion`).

### Checklist de cierre de la PWA

- [ ] manifest.json sin errores en DevTools > Application > Manifest
- [ ] sw.js registra y cachea el shell correctamente
- [ ] Lighthouse PWA score > 90
- [ ] Instalable en Android/Chrome
- [ ] Iconos y splash correctos al instalar

**Empaquetado con Capacitor (Play Store) es una fase posterior — no
abordar en esta construcción.**

---

## 4. IDENTIDAD VISUAL (confirmada)

- Nombre: **Liberdade Fiscal**
- Claim: *"Descobre quanto do teu trabalho fica realmente contigo."*
- Tipografía: Poppins (Bold / SemiBold / Regular / Light). Los números
  principales deben ser grandes y muy legibles: números > explicación >
  decoración.
- Paleta:
  - Navy `#0D1321` — confianza / estructura
  - Green `#22C55E` — libertad / resultado
  - Mint `#7EEBC1` — estados positivos
  - Gold `#F6C453` — atención / dinero
  - Background `#F1F3F5`
  - White `#FFFFFF`
- Logo: pájaro estilizado + barras de crecimiento. Ficheros los aporta
  el autor; usar placeholders funcionales mientras tanto.

---

## 5. MODELO DE DATOS

```typescript
interface TaxParameter {
  id: string;
  value: number;
  unit: string;
  year: number;
  source: string;
  sourceUrl?: string;
  effectiveFrom?: string;
  effectiveUntil?: string;
  notes?: string;
}

interface GoodService {
  id: string;
  name_pt: string;
  category: string;
  iva_rate: { continente: number; acores: number; madeira: number };
  special_tax?: {
    type: "ISP" | "IABA" | "IT";
    note: string; // p.ej. "El IVA se calcula sobre el precio que ya incluye este impuesto"
  };
}

interface Invoice {
  id: string;
  date: string;
  source: "manual" | "photo_ocr" | "qr";
  goodServiceId: string;
  region: "continente" | "acores" | "madeira";
  amount_total: number;
  amount_base: number;
  amount_tax: number;
  raw_ocr_data?: object;
  confirmed_by_user: boolean; // obligatorio antes de persistir
}

interface PeriodicTax {
  id: string;
  type: "IMI" | "IUC" | "ISV" | "IMT" | "Imposto_Selo";
  amount: number;
  date: string;
  note?: string;
  recurrence: "annual" | "one_time";
}

interface QuizQuestion {
  id: string;
  question_pt: string;
  options: string[];
  correct_index: number;
  explanation_pt: string;
  category: string;
}
```

Todos los parámetros fiscales viven en `data/`, fuera de los componentes
de UI, versionados por año (`data/tax-rules/2026/...`). Nunca
hardcodear tasas dentro de la lógica de UI.

---

## 6. MÓDULOS FUNCIONALES

### 6.1 Quiz (puerta de entrada)

- Pool inicial de **30-40 preguntas verificadas** sobre fiscalidad
  portuguesa (IRS, SS, IVA, IEC, patrimoniales), estructura preparada
  para escalar a 200 sin cambios de arquitectura.
- Selección aleatoria de 10 preguntas por sesión.
- Cada pregunta con explicación breve al responder (valor educativo, no
  solo puntuación).

### 6.2 Ingresos / Taxímetro

- Modo Rápido: salario bruto mensual, estado civil, dependientes, tipo
  de trabajador, región. Resultado en <60s.
- Modo Avanzado: añade subsidios, tipo de contrato, deducciones
  relevantes, más detalle de consumo.
- Distinguir explícitamente en cadena: valor bruto del trabajo → coste
  total para el empleador (incluye TSU patronal) → rendimiento bruto →
  Segurança Social → IRS → rendimiento líquido. Nunca mezclar estas
  cifras en un único número sin explicar qué representa cada una.

### 6.3 Facturas de consumo (IVA + impuestos especiales)

- **Captura primaria: manual.** El usuario elige región (Continente /
  Açores / Madeira) una vez en onboarding, luego para cada gasto
  selecciona un ítem del catálogo `data/goods-services-pt.js` (trae el
  IVA correcto ya resuelto) e introduce el importe.
- **QR: opcional**, atajo secundario. Lectura 100% en cliente (librería
  JS tipo `jsQR`), parseando el código estructurado que ya llevan las
  facturas portuguesas por ley. Sin servidor, sin envío de datos.
- **Foto + IA (fallback): ELIMINADO (19/08/2026, decisión explícita del
  autor).** Existió en el código (cliente + worker Cloudflare) pero
  nunca se desplegó; se retiró por completo para simplificar la
  promesa de privacidad de la app — ya no hay ningún flujo con salida
  de datos a terceros, sin excepciones. No reintroducir sin decisión
  explícita nueva del autor.
- Para ítems con impuesto especial (combustible/ISP, alcohol/IABA,
  tabaco/IT): el usuario introduce el importe total pagado; la app
  muestra un desglose educativo estimado (impuesto especial + IVA
  calculado sobre ese impuesto especial ya incluido en el precio) usando
  los tipos unitarios publicados anualmente. Ese desglose SÍ se suma al
  cálculo del Dia da Liberdade Fiscal.
- Nota editorial a mostrar donde aplique: el Imposto de Selo y el IVA
  son mutuamente excluyentes, nunca acumulativos sobre el mismo acto.

### 6.4 Impuestos anuales / patrimoniales (sección separada)

- Registro puntual de IMI, IUC, ISV, IMT, Imposto de Selo — no encajan
  en el flujo de "factura de consumo diario", son eventos anuales o
  puntuales.
- Se suman directo al acumulado anual del Dia da Liberdade Fiscal.

### 6.5 Dia da Liberdade Fiscal

```typescript
function calculateFiscalFreedomDay(input): {
  dayOfYear: number;
  date: string;
  daysForTaxes: number;
  percentage: number;
  methodology: string;
}
```

- Suma: IRS + SS + IVA + ISP/IABA/IT (desglose especial) + IMI/IUC/ISV/IMT.
- Cada resultado debe poder explicarse: valor, fórmula, parámetros
  usados, año, fuente, hipótesis y limitaciones ("Como chegámos a este
  número?").
- Prohibido usar frases como "a partir de hoy dejas de pagar impuestos"
  (conceptualmente incorrecto). Usar en su lugar framing tipo: *"Segundo
  as hipóteses utilizadas nesta simulação, esta é a data correspondente
  à proporção anual do valor destinado a impostos e contribuições."*

### 6.6 Comparación internacional (benchmark OCDE)

- Dato estático anual en `data/oecd-benchmark-2025.js` (tax wedge por
  país — informe OCDE "Taxing Wages", actualización anual manual, sin
  API ni scraping).
- Países v1: Portugal, España, Francia, Alemania, Irlanda, Países Bajos,
  Suiza.
- Aviso obligatorio en esta pantalla: el tax wedge de la OCDE mide solo
  carga sobre el trabajo (IRS+SS), no incluye IVA ni impuestos
  especiales — el resultado de Liberdade Fiscal en Portugal es más
  completo, así que no son directamente equiparables sin esta
  aclaración.

### 6.7 Tarjeta para compartir

- Formato vertical/cuadrado para Instagram Stories, WhatsApp, X,
  Facebook, LinkedIn.
- Contenido: nombre app, país/año, Dia da Liberdade Fiscal, días
  trabajados para impuestos, % de carga estimada.
- Sin datos personales. Generada con Web Share API.

---

## 7. FIGURAS IMPOSITIVAS CUBIERTAS (Portugal)

| Figura | Tipo | Módulo |
|---|---|---|
| IRS | Directo | Ingresos/Taxímetro |
| Segurança Social (+ TSU empleador) | Directo | Ingresos/Taxímetro |
| IVA (6/13/23%, Continente/Açores/Madeira) | Indirecto general | Facturas |
| ISP | Indirecto especial | Facturas (combustible) |
| IABA | Indirecto especial | Facturas (alcohol) |
| IT | Indirecto especial | Facturas (tabaco) |
| IMI | Patrimonial | Impuestos anuales |
| IMT | Patrimonial | Impuestos anuales |
| ISV | Vehículo | Impuestos anuales |
| IUC | Vehículo | Impuestos anuales |
| Imposto de Selo | Variable (excluyente con IVA) | Impuestos anuales |

---

## 8. FUENTES DE DATOS FISCALES (prioridad)

1. Autoridade Tributária e Aduaneira
2. Segurança Social
3. Diário da República
4. Governo de Portugal
5. OCDE (Taxing Wages, para el benchmark)
6. Otras fuentes solo como apoyo

Cada parámetro debe documentarse en `TAX-METHODOLOGY.md`: fórmulas,
fuentes, hipótesis, limitaciones, diferencias entre retención en origen
e impuesto anual. Si hay incertidumbre sobre un dato, márcalo como
`UNKNOWN` o `ESTIMATE` explícitamente — nunca inventar.

---

## 9. PRIVACIDAD Y AVISO LEGAL

- Sin cuentas obligatorias. Datos del usuario en IndexedDB del
  dispositivo, nunca en servidor propio.
- Cero flujos con salida de datos a terceros (19/08/2026: el fallback
  de foto+IA que estaba previsto aquí fue eliminado por decisión
  explícita del autor — no reintroducir sin decisión nueva).
- Disclaimer en tres puntos: onboarding, pantalla de resultado (Dia da
  Liberdade Fiscal), y footer/Acerca de. Texto base: *"Esta aplicação
  fornece estimativas para fins informativos e educativos. Não
  constitui aconselhamento fiscal, financeiro ou jurídico e não
  substitui o cálculo oficial da Autoridade Tributária."*

---

## 10. QUÉ NO HACER

- No usar SvelteKit/React/build complejo sin justificación.
- No inventar datos fiscales ni mezclar años fiscales.
- No presentar estimaciones como valores oficiales.
- No afirmar que el usuario "trabaja gratis para el Estado".
- No usar lenguaje partidista.
- No exigir registro/cuenta para usar el simulador.
- No enviar NUNCA datos fiscales a ningún backend — sin excepciones.
- No comparar el benchmark OCDE con el resultado local sin la
  aclaración de metodologías distintas.

---

## 11. ROADMAP DE CONSTRUCCIÓN

**Fase 1 — Foundation**: estructura de archivos, PWA (manifest + sw.js
con placeholders de icono), design system con la paleta e identidad
confirmadas, IndexedDB setup.

**Fase 2 — Motor fiscal**: tablas Portugal 2026 (IRS, SS, IVA
Continente/Açores/Madeira, ISP/IABA/IT, IMI/IUC/ISV/IMT), funciones
puras de cálculo, `TAX-METHODOLOGY.md`.

**Fase 3 — Quiz**: 30-40 preguntas iniciales, lógica de selección
aleatoria de 10, pantalla de resultado con explicaciones.

**Fase 4 — Ingresos y Taxímetro**: Modo Rápido y Avanzado, desglose
coste empleador → líquido.

**Fase 5 — Facturas**: catálogo de bienes/servicios, flujo manual
(primario), QR (opcional, cliente). El fallback de foto+IA (Cloudflare
Worker) que estaba previsto aquí fue eliminado el 19/08/2026, decisión
explícita del autor.

**Fase 6 — Impuestos anuales/patrimoniales**: módulo separado
IMI/IUC/ISV/IMT/Imposto de Selo.

**Fase 7 — Dia da Liberdade Fiscal**: motor de cálculo consolidado,
explicabilidad por resultado.

**Fase 8 — Benchmark OCDE + Tarjeta para compartir**.

**Fase 9 — QA**: tests unitarios del motor fiscal (salarios
bajo/medio/alto, distintas regiones, distintos consumos), verificación
Lighthouse >90, accesibilidad WCAG AA.

---

## 12. CRITERIO DE ÉXITO DEL MVP

Un usuario, sin registrarse, debe poder en pocos minutos: hacer el quiz
inicial, introducir su ingreso, registrar algunas facturas reales
(manual), ver su Taxímetro y su Dia da Liberdade Fiscal con desglose
explicado, y compartir el resultado — todo desde el móvil y funcionando
completamente offline, sin excepciones.
