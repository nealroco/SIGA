// Prueba la cadena completa de src/actions/financiera.ts (MOD-003 Financiera):
//   crearCuenta -> aprobarCuenta -> ordenarPago -> aprobarPago
// verificando el estado final en BD después de cada paso, más el self-block RN-025
// (segregación de funciones: quien registra/ordena no puede aprobar/rechazar lo propio)
// en aprobarCuenta y rechazarCuenta.
//
// Patrón de auth: las Server Actions llaman `auth()` de "@/auth" para obtener la sesión.
// Se mockea el módulo completo con vi.mock y se controla qué usuario "está logueado" en
// cada llamada con mockResolvedValueOnce.
//
// Patrón de redirect: crearCuenta/aprobarCuenta/ordenarPago/aprobarPago llaman
// redirect(...) de "next/navigation" incondicionalmente tras un éxito. redirect() real
// (sin mockear) lanza un Error cuyo `.digest` empieza con "NEXT_REDIRECT" — se captura esa
// throw como señal de éxito y el estado real se verifica leyendo la BD directamente
// después, en vez de intentar interpretar el valor de retorno (las acciones que redirigen
// son `Promise<void>` y nunca retornan normalmente en el camino feliz).
//
// `revalidatePath()` (llamado justo antes de redirect() en cada camino de éxito) SÍ
// necesita un "static generation store" real de Next.js que no existe al invocar la
// Server Action directamente desde un test — sin mockearlo, lanza "Invariant: static
// generation store missing" antes de llegar siquiera a redirect(). Se mockea como no-op.
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
import {
  testPrisma,
  createTestRol,
  createTestRolConPermiso,
  createTestPermiso,
  createTestUser,
  createTestContrato,
  createTestInforme,
  createTestRubro,
  cleanupByIds,
} from "../prisma/testFixtures";
import { auth } from "@/auth";
import type { Session } from "next-auth";

vi.mock("@/auth", () => ({ auth: vi.fn() }));

// `auth` está sobrecargado (puede invocarse como middleware o como función simple sin
// argumentos que devuelve la sesión); las Server Actions de financiera.ts solo usan la
// segunda forma. Se castea el mock a esa forma para no pelear con el overload equivocado.
const mockedAuth = auth as unknown as { mockReset: () => void; mockResolvedValueOnce: (v: Session) => void };

/** Arma el objeto sesión mínimo que las Server Actions de financiera.ts leen de auth(). */
function sesionDe(usuario: { id: number; rol: { nombre: string } }): Session {
  return { user: { id: String(usuario.id), rol: usuario.rol.nombre, rolId: 0 } } as Session;
}

/** redirect() real de Next lanza un Error con digest "NEXT_REDIRECT;..." en el camino feliz. */
function esRedirect(err: unknown): boolean {
  return typeof err === "object" && err !== null && "digest" in err && String((err as { digest?: unknown }).digest).startsWith("NEXT_REDIRECT");
}

async function esperarRedirect(promesa: Promise<unknown>) {
  try {
    await promesa;
    throw new Error("Se esperaba que la acción redirigiera (lanzara NEXT_REDIRECT) pero no lanzó nada.");
  } catch (err) {
    if (!esRedirect(err)) throw err;
  }
}

