import { prisma } from "@/lib/db";

export type Categoria = { categoria: string; count: number };
// `categoria` es string y las series son number — el índice acepta ambos porque TS exige que TODAS
// las propiedades (incluida `categoria`) calcen con el tipo del índice.
export type CrossTab = { categoria: string; [serie: string]: number | string };

const ACTIVO = { estado: "Activo" } as const;

function porCategoria<T extends { count: number }>(rows: T[], clave: (r: T) => string): Categoria[] {
  return rows
    .map((r) => ({ categoria: clave(r), count: r.count }))
    .sort((a, b) => b.count - a.count);
}

/** Pivota filas de un groupBy de 2 columnas al shape ancho que pide BarChartAgrupado — mismo
 *  patrón de fetch-then-reduce-en-JS ya usado en geo.ts (p. ej. `presenciaPorProgramaYTerritorio`). */
function pivotarAncho<T>(
  filas: T[],
  getX: (f: T) => string,
  getSerie: (f: T) => string,
  getCount: (f: T) => number
): { filas: CrossTab[]; series: string[] } {
  const porX = new Map<string, CrossTab>();
  const series = new Set<string>();
  for (const f of filas) {
    const x = getX(f);
    const serie = getSerie(f);
    series.add(serie);
    if (!porX.has(x)) porX.set(x, { categoria: x });
    const fila = porX.get(x)!;
    fila[serie] = (Number(fila[serie]) || 0) + getCount(f);
  }
  return { filas: Array.from(porX.values()), series: Array.from(series).sort() };
}

/** Orden numérico cuando la categoría es un grado ("2".."11"); las no-numéricas ("Sin dato") van al final. */
function ordenarPorGrado(filas: CrossTab[]): CrossTab[] {
  return filas.sort((a, b) => {
    const na = Number(a.categoria);
    const nb = Number(b.categoria);
    if (Number.isNaN(na) && Number.isNaN(nb)) return a.categoria.localeCompare(b.categoria);
    if (Number.isNaN(na)) return 1;
    if (Number.isNaN(nb)) return -1;
    return na - nb;
  });
}

// ===== Composición (8 dimensiones, groupBy de 1 columna — todas flat en Beneficiario) =====

export async function composicionPorEstrato(): Promise<Categoria[]> {
  const rows = await prisma.beneficiario.groupBy({ by: ["estrato"], _count: { _all: true }, where: ACTIVO });
  return porCategoria(
    rows.map((r) => ({ count: r._count._all, estrato: r.estrato })),
    (r) => (r.estrato == null ? "Sin dato" : `Estrato ${r.estrato}`)
  );
}

export async function composicionPorUbicacionVivienda(): Promise<Categoria[]> {
  const rows = await prisma.beneficiario.groupBy({ by: ["ubicacionDomicilio"], _count: { _all: true }, where: ACTIVO });
  return porCategoria(
    rows.map((r) => ({ count: r._count._all, valor: r.ubicacionDomicilio })),
    (r) => r.valor ?? "Sin dato"
  );
}

export async function composicionPorSexo(): Promise<Categoria[]> {
  const rows = await prisma.beneficiario.groupBy({ by: ["sexo"], _count: { _all: true }, where: ACTIVO });
  const etiqueta: Record<string, string> = { F: "Femenino", M: "Masculino", Otro: "Otro" };
  return porCategoria(
    rows.map((r) => ({ count: r._count._all, sexo: r.sexo })),
    (r) => (r.sexo ? etiqueta[r.sexo] ?? r.sexo : "Sin dato")
  );
}

export async function composicionPorDescolarizado(): Promise<Categoria[]> {
  const rows = await prisma.beneficiario.groupBy({ by: ["descolarizado"], _count: { _all: true }, where: ACTIVO });
  return porCategoria(
    rows.map((r) => ({ count: r._count._all, valor: r.descolarizado })),
    (r) => (r.valor ? "Sí" : "No")
  );
}

export async function composicionPorSistemaSalud(): Promise<Categoria[]> {
  const rows = await prisma.beneficiario.groupBy({ by: ["afiliacionSalud"], _count: { _all: true }, where: ACTIVO });
  return porCategoria(
    rows.map((r) => ({ count: r._count._all, valor: r.afiliacionSalud })),
    (r) => r.valor ?? "Sin dato"
  );
}

