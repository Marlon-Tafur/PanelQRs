# CLAUDE.md — Panel de QRs Dinámicos

> Este archivo es leído automáticamente por Claude Code al iniciar.
> Contiene las reglas de arquitectura, stack, convenciones y restricciones del proyecto.
> **No modifiques este archivo sin documentar el motivo.**

---

## Qué es este proyecto

Panel web para gestionar **QRs dinámicos con redirección controlada**.

- Cada QR tiene una URL fija que nunca cambia (se imprime una sola vez).
- El destino real puede cambiarse desde el panel sin regenerar el QR.
- Cada cambio de destino crea una nueva **versión de redirección**.
- Cada escaneo se registra enlazado a la versión vigente al momento del escaneo.
- El panel muestra trazabilidad: total de escaneos por QR y por versión.
- El QR puede personalizarse con color y logo.

---

## Stack

| Capa | Tecnología |
|---|---|
| Framework | Next.js 14 (App Router) |
| Lenguaje | TypeScript |
| UI | Tailwind CSS + shadcn/ui |
| Base de datos | PostgreSQL vía Supabase |
| ORM | Prisma |
| Auth | Credenciales propias (email + bcrypt) con iron-session o next-auth credentials |
| Storage | Sistema de archivos local en dev / Supabase Storage en prod |
| QR generation | `qrcode` + `sharp` (composición con logo) |
| Gráficas | Recharts |
| Hosting | Vercel |

---

## Reglas de arquitectura — NO romper

1. **El QR siempre codifica una URL fija del sistema** (`/r/:slug`). Nunca la URL final.
2. **Los cambios de destino crean una nueva versión.** Nunca sobreescriben el campo directo.
3. **Cada escaneo se registra con `redirect_version_id`** vigente en ese momento.
4. **Cambiar color o logo no afecta el slug ni la lógica de redirección.**
5. **Solo una versión puede ser `is_current = true`** por QR en cualquier momento.
6. **El endpoint `/r/:slug` usa `302`** (no 301) para evitar caché del navegador.
7. **Acceso al panel solo por email + contraseña.** Sin OAuth, sin 2FA, sin roles complejos.
8. **No multi-tenant en este MVP.** Un solo espacio de administración.
9. **Mantener seguridad al mínimo funcional**, excepto validación de URLs de destino.
10. **No sobre-ingenierizar.** Si algo no está en el alcance del MVP, no se implementa.

---

## Modelo de datos clave

```prisma
// Las 4 tablas principales — no agregar complejidad innecesaria

model User {
  id            String   @id @default(cuid())
  name          String
  email         String   @unique
  passwordHash  String
  isActive      Boolean  @default(true)
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
}

model QrCode {
  id               String              @id @default(cuid())
  name             String
  slug             String              @unique
  shortUrl         String
  isActive         Boolean             @default(true)
  description      String?
  primaryColor     String              @default("#000000")
  backgroundColor  String              @default("#FFFFFF")
  logoFileUrl      String?
  qrPngUrl         String?
  qrSvgUrl         String?
  createdBy        String
  createdAt        DateTime            @default(now())
  updatedAt        DateTime            @updatedAt
  redirectVersions QrRedirectVersion[]
  scanLogs         QrScanLog[]
}

model QrRedirectVersion {
  id             String      @id @default(cuid())
  qrCodeId       String
  versionNumber  Int
  destinationUrl String
  isCurrent      Boolean     @default(false)
  startedAt      DateTime    @default(now())
  endedAt        DateTime?
  createdBy      String
  changeNote     String?
  qrCode         QrCode      @relation(fields: [qrCodeId], references: [id])
  scanLogs       QrScanLog[]
}

model QrScanLog {
  id                String            @id @default(cuid())
  qrCodeId          String
  redirectVersionId String
  scannedAt         DateTime          @default(now())
  userAgent         String?
  referer           String?
  ipHash            String?
  qrCode            QrCode            @relation(fields: [qrCodeId], references: [id])
  redirectVersion   QrRedirectVersion @relation(fields: [redirectVersionId], references: [id])
}
```