describe("cadena financiera.ts: crearCuenta -> aprobarCuenta -> ordenarPago -> aprobarPago", () => {
  // ids acumulados por test para el afterEach — se resetean en beforeEach.
  let rolFinancieraId: number;
  let rolAdminId: number;
  let moduloId: number;
  let financieraId: number;
  let adminId: number;
  let contratoId: number;
  let informeId: number;
  let rubroId: number;
  let fuenteId: number;
  let terceroId: number;
  let cuentaCobroId: number | undefined;
  let pagoId: number | undefined;

  beforeEach(() => {
    mockedAuth.mockReset();
    cuentaCobroId = undefined;
    pagoId = undefined;
  });

  afterEach(async () => {
    // Notificacion/AuditLog referencian usuarioId/createdById con FK sin cascade: se
    // limpian explícitamente antes de borrar los usuarios para no romper el afterEach.
    await testPrisma.notificacion.deleteMany({ where: { createdById: { in: [financieraId, adminId] } } });
    await testPrisma.auditLog.deleteMany({ where: { usuarioId: { in: [financieraId, adminId] } } });
    if (pagoId) await testPrisma.pago.delete({ where: { id: pagoId } }).catch(() => {});
    if (cuentaCobroId) await testPrisma.cuentaCobro.delete({ where: { id: cuentaCobroId } }).catch(() => {});
    // Permiso no tiene cascade hacia Modulo: sin borrar esto primero, cleanupByIds no puede
    // borrar el modulo (FK), queda huérfano con el mismo `codigo`, y el siguiente test choca
    // con el unique constraint al crear un módulo nuevo con ese mismo código.
    await testPrisma.permiso.deleteMany({ where: { moduloId } });
    await cleanupByIds([
      { model: "rubro", id: rubroId },
      { model: "fuenteFinanciacion", id: fuenteId },
      { model: "informe", id: informeId },
      { model: "contrato", id: contratoId },
      { model: "tercero", id: terceroId },
      { model: "usuario", id: financieraId },
      { model: "usuario", id: adminId },
      { model: "modulo", id: moduloId },
      { model: "rol", id: rolFinancieraId },
      { model: "rol", id: rolAdminId },
    ]);
  });

  /** Arma el fixture común: contrato Aprobado + informe Aprobado + rubro Aprobado, y dos
   *  usuarios (Financiera con nivel E, Administrador con nivel A) en el mismo MOD-003. */
  async function armarEscenario(opts?: { valorAsignadoRubro?: number }) {
    const { rol: rolFinanciera, modulo } = await createTestRolConPermiso("E", { moduloCodigo: "MOD-003" });
    rolFinancieraId = rolFinanciera.id;
    moduloId = modulo.id;

    const rolAdmin = await createTestRol();
    rolAdminId = rolAdmin.id;
    await createTestPermiso({ rolId: rolAdmin.id, moduloId: modulo.id, nivel: "A" });

    const financiera = await createTestUser(rolFinancieraId, { nombre: "Financiera Test" });
    financieraId = financiera.id;
    const admin = await createTestUser(rolAdminId, { nombre: "Administrador Test" });
    adminId = admin.id;

    const contrato = await createTestContrato({ estado: "Aprobado" });
    contratoId = contrato.id;
    const informe = await createTestInforme({ contratoId: contrato.id, estado: "Aprobado" });
    informeId = informe.id;
    const rubro = await createTestRubro({ estado: "Aprobado", valorAsignado: opts?.valorAsignadoRubro ?? 100_000 });
    rubroId = rubro.id;
    fuenteId = rubro.fuenteId;
    terceroId = contrato.terceroId;

    return { financiera, admin, contrato, informe, rubro };
  }

  function fdCrearCuenta(input: { contratoId: number; rubroId: number; informeId: number; periodo: string; valorCobrado: number }) {
    const fd = new FormData();
    fd.set("contratoId", String(input.contratoId));
    fd.set("rubroId", String(input.rubroId));
    fd.set("informeId", String(input.informeId));
    fd.set("periodo", input.periodo);
    fd.set("valorCobrado", String(input.valorCobrado));
    return fd;
  }

  it("recorre Registrada -> Aprobada -> Ordenado -> Pagada/Aprobado con el estado final correcto en cada paso", async () => {
    const { financiera, admin } = await armarEscenario({ valorAsignadoRubro: 100_000 });
    const { crearCuenta, aprobarCuenta, ordenarPago, aprobarPago } = await import("@/actions/financiera");

    // 1) crearCuenta — requiere contrato Aprobado + informe Aprobado + rubro con cupo (RN-005/006/007).
    mockedAuth.mockResolvedValueOnce(sesionDe(financiera));
    await esperarRedirect(
      crearCuenta({}, fdCrearCuenta({ contratoId, rubroId, informeId, periodo: "2026-01", valorCobrado: 40_000 }))
    );

    const cuentaCreada = await testPrisma.cuentaCobro.findFirstOrThrow({ where: { contratoId, rubroId, periodo: "2026-01" } });
    cuentaCobroId = cuentaCreada.id;
    expect(cuentaCreada.estado).toBe("Registrada");
    expect(cuentaCreada.createdById).toBe(financiera.id);
    expect(cuentaCreada.valorCobrado).toBe(40_000);

    // 2) aprobarCuenta — un usuario distinto (Administrador, nivel A) aprueba.
    const fdAprobarCuenta = new FormData();
    fdAprobarCuenta.set("id", String(cuentaCobroId));
    mockedAuth.mockResolvedValueOnce(sesionDe(admin));
    await esperarRedirect(aprobarCuenta(fdAprobarCuenta));

    const cuentaAprobada = await testPrisma.cuentaCobro.findUniqueOrThrow({ where: { id: cuentaCobroId } });
    expect(cuentaAprobada.estado).toBe("Aprobada");
    expect(cuentaAprobada.valorAprobado).toBe(40_000);
    expect(cuentaAprobada.aprobadoById).toBe(admin.id);

    // 3) ordenarPago — Financiera ordena un pago contra la cuenta ya Aprobada (RN-008/009).
    const fdOrdenarPago = new FormData();
    fdOrdenarPago.set("cuentaCobroId", String(cuentaCobroId));
    fdOrdenarPago.set("valorPagado", "40000");
    fdOrdenarPago.set("medioPago", "Orden bancaria");
    mockedAuth.mockResolvedValueOnce(sesionDe(financiera));
    await esperarRedirect(ordenarPago(fdOrdenarPago));

    const pagoOrdenado = await testPrisma.pago.findFirstOrThrow({ where: { cuentaCobroId } });
    pagoId = pagoOrdenado.id;
    expect(pagoOrdenado.estado).toBe("Ordenado");
    expect(pagoOrdenado.createdById).toBe(financiera.id);
    expect(pagoOrdenado.valorPagado).toBe(40_000);

    // La cuenta sigue "Aprobada" mientras el pago solo está "Ordenado" (aún no aprobado).
    const cuentaTrasOrdenar = await testPrisma.cuentaCobro.findUniqueOrThrow({ where: { id: cuentaCobroId } });
    expect(cuentaTrasOrdenar.estado).toBe("Aprobada");

    // 4) aprobarPago — Administrador aprueba la orden; al cubrir el 100% del valor aprobado
    // de la cuenta, la cuenta pasa a "Pagada" (efecto colateral documentado en aprobarPago()).
    const fdAprobarPago = new FormData();
    fdAprobarPago.set("id", String(pagoId));
    mockedAuth.mockResolvedValueOnce(sesionDe(admin));
    await esperarRedirect(aprobarPago(fdAprobarPago));

    const pagoAprobado = await testPrisma.pago.findUniqueOrThrow({ where: { id: pagoId } });
    expect(pagoAprobado.estado).toBe("Aprobado");
    expect(pagoAprobado.aprobadoById).toBe(admin.id);

    const cuentaFinal = await testPrisma.cuentaCobro.findUniqueOrThrow({ where: { id: cuentaCobroId } });
    expect(cuentaFinal.estado).toBe("Pagada");
  });

  describe("self-block RN-025 (segregación de funciones)", () => {
    it("aprobarCuenta lanza el error de segregación de funciones si el mismo usuario que registró intenta aprobar", async () => {
      const { financiera } = await armarEscenario();
      const { crearCuenta, aprobarCuenta } = await import("@/actions/financiera");

      mockedAuth.mockResolvedValueOnce(sesionDe(financiera));
      await esperarRedirect(
        crearCuenta({}, fdCrearCuenta({ contratoId, rubroId, informeId, periodo: "2026-02", valorCobrado: 10_000 }))
      );
      const cuenta = await testPrisma.cuentaCobro.findFirstOrThrow({ where: { contratoId, rubroId, periodo: "2026-02" } });
      cuentaCobroId = cuenta.id;
      expect(cuenta.createdById).toBe(financiera.id);

      const fd = new FormData();
      fd.set("id", String(cuenta.id));
      // Nota: `financiera` no tiene nivel "A" en MOD-003 en este escenario (armarEscenario le
      // dio "E"), así que para aislar específicamente el chequeo RN-025 (y no el de can()) se
      // eleva ESE MISMO permiso a "A" — es un update, no un create nuevo: rolId+moduloId ya
      // tiene una fila (constraint @@unique([rolId, moduloId]) en Permiso).
      await testPrisma.permiso.update({ where: { rolId_moduloId: { rolId: rolFinancieraId, moduloId } }, data: { nivel: "A" } });

      mockedAuth.mockResolvedValueOnce(sesionDe(financiera));
      await expect(aprobarCuenta(fd)).rejects.toThrow("Segregación de funciones (RN-025): no puedes aprobar lo que tú registraste.");

      // El estado no debe haber cambiado: sigue "Registrada".
      const cuentaTrasIntento = await testPrisma.cuentaCobro.findUniqueOrThrow({ where: { id: cuenta.id } });
      expect(cuentaTrasIntento.estado).toBe("Registrada");
    });

    it("rechazarCuenta lanza el error de segregación de funciones si el mismo usuario que registró intenta rechazar", async () => {
      const { financiera } = await armarEscenario();
      const { crearCuenta, rechazarCuenta } = await import("@/actions/financiera");

      mockedAuth.mockResolvedValueOnce(sesionDe(financiera));
      await esperarRedirect(
        crearCuenta({}, fdCrearCuenta({ contratoId, rubroId, informeId, periodo: "2026-03", valorCobrado: 10_000 }))
      );
      const cuenta = await testPrisma.cuentaCobro.findFirstOrThrow({ where: { contratoId, rubroId, periodo: "2026-03" } });
      cuentaCobroId = cuenta.id;

      // Ídem: eleva el permiso ya existente de "E" a "A" (update, no create — ver nota en el
      // test de aprobarCuenta arriba).
      await testPrisma.permiso.update({ where: { rolId_moduloId: { rolId: rolFinancieraId, moduloId } }, data: { nivel: "A" } });

      const fd = new FormData();
      fd.set("id", String(cuenta.id));
      fd.set("motivo", "No aplica");
      mockedAuth.mockResolvedValueOnce(sesionDe(financiera));
      await expect(rechazarCuenta(fd)).rejects.toThrow("Segregación de funciones (RN-025): no puedes rechazar lo que tú registraste.");

      const cuentaTrasIntento = await testPrisma.cuentaCobro.findUniqueOrThrow({ where: { id: cuenta.id } });
      expect(cuentaTrasIntento.estado).toBe("Registrada");
    });
  });
});
