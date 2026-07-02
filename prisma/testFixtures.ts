// Fixtures mínimos para tests con Vitest.
//
// Deliberadamente NO se usa prisma/seed.ts (634 líneas: 9 roles × 29 módulos, decenas de
// beneficiarios, convocatorias, etc.) porque es lento y acopla cada test a datos ajenos a
// lo que ese test quiere probar. En su lugar, cada test crea SOLO lo mínimo que necesita
// con las funciones de abajo y debería limpiarlo al final (ver `cleanupByIds` / borrar por
// id explícitamente en un afterEach).
//
// Patrón para agregar más fixtures después: una función createTestX(overrides?) por
// modelo, con defaults sensatos + código único (Date.now()/Math.random()) para que tests en
// paralelo no choquen por unique constraints, y devolviendo el registro creado por Prisma
// (no solo el id) para que el test pueda leer cualquier campo sin otra consulta.
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

// Cliente Prisma dedicado para tests. Import this desde los archivos de test:
//   import { testPrisma } from "../../prisma/testFixtures";
// No reutiliza "@/lib/db" a propósito: ese módulo cachea la instancia en globalThis con
// una lógica pensada para el hot-reload de Next.js en dev, no para el ciclo de vida de una
// suite de Vitest. Aun así, ambos apuntan al mismo DATABASE_URL (tomado de .env.test vía
// vitest.setup.ts), es decir, al mismo schema MySQL "siga_deportes_test".
export const testPrisma = new PrismaClient();

/** Cierra la conexión del cliente de test. Llamar una vez en un afterAll global si hace falta. */
export async function disconnectTestPrisma() {
  await testPrisma.$disconnect();
}

let contador = 0;
/** Sufijo corto y único por proceso para evitar choques de unique constraints entre tests. */
function unico(prefijo: string): string {
  contador += 1;
  return `${prefijo}-${Date.now()}-${contador}`;
}

// ---------------------------------------------------------------------------
// Rol / Módulo / Permiso — necesarios para que src/lib/permissions.ts#can() funcione
// ---------------------------------------------------------------------------

/** Crea (o reutiliza) un Rol de test. `nombre` debe ser único; por defecto se genera uno. */
export async function createTestRol(overrides?: Partial<{ nombre: string; descripcion: string | null; estado: string }>) {
  const nombre = overrides?.nombre ?? unico("Rol-Test");
  return testPrisma.rol.create({
    data: {
      nombre,
      descripcion: overrides?.descripcion ?? "Rol creado por testFixtures",
      estado: overrides?.estado ?? "Activo",
    },
  });
}

/** Crea (o reutiliza) un Módulo de test. `codigo` debe ser único (formato libre en test). */
export async function createTestModulo(
  overrides?: Partial<{ codigo: string; nombre: string; categoria: string | null; esBase: boolean; estado: string }>
) {
  const codigo = overrides?.codigo ?? unico("MOD-TEST");
  return testPrisma.modulo.create({
    data: {
      codigo,
      nombre: overrides?.nombre ?? `Módulo de test ${codigo}`,
      categoria: overrides?.categoria ?? "Test",
      esBase: overrides?.esBase ?? false,
      estado: overrides?.estado ?? "Activo",
    },
  });
}

/**
 * Da a un rol un nivel de permiso sobre un módulo (fila de la matriz rol × módulo).
 * Requerido para que `can(rolNombre, moduloCodigo, accion)` devuelva true/false de forma
 * predecible en un test, sin depender de la matriz 9×29 real del seed.
 */
export async function createTestPermiso(input: { rolId: number; moduloId: number; nivel: "E" | "A" | "L" | "C" | "NONE" }) {
  return testPrisma.permiso.create({
    data: { rolId: input.rolId, moduloId: input.moduloId, nivel: input.nivel },
  });
}

/**
 * Atajo de alto nivel: crea un Rol + un Módulo + el Permiso que los une con el nivel dado.
 * Útil cuando el test solo necesita "un rol con nivel E en un módulo" sin que le importen
 * los ids intermedios por separado.
 */
export async function createTestRolConPermiso(nivel: "E" | "A" | "L" | "C" | "NONE", overrides?: { moduloCodigo?: string }) {
  const rol = await createTestRol();
  const modulo = await createTestModulo({ codigo: overrides?.moduloCodigo });
  const permiso = await createTestPermiso({ rolId: rol.id, moduloId: modulo.id, nivel });
  return { rol, modulo, permiso };
}