export async function composicionPorVictimaConflicto(): Promise<Categoria[]> {
  const rows = await prisma.beneficiario.groupBy({ by: ["victimaConflictoArmado"], _count: { _all: true }, where: ACTIVO });
  return porCategoria(
    rows.map((r) => ({ count: r._count._all, valor: r.victimaConflictoArmado })),
    (r) => (r.valor ? "Sí" : "No")
  );
}

export async function composicionPorTipoPoblacion(): Promise<Categoria[]> {
  const rows = await prisma.beneficiario.groupBy({ by: ["tipoPoblacion"], _count: { _all: true }, where: ACTIVO });
  return porCategoria(
    rows.map((r) => ({ count: r._count._all, valor: r.tipoPoblacion })),
    (r) => r.valor ?? "Sin dato"
  );
}

export async function composicionPorJornada(): Promise<Categoria[]> {
  const rows = await prisma.beneficiario.groupBy({ by: ["jornada"], _count: { _all: true }, where: ACTIVO });
  return porCategoria(
    rows.map((r) => ({ count: r._count._all, valor: r.jornada })),
    (r) => r.valor ?? "Sin dato"
  );
}

// ===== Cruces por grado (4 funciones, groupBy de 2 columnas + pivote en JS) =====

export async function gradoPorDescolarizado(): Promise<{ filas: CrossTab[]; series: string[] }> {
  const rows = await prisma.beneficiario.groupBy({
    by: ["grado", "descolarizado"],
    _count: { _all: true },
    where: { ...ACTIVO, grado: { not: null } },
  });
  const { filas, series } = pivotarAncho(
    rows,
    (r) => r.grado!,
    (r) => (r.descolarizado ? "Sí" : "No"),
    (r) => r._count._all
  );
  return { filas: ordenarPorGrado(filas), series };
}

export async function afiliacionSaludPorGrado(): Promise<{ filas: CrossTab[]; series: string[] }> {
  const rows = await prisma.beneficiario.groupBy({
    by: ["grado", "afiliacionSalud"],
    _count: { _all: true },
    where: { ...ACTIVO, grado: { not: null } },
  });
  const { filas, series } = pivotarAncho(
    rows,
    (r) => r.grado!,
    (r) => r.afiliacionSalud ?? "Sin dato",
    (r) => r._count._all
  );
  return { filas: ordenarPorGrado(filas), series };
}

export async function complementoAlimentarioPorGrado(): Promise<{ filas: CrossTab[]; series: string[] }> {
  const rows = await prisma.beneficiario.groupBy({
    by: ["grado", "tipoComplementoAlimentario"],
    _count: { _all: true },
    where: { ...ACTIVO, grado: { not: null } },
  });
  const { filas, series } = pivotarAncho(
    rows,
    (r) => r.grado!,
    (r) => r.tipoComplementoAlimentario ?? "Sin dato",
    (r) => r._count._all
  );
  return { filas: ordenarPorGrado(filas), series };
}

export async function medioTransportePorGrado(): Promise<{ filas: CrossTab[]; series: string[] }> {
  const rows = await prisma.beneficiario.groupBy({
    by: ["grado", "medioTransporte"],
    _count: { _all: true },
    where: { ...ACTIVO, grado: { not: null } },
  });
  const { filas, series } = pivotarAncho(
    rows,
    (r) => r.grado!,
    (r) => r.medioTransporte ?? "Sin dato",
    (r) => r._count._all
  );
  return { filas: ordenarPorGrado(filas), series };
}

// ===== Geográfico (join real vía territorio, mismo patrón que `inversionPorTerritorio` en geo.ts) =====

/** Suma beneficiarios activos por departamento — varios territorios del mismo departamento se agregan
 *  en una sola barra (p. ej. los 6 territorios de Cundinamarca). Sin territorio asignado no cuenta. */
export async function beneficiariosPorDepartamento(): Promise<Categoria[]> {
  const [grupos, territorios] = await Promise.all([
    prisma.beneficiario.groupBy({
      by: ["territorioId"],
      _count: { _all: true },
      where: { ...ACTIVO, territorioId: { not: null } },
    }),
    prisma.territorio.findMany({ select: { id: true, departamento: true } }),
  ]);
  const deptoPorId = new Map(territorios.map((t) => [t.id, t.departamento]));
  const totales = new Map<string, number>();
  for (const g of grupos) {
    if (g.territorioId == null) continue;
    const depto = deptoPorId.get(g.territorioId);
    if (!depto) continue;
    totales.set(depto, (totales.get(depto) ?? 0) + g._count._all);
  }
  return Array.from(totales.entries())
    .map(([categoria, count]) => ({ categoria, count }))
    .sort((a, b) => b.count - a.count);
}
