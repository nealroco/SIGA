# SIGA Deportes — Plataforma

Sistema Integral de Gestión Administrativa Deportiva · Ministerio del Deporte / ESAL-JDEC.
Implementación de la **arquitectura v4** (29 módulos, 9 roles, matriz de permisos, reglas RN, KPIs).

**Los 29 módulos del catálogo están construidos y enrutados**, ninguno como placeholder. Construido por
fases (A–F) sobre el patrón inaugurado en Beneficiarios/Contratos/Convocatorias; ver `git log` para el
detalle de cada fase y las reglas de negocio que estrena.

## Stack

- **Next.js 16** (App Router) + **TypeScript** + **React 19**
- **Tailwind v4** + identidad visual SIGA (navy / azul eléctrico / coral; Bricolage Grotesque · Inter · JetBrains Mono)
- **Prisma 6** · **MySQL** en dev y producción (Hostinger, plan "App web de Node.js", solo ofrece MySQL —
  no hay Postgres disponible en ese plan). Los campos de texto largo/libre llevan `@db.Text` explícito
  porque MySQL trunca `String` a `VARCHAR(191)` por defecto.
- **Auth.js v5 (NextAuth)** — credenciales, sesión JWT con el rol del usuario

## Requisitos

- Node 20+ (este repo se construyó con Node 24 vía nvm).
- **MySQL 8.4+ local para desarrollo** (sin Homebrew ni sudo en este entorno): se instaló el tar.gz oficial
  de MySQL Community Server en `~/mysql-siga` y se corre como proceso de usuario en el puerto `3307`
  (nunca el 3306 por defecto, para no chocar con una instalación futura). Arrancarlo:
  ```bash
  ~/mysql-siga/mysql-8.4.10-macos15-arm64/bin/mysqld \
    --basedir=~/mysql-siga/mysql-8.4.10-macos15-arm64 \
    --datadir=~/mysql-siga/data --socket=~/mysql-siga/mysql.sock \
    --pid-file=~/mysql-siga/mysql.pid --port=3307 --bind-address=127.0.0.1 \
    --log-error=~/mysql-siga/logs/mysqld.log &
  ```
  Base de datos `siga_deportes` y usuario `siga` ya creados (ver `.env`).

## Puesta en marcha

```bash
npm install
cp .env.example .env          # ajusta DATABASE_URL si tu MySQL local usa otro puerto/credenciales
npx prisma db push            # crea/sincroniza las tablas en MySQL (no se usa `migrate dev`: no hay TTY)
npx prisma db seed            # 9 roles, 29 módulos, matriz 9×29, usuarios y beneficiarios de muestra
npm run dev                   # http://localhost:3000
```

## Tests

```bash
# una sola vez por máquina: crear el schema de test (separado de dev/producción)
mysql -h 127.0.0.1 -P 3307 -u siga -p -e "CREATE DATABASE siga_deportes_test; GRANT ALL PRIVILEGES ON siga_deportes_test.* TO 'siga'@'%';"
cp .env.test.example .env.test

npm run test        # Vitest — unitarios/integración contra siga_deportes_test (nunca dev/producción)
npm run test:e2e    # Playwright — requiere antes: npx playwright install --with-deps chromium
```

El `globalSetup` de Vitest resetea `siga_deportes_test` (`prisma db push --force-reset`) antes de cada corrida — verifica primero que el nombre del schema en `DATABASE_URL` termine en `_test`, así que nunca toca dev/producción por accidente. Los fixtures mínimos están en `prisma/testFixtures.ts` (no se usa el seed completo en los tests: es lento y acopla los casos entre sí).

## Usuarios de prueba (seed)

| Correo | Rol | Permiso en MOD-001 |
|---|---|---|
| `admin@sigadeportes.co` | Administrador | Escritura (crea/edita/baja) |
| `coord@sigadeportes.co` | Coord. deportiva | Escritura |
| `revisor@sigadeportes.co` | Revisor | Solo lectura |

Contraseña para todos: `siga2026`

## Mapa de módulos (MOD-001 a MOD-029)

| Módulo | Ruta | Regla(s) de negocio destacada |
|---|---|---|
| MOD-001 Beneficiarios | `/beneficiarios` | RN-002 (baja lógica), RN-015, RN-020 |
| MOD-002 Personal | `/personal` | RN-025 (Operador registra, Supervisor aprueba — self-block sobre `estadoAprobacion`) |
| MOD-003 Financiera | `/financiera`, `/rubros` | RN-005/006/007/008/009/010/018/023/025 — pagos son **orden + aprobación**, no en línea; control de inversión por rubro (Asignado/Comprometido/Ejecutado/Libre) |
| MOD-004 Inventarios | `/inventarios` | — |
| MOD-005 Documental | `/documental` | RN-012 (versionado append-only), RN-017, RN-025 (self-block: quien carga no revisa) |
| MOD-006 Informes | `/informes` | RN-006, RN-022, RN-023/026, RN-025 (self-block: quien radica no aprueba/devuelve) |
| MOD-007 Dashboard KPIs | `/dashboard` | RN-016/019 (KPIs cruzados); % ejecución solo sobre cuentas Aprobada/Pagada |
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
| MOD-028 Seguridad / IAM | `/admin/usuarios`, `/admin/permisos` | RN-026 (break-glass, solo Administrador); guarda contra bloquear al último Administrador activo |
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

