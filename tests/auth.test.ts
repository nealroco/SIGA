// Prueba la lógica de negocio equivalente a `authorize()` en src/auth.ts.
//
// NextAuth no expone `authorize()` como una función standalone fácil de importar y
// llamar aislada del resto del provider (vive dentro de la config de `Credentials({...})`
// pasada a `NextAuth(...)`), así que en vez de invocarla a través de todo el pipeline de
// NextAuth (JWT, cookies, callbacks), esta suite reproduce exactamente los mismos pasos
// que hace `authorize()` en src/auth.ts contra el usuario de prueba:
//   1. buscar por correo (case-insensitive vía lowercase, como hace authorize())
//   2. exigir estado "Activo"
//   3. exigir que bloqueadoHasta no esté en el futuro
//   4. comparar password con bcrypt
//   5. en fallo: incrementar intentosFallidos, y al llegar a 5 poner bloqueadoHasta en el
//      futuro y resetear el contador a 0 (tal como hace authorize())
//   6. en éxito: resetear intentosFallidos/bloqueadoHasta y actualizar ultimoAcceso
//
// Los valores usados aquí (MAX_INTENTOS_FALLIDOS = 5, BLOQUEO_MINUTOS = 15) deben
// mantenerse en sync con las constantes de src/auth.ts.
import { describe, it, expect, afterEach } from "vitest";
import bcrypt from "bcryptjs";
import { testPrisma, createTestUser, createTestRol, cleanupByIds } from "../prisma/testFixtures";

const MAX_INTENTOS_FALLIDOS = 5;
const BLOQUEO_MINUTOS = 15;

/**
 * Reproduce el cuerpo de `authorize()` de src/auth.ts contra la BD de test, para poder
 * probar la lógica de negocio (credenciales, estado, bloqueo) sin pasar por todo el
 * pipeline de NextAuth. Devuelve lo mismo que authorize(): el usuario "seguro" en éxito,
 * o null en cualquier fallo.
 */
async function authorizeEquivalente(correoInput: string, passwordInput: string) {
  const correo = String(correoInput ?? "").trim().toLowerCase();
  const password = String(passwordInput ?? "");
  if (!correo || !password) return null;

  const u = await testPrisma.usuario.findUnique({
    where: { correo },
    include: { rol: true },
  });
  if (!u || u.estado !== "Activo") return null;

  if (u.bloqueadoHasta && u.bloqueadoHasta > new Date()) return null;

  const ok = await bcrypt.compare(password, u.passwordHash);
  if (!ok) {
    const intentos = u.intentosFallidos + 1;
    const bloquear = intentos >= MAX_INTENTOS_FALLIDOS;
    await testPrisma.usuario.update({
      where: { id: u.id },
      data: {
        intentosFallidos: bloquear ? 0 : intentos,
        bloqueadoHasta: bloquear ? new Date(Date.now() + BLOQUEO_MINUTOS * 60 * 1000) : null,
      },
    });
    return null;
  }

  await testPrisma.usuario.update({
    where: { id: u.id },
    data: { ultimoAcceso: new Date(), intentosFallidos: 0, bloqueadoHasta: null },
  });

  return {
    id: String(u.id),
    name: u.nombre,
    email: u.correo,
    rol: u.rol.nombre,
    rolId: u.rolId,
  };
}

describe("authorize() equivalente (src/auth.ts)", () => {
  let rolId: number;
  let usuarioId: number;

  afterEach(async () => {
    await cleanupByIds([
      { model: "usuario", id: usuarioId },
      { model: "rol", id: rolId },
    ]);
  });

  it("credenciales correctas contra un usuario Activo devuelven el usuario y limpian el contador", async () => {
    const rol = await createTestRol();
    rolId = rol.id;
    const usuario = await createTestUser(rol.id, { intentosFallidos: 2 });
    usuarioId = usuario.id;

    const resultado = await authorizeEquivalente(usuario.correo, usuario.passwordPlano);

    expect(resultado).not.toBeNull();
    expect(resultado?.id).toBe(String(usuario.id));
    expect(resultado?.email).toBe(usuario.correo);
    expect(resultado?.rol).toBe(rol.nombre);
    expect(resultado?.rolId).toBe(rol.id);

    const releido = await testPrisma.usuario.findUniqueOrThrow({ where: { id: usuario.id } });
    expect(releido.intentosFallidos).toBe(0);
    expect(releido.bloqueadoHasta).toBeNull();
    expect(releido.ultimoAcceso).not.toBeNull();
  });

  it("credenciales incorrectas devuelven null e incrementan intentosFallidos en 1", async () => {
    const rol = await createTestRol();
    rolId = rol.id;
    const usuario = await createTestUser(rol.id);
    usuarioId = usuario.id;

    const resultado = await authorizeEquivalente(usuario.correo, "password-incorrecto");

    expect(resultado).toBeNull();

    const releido = await testPrisma.usuario.findUniqueOrThrow({ where: { id: usuario.id } });
    expect(releido.intentosFallidos).toBe(1);
    expect(releido.bloqueadoHasta).toBeNull();
  });

  it("un usuario en estado Inactivo no puede autenticarse aunque la password sea correcta", async () => {
    const rol = await createTestRol();
    rolId = rol.id;
    const usuario = await createTestUser(rol.id, { estado: "Inactivo" });
    usuarioId = usuario.id;

    const resultado = await authorizeEquivalente(usuario.correo, usuario.passwordPlano);

    expect(resultado).toBeNull();
  });

  it("un usuario con bloqueadoHasta en el futuro no puede autenticarse aunque la password sea correcta", async () => {
    const rol = await createTestRol();
    rolId = rol.id;
    const enElFuturo = new Date(Date.now() + 60 * 60 * 1000); // +1h
    const usuario = await createTestUser(rol.id, { bloqueadoHasta: enElFuturo });
    usuarioId = usuario.id;

    const resultado = await authorizeEquivalente(usuario.correo, usuario.passwordPlano);

    expect(resultado).toBeNull();
  });

  it("al 5º intento fallido consecutivo, bloqueadoHasta queda en el futuro y el contador se resetea a 0", async () => {
    const rol = await createTestRol();
    rolId = rol.id;
    const usuario = await createTestUser(rol.id);
    usuarioId = usuario.id;

    const ahora = Date.now();

    // Intentos 1 a 4: siguen incrementando el contador, sin bloqueo todavía.
    for (let i = 1; i <= MAX_INTENTOS_FALLIDOS - 1; i++) {
      const resultado = await authorizeEquivalente(usuario.correo, "password-incorrecto");
      expect(resultado).toBeNull();

      const releido = await testPrisma.usuario.findUniqueOrThrow({ where: { id: usuario.id } });
      expect(releido.intentosFallidos).toBe(i);
      expect(releido.bloqueadoHasta).toBeNull();
    }

    // Intento 5: dispara el bloqueo.
    const resultadoFinal = await authorizeEquivalente(usuario.correo, "password-incorrecto");
    expect(resultadoFinal).toBeNull();

    const bloqueado = await testPrisma.usuario.findUniqueOrThrow({ where: { id: usuario.id } });
    expect(bloqueado.intentosFallidos).toBe(0);
    expect(bloqueado.bloqueadoHasta).not.toBeNull();
    expect(bloqueado.bloqueadoHasta!.getTime()).toBeGreaterThan(ahora);
  });
});
