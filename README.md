# Panel de QRs Dinamicos

Panel web para gestionar QRs dinamicos con redireccion versionada y trazabilidad de escaneos.

## Stack

- Next.js App Router + TypeScript
- Prisma + PostgreSQL (Supabase)
- Auth con email/contrasena (`iron-session` + `bcryptjs`)
- UI con Tailwind + shadcn/ui
- Generacion QR con `qrcode` + `sharp`
- Storage local en desarrollo y Supabase Storage en produccion

## Requisitos

- Node.js 20+
- Base de datos PostgreSQL (recomendado: Supabase)

## Variables de entorno

Crear `.env.local` con:

```env
DATABASE_URL=
SESSION_SECRET=
BASE_URL=http://localhost:3000
STORAGE_PATH=./public/uploads

# Produccion (Vercel + Supabase Storage)
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_STORAGE_BUCKET=qr-assets
```

Notas:
- `SESSION_SECRET` debe tener minimo 32 caracteres.
- En produccion, si estan presentes `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` + `SUPABASE_STORAGE_BUCKET`, los assets se suben/leen desde Supabase Storage.

## Instalacion local

```bash
npm install
npx prisma migrate dev
npm run dev
```

Aplicacion: `http://localhost:3000`

## Seed de demostracion

```bash
npx prisma db seed
```

Usuarios demo:
- `admin@panelqrs.com` / `admin123`
- `ops@panelqrs.com` / `ops12345`
- `marketing@panelqrs.com` / `market123`
- `soporte@panelqrs.com` / `soporte123` (inactivo)

## Scripts utiles

```bash
npm run dev
npm run lint
npx tsc --noEmit
npm run build
```

## Endpoints principales

Publico:
- `GET /r/:slug`

Privados:
- Auth: `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me`
- QRs: `GET/POST /api/qrs`, `GET/PATCH /api/qrs/:id`, `PATCH /api/qrs/:id/status`
- Redirecciones: `POST /api/qrs/:id/redirect-version`, `GET /api/qrs/:id/redirect-versions`
- Analitica: `GET /api/qrs/:id/stats`, `GET /api/dashboard/summary`
- Apariencia: `PATCH /api/qrs/:id/appearance`, `POST /api/uploads/logo`
- Descargas: `GET /api/qrs/:id/download/png`, `GET /api/qrs/:id/download/svg`
- Usuarios: `GET/POST /api/users`, `PATCH /api/users/:id`

## Deploy en Vercel

1. Conectar repositorio en Vercel.
2. Configurar variables de entorno (incluyendo Supabase Storage para produccion).
3. Cada push a `master` dispara deploy automatico.
