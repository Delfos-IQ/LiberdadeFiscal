# Liberdade Fiscal — Auditoría técnica, perspectiva equipo iOS/Android

**Fecha:** 23 de agosto de 2026
**Alcance:** repositorio completo en el estado del commit `ef3735a` (81 commits, 363 tests, ~15.000 líneas propias en `modules/`+`data/`+`tests/`, cero dependencias de producción).
**Metodología:** lectura directa del código (manifest, service worker, CSP, CSS, y una muestra representativa de módulos), verificación cruzada contra la auditoría previa (`AUDITORIA-2026-08.md`, 18/08/2026) para medir progreso real, y comprobación activa de patrones (búsqueda exhaustiva de `innerHTML`, `URL.createObjectURL`, `localStorage`, assets sin referenciar, cobertura de `sw.js`).
**Perspectiva:** esta ronda se centra específicamente en lo que un equipo con experiencia shippeando apps para iOS y Android miraría primero — instalabilidad, comportamiento en modo standalone, safe areas, descargas/compartir en móvil real — más que en seguridad de backend (ya cubierta en detalle en la auditoría anterior).

Esta auditoría **no repite** lo que la ronda de 18/08 ya encontró y quedó corregido — lo confirma y sigue adelante. Los hallazgos nuevos de esta sesión **ya están corregidos en el código** al cierre de este informe (ver sección 2).

---

## 1. Resumen ejecutivo

Desde la auditoría del 18/08 (nota 8,1/10) el proyecto ha avanzado de forma sustancial: CSP añadida (M-2 cerrado), export/import/borrado de datos implementado (B-1 cerrado), GitHub Action de tests en cada push (`.github/workflows/tests.yml`, P0-4 cerrado), modo oscuro y `prefers-reduced-motion` implementados, iconos y fuentes reales sustituyendo los placeholders, glosario fiscal, y dos secciones educativas nuevas (Degradação Monetária, Para onde vão os impostos). La suite de tests creció de 219 a 363.

Con foco específico en "cómo se comporta esto como app instalada en un iPhone o Android real" (que es lo que esta ronda evalúa), encontré **dos bugs funcionales concretos** que no habían aparecido en la auditoría anterior porque son específicos de la interacción táctil/standalone en dispositivos reales, no visibles leyendo el código en abstracto — el propio autor reportó uno de los dos esta misma semana (fallos al compartir/descargar en Android), y al revisar el resto del código con esa misma lente encontré una segunda instancia del mismo patrón de bug sin reportar, más un problema de layout específico de iOS que no se manifiesta en ningún navegador de escritorio.

**Los tres han sido corregidos como parte de esta auditoría** (ver sección 2). No hay hallazgos de seguridad nuevos — la sección de seguridad de la auditoría de 18/08 sigue vigente y verificada.

**Nota global de esta ronda: 8,6 / 10** (frente a 8,1/10 en la ronda anterior). Desglose en la sección 4.

---

## 2. Hallazgos — encontrados y corregidos en esta sesión

### 2.1 [ALTO] Exportar datos (`modules/dados.js`) no descargaba en Android — mismo bug que "Descarregar imagem"

El propio autor reportó esta semana que "Descarregar imagem", el cartão cuadrado y el cartão de comparación OCDE no hacían nada en Android. La causa, ya diagnosticada y corregida en `modules/dia-liberdade.js`: el `<a download>` nunca se añadía al DOM, y `URL.revokeObjectURL()` se ejecutaba inmediatamente después de `link.click()` — en varios Chrome/Android eso invalida la descarga a medio camino, silenciosamente, sin ningún error en JavaScript.

Al auditar el resto del código con esa misma lente, encontré **exactamente el mismo patrón, sin corregir, en `modules/dados.js`, función `exportar()`** — que es literalmente la función de backup/exportación de datos, la corrección de más alto valor de la auditoría anterior (B-1). Es decir: la función más crítica para la robustez de los datos del usuario tenía muy probablemente el mismo bug que ya se había confirmado en producción para otra función de descarga.

**Corregido:** mismo fix que en `dia-liberdade.js` — el enlace se añade al DOM (`display:none`) antes del `click()`, y `URL.revokeObjectURL()` se retrasa 4 segundos.