## Auditoría de sistema — hallazgos y correcciones (Núcleo/IAM)

Auditoría manual de MOD-001/002/005/006/007/026/028 (2026-06-30). Confirmados y corregidos:

- **MOD-006 Informes**: `aprobarInforme`/`devolverInforme` no comprobaban `createdById` — quien radicaba
  un informe podía aprobárselo a sí mismo (la matriz da E a Administrador/Revisor/Tecnología sin un nivel
  A distinto). Corregido con self-block RN-025.
- **MOD-005 Documental**: `Documento` no tenía `createdById` (no había forma de saber quién cargó un
  documento) y `revisarDocumento` no bloqueaba la auto-revisión. Se agregó la columna y el self-block.
- **MOD-007 Dashboard**: el KPI "% ejecución financiera" sumaba **todas** las cuentas de cobro sin filtrar
  por estado y usaba `valorCobrado` como sustituto de `valorAprobado` para cuentas no aprobadas — inflaba
  el denominador. Corregido para filtrar `estado IN (Aprobada, Pagada)` y usar solo `valorAprobado`.
- **MOD-002 Personal**: la matriz da a Supervisor nivel Aprobación (A), pero no existía ningún flujo de
  aprobación en el código. Se agregó `estadoAprobacion` (Pendiente/Aprobado/Rechazado) + `aprobarPersonal`/
  `rechazarPersonal` con doble control RN-025, independiente de la baja lógica (`estado`, RN-002).
- **MOD-028 IAM**: `cambiarEstadoUsuario` no impedía dejar el sistema sin ningún Administrador activo
  (riesgo de bloqueo total/lockout). Se agregó la comprobación.
- Esquema: `Beneficiario`/`Lote` migraron su `territorio` de texto libre a `territorioId` (relación a
  `Territorio`); se agregaron `Contrato.convocatoriaId`, `ActaComite.contratoId/convocatoriaId`,
  `Comunicacion.convocatoriaId`, `EvaluacionPsicosocial.nivelRiesgo`, `DotacionEntrega.fechaDevolucion`/
  `devueltoById` para cerrar vínculos que solo existían en el catálogo v4 y no en el modelo de datos.

Backlog de la auditoría completa (6 grupos) — **cerrado en 3 lotes** (2026-07-01), cada uno verificado en
vivo contra la base real antes de commitear:

- **Lote 1**: Escenario (editar/baja lógica, `escenarios/[id]`), Impacto (filtro por período), SECOP
  (deduplicación vía `RegistroSecop.contratoId @unique`).
- **Lote 2+3**: Mantenimiento↔Reservas (bloqueo de reservas contra escenarios en mantenimiento activo,
  `LogConflicto(tipo:"Mantenimiento")`), Inventarios/Dotación (`marcarDevuelta` registra
  `fechaDevolucion`/`devueltoById`), Convocatorias (borrador automático de `Comunicacion` al abrir, cierre
  automático de ciclo de vida al llenar cupos + `cerrarConvocatoria` manual), notificaciones automáticas
  RN-024-B/RN-026 (Supervisor) y RN-025 (Administrador/Supervisor, 9 módulos con flujo de aprobación).

## Cómo se añade un módulo nuevo

1. Modelo en `prisma/schema.prisma` (+ `migrate`).
2. Server actions en `src/actions/<modulo>.ts` con `can()` + Zod + `writeAudit()`.
3. Páginas en `src/app/(app)/<modulo>/…` reutilizando los componentes y la identidad.
4. La navegación y los permisos ya salen automáticamente de la matriz sembrada (hoja Roles_Permisos del v4).

## Producción (Hostinger — App web de Node.js)

Dev y producción usan el mismo motor (MySQL), así que no hay que tocar `prisma/schema.prisma` al desplegar:

1. En el panel de Hostinger, crear la app "App web de Node.js" y conectar el repo `nealroco/SIGA`.
2. Crear la base de datos MySQL que ofrece ese plan y copiar la cadena de conexión a `DATABASE_URL`
   (formato `mysql://usuario:password@host:3306/nombre_bd`) en las variables de entorno de la app.
3. `npx prisma db push` (o el equivalente en el flujo de build de Hostinger) para crear las tablas.
4. `npx prisma db seed` **solo** la primera vez, para cargar roles/módulos/matriz de permisos — luego
   editar usuarios reales desde `/admin/usuarios` en vez de re-sembrar.
