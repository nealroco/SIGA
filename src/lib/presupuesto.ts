import { prisma } from "@/lib/db";

export type EjecucionRubro = {
  asignado: number;
  comprometido: number;
  ejecutado: number;
  libre: number;
  pctComprometido: number;
  pctEjecutado: number;
};

/**
 * Control de inversión por rubro: Asignado (meta) → Comprometido (cuentas Aprobadas/Pagadas,
 * aunque no se hayan pagado) → Ejecutado (pagos Aprobados, subconjunto de lo comprometido) → Libre.
 * Libre = Asignado − Comprometido (no se resta Ejecutado aparte: ya está dentro de Comprometido).
 */
function construirEjecucion(valorAsignado: number, comprometido: number, ejecutado: number): EjecucionRubro {
  const libre = valorAsignado - comprometido;
  return {
    asignado: valorAsignado,
    comprometido,
    ejecutado,
    libre,
    pctComprometido: valorAsignado > 0 ? Math.round((comprometido / valorAsignado) * 100) : 0,
    pctEjecutado: valorAsignado > 0 ? Math.round((ejecutado / valorAsignado) * 100) : 0,
  };
}

export async function calcularEjecucionRubro(rubroId: number, valorAsignado: number): Promise<EjecucionRubro> {
  const [comprometidoAgg, ejecutadoAgg] = await Promise.all([
    prisma.cuentaCobro.aggregate({
      where: { rubroId, estado: { in: ["Aprobada", "Pagada"] } },
      _sum: { valorAprobado: true, valorCobrado: true },
    }),
    prisma.pago.aggregate({
      where: { estado: "Aprobado", cuentaCobro: { rubroId } },
      _sum: { valorPagado: true },
    }),
  ]);
  const comprometido = comprometidoAgg._sum.valorAprobado ?? comprometidoAgg._sum.valorCobrado ?? 0;
  const ejecutado = ejecutadoAgg._sum.valorPagado ?? 0;
  return construirEjecucion(valorAsignado, comprometido, ejecutado);
}

/**
 * Igual que calcularEjecucionRubro pero para todos los rubros de una vez (evita N+1 en listados):
 * 2 queries agrupadas por rubroId en vez de 2 queries por cada rubro.
 */
export async function calcularEjecucionRubros(
  rubros: { id: number; valorAsignado: number }[]
): Promise<Map<number, EjecucionRubro>> {
  const ids = rubros.map((r) => r.id);
  const [comprometidoPorRubro, ejecutadoPorRubro] = await Promise.all([
    prisma.cuentaCobro.groupBy({
      by: ["rubroId"],
      where: { rubroId: { in: ids }, estado: { in: ["Aprobada", "Pagada"] } },
      _sum: { valorAprobado: true, valorCobrado: true },
    }),
    prisma.pago.groupBy({
      by: ["cuentaCobroId"],
      where: { estado: "Aprobado", cuentaCobro: { rubroId: { in: ids } } },
      _sum: { valorPagado: true },
    }),
  ]);

  // Los pagos se agrupan por cuentaCobroId; hace falta el rubroId de cada cuenta para acumular por rubro.
  const cuentaIds = ejecutadoPorRubro.map((p) => p.cuentaCobroId);
  const cuentasConRubro =
    cuentaIds.length > 0
      ? await prisma.cuentaCobro.findMany({
          where: { id: { in: cuentaIds } },
          select: { id: true, rubroId: true },
        })
      : [];
  const rubroIdPorCuenta = new Map(cuentasConRubro.map((c) => [c.id, c.rubroId]));

  const comprometidoMap = new Map<number, number>();
  for (const g of comprometidoPorRubro) {
    comprometidoMap.set(g.rubroId, g._sum.valorAprobado ?? g._sum.valorCobrado ?? 0);
  }
  const ejecutadoMap = new Map<number, number>();
  for (const g of ejecutadoPorRubro) {
    const rubroId = rubroIdPorCuenta.get(g.cuentaCobroId);
    if (rubroId == null) continue;
    ejecutadoMap.set(rubroId, (ejecutadoMap.get(rubroId) ?? 0) + (g._sum.valorPagado ?? 0));
  }

  const resultado = new Map<number, EjecucionRubro>();
  for (const r of rubros) {
    resultado.set(r.id, construirEjecucion(r.valorAsignado, comprometidoMap.get(r.id) ?? 0, ejecutadoMap.get(r.id) ?? 0));
  }
  return resultado;
}

/** Suma de comprometido de un rubro EXCLUYENDO una cuenta puntual (para revalidar al aprobarla). */
export async function comprometidoRubroExcluyendo(rubroId: number, cuentaIdExcluir: number): Promise<number> {
  const cuentas = await prisma.cuentaCobro.findMany({
    where: { rubroId, estado: { in: ["Aprobada", "Pagada"] }, id: { not: cuentaIdExcluir } },
    select: { valorAprobado: true, valorCobrado: true },
  });
  return cuentas.reduce((acc, c) => acc + (c.valorAprobado ?? c.valorCobrado ?? 0), 0);
}

export function semaforoEjecucion(pct: number): string {
  if (pct >= 90) return "ok";
  if (pct >= 70) return "A";
  return "L";
}