// ---------------------------------------------------------------------------
// Usuario
// ---------------------------------------------------------------------------

/**
 * Crea un Usuario de test con password conocido (por defecto "Test1234!", ya hasheado con
 * bcrypt como espera src/auth.ts). Si no se pasa `rolId`, crea un Rol de test nuevo.
 */
export async function createTestUser(
  rolId?: number,
  overrides?: Partial<{
    nombre: string;
    correo: string;
    password: string;
    estado: string;
    intentosFallidos: number;
    bloqueadoHasta: Date | null;
  }>
) {
  const finalRolId = rolId ?? (await createTestRol()).id;
  const correo = overrides?.correo ?? `${unico("user")}@test.siga.local`;
  const password = overrides?.password ?? "Test1234!";
  const passwordHash = await bcrypt.hash(password, 10);

  const usuario = await testPrisma.usuario.create({
    data: {
      nombre: overrides?.nombre ?? "Usuario de Test",
      correo,
      passwordHash,
      rolId: finalRolId,
      estado: overrides?.estado ?? "Activo",
      intentosFallidos: overrides?.intentosFallidos ?? 0,
      bloqueadoHasta: overrides?.bloqueadoHasta ?? null,
    },
    include: { rol: true },
  });

  // Se devuelve también el password en texto plano (nunca persistido) para que los tests
  // de login/auth puedan usarlo directamente sin recalcular el hash.
  return { ...usuario, passwordPlano: password };
}

// ---------------------------------------------------------------------------
// MOD-003 Financiera — Fuente de financiación / Rubro (ejemplo RN-025 en src/actions/rubros.ts)
// ---------------------------------------------------------------------------

/** Crea una FuenteFinanciacion de test. Por defecto queda "Aprobada" (requisito RN-007 de Rubro). */
export async function createTestFuente(
  overrides?: Partial<{
    codigo: string;
    nombre: string;
    tipo: string | null;
    valorDisponible: number;
    vigencia: string | null;
    estado: string;
    createdById: number | null;
    aprobadoById: number | null;
  }>
) {
  const codigo = overrides?.codigo ?? unico("FUENTE");
  return testPrisma.fuenteFinanciacion.create({
    data: {
      codigo,
      nombre: overrides?.nombre ?? `Fuente de test ${codigo}`,
      tipo: overrides?.tipo ?? "Municipio",
      valorDisponible: overrides?.valorDisponible ?? 1_000_000,
      vigencia: overrides?.vigencia ?? "2026",
      estado: overrides?.estado ?? "Aprobada",
      createdById: overrides?.createdById ?? null,
      aprobadoById: overrides?.aprobadoById ?? null,
    },
  });
}

/**
 * Crea un Rubro de test. Si no se pasa `fuenteId`, crea una Fuente de test Aprobada.
 * Por defecto queda en estado "Registrado" (pendiente de aprobación, como al crearlo
 * desde crearRubro()).
 */
export async function createTestRubro(
  overrides?: Partial<{
    codigo: string;
    nombre: string;
    fuenteId: number;
    valorAsignado: number;
    vigencia: string | null;
    estado: string;
    createdById: number | null;
    aprobadoById: number | null;
  }>
) {
  const fuenteId = overrides?.fuenteId ?? (await createTestFuente()).id;
  const codigo = overrides?.codigo ?? unico("RUBRO");
  return testPrisma.rubro.create({
    data: {
      codigo,
      nombre: overrides?.nombre ?? `Rubro de test ${codigo}`,
      fuenteId,
      valorAsignado: overrides?.valorAsignado ?? 100_000,
      vigencia: overrides?.vigencia ?? "2026",
      estado: overrides?.estado ?? "Registrado",
      createdById: overrides?.createdById ?? null,
      aprobadoById: overrides?.aprobadoById ?? null,
    },
  });
}

// ---------------------------------------------------------------------------
// MOD-015 Comité de control — Acta (ejemplo RN-025 en src/actions/comite.ts)
// ---------------------------------------------------------------------------

/**
 * Crea una ActaComite de test. Por defecto queda en estado "Registrada" (pendiente de
 * aprobación, como al crearla desde crearActa()).
 */
