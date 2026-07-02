// Prueba la máquina de estados completa de src/actions/seguimiento.ts (MOD-011):
//
//   crearSeguimiento     -> "Registrado"
//   aprobarSeguimiento   -> "Aprobado"   (bloquea RN-025: quien registró no puede aprobar)
//   rechazarSeguimiento  -> "Rechazado"  (exige motivo; bloquea RN-025 igual que aprobar)
//   cerrarSeguimiento    -> "Cerrado"    (solo si el estado actual es "Aprobado")
//
// `auth()` (src/auth.ts) depende de todo el pipeline de NextAuth (cookies/JWT), así que se
// mockea con vi.mock para devolver la sesión que cada test necesita, siguiendo el patrón ya
// usado en el resto del código de mockear solo el borde de infraestructura (auth), dejando
// que `can()` y Prisma corran de verdad contra la BD de test (mismo patrón que
// prisma/__tests__/testSetup.smoke.test.ts y tests/permissions.test.ts).
//
// Las Server Actions bajo prueba usan `redirect()` de next/navigation en sus caminos de
// "éxito" y de "no-op" (estado no elegible): en Next.js, redirect() SIEMPRE lanza una
// excepción especial con digest "NEXT_REDIRECT..." (incluso fuera de un request real), así
// que los casos que terminan en redirect se verifican esperando ese throw.
//
// `revalidatePath()` (llamado justo antes de redirect() en el camino de éxito) SÍ necesita
// un "static generation store" real de Next.js que no existe al invocar la Server Action
// directamente desde un test — sin mockearlo, lanza "Invariant: static generation store
// missing" antes de llegar siquiera a redirect(). Se mockea como no-op.
import { describe, it, expect, vi, afterEach } from "vitest";
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
import {
  testPrisma,
  createTestRol,
  createTestModulo,
  createTestPermiso,
  createTestUser,
  createTestBeneficiario,
  createTestSeguimiento,
  cleanupByIds,
} from "../prisma/testFixtures";

const mockAuth = vi.fn();
vi.mock("@/auth", () => ({
  auth: () => mockAuth(),
}));

import { crearSeguimiento, aprobarSeguimiento, rechazarSeguimiento, cerrarSeguimiento } from "@/actions/seguimiento";

const MOD = "MOD-011";

function sesionDe(usuario: { id: number; rol: { nombre: string } }) {
  return { user: { id: String(usuario.id), rol: usuario.rol.nombre, rolId: 0 } };
}

function fdCon(campos: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [k, v] of Object.entries(campos)) fd.set(k, v);
  return fd;
}

/** Las Server Actions bajo prueba llaman a redirect() en sus caminos de éxito/no-op, que
 *  siempre lanza. Esta aserción confirma que fue justo eso (y no un error real) lo que
 *  interrumpió la ejecución. */
async function expectRedirect(fn: () => Promise<unknown>) {
  try {
    await fn();
    throw new Error("Se esperaba que la acción redirigiera (lanzara NEXT_REDIRECT) pero no lanzó nada.");
  } catch (err: unknown) {
    const digest = (err as { digest?: string })?.digest;
    expect(digest).toMatch(/^NEXT_REDIRECT/);
  }
}

