// Prueba el self-block RN-025 (segregación de funciones) en src/actions/comite.ts (MOD-015):
// quien registra un ActaComite nunca puede aprobarla ni rechazarla, aunque su rol tenga
// nivel Aprobación (A). rechazarActa se corrigió en la auditoría previa para tener este
// mismo bloqueo que ya tenía aprobarActa — este test confirma que AMBAS lo tienen.
//
// Mismo patrón de auth/redirect que tests/seguimiento.test.ts: se mockea "@/auth" y se
// espera el throw NEXT_REDIRECT como señal de éxito en los caminos que redirigen.
import { describe, it, expect, vi, afterEach } from "vitest";
import { testPrisma, createTestRolConPermiso, createTestUser, cleanupByIds } from "../prisma/testFixtures";

const mockAuth = vi.fn();
vi.mock("@/auth", () => ({ auth: () => mockAuth() }));

import { aprobarActa, rechazarActa } from "@/actions/comite";

function sesionDe(usuario: { id: number; rol: { nombre: string } }) {
  return { user: { id: String(usuario.id), rol: usuario.rol.nombre, rolId: 0 } };
}

function fdCon(campos: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [k, v] of Object.entries(campos)) fd.set(k, v);
  return fd;
}

describe("self-block RN-025 en src/actions/comite.ts (MOD-015)", () => {
  let rolId: number;
  let moduloId: number;
  let registradorId: number;
  let actaId: number | undefined;

  afterEach(async () => {
    vi.clearAllMocks();
    // Permiso no tiene cascade hacia Modulo: sin borrar esto primero, cleanupByIds no puede
    // borrar el modulo (FK), queda huérfano con el mismo `codigo`, y el siguiente test choca
    // con el unique constraint al crear un módulo nuevo con ese mismo código.
    await testPrisma.permiso.deleteMany({ where: { moduloId } });
    const registros: Array<{ model: "actaComite" | "usuario" | "modulo" | "rol"; id: number }> = [];
    if (actaId) registros.push({ model: "actaComite", id: actaId });
    registros.push({ model: "usuario", id: registradorId }, { model: "modulo", id: moduloId }, { model: "rol", id: rolId });
    await cleanupByIds(registros);
    actaId = undefined;
  });

  /** Rol con nivel A en MOD-015 (Aprobación) + un usuario que registra su propia acta. */
  async function prepararEscenario() {
    const { rol, modulo } = await createTestRolConPermiso("A", { moduloCodigo: "MOD-015" });
    rolId = rol.id;
    moduloId = modulo.id;

    const registrador = await createTestUser(rolId, { correo: `${Date.now()}-registrador@test.siga.local` });
    registradorId = registrador.id;

    const acta = await testPrisma.actaComite.create({
      data: { tema: "Revisión de avance de test", estado: "Registrada", createdById: registrador.id },
    });
    actaId = acta.id;

    return { registrador, acta };
  }

  it("aprobarActa lanza el error de segregación de funciones si el mismo usuario que registró intenta aprobar", async () => {
    const { registrador, acta } = await prepararEscenario();
    mockAuth.mockResolvedValue(sesionDe(registrador));

    await expect(aprobarActa(fdCon({ id: String(acta.id) }))).rejects.toThrow(
      "Segregación de funciones (RN-025): no puedes aprobar un acta que tú registraste."
    );

    const trasIntento = await testPrisma.actaComite.findUniqueOrThrow({ where: { id: acta.id } });
    expect(trasIntento.estado).toBe("Registrada");
  });

  it("rechazarActa lanza el error de segregación de funciones si el mismo usuario que registró intenta rechazar", async () => {
    const { registrador, acta } = await prepararEscenario();
    mockAuth.mockResolvedValue(sesionDe(registrador));

    await expect(rechazarActa(fdCon({ id: String(acta.id), motivo: "No aplica" }))).rejects.toThrow(
      "Segregación de funciones (RN-025): no puedes rechazar un acta que tú registraste."
    );

    const trasIntento = await testPrisma.actaComite.findUniqueOrThrow({ where: { id: acta.id } });
    expect(trasIntento.estado).toBe("Registrada");
  });
});
