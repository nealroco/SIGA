# SIGA Deportes — Plataforma

Sistema Integral de Gestión Administrativa Deportiva · Ministerio del Deporte / ESAL-JDEC.
Implementación de la **arquitectura v4** (29 módulos, 9 roles, matriz de permisos, reglas RN, KPIs).

**Los 29 módulos del catálogo están construidos y enrutados**, ninguno como placeholder. Construido por
fases (A–F) sobre el patrón inaugurado en Beneficiarios/Contratos/Convocatorias; ver `git log` para el
detalle de cada fase y las reglas de negocio que estrena.

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

## Mapa de módulos (MOD-001 a MOD-029)

| Módulo | Ruta | Regla(s) de negocio destacada |
|---|---|---|
| MOD-001 Beneficiarios | `/beneficiarios` | RN-002 (baja lógica), RN-015, RN-020 |
| MOD-002 Personal | `/personal` | — |
| MOD-003 Financiera | `/financiera` | RN-005/006/007/008/009/010/018/023/025 — pagos son **orden + aprobación**, no en línea |
| MOD-004 Inventarios | `/inventarios` | — |
| MOD-005 Documental | `/documental` | RN-012 (versionado append-only), RN-017 |
| MOD-006 Informes | `/informes` | RN-006, RN-022, RN-023/026 |
| MOD-007 Dashboard KPIs | `/dashboard` | RN-016/019 (KPIs cruzados) |
| MOD-008 Convocatorias | `/convocatorias` | RN-027 (segregación anti-nepotismo) |
| MOD-009 Evaluación ESAL | `/evaluacion-esal` | doble control: Administrador registra, Supervisor aprueba |
| MOD-010 Contratos | `/contratos` | RN-025 (doble aprobación, 4 ojos) |
| MOD-011 Seguimiento | `/seguimiento` | — |
| MOD-012 Caracterización territorial | `/territorios` | — |
| MOD-013 Dotación deportiva | `/dotacion` | control de stock transaccional |
| MOD-014 Control pólizas | `/polizas` | alimenta RN-018 |
| MOD-015 Comité de control | `/comite` | doble registrante (Supervisor/Coord.) + Administrador aprueba |
| MOD-016 Indicadores físicos | `/indicadores` | RN-011 (solo avance aprobado suma) |
| MOD-017 Gestión de lotes | `/lotes` | — |
| MOD-018 Eval. psicosocial | `/psicosocial` | — |
| MOD-019 Comunicaciones | `/comunicaciones` | — |
| MOD-020 Fuentes de financiación | `/fuentes` | RN-025 |
| MOD-021 Notificaciones | `/notificaciones` | — |
| MOD-022 Reservas escenario | `/reservas` | RN-024 (anti-solapamiento, margen 30 min) + RN-024-B (override) |
| MOD-023 Mantenimiento de escenarios | `/mantenimiento` | insumo KPI-029b |
| MOD-024 Georeferenciación | `/georeferenciacion` | edita lat/lng de Territorio/Escenario |
| MOD-025 Análisis de impacto | `/impacto` | RN-021 (alerta de desviación) |
| MOD-026 Auditoría interna | `/auditoria` | visor de `AuditLog` + hallazgos |
| MOD-027 Integración SECOP II | `/secop` | RN-025 |
| MOD-028 Seguridad / IAM | `/admin/usuarios`, `/admin/permisos` | RN-026 (break-glass, solo Administrador) |
| MOD-029 Infraestructura cloud | `/infraestructura-cloud` | estado del sistema + config |

## Reglas de negocio aplicadas (del v4)

- **RN-015** — los permisos de rol prevalecen: cada server action verifica `can(rol, "MOD-0XX", acción)` en el servidor; la UI oculta acciones sin permiso.
- **RN-014** — auditoría: toda acción crítica (crear/editar/aprobar/baja/login/etc.) se registra en la tabla `auditoria`.
- **RN-002** — baja lógica: dar de baja cambia el estado a `Inactivo`, nunca borra el histórico.
- **RN-020/023** — validación: valores numéricos no negativos (Zod).
- **RN-025 / RN-027** — doble control (4 ojos): quien registra (nivel E) nunca puede aprobar (nivel A) su propio registro — aplicado en Contratos, Fuentes, Convocatorias, Evaluación ESAL, Comité de control, SECOP II.
- **RN-024 / RN-024-B** — anti-solapamiento de reservas con margen de 30 min y log de conflictos (`LogConflicto`); el override de emergencia exige una comprobación **literal** de rol (`session.user.rol === "Administrador"`), no solo de nivel de permiso, porque varios roles comparten el mismo nivel E en esa matriz.
- **RN-026** — acceso de emergencia (break-glass) en IAM, con la misma comprobación literal de rol y registro en `AccesoEmergenciaIAM`.
- **RN-011** — en Indicadores físicos, solo el avance en estado `Aprobado` suma al % de cumplimiento.

## Lección técnica (bug real encontrado y corregido)

En `<input type="number">`, si `step` es distinto de `1`/`"any"`, el atributo `min` debe ser `0` o un
múltiplo de ese `step`. `min={1} step="1000"` hace que el navegador rechace valores como `7000000`
**sin avisar** (sin red, sin consola — bloqueo silencioso de validación HTML5). Se encontró en
`PagoForm.tsx` y se corrigió a `min={0} step="any"`; todos los módulos posteriores usan esa convención.

## Cómo se añade un módulo nuevo

1. Modelo en `prisma/schema.prisma` (+ `migrate`).
2. Server actions en `src/actions/<modulo>.ts` con `can()` + Zod + `writeAudit()`.
3. Páginas en `src/app/(app)/<modulo>/…` reutilizando los componentes y la identidad.
4. La navegación y los permisos ya salen automáticamente de la matriz sembrada (hoja Roles_Permisos del v4).

## Producción (PostgreSQL)

Cambiar en `prisma/schema.prisma` el `datasource db { provider = "postgresql" }` y `DATABASE_URL` a la cadena de
Postgres; `enum`/`Json` pueden reintroducirse (SQLite no los soporta y por eso aquí se usan `String`).