export async function createTestActa(
  overrides?: Partial<{
    tema: string;
    decision: string | null;
    estado: string;
    motivoRechazo: string | null;
    createdById: number | null;
    aprobadoById: number | null;
  }>
) {
  return testPrisma.actaComite.create({
    data: {
      tema: overrides?.tema ?? `Acta de test ${unico("ACTA")}`,
      decision: overrides?.decision ?? null,
      estado: overrides?.estado ?? "Registrada",
      motivoRechazo: overrides?.motivoRechazo ?? null,
      createdById: overrides?.createdById ?? null,
      aprobadoById: overrides?.aprobadoById ?? null,
    },
  });
}

// ---------------------------------------------------------------------------
// MOD-010 Contratos / MOD-003 Financiera — Tercero, Contrato, Informe, CuentaCobro, Pago
// (cadena completa RN-005/RN-006/RN-007 -> RN-008/RN-009/RN-025 de src/actions/financiera.ts)
// ---------------------------------------------------------------------------

/** Crea un Tercero de test (contraparte de un Contrato). `documento` debe ser único. */
export async function createTestTercero(
  overrides?: Partial<{ documento: string; razonSocial: string; tipo: string; estado: string }>
) {
  const documento = overrides?.documento ?? unico("DOC-TERCERO");
  return testPrisma.tercero.create({
    data: {
      documento,
      razonSocial: overrides?.razonSocial ?? `Tercero de test ${documento}`,
      tipo: overrides?.tipo ?? "ESAL",
      estado: overrides?.estado ?? "Activo",
    },
  });
}

/**
 * Crea un Contrato de test. Si no se pasa `terceroId`, crea un Tercero de test.
 * Por defecto queda "Aprobado" (requisito RN-005 de CuentaCobro: crearCuenta exige un
 * contrato Aprobado).
 */
export async function createTestContrato(
  overrides?: Partial<{
    numero: string;
    objeto: string;
    terceroId: number;
    valorTotal: number;
    estado: string;
    createdById: number | null;
    aprobadoById: number | null;
  }>
) {
  const terceroId = overrides?.terceroId ?? (await createTestTercero()).id;
  const numero = overrides?.numero ?? unico("CONTRATO");
  return testPrisma.contrato.create({
    data: {
      numero,
      objeto: overrides?.objeto ?? `Objeto de contrato de test ${numero}`,
      terceroId,
      valorTotal: overrides?.valorTotal ?? 100_000,
      estado: overrides?.estado ?? "Aprobado",
      createdById: overrides?.createdById ?? null,
      aprobadoById: overrides?.aprobadoById ?? null,
    },
  });
}

/**
 * Crea un Informe de test. Si no se pasa `contratoId`, crea un Contrato de test Aprobado.
 * Por defecto queda "Aprobado" (requisito RN-006 de CuentaCobro cuando se referencia un
 * informe: crearCuenta exige que, de indicarse, el informe esté Aprobado).
 */
export async function createTestInforme(
  overrides?: Partial<{
    contratoId: number;
    periodo: string;
    estado: string;
    createdById: number | null;
  }>
) {
  const contratoId = overrides?.contratoId ?? (await createTestContrato()).id;
  return testPrisma.informe.create({
    data: {
      contratoId,
      periodo: overrides?.periodo ?? "2026-01",
      estado: overrides?.estado ?? "Aprobado",
      createdById: overrides?.createdById ?? null,
    },
  });
}

/**
 * Crea una CuentaCobro de test directamente en BD (sin pasar por la Server Action
 * crearCuenta, para tests que solo necesitan un estado de partida ya armado, p. ej.
 * probar aprobarCuenta/rechazarCuenta de forma aislada). Si no se pasan `contratoId` /
 * `rubroId`, crea un Contrato Aprobado y un Rubro Aprobado respectivamente. Por defecto
 * queda "Registrada" (pendiente de aprobación, como al crearla desde crearCuenta()).
 */
export async function createTestCuentaCobro(
  overrides?: Partial<{
    contratoId: number;
    rubroId: number;
    informeId: number | null;
    periodo: string;
    valorCobrado: number;
    valorAprobado: number | null;
    estado: string;
    createdById: number | null;
    aprobadoById: number | null;
  }>
) {
  const contratoId = overrides?.contratoId ?? (await createTestContrato()).id;
  const rubroId = overrides?.rubroId ?? (await createTestRubro({ estado: "Aprobado" })).id;
  return testPrisma.cuentaCobro.create({
    data: {
      contratoId,
      rubroId,
      informeId: overrides?.informeId ?? null,
      periodo: overrides?.periodo ?? "2026-01",
      valorCobrado: overrides?.valorCobrado ?? 50_000,
      valorAprobado: overrides?.valorAprobado ?? null,
      estado: overrides?.estado ?? "Registrada",
      createdById: overrides?.createdById ?? null,
      aprobadoById: overrides?.aprobadoById ?? null,
    },
  });
}

