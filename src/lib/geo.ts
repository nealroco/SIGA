import { prisma } from "@/lib/db";

export type PuntoGeo = { territorioId: number; municipio: string; lat: number; lng: number; valor: number };
export type EscenarioGeo = { id: number; nombre: string; tipo: string | null; capacidad: number | null; lat: number; lng: number };
export type PresenciaPrograma = { territorioId: number; municipio: string; lat: number; lng: number; programa: string; count: number };

async function territoriosConCoordenadas() {
  return prisma.territorio.findMany({
    where: { lat: { not: null }, lng: { not: null } },
    select: { id: true, municipio: true, zona: true, lat: true, lng: true },
  });
}

/** Beneficiarios activos por territorio — alimenta el mapa de calor de población. */
export async function beneficiariosPorTerritorio(): Promise<PuntoGeo[]> {
  const [grupos, territorios] = await Promise.all([
    prisma.beneficiario.groupBy({
      by: ["territorioId"],
      _count: { _all: true },
      where: { estado: "Activo", territorioId: { not: null } },
    }),
    territoriosConCoordenadas(),
  ]);
  const porId = new Map(territorios.map((t) => [t.id, t]));
  return grupos
    .map((g) => {
      const t = g.territorioId != null ? porId.get(g.territorioId) : undefined;
      if (!t) return null;
      return { territorioId: t.id, municipio: t.municipio, lat: t.lat!, lng: t.lng!, valor: g._count._all };
    })
    .filter((p): p is PuntoGeo => p != null);
}

/**
 * Inversión por territorio — RN de base por compromiso (mismo criterio que Financiera/Dashboard):
 * solo cuentas de cobro Aprobadas/Pagadas, atribuidas al municipio del contrato (Contrato.territorioId).
 * Contratos sin territorio asignado no aportan a este mapa (no se inventa una ubicación).
 */
export async function inversionPorTerritorio(): Promise<PuntoGeo[]> {
  const [cuentas, territorios] = await Promise.all([
    prisma.cuentaCobro.findMany({
      where: { estado: { in: ["Aprobada", "Pagada"] } },
      select: { valorAprobado: true, contrato: { select: { territorioId: true } } },
    }),
    territoriosConCoordenadas(),
  ]);
  const porId = new Map(territorios.map((t) => [t.id, t]));
  const totales = new Map<number, number>();
  for (const c of cuentas) {
    const tId = c.contrato.territorioId;
    if (tId == null) continue;
    totales.set(tId, (totales.get(tId) ?? 0) + (c.valorAprobado ?? 0));
  }
  return Array.from(totales.entries())
    .map(([territorioId, valor]) => {
      const t = porId.get(territorioId);
      if (!t) return null;
      return { territorioId, municipio: t.municipio, lat: t.lat!, lng: t.lng!, valor };
    })
    .filter((p): p is PuntoGeo => p != null);
}

/** Escenarios con coordenadas propias — presencia física de escenarios deportivos. */
export async function escenariosGeo(): Promise<EscenarioGeo[]> {
  const rows = await prisma.escenario.findMany({
    where: { lat: { not: null }, lng: { not: null }, estado: "Activo" },
    select: { id: true, nombre: true, tipo: true, capacidad: true, lat: true, lng: true },
  });
  return rows.map((r) => ({ ...r, lat: r.lat!, lng: r.lng! }));
}

/**
 * Beneficiarios activos por (territorio, programa) — alimenta la vista de presencia de
 * escuelas/programas deportivos, filtrable en el cliente por programa sin ida y vuelta al servidor.
 */
export async function presenciaPorProgramaYTerritorio(): Promise<PresenciaPrograma[]> {
  const [grupos, territorios] = await Promise.all([
    prisma.beneficiario.groupBy({
      by: ["territorioId", "programa"],
      _count: { _all: true },
      where: { estado: "Activo", territorioId: { not: null }, programa: { not: null } },
    }),
    territoriosConCoordenadas(),
  ]);
  const porId = new Map(territorios.map((t) => [t.id, t]));
  return grupos
    .map((g) => {
      const t = g.territorioId != null ? porId.get(g.territorioId) : undefined;
      if (!t || !g.programa) return null;
      return { territorioId: t.id, municipio: t.municipio, lat: t.lat!, lng: t.lng!, programa: g.programa, count: g._count._all };
    })
    .filter((p): p is PresenciaPrograma => p != null);
}