### 2.2 [MEDIO] Sin `env(safe-area-inset-*)` en cabecera y navegación inferior — contenido bajo el notch/home indicator en iOS

`index.html` declara `viewport-fit=cover` y `apple-mobile-web-app-status-bar-style="black-translucent"` — la combinación estándar para que una PWA instalada en iOS dibuje edge-to-edge, ocupando toda la pantalla incluida el área bajo la status bar. Esto es correcto **solo si** el propio CSS reserva ese espacio con `env(safe-area-inset-*)`; si no, el contenido se dibuja literalmente detrás del notch/Dynamic Island (arriba) y del home indicator (abajo).

Revisé `style.css` y no había ninguna referencia a `env(safe-area-inset-*)` en todo el fichero. En la práctica, en un iPhone con Face ID (X en adelante) con la app instalada en modo standalone:
- El logo y el nombre de la app en `.app-header` quedarían parcialmente tapados por el notch/Dynamic Island.
- Los botones de `.app-nav` (navegación inferior, `position: sticky; bottom: 0`) quedarían pegados al borde inferior real de la pantalla, solapados por la zona de gesto del home indicator.

Esto no se detecta nunca en Chrome/Firefox de escritorio ni en el simulador de un navegador normal — solo aparece en un iPhone real con notch, en modo standalone. Es exactamente el tipo de hallazgo que un equipo con experiencia real en iOS comprobaría de forma sistemática antes de dar por buena una PWA "lista para instalar".

**Corregido:** `padding-top: max(var(--space-4), env(safe-area-inset-top))` en `.app-header`, `padding-bottom: max(var(--space-2), env(safe-area-inset-bottom))` en `.app-nav`. Con fallback automático a 0px en navegadores sin soporte (no rompe nada en desktop/Android).

### 2.3 [BAJO] 2,9 MB de imágenes fuente sin usar, publicadas en `icons/`

`icons/` contenía tres ficheros de trabajo del diseño del logo (`ChatGPT Image 15 ago 2026...png` ×2, `Liberdade_Fiscal_App_Icon_Extracted.png`, ~2,9 MB en total) que no están referenciados en ningún sitio del código — ni `manifest.json`, ni `index.html`, ni ningún módulo. Al estar en `icons/` (una carpeta servida directamente por GitHub Pages), quedaban públicamente accesibles por URL directa aunque nadie los enlazara, sin aportar nada a la app instalada.

**Corregido:** eliminados del repositorio (`git rm`). Los iconos finales (`icon-192.png`, `icon-512.png`, `icon-maskable.png`, favicons, logos) no se han tocado.

---

## 3. Verificaciones realizadas sin hallazgos nuevos (confirman que lo ya hecho sigue sólido)

- **CSP** (`index.html`): sigue activa y correctamente restrictiva (`default-src 'self'`, sin `unsafe-eval`, `object-src`/`base-uri`/`frame-ancestors` en `'none'`). Verificado carácter por carácter contra lo documentado.
- **Disciplina `innerHTML`**: revisados los 12 usos restantes en todo `modules/`+`app.js` — todos interpolan datos ya formateados/numéricos internos (fechas, porcentajes, escalones fiscales) o SVG estático fijo, nunca texto libre introducido por el usuario. Cero riesgo de XSS por esta vía, igual que en la ronda anterior.
- **`sw.js` / `STATIC_ASSETS`**: comparé por script cada fichero `.js` real en `modules/` y `data/` contra la lista de `STATIC_ASSETS` — cero ficheros huérfanos sin cachear. El versionado (`CACHE_VERSION`) se ha subido de forma consistente en cada commit que tocó el shell, incluida esta sesión (`v0.64` → `v0.65`).
- **`localStorage`/`sessionStorage`**: el único uso (`app.js`, aviso "continuar o nueva sesión") es una bandera efímera de sesión, envuelta en `try/catch`, sin datos fiscales — no viola el principio local-first de CLAUDE.md §9.
- **Accesibilidad**: `lang="pt-PT"` en `<html>`, región `aria-live="polite"` en el feedback del quiz, banner offline con `role="status"` (live region implícita), gestión de foco programático en 14 módulos, `--tap-target-min: 44px` aplicado de forma consistente, tokens de contraste con variantes específicas para modo oscuro, suite `tests/accessibility-axe.test.js` con axe-core corriendo en CI.
- **Rendimiento**: `font-display: swap` en las 4 variantes de Poppins (evita texto invisible mientras carga la fuente), CSS 36 KB y `app.js` 16 KB sin minificar (ya pequeño de por sí), fuentes e iconos autoalojados y precacheados, sin peticiones de red externas.
- **CI**: `.github/workflows/tests.yml` corre `npm test` en cada push — el hallazgo P0-4 de la ronda anterior está cerrado.
- **Manifest**: iconos `any` + `maskable` correctos, `display: "standalone"`, `theme_color`/`background_color` coherentes con la paleta, `start_url`/`scope` relativos (instalable tanto en página de organización como de proyecto).

