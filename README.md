# SIGA Deportes — Plataforma

Sistema Integral de Gestión Administrativa Deportiva · Ministerio del Deporte / ESAL-JDEC.
Implementación de la **arquitectura v4** (29 módulos, 9 roles, matriz de permisos, reglas RN, KPIs).

Primer entregable: **esqueleto** (IAM + navegación + modelo de datos + matriz de permisos) y el módulo
**Beneficiarios (MOD-001)** end-to-end como patrón a replicar.

## Stack

- **Next.js 16** (App Router) + **TypeScript** + **React 19**
- **Tailwind v4** + identidad visual SIGA (navy / azul eléctrico / coral; Bricolage Grotesque · Inter · JetBrains Mono)
- **Prisma 6** · **SQLite** en desarrollo (schema *Postgres-ready*: en producción se cambia el `provider` a `postgresql`)
- **Auth.js v5 (NextAuth)** — credenciales, sesión JWT con el rol del usuario

## Requisitos

- Node 20+ (este repo se construyó con Node 24 vía nvm). Sin Docker: la BD de desarrollo es SQLite (archivo local).

## Puesta en marcha

```bash
npm install
cp .env.example .env          # ya incluido un .env de desarrollo
npx prisma migrate dev        # crea prisma/dev.db y aplica el esquema
npx prisma db seed            # 9 roles, 29 módulos, matriz 9×29, usuarios y beneficiarios de muestra
npm run dev                   # http://localhost:3000
```

## Usuarios de prueba (seed)

| Correo | Rol | Permiso en MOD-001 |
|---|---|---|
| `admin@siga.gov.co` | Administrador | Escritura (crea/edita/baja) |
| `coord@siga.gov.co` | Coord. deportiva | Escritura |
| `revisor@siga.gov.co` | Revisor | Solo lectura |

Contraseña para todos: `siga2026`

## Reglas de negocio aplicadas (del v4)

- **RN-015** — los permisos de rol prevalecen: cada server action verifica `can(rol, "MOD-001", acción)` en el servidor; la UI oculta acciones sin permiso.
- **RN-014** — auditoría: crear / editar / baja / login se registran en la tabla `auditoria`.
- **RN-002** — baja lógica: dar de baja cambia el estado a `Inactivo`, nunca borra el histórico.
- **RN-020** — validación: la edad no puede ser negativa (Zod).

## Cómo se añade un módulo nuevo

1. Modelo en `prisma/schema.prisma` (+ `migrate`).
2. Server actions en `src/actions/<modulo>.ts` con `can()` + Zod + `writeAudit()`.
3. Páginas en `src/app/(app)/<modulo>/…` reutilizando los componentes y la identidad.
4. La navegación y los permisos ya salen automáticamente de la matriz sembrada (hoja Roles_Permisos del v4).

## Producción (PostgreSQL)

Cambiar en `prisma/schema.prisma` el `datasource db { provider = "postgresql" }` y `DATABASE_URL` a la cadena de
Postgres; `enum`/`Json` pueden reintroducirse (SQLite no los soporta y por eso aquí se usan `String`).
