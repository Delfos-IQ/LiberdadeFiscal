# Liberdade Fiscal — Auditoría técnica, 19 de agosto de 2026

**Alcance:** repositorio completo en el commit `d16db91` (57 commits, 319 tests, sin dependencias de producción).
**Metodología:** lectura directa del código actual, contraste explícito contra `AUDITORIA-2026-08.md` (18/08/2026, nota 8,1/10) para medir progreso real, no solo estado presente.

**Nota de corrección (misma sesión):** la primera versión de este informe tenía dos errores, corregidos aquí antes de publicarlo:
1. Di la CSP por "ausente" — mi grep sí la encontró en `index.html`, pero interpreté mal el resultado. Está implementada desde el commit `c640506` (18/08, 00:51), horas antes de que se cerrara la auditoría de ayer. Lo mismo aplica a la migración de esquema IndexedDB y a la atomicidad de `fecharPeriodoAtual()` — las tres cosas se resolvieron en ese mismo commit, no están pendientes.
2. La media ponderada publicada (8,8) estaba mal calculada a mano — la suma de pesos real es 13,75, no 12,75. Recalculado con Python: **8,3/10**, no 8,8. Detalle abajo.

---

## 1. Resumen ejecutivo

Desde la auditoría de ayer se cerró la mayoría del roadmap P0: exportación/importación de datos, CSP, migración de esquema IndexedDB y atomicidad de `fecharPeriodoAtual()` — las cuatro en un único commit (`c640506`) horas después de que la auditoría de ayer las señalara. A eso se suma, ya en esta sesión: CI real corriendo los tests en cada push (y arreglado en vivo cuando se rompió por una incompatibilidad de Node), dos figuras fiscales nuevas (CAV, Taxa Municipal Turística), iconos definitivos sustituyendo los placeholders, modo oscuro, la decisión sobre cifrado local documentada en `SECURITY.md`, y — lo más relevante para la confianza del producto — una ronda de re-verificación de fuentes primarias que encontró y corrigió **dos errores reales** en los cálculos de IRS que llevaban en producción sin que nadie se diera cuenta.

**Nota global: 8,3 / 10** (frente a 8,1/10 ayer — una subida real pero modesta, no el 8,8 que publiqué en la primera pasada de este mismo informe). Desglose en la sección 4.

---

## 2. Qué cambió desde ayer (verificado en código, no en promesas)

| Ítem del roadmap P0/P1 (auditoría 18/08) | Estado hoy |
|---|---|
| P0-1 Export/import JSON de datos del usuario | ✅ Hecho — `exportarTodosDados()`, `validarDadosImportacao()`, `importarTodosDados()` en `data/db.js`, con UI en `modules/dados.js` |
| P0-2 CSP vía `<meta http-equiv>` | ✅ Hecho — política restrictiva completa en `index.html` (`script-src 'self'`, sin `eval`, `object-src`/`base-uri`/`frame-ancestors` en `'none'`) |
| P0-3 Checklist de actualización fiscal anual con fecha | ✅ Hecho — `TAX-METHODOLOGY.md` §7-8, con gatillo explícito |
| P0-4 GitHub Action con `npm test` en cada push | ✅ Hecho — y tuvo que arreglarse en vivo hoy (Node 20→22, jsdom 30 dejó de soportar Node 20) |
| P1-5 Estrategia de migración de esquema IndexedDB | 🟡 Infraestructura lista, sin estrenar — patrón `MIGRACOES_DE_DADOS` en `data/db.js`, con ejemplo documentado, pero el array sigue vacío porque aún no ha hecho falta ninguna migración real. No se puede llamar "probado" hasta que se use una vez de verdad. |
| P1-6 Atomicidad de `fecharPeriodoAtual()` | ✅ Hecho — las dos escrituras (histórico + reinicio) van en una única transacción IndexedDB sobre ambos stores |
| P2-10 Decisión documentada sobre cifrado/PIN local (M-1) | ✅ Hecho — `SECURITY.md` completo |
| P2-9 Iconos definitivos | ✅ Hecho — placeholders sustituidos |
| P2-12 Modo oscuro | ✅ Hecho |
| Cobertura fiscal (ISV/IUC/IABA espirituosas) | Parcial — quedan 7 campos `ESTIMATE`/`UNKNOWN` en `data/tax-rules/2026/` |

Además, fuera del roadmap de ayer: se añadieron **CAV** y **Taxa Municipal Turística**, con la decisión razonada de **no** modelar TGR/TRH/TMDP (declarado como limitación explícita en la app).

---

## 3. Hallazgo del día: la re-verificación de fuentes encontró bugs reales

Al re-confirmar IRS/Segurança Social/IVA contra el PwC Guia Fiscal 2026 (Claude in Chrome seguía desconectado, así que se usó `WebSearch` + `web_fetch` directo — limitación declarada):

- **Dedução específica Categoria A** estaba en 4.104€, desactualizada — el valor correcto 2026 es **4.587,09€**.
- **Bonificación de 900€ al 2.º dependiente** exigía edad ≤3 años en el motor; la regla real es ≤6 años, "independientemente de la edad del primero" — afectaba a hogares con 2+ dependientes donde uno tuviera entre 4 y 6 años.

Ambos corregidos, con test de regresión nuevo y 319/319 tests en verde. El resto de figuras se re-confirmaron sin cambios, con una segunda fuente independiente en la mayoría de los casos. Es la prueba de que "marcar ESTIMATE cuando no se sabe" está funcionando: los datos que se declaran verificados se revisan de verdad, y cuando aparece un error se corrige con transparencia, no se disimula — el mismo estándar que le estoy aplicando a este informe ahora mismo.

---

## 4. Puntuación por dimensión (1-10)

