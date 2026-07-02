// Test de humo: NO prueba lógica de negocio, solo confirma que la infraestructura de
// testing (globalSetup + .env.test + testFixtures + PrismaClient) funciona de punta a
// punta contra el schema MySQL de test. Sirve también de ejemplo mínimo del patrón a
// seguir: crear datos con los helpers de prisma/testFixtures.ts y limpiarlos en un
// afterEach con cleanupByIds (orden inverso de dependencias FK).
import { describe, it, expect, afterEach } from "vitest";
import {
  testPrisma,
  createTestRol,
  createTestModulo,
  createTestPermiso,
  createTestUser,
  createTestFuente,
  createTestRubro,
  cleanupByIds,
} from "../testFixtures";
import { can } from "@/lib/permissions";

describe("infraestructura de test (smoke)", () => {
  it("DATABASE_URL de .env.test apunta a un schema *_test", () => {
    expect(process.env.DATABASE_URL).toBeDefined();
    const schema = process.env.DATABASE_URL!.split("?")[0].split("/").pop();
    expect(schema).toMatch(/_test$/);
  });

  it("puede escribir y leer contra el schema de test vía Prisma", async () => {
    const rol = await createTestRol();
    expect(rol.id).toBeGreaterThan(0);

    const leido = await testPrisma.rol.findUnique({ where: { id: rol.id } });
    expect(leido?.nombre).toBe(rol.nombre);

    await cleanupByIds([{ model: "rol", id: rol.id }]);
    const borrado = await testPrisma.rol.findUnique({ where: { id: rol.id } });
    expect(borrado).toBeNull();
  });

  it("createTestUser + createTestRolConPermiso permiten ejercitar can() de src/lib/permissions.ts", async () => {
    const rol = await createTestRol();
    const modulo = await createTestModulo({ codigo: "MOD-TEST-SMOKE" });
    await createTestPermiso({ rolId: rol.id, moduloId: modulo.id, nivel: "E" });
    const usuario = await createTestUser(rol.id);

    await expect(can(rol.nombre, modulo.codigo, "crear")).resolves.toBe(true);
    await expect(can(rol.nombre, modulo.codigo, "aprobar")).resolves.toBe(false);

    await cleanupByIds([
      { model: "usuario", id: usuario.id },
      { model: "modulo", id: modulo.id },
      { model: "rol", id: rol.id },
    ]);
  });

  describe("RN-025 en Rubro (createTestFuente + createTestRubro)", () => {
    let fuenteId: number;
    let rubroId: number;

    afterEach(async () => {
      await cleanupByIds([
        { model: "rubro", id: rubroId },
        { model: "fuenteFinanciacion", id: fuenteId },
      ]);
    });

    it("un rubro nuevo queda 'Registrado' e imputado a una fuente 'Aprobada'", async () => {
      const fuente = await createTestFuente({ valorDisponible: 500_000 });
      fuenteId = fuente.id;
      expect(fuente.estado).toBe("Aprobada");

      const rubro = await createTestRubro({ fuenteId: fuente.id, valorAsignado: 100_000 });
      rubroId = rubro.id;

      expect(rubro.estado).toBe("Registrado");
      expect(rubro.fuenteId).toBe(fuente.id);
    });
  });
});
