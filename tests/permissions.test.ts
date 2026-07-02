// Prueba can() de src/lib/permissions.ts contra la matriz real de roles/permisos sembrada
// en la BD de test (tablas de catálogo Rol/Modulo/Permiso vía prisma/testFixtures.ts).
//
// No se reutiliza el seed completo (prisma/seed.ts, 9 roles x 29 módulos): es demasiado para
// lo que este archivo necesita verificar (la lógica de REQUISITO por nivel), así que cada
// caso crea su propio Rol + Módulo + Permiso mínimos con testFixtures y limpia en afterEach,
// siguiendo el mismo patrón que prisma/__tests__/testSetup.smoke.test.ts.
import { describe, it, expect, afterEach } from "vitest";
import { createTestRolConPermiso, cleanupByIds } from "../prisma/testFixtures";
import { can } from "@/lib/permissions";

describe("can() (src/lib/permissions.ts) contra la matriz rol/módulo/permiso real", () => {
  let rolId: number;
  let moduloId: number;

  afterEach(async () => {
    await cleanupByIds([
      { model: "modulo", id: moduloId },
      { model: "rol", id: rolId },
    ]);
  });

  it("un rol con nivel E puede 'crear' y 'editar' pero no 'aprobar'", async () => {
    const { rol, modulo } = await createTestRolConPermiso("E");
    rolId = rol.id;
    moduloId = modulo.id;

    await expect(can(rol.nombre, modulo.codigo, "crear")).resolves.toBe(true);
    await expect(can(rol.nombre, modulo.codigo, "editar")).resolves.toBe(true);
    await expect(can(rol.nombre, modulo.codigo, "aprobar")).resolves.toBe(false);
  });

  it("un rol con nivel A puede 'aprobar'", async () => {
    const { rol, modulo } = await createTestRolConPermiso("A");
    rolId = rol.id;
    moduloId = modulo.id;

    await expect(can(rol.nombre, modulo.codigo, "aprobar")).resolves.toBe(true);
  });

  it("un rol con nivel NONE no puede hacer nada, ni siquiera 'ver'", async () => {
    const { rol, modulo } = await createTestRolConPermiso("NONE");
    rolId = rol.id;
    moduloId = modulo.id;

    await expect(can(rol.nombre, modulo.codigo, "ver")).resolves.toBe(false);
    await expect(can(rol.nombre, modulo.codigo, "crear")).resolves.toBe(false);
    await expect(can(rol.nombre, modulo.codigo, "editar")).resolves.toBe(false);
    await expect(can(rol.nombre, modulo.codigo, "eliminar")).resolves.toBe(false);
    await expect(can(rol.nombre, modulo.codigo, "aprobar")).resolves.toBe(false);
    await expect(can(rol.nombre, modulo.codigo, "cargar")).resolves.toBe(false);
  });

  it("un módulo sin fila de permiso para el rol se comporta como nivel NONE (no 'ver')", async () => {
    // Cubre la rama `permisos.get(moduloCodigo) ?? "NONE"` de can(): un rol real con permiso
    // sobre OTRO módulo, pero sin ningún Permiso creado para el módulo consultado aquí.
    const { rol, modulo } = await createTestRolConPermiso("E");
    rolId = rol.id;
    moduloId = modulo.id;

    await expect(can(rol.nombre, "MOD-QUE-NO-EXISTE", "ver")).resolves.toBe(false);
  });
});