// ---------------------------------------------------------------------------
// MOD-011 Seguimiento — Beneficiario / Seguimiento (RN-025 en src/actions/seguimiento.ts)
// ---------------------------------------------------------------------------

/** Crea un Beneficiario de test. Solo `documento` (único) y `nombre` son obligatorios. */
export async function createTestBeneficiario(
  overrides?: Partial<{ documento: string; nombre: string; programa: string | null; estado: string }>
) {
  const documento = overrides?.documento ?? unico("DOC-BENEF");
  return testPrisma.beneficiario.create({
    data: {
      documento,
      nombre: overrides?.nombre ?? `Beneficiario de test ${documento}`,
      programa: overrides?.programa ?? null,
      estado: overrides?.estado ?? "Activo",
    },
  });
}

/**
 * Crea un Seguimiento de test directamente en BD (sin pasar por la Server Action
 * crearSeguimiento, para tests que solo necesitan un estado de partida ya armado, p. ej.
 * probar aprobarSeguimiento/rechazarSeguimiento/cerrarSeguimiento de forma aislada). Si no
 * se pasa `beneficiarioId`, crea un Beneficiario de test. Por defecto queda "Registrado"
 * (pendiente de revisión, como al crearlo desde crearSeguimiento()).
 */
export async function createTestSeguimiento(
  overrides?: Partial<{
    beneficiarioId: number;
    actividad: string;
    programa: string | null;
    estado: string;
    observacion: string | null;
    createdById: number | null;
  }>
) {
  const beneficiarioId = overrides?.beneficiarioId ?? (await createTestBeneficiario()).id;
  return testPrisma.seguimiento.create({
    data: {
      beneficiarioId,
      actividad: overrides?.actividad ?? `Actividad de test ${unico("SEG")}`,
      programa: overrides?.programa ?? null,
      observacion: overrides?.observacion ?? null,
      estado: overrides?.estado ?? "Registrado",
      createdById: overrides?.createdById ?? null,
    },
  });
}

// ---------------------------------------------------------------------------
// Limpieza
// ---------------------------------------------------------------------------

/**
 * Borra por id un conjunto de registros creados en un test, en el orden dado (pensado para
 * llamarse en un afterEach con los ids acumulados durante el test, en orden inverso de
 * dependencias FK: hijos antes que padres). Ignora silenciosamente "no encontrado" (P2025)
 * para que un cleanup parcial no reviente el resto del afterEach.
 *
 * Ejemplo:
 *   afterEach(() => cleanupByIds([
 *     { model: "rubro", id: rubro.id },
 *     { model: "fuenteFinanciacion", id: fuente.id },
 *     { model: "usuario", id: usuario.id },
 *     { model: "rol", id: rol.id },
 *   ]));
 */
type ModeloBorrable =
  | "rubro"
  | "fuenteFinanciacion"
  | "actaComite"
  | "usuario"
  | "rol"
  | "modulo"
  | "permiso"
  | "auditLog"
  | "pago"
  | "cuentaCobro"
  | "informe"
  | "contrato"
  | "tercero"
  | "seguimiento"
  | "beneficiario";

export async function cleanupByIds(registros: Array<{ model: ModeloBorrable; id: number }>) {
  // Intenta borrar TODOS los registros, incluso si alguno falla (p. ej. por una FK huérfana
  // que un test olvidó limpiar): un solo fallo a mitad de la lista no debe dejar sin borrar
  // los que vienen después, o el siguiente test hereda basura de este (unique constraints,
  // etc.). Los errores no ignorables se acumulan y se lanzan juntos al final.
  const errores: unknown[] = [];
  for (const { model, id } of registros) {
    try {
      // @ts-expect-error -- indexación dinámica del client de Prisma por nombre de modelo.
      await testPrisma[model].delete({ where: { id } });
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code;
      if (code !== "P2025") errores.push(err); // P2025 = "Record to delete does not exist" (ya borrado)
    }
  }
  if (errores.length > 0) {
    throw new AggregateError(errores, `cleanupByIds: fallaron ${errores.length} de ${registros.length} borrados.`);
  }
}