> `audit_logs` es opcional para el MVP. Puede agregarse en la Fase 8 si hay tiempo.

---

## Endpoints clave

### Público
```
GET /r/:slug          → Redirección 302 con registro de escaneo
```

### Privados (bajo /api)
```
POST   /api/auth/login
POST   /api/auth/logout

GET    /api/qrs
POST   /api/qrs
GET    /api/qrs/:id
PATCH  /api/qrs/:id
PATCH  /api/qrs/:id/status
PATCH  /api/qrs/:id/appearance
POST   /api/qrs/:id/redirect-version
GET    /api/qrs/:id/redirect-versions
GET    /api/qrs/:id/stats
GET    /api/qrs/:id/download/png
GET    /api/qrs/:id/download/svg

GET    /api/dashboard/summary

GET    /api/users
POST   /api/users
PATCH  /api/users/:id
```

---

## Lógica crítica: cambio de redirección

Cuando el usuario cambia el destino de un QR:

```
1. Buscar la versión con isCurrent = true del QR
2. Actualizar: isCurrent = false, endedAt = now()
3. Crear nueva versión: isCurrent = true, versionNumber = anterior + 1
4. No tocar el slug ni los assets visuales del QR
```

**Nunca** guardar solo `current_destination_url` en `qr_codes`. Eso rompe la trazabilidad.

---

## Lógica crítica: endpoint de redirección

```
GET /r/:slug

1. Buscar QrCode por slug
2. Si no existe → 404
3. Si isActive = false → 200 con página "QR pausado"
4. Buscar QrRedirectVersion donde qrCodeId = id AND isCurrent = true
5. Validar que destinationUrl comience con http:// o https://
6. Registrar QrScanLog (qrCodeId, redirectVersionId, scannedAt, userAgent, ipHash)
7. Responder con redirect 302 → destinationUrl
```

---

## Cómo trabajar con SDD en este proyecto

Claude Code debe seguir este flujo en cada sesión:

1. **Leer este archivo** (CLAUDE.md) al iniciar.
2. **Leer PLAN.md** para saber en qué fase estamos.
3. **No implementar fuera del alcance** de la fase actual.
4. **Proponer antes de implementar** si algo es ambiguo.
5. **Al terminar una fase**: generar resumen de archivos creados y decisiones tomadas.

---

## Convenciones de código

- Componentes: PascalCase (`QrDetailCard.tsx`)
- Funciones y variables: camelCase
- Archivos de ruta Next.js: `route.ts` (sin mayúsculas)
- Helpers de lógica de negocio: en `/lib/` separados por dominio
- No mezclar lógica de negocio dentro de componentes de UI
- Usar `Server Actions` o `route handlers` para mutaciones, no lógica directa en cliente
- Validar con `zod` en el servidor antes de escribir a la base de datos

---

## Variables de entorno requeridas

```env
DATABASE_URL=
SESSION_SECRET=          # mínimo 32 caracteres
BASE_URL=                # URL de Vercel: https://qr-dynamic-panel.vercel.app (o dominio propio)
STORAGE_PATH=            # ruta local o URL de Supabase
```

---

## Alcance del MVP — NO incluir

- Multi-tenant / multi-empresa
- 2FA / OAuth / SSO
- Permisos y roles complejos
- Campañas automáticas o A/B testing
- Analítica geográfica
- Dominios múltiples por QR
- Importación masiva por Excel (primera versión)

---

## Criterios de aceptación del MVP

El proyecto está completo cuando:

- [ ] Login funciona con email + contraseña
- [ ] Se puede crear un QR con slug fijo
- [ ] El QR se puede descargar en PNG y SVG
- [ ] Se puede cambiar el color y subir logo
- [ ] Se puede cambiar la redirección sin cambiar el QR
- [ ] El sistema guarda historial de versiones de redirección
- [ ] Un escaneo real registra `redirect_version_id` correcto
- [ ] El panel muestra escaneos totales por QR
- [ ] El panel muestra escaneos por versión de redirección
- [ ] Un QR pausado no redirige
- [ ] Las URLs de destino son validadas