describe("máquina de estados de Seguimiento (src/actions/seguimiento.ts, MOD-011)", () => {
  let rolId: number;
  let moduloId: number;
  let registradorId: number;
  let revisorId: number;
  let beneficiarioId: number;
  let seguimientoId: number | undefined;

  afterEach(async () => {
    vi.clearAllMocks();
    // Permiso no tiene cascade hacia Modulo: sin borrar esto primero, cleanupByIds no puede
    // borrar el modulo (FK), queda huérfano con el mismo `codigo` (MOD-011), y el siguiente
    // test choca con el unique constraint al crear un módulo nuevo con ese mismo código.
    await testPrisma.permiso.deleteMany({ where: { moduloId } });
    const registros: Array<{ model: "seguimiento" | "beneficiario" | "usuario" | "modulo" | "rol"; id: number }> = [];
    if (seguimientoId) registros.push({ model: "seguimiento", id: seguimientoId });
    registros.push(
      { model: "beneficiario", id: beneficiarioId },
      { model: "usuario", id: registradorId },
      { model: "usuario", id: revisorId },
      { model: "modulo", id: moduloId },
      { model: "rol", id: rolId }
    );
    await cleanupByIds(registros);
    seguimientoId = undefined;
  });

  /** Arma rol con nivel E en MOD-011 + dos usuarios (registrador y revisor) + beneficiario. */
  async function prepararEscenario() {
    const rol = await createTestRol();
    rolId = rol.id;
    const modulo = await createTestModulo({ codigo: MOD });
    moduloId = modulo.id;
    await createTestPermiso({ rolId, moduloId, nivel: "E" });

    const registrador = await createTestUser(rolId, { correo: `${Date.now()}-registrador@test.siga.local` });
    registradorId = registrador.id;
    const revisor = await createTestUser(rolId, { correo: `${Date.now()}-revisor@test.siga.local` });
    revisorId = revisor.id;

    const beneficiario = await createTestBeneficiario();
    beneficiarioId = beneficiario.id;

    return { rol, registrador, revisor, beneficiario };
  }

  it("crearSeguimiento deja el registro en estado 'Registrado' asociado al beneficiario y a quien lo creó", async () => {
    const { registrador, beneficiario } = await prepararEscenario();
    mockAuth.mockResolvedValue(sesionDe(registrador));

    await expectRedirect(() =>
      crearSeguimiento(
        {},
        fdCon({ beneficiarioId: String(beneficiario.id), actividad: "Sesión de entrenamiento inicial" })
      )
    );

    const creado = await testPrisma.seguimiento.findFirst({
      where: { beneficiarioId: beneficiario.id, createdById: registrador.id },
      orderBy: { id: "desc" },
    });
    expect(creado).not.toBeNull();
    expect(creado!.estado).toBe("Registrado");
    expect(creado!.createdById).toBe(registrador.id);
    seguimientoId = creado!.id;
  });

  describe("aprobarSeguimiento", () => {
    it("pasa de 'Registrado' a 'Aprobado' cuando lo aprueba un usuario distinto de quien registró", async () => {
      const { registrador, revisor } = await prepararEscenario();
      const seguimiento = await createTestSeguimiento({ beneficiarioId, createdById: registrador.id });
      seguimientoId = seguimiento.id;

      mockAuth.mockResolvedValue(sesionDe(revisor));
      await expectRedirect(() => aprobarSeguimiento(fdCon({ id: String(seguimiento.id) })));

      const actualizado = await testPrisma.seguimiento.findUnique({ where: { id: seguimiento.id } });
      expect(actualizado?.estado).toBe("Aprobado");
    });

    it("RN-025: falla si el usuario que aprueba es el mismo que registró (self-block)", async () => {
      const { registrador } = await prepararEscenario();
      const seguimiento = await createTestSeguimiento({ beneficiarioId, createdById: registrador.id });
      seguimientoId = seguimiento.id;

      mockAuth.mockResolvedValue(sesionDe(registrador));
      await expect(aprobarSeguimiento(fdCon({ id: String(seguimiento.id) }))).rejects.toThrow(
        "Segregación de funciones (RN-025): no puedes aprobar un seguimiento que tú registraste."
      );

      const sinCambios = await testPrisma.seguimiento.findUnique({ where: { id: seguimiento.id } });
      expect(sinCambios?.estado).toBe("Registrado");
    });
  });

  describe("rechazarSeguimiento", () => {
    it("pasa de 'Registrado' a 'Rechazado' con motivo, cuando lo rechaza un usuario distinto de quien registró", async () => {
      const { registrador, revisor } = await prepararEscenario();
      const seguimiento = await createTestSeguimiento({ beneficiarioId, createdById: registrador.id });
      seguimientoId = seguimiento.id;

      mockAuth.mockResolvedValue(sesionDe(revisor));
      await expectRedirect(() =>
        rechazarSeguimiento(fdCon({ id: String(seguimiento.id), motivo: "Actividad no soportada con evidencia" }))
      );

      const actualizado = await testPrisma.seguimiento.findUnique({ where: { id: seguimiento.id } });
      expect(actualizado?.estado).toBe("Rechazado");
      expect(actualizado?.observacion).toBe("Actividad no soportada con evidencia");
    });

    it("exige motivo: falla si no se indica motivo de rechazo", async () => {
      const { registrador, revisor } = await prepararEscenario();
      const seguimiento = await createTestSeguimiento({ beneficiarioId, createdById: registrador.id });
      seguimientoId = seguimiento.id;

      mockAuth.mockResolvedValue(sesionDe(revisor));
      await expect(rechazarSeguimiento(fdCon({ id: String(seguimiento.id), motivo: "" }))).rejects.toThrow(
        "Debes indicar un motivo de rechazo."
      );

      const sinCambios = await testPrisma.seguimiento.findUnique({ where: { id: seguimiento.id } });
      expect(sinCambios?.estado).toBe("Registrado");
    });

    it("RN-025: falla si el usuario que rechaza es el mismo que registró (self-block)", async () => {
      const { registrador } = await prepararEscenario();
      const seguimiento = await createTestSeguimiento({ beneficiarioId, createdById: registrador.id });
      seguimientoId = seguimiento.id;

      mockAuth.mockResolvedValue(sesionDe(registrador));
      await expect(
        rechazarSeguimiento(fdCon({ id: String(seguimiento.id), motivo: "Cualquier motivo" }))
      ).rejects.toThrow("Segregación de funciones (RN-025): no puedes rechazar un seguimiento que tú registraste.");

      const sinCambios = await testPrisma.seguimiento.findUnique({ where: { id: seguimiento.id } });
      expect(sinCambios?.estado).toBe("Registrado");
    });
  });

  describe("cerrarSeguimiento", () => {
    it("pasa de 'Aprobado' a 'Cerrado'", async () => {
      const { revisor } = await prepararEscenario();
      const seguimiento = await createTestSeguimiento({ beneficiarioId, estado: "Aprobado" });
      seguimientoId = seguimiento.id;

      mockAuth.mockResolvedValue(sesionDe(revisor));
      await expectRedirect(() => cerrarSeguimiento(fdCon({ id: String(seguimiento.id) })));

      const actualizado = await testPrisma.seguimiento.findUnique({ where: { id: seguimiento.id } });
      expect(actualizado?.estado).toBe("Cerrado");
    });

    it("falla (no cierra) si el estado actual es 'Registrado'", async () => {
      const { revisor } = await prepararEscenario();
      const seguimiento = await createTestSeguimiento({ beneficiarioId, estado: "Registrado" });
      seguimientoId = seguimiento.id;

      mockAuth.mockResolvedValue(sesionDe(revisor));
      // El estado no es "Aprobado": la acción hace redirect() de no-op sin actualizar nada.
      await expectRedirect(() => cerrarSeguimiento(fdCon({ id: String(seguimiento.id) })));

      const sinCambios = await testPrisma.seguimiento.findUnique({ where: { id: seguimiento.id } });
      expect(sinCambios?.estado).toBe("Registrado");
    });

    it("falla (no cierra) si el estado actual es 'Rechazado'", async () => {
      const { revisor } = await prepararEscenario();
      const seguimiento = await createTestSeguimiento({ beneficiarioId, estado: "Rechazado" });
      seguimientoId = seguimiento.id;

      mockAuth.mockResolvedValue(sesionDe(revisor));
      await expectRedirect(() => cerrarSeguimiento(fdCon({ id: String(seguimiento.id) })));

      const sinCambios = await testPrisma.seguimiento.findUnique({ where: { id: seguimiento.id } });
      expect(sinCambios?.estado).toBe("Rechazado");
    });
  });
});
