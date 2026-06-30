import { prisma } from "@/lib/db";

export type Nivel = "E" | "A" | "L" | "C" | "NONE";
export type Accion = "ver" | "crear" | "editar" | "eliminar" | "aprobar";

/** Niveles que satisfacen cada acción (RN-015: los permisos de rol prevalecen). */
const REQUISITO: Record<Accion, Nivel[]> = {
  ver: ["E", "A", "L", "C"], // cualquier acceso distinto de NONE
  crear: ["E"],
  editar: ["E"],
  eliminar: ["E"], // la "eliminación" es baja lógica (RN-002)
  aprobar: ["A"], // SoD (RN-025): aprobar exige nivel Aprobación, distinto de quien registra (E)
};

/** Mapa codigo_modulo -> nivel para un rol. */
export async function getPermisos(rolNombre: string): Promise<Map<string, Nivel>> {
  const rol = await prisma.rol.findUnique({
    where: { nombre: rolNombre },
    include: { permisos: { include: { modulo: true } } },
  });
  const map = new Map<string, Nivel>();
  if (!rol) return map;
  for (const p of rol.permisos) map.set(p.modulo.codigo, p.nivel as Nivel);
  return map;
}

/** ¿Puede el rol ejecutar `accion` sobre `moduloCodigo`? */
export async function can(rolNombre: string, moduloCodigo: string, accion: Accion): Promise<boolean> {
  const permisos = await getPermisos(rolNombre);
  const nivel = permisos.get(moduloCodigo) ?? "NONE";
  return REQUISITO[accion].includes(nivel);
}

/** Comprueba en cliente/servidor a partir de un mapa ya cargado. */
export function puede(nivel: Nivel | undefined, accion: Accion): boolean {
  return REQUISITO[accion].includes(nivel ?? "NONE");
}

/** Módulos visibles para el rol (nivel != NONE), ordenados por código, para el sidebar. */
export async function getModulosVisibles(rolNombre: string) {
  const permisos = await getPermisos(rolNombre);
  const modulos = await prisma.modulo.findMany({ orderBy: { codigo: "asc" } });
  return modulos
    .map((m) => ({ ...m, nivel: (permisos.get(m.codigo) ?? "NONE") as Nivel }))
    .filter((m) => m.nivel !== "NONE");
}