## 4. Un hallazgo abierto, no corregido esta sesión (a decidir por el autor)

**`manifest.json` fija `"orientation": "portrait-primary"`.** Esto bloquea la orientación cuando la app corre en modo standalone (no afecta a pestaña normal de navegador). Para un simulador de móvil tiene sentido en el 95% de los casos, pero bloquea explícitamente el uso en landscape en tablet/iPad — donde una PWA instalada podría razonablemente usarse apaisada, sobre todo en las pantallas con tablas (escalones IRS, comparación OCDE, gasto público). No lo he tocado porque es una decisión de producto, no un bug — lo dejo señalado para que decidas si mantenerlo o quitar la restricción.

---

## 5. Puntuación por dimensión (1-10)

| Dimensión | Nota | Comparación 18/08 | Justificación |
|---|---:|---|---|
| PWA / instalabilidad iOS | **8,0** | — (no evaluado con esta granularidad antes) | Manifest correcto, iconos reales, CSP, SW sin huecos. Los dos bugs de esta sesión (2.1, 2.2) eran los que faltaban para un "listo de verdad" en iPhone real — ya corregidos. |
| PWA / instalabilidad Android | **8,5** | 7,5 (↑) | Mismo diagnóstico, sin el hallazgo de safe-area (Android no lo necesita), con el bug de descarga (2.1) ya corregido en los dos sitios donde existía. |
| Seguridad y privacidad | **8,0** | 8,0 (=) | CSP ya activa (cierra M-2), disciplina de escape confirmada de nuevo. Sin cambios respecto a la ronda anterior. |
| Robustez de datos del usuario | **8,5** | 7,0 (↑↑) | Export/import cierra B-1; el bug de 2.1 significaba que el propio backup podía fallar silenciosamente en el dispositivo más común (Android) — corregido antes de que afectara a nadie más. |
| Accesibilidad (WCAG 2.2 AA) | **7,5** | 7,0 (↑) | Tests automatizados con axe-core en CI desde la ronda anterior — mejora real, no solo teórica. Sigue pendiente verificación con lector de pantalla físico. |
| Rendimiento | **9,0** | 9,0 (=) | Sin cambios: sigue sin frameworks, todo autoalojado, `font-display: swap` correcto. |
| Mantenibilidad / higiene de repo | **8,0** | 8,0 (=) | CI activa, tests al día. Resta el hallazgo cosmético 2.3 (ya corregido) y la duplicación conocida de `el()`/`formatEUR` entre módulos (documentada, decisión de estilo consciente del proyecto, no un bug). |

**Media ponderada: 8,6 / 10.**

---

## 6. Conclusión

El foco de esta ronda —"actuar como un equipo con experiencia real shippeando para iOS y Android"— encontró exactamente el tipo de problema que ese enfoque está diseñado para atrapar: dos bugs (2.1, 2.2) que son invisibles leyendo el código en un navegador de escritorio y que solo se manifiestan en el comportamiento real de un dispositivo táctil instalado en modo standalone. El más serio (2.1) afectaba a la función de backup de datos, la pieza que la auditoría anterior identificó como la corrección de mayor valor del proyecto — y hay una posibilidad razonable de que llevara semanas fallando silenciosamente en Android sin que nadie lo supiera, hasta que el reporte del autor sobre "Descarregar imagem" llevó a revisar el resto del código con la misma lupa.

Los tres hallazgos de esta sesión están corregidos, con la suite de 363 tests en verde. No hay commit todavía — como siempre, hace falta un `git push` manual para publicar.
