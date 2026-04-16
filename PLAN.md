# PLAN.md — Ejecución por fases

> Este archivo registra el estado del proyecto y las tareas pendientes por fase.
> Claude Code debe leer este archivo al inicio de cada sesión para saber dónde continuar.
> Al cerrar una fase, marcar las tareas como completadas y registrar la fecha.

---

## Estado actual

```
Fase activa: 5 — Analítica básica
Última actualización: 2026-04-16
```

---

## Fases del proyecto

| Fase | Nombre | Estado |
|---|---|---|
| 0 | Setup del proyecto | ✅ Completa |
| 1 | Auth — login mínimo | ✅ Completa |
| 2 | Núcleo de QRs (CRUD) | ✅ Completa |
| 3 | Versionado de redirecciones | ✅ Completa |
| 4 | Endpoint público + scan logs | ✅ Completa |
| 5 | Analítica básica | ⬜ Pendiente |
| 6 | Personalización visual del QR | ⬜ Pendiente |
| 7 | Pulido y cierre | ⬜ Pendiente |

---

## Fase 0 — Setup del proyecto

**Objetivo:** Dejar la base técnica lista para empezar a construir.

**Prompt para Claude Code:**
```
Lee CLAUDE.md. Luego ejecuta la Fase 0 de PLAN.md.
No implementes lógica de negocio todavía.
Solo deja el proyecto configurado y corriendo.
```

### Pre-requisitos manuales (hacer antes de ejecutar Claude Code)