| Dimensión | Nota | Ayer (18/08) | Peso | Justificación |
|---|---:|---|---:|---|
| Arquitectura y estructura | 8,5 | 8,5 (=) | 1,00 | Sin cambios de fondo. |
| Calidad de código | 8,2 | 8,0 (↑) | 1,00 | Comentarios de corrección explican el "antes/después" con precisión; sigue habiendo duplicación menor entre módulos. |
| Cumplimiento del spec (CLAUDE.md) | 9,0 | 8,5 (↑) | 1,50 | Dos figuras fiscales nuevas, exclusiones declaradas. Resta: ISV/IUC/IABA espirituosas incompletos. |
| Rigor de fuentes fiscales | 8,0 | *(eje nuevo)* | 1,25 | Dos errores reales encontrados y corregidos con transparencia. Resta: ninguna figura confirmada contra el texto legal en bruto. |
| Seguridad y privacidad | 8,8 | 8,0 (↑) | 1,25 | CSP restrictiva ya en producción, decisión de cifrado documentada. |
| Accesibilidad (WCAG 2.2 AA) | 7,0 | 7,0 (=) | 1,50 | Sin cambios; sigue sin verificación real (Lighthouse, lector de pantalla) fuera de este entorno. |
| PWA / offline | 8,5 | 7,5 (↑) | 1,00 | Iconos definitivos, manifest completo. Resta: instalación real en Android/iOS sin confirmar. |
| Robustez / manejo de errores | 8,3 | 7,0 (↑) | 1,25 | Export/import, atomicidad de `fecharPeriodoAtual()` y patrón de migraciones ya en el código. Resta: el patrón de migraciones sigue sin un caso real que lo ejercite. |
| Mantenibilidad | 8,8 | 8,0 (↑) | 1,00 | CI real puesto a prueba en vivo, `SECURITY.md` añadido. |
| Rendimiento | 9,0 | 9,0 (=) | 1,00 | Sin cambios. |
| UX / diseño | 8,3 | 8,0 (↑) | 1,00 | Modo oscuro añadido. |
| Preparación para escalar | 8,0 | 7,5 (↑) | 1,00 | Export/import + patrón de migraciones reducen el techo de riesgo, aunque el segundo siga sin estrenarse. |

**Media ponderada: 8,3 / 10** — recalculada con Python para evitar otro error de suma a mano (suma de pesos = 13,75; suma ponderada = 114,675; 114,675 / 13,75 = 8,34, redondeado a 8,3).

---

## 5. Lo que sigue genuinamente abierto

1. **Verificación real de accesibilidad** (Lighthouse, lector de pantalla, instalación en dispositivo físico) — limitación del entorno de construcción, no del código; no se puede cerrar desde este sandbox.
2. **ISV/IUC completo, IABA de espirituosas** — declarado con honestidad como `ESTIMATE`/`UNKNOWN`, limita la cobertura real del Dia da Liberdade Fiscal para quien tenga vehículo o consuma esas categorías.
3. **Ninguna figura fiscal confirmada contra el texto legal en bruto** (CIRS/CRCSPSS/CIVA) ni contra los portales oficiales — el rigor actual descansa en PwC y fuentes secundarias convergentes, porque Claude in Chrome no ha estado disponible en las últimas rondas.
4. **El patrón de migraciones de IndexedDB sigue sin estrenarse** — existe y está bien documentado, pero no hay garantía real de que funcione hasta que se use con un cambio de esquema de verdad.

---

## 6. Conclusión

El salto de 8,1 a 8,3 es real pero modesto — más pequeño que el 8,8 que publiqué en el primer intento de este informe, precisamente porque parte de lo que iba a contar como "progreso de hoy" (CSP, atomicidad, migraciones) ya estaba resuelto desde ayer y yo no lo había verificado bien antes de escribirlo. Lo que sí es mérito de esta sesión: dos bugs reales de IRS encontrados y corregidos por el propio proceso de verificación, dos figuras fiscales nuevas, y un ciclo de auditoría que se corrige a sí mismo en vivo cuando se equivoca — que es, en el fondo, el mismo estándar de rigor que el proyecto exige para sus datos fiscales.

---

## 7. Addendum (misma sesión, después de este informe)

De los cuatro puntos de la sección 5 ("lo que sigue genuinamente abierto"), tres quedaron resueltos más tarde en esta misma sesión, a petición explícita del autor ("vamos a atacar a lo que sigue en abierto" / "vamos a por ello"):

- **Confirmación contra el CIRS en bruto**: Claude in Chrome se reconectó y confirmó directamente en el texto legal (Art. 25.º y Art. 78.º-A CIRS) los dos bugs de IRS corregidos hoy — ya no depende solo de PwC.
- **ISV/IUC/IABA/IT**: la mayoría ya estaba `verified` (mi lectura inicial de estos como "huecos abiertos" fue otro error de este informe — no releí los ficheros de datos actuales). Los huecos reales que sí quedaban (tabaco: charutos/tabaco de enrolar/líquidos de e-cigarette; ISV protocolo NEDC; IUC categorías E completa, F, G, y un recargo por altas emisiones que el motor no aplicaba) se completaron contra la misma fuente primaria de la AT ya usada el 18/08.
- **Patrón de migraciones de IndexedDB**: exercitado por primera vez con un test de integración real (crea una BD en una versión antigua, empuja una migración sintética, confirma que corre y transforma los datos, y que una migración con `versaoAlvo` ya alcanzado NO corre).

Único punto de los cuatro que sigue abierto: la verificación real de accesibilidad (Lighthouse, lector de pantalla, dispositivo físico), que sigue sin poder hacerse desde este entorno.

325/325 tests en verde tras estos cambios (319 al momento de escribir la sección 6 de este informe).
