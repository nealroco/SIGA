import { prisma } from "@/lib/db";

export const MIN_MESES_PARA_TENDENCIA = 3;

export type PuntoMensual = { mes: string; count: number };

/**
 * Beneficiarios registrados por mes, últimos `mesesAtras` meses.
 * Se agrupa en JS (no Prisma groupBy ni $queryRaw): a este volumen de datos
 * truncar fechas a mes en SQL no aporta nada y sí agrega superficie de mantenimiento.
 */
export async function beneficiariosPorMes(mesesAtras = 6): Promise<PuntoMensual[]> {
  const desde = new Date();
  desde.setMonth(desde.getMonth() - (mesesAtras - 1));
  desde.setDate(1);
  desde.setHours(0, 0, 0, 0);

  const rows = await prisma.beneficiario.findMany({
    where: { createdAt: { gte: desde } },
    select: { createdAt: true },
  });

  const buckets = new Map<string, number>();
  for (let i = 0; i < mesesAtras; i++) {
    const d = new Date(desde);
    d.setMonth(d.getMonth() + i);
    buckets.set(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`, 0);
  }
  for (const r of rows) {
    const key = `${r.createdAt.getFullYear()}-${String(r.createdAt.getMonth() + 1).padStart(2, "0")}`;
    if (buckets.has(key)) buckets.set(key, (buckets.get(key) ?? 0) + 1);
  }
  return Array.from(buckets.entries()).map(([mes, count]) => ({ mes, count }));
}

/** RN de degradación honesta: sin al menos 3 meses con datos reales, no hay tendencia que mostrar. */
export function tieneTendenciaSuficiente(puntos: PuntoMensual[]): boolean {
  return puntos.filter((p) => p.count > 0).length >= MIN_MESES_PARA_TENDENCIA;
}