- [ ] Crear proyecto en [supabase.com](https://supabase.com) → Settings → Database → copiar `Connection string (URI)` → será `DATABASE_URL`
- [ ] Crear repo en GitHub
- [ ] Crear proyecto en [vercel.com](https://vercel.com) → conectar el repo → la URL generada (`https://nombre.vercel.app`) será `BASE_URL`

### Tareas

- [x] Crear proyecto Next.js 14 con App Router y TypeScript
- [x] Configurar Tailwind CSS
- [x] Instalar y configurar shadcn/ui
- [x] Configurar Prisma con PostgreSQL
- [x] Crear schema.prisma con las 4 tablas del modelo de datos (User, QrCode, QrRedirectVersion, QrScanLog)
- [x] Crear archivo `.env.example` con las variables requeridas
- [x] Crear layout base del panel (sidebar + contenido)
- [x] Crear estructura de carpetas según CLAUDE.md
- [x] Ejecutar `prisma migrate dev` y verificar conexión

> ⚠️ Pendiente: ejecutar `npx prisma migrate dev` después de configurar DATABASE_URL en .env.local

### Entregables
- Proyecto corre localmente en `localhost:3000`
- Base de datos conectada y migrada
- Estructura de carpetas creada

---

## Fase 1 — Auth mínimo

**Objetivo:** Panel protegido con login por email y contraseña.

**Prompt para Claude Code:**
```
Lee CLAUDE.md y PLAN.md. Implementa la Fase 1.
Usa email + contraseña con bcrypt. Sin OAuth ni 2FA.
Protege todas las rutas bajo /(panel) con middleware.
```

### Tareas

- [x] Instalar `bcryptjs` e `iron-session` (o next-auth con credentials provider)
- [x] Implementar `POST /api/auth/login` (validar email, comparar hash, crear sesión)
- [x] Implementar `POST /api/auth/logout`
- [x] Crear pantalla de login (`/login`)
- [x] Crear middleware que proteja rutas bajo `/(panel)`
- [x] Crear seed básico con usuario de prueba
- [x] Verificar que sin sesión redirige a `/login`

### Entregables
- Login funcional
- Panel privado protegido
- Logout funcional

---

## Fase 2 — Núcleo de QRs

**Objetivo:** Crear, listar, ver detalle, activar y pausar QRs.

**Prompt para Claude Code:**
```
Lee CLAUDE.md y PLAN.md. Implementa la Fase 2.
El QR debe tener slug único autogenerado.
La shortUrl debe ser BASE_URL + /r/ + slug.
El QR visual aún puede ser placeholder — se completa en Fase 6.
```

### Tareas

- [x] Implementar `GET /api/qrs` y `POST /api/qrs`
- [x] Implementar `GET /api/qrs/:id`, `PATCH /api/qrs/:id`, `PATCH /api/qrs/:id/status`
- [x] Generar slug único (nanoid de 8 chars o similar)
- [x] Al crear un QR, crear automáticamente la primera `QrRedirectVersion` con `isCurrent = true`
- [x] Pantalla listado de QRs con columnas: nombre, slug, destino actual, estado, escaneos, acciones
- [x] Pantalla detalle de QR con datos generales y redirección actual
- [x] Botones activar / pausar en listado y detalle

### Entregables
- CRUD de QRs funcional
- Listado con filtro básico por nombre
- Detalle del QR visible

---

## Fase 3 — Versionado de redirecciones

**Objetivo:** Cambiar destino sin perder historial. Base de la trazabilidad.

**Prompt para Claude Code:**
```
Lee CLAUDE.md y PLAN.md. Implementa la Fase 3.
El cambio de destino NUNCA sobreescribe. Siempre crea nueva versión.
Lee la lógica crítica de cambio de redirección en CLAUDE.md antes de implementar.
```

### Tareas

- [x] Implementar `POST /api/qrs/:id/redirect-version`
  - Cierra la versión actual (`isCurrent = false`, `endedAt = now()`)
  - Crea nueva versión (`isCurrent = true`, `versionNumber = n+1`)
- [x] Implementar `GET /api/qrs/:id/redirect-versions`
- [x] Mostrar historial de versiones en el detalle del QR:
  - Tabla con: versión, destino, fecha inicio, fecha fin, escaneos
- [x] Formulario de "Cambiar destino" en el detalle del QR con campo de nueva URL y nota opcional
- [x] Validar que la nueva URL comience con `http://` o `https://` y no apunte a `/r/:slug` propio

### Entregables
- Cambio de destino funcional
- Historial de versiones visible en el panel
- Versión actual claramente identificada

---

## Fase 4 — Endpoint público + scan logs

**Objetivo:** El QR funciona en producción. Cada escaneo queda registrado.

**Prompt para Claude Code:**
```
Lee CLAUDE.md y PLAN.md. Implementa la Fase 4.
Lee la lógica crítica del endpoint de redirección en CLAUDE.md antes de implementar.
El scan log DEBE incluir redirect_version_id del momento del escaneo.
```

### Tareas

- [x] Implementar `GET /r/:slug` siguiendo el flujo exacto de CLAUDE.md
- [x] Registrar `QrScanLog` con: `qrCodeId`, `redirectVersionId`, `scannedAt`, `userAgent`, `ipHash`
- [x] Hash de IP: usar SHA256 simple (no guardar IP cruda)
- [x] Si QR pausado: devolver página simple "Este QR está temporalmente deshabilitado"
- [x] Si slug no existe: devolver 404
- [x] Verificar que en el detalle del QR el contador de escaneos se actualiza

### Entregables
- Escaneo real funcional (se puede probar con el teléfono)
- Logs correctamente asociados a la versión vigente
- QR pausado no redirige

---

## Fase 5 — Analítica básica

**Objetivo:** Mostrar métricas de escaneos por QR y por versión en el panel.

**Prompt para Claude Code:**
```
Lee CLAUDE.md y PLAN.md. Implementa la Fase 5.
Las métricas deben mostrarse por QR y por cada versión de redirección histórica.
Usa agregaciones Prisma. No crear tablas adicionales.
```

### Tareas

- [ ] Implementar `GET /api/qrs/:id/stats`
  - Total escaneos del QR
  - Escaneos por versión de redirección
  - Escaneos por fecha (últimos 30 días)
- [ ] Implementar `GET /api/dashboard/summary`
  - Total QRs, QRs activos, QRs pausados
  - Escaneos totales, escaneos últimos 7 días
  - Top 5 QRs por escaneos
- [ ] Dashboard con KPIs en tarjetas
- [ ] En el detalle del QR: tabla de escaneos por versión + gráfico de barras
- [ ] Filtro básico por rango de fechas en el detalle

### Entregables
- Dashboard con KPIs reales
- Detalle de QR muestra escaneos por versión
- Gráfico temporal de escaneos

---

## Fase 6 — Personalización visual del QR

**Objetivo:** QR con color personalizado y logo. Descarga en PNG y SVG.

**Prompt para Claude Code:**
```
Lee CLAUDE.md y PLAN.md. Implementa la Fase 6.
Usa la librería qrcode + sharp para composición.
Cambiar apariencia NO debe afectar slug ni versiones de redirección.
Valida que el contraste entre primaryColor y backgroundColor sea suficiente.
```

### Tareas

- [ ] Instalar `qrcode` y `sharp`
- [ ] Función `generateQrAssets(qrCode)` en `/lib/qr/generator.ts`:
  - Genera SVG base con color primario y fondo
  - Si hay logo: lo inserta centrado (máx 25% del área)
  - Guarda PNG y SVG en storage
  - Actualiza `qrPngUrl` y `qrSvgUrl` en DB
- [ ] Implementar `PATCH /api/qrs/:id/appearance`
  - Actualiza colores y logoFileUrl
  - Llama a `generateQrAssets()` y actualiza URLs
- [ ] Implementar `GET /api/qrs/:id/download/png` y `.../svg`
- [ ] Upload de logo: validar que sea imagen (PNG/JPG/SVG), máx 500KB
- [ ] En el detalle del QR: modal de personalización con previsualización en tiempo real
- [ ] Validar contraste: si luminancia del fondo y foreground es similar, mostrar advertencia

### Entregables
- QR personalizable con color y logo
- Previsualización antes de guardar
- Descarga de PNG y SVG funcional

---

## Fase 7 — Pulido y cierre

**Objetivo:** MVP presentable y documentado.

**Prompt para Claude Code:**
```
Lee CLAUDE.md y PLAN.md. Ejecuta la Fase 7.
Revisa que todos los criterios de aceptación de CLAUDE.md estén cumplidos.
Genera el reporte final.
```

### Tareas

- [ ] Revisar todos los criterios de aceptación del CLAUDE.md
- [ ] Agregar mensajes de error claros en formularios (toast o inline)
- [ ] Validaciones UI: slugs, URLs, colores hex, tamaño de logo
- [ ] Pantalla de gestión de usuarios (crear, editar, activar/desactivar, cambiar contraseña)
- [ ] Revisar que no haya rutas sin protección
- [ ] Limpiar console.log y código de debug
- [ ] Crear README.md con: setup local, variables de entorno, comandos de deploy
- [ ] Generar seed completo con datos de ejemplo para demostración
- [ ] Reporte final: listar archivos creados, decisiones tomadas, pendientes para v2

### Entregables
- MVP funcional y presentable
- README.md claro
- Todos los criterios de aceptación marcados como cumplidos

---

## Notas para Claude Code al iniciar cada sesión

```
1. Leer CLAUDE.md
2. Leer PLAN.md y encontrar la fase activa
3. Revisar las tareas pendientes de esa fase
4. Antes de implementar algo complejo, proponer el enfoque
5. Al terminar la sesión, actualizar el estado en PLAN.md
```

---

## Decisiones tomadas

| Fecha | Decisión | Motivo |
|---|---|---|
| — | Usar `302` en lugar de `301` para redirección | Evitar caché permanente del navegador |
| — | Versionado de redirecciones como tabla separada | Única forma de tener trazabilidad real por versión |
| — | Hash SHA256 de IP en logs | Privacidad mínima sin complejidad |
| — | No usar 301 nunca en `/r/:slug` | El destino cambia frecuentemente |
| — | `iron-session` para sesiones | Simple, sin dependencias pesadas |
