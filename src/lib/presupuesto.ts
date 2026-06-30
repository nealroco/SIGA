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
export async function calcularEjecucionRubro(rubroId: number, valorAsignado: number): Promise<EjecucionRubro> {
  const [cuentas, pagos] = await Promise.all([
    prisma.cuentaCobro.findMany({
      where: { rubroId, estado: { in: ["Aprobada", "Pagada"] } },
      select: { valorAprobado: true, valorCobrado: true },
    }),
    prisma.pago.findMany({
      where: { estado: "Aprobado", cuentaCobro: { rubroId } },
      select: { valorPagado: true },
    }),
  ]);
  const comprometido = cuentas.reduce((acc, c) => acc + (c.valorAprobado ?? c.valorCobrado ?? 0), 0);
  const ejecutado = pagos.reduce((acc, p) => acc + p.valorPagado, 0);
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
