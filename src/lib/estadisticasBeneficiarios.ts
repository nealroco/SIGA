import { prisma } from "@/lib/db";

export type Categoria = { categoria: string; count: number };
// `categoria` es string y las series son number — el índice acepta ambos porque TS exige que TODAS
// las propiedades (incluida `categoria`) calcen con el tipo del índice.
export type CrossTab = { categoria: string; [serie: string]: number | string };

/** Filtro opcional aplicado a todas las funciones de esta página — mismo objeto para las 13,
 *  resuelto una sola vez en la página (territorioIds ya viene resuelto desde `departamento`,
 *  ver `resolverTerritorioIds` más abajo, porque `departamento` vive en Territorio, no en Beneficiario). */
export type Filtro = { programa?: string; tipoPoblacion?: string; territorioIds?: number[] };

const ACTIVO = { estado: "Activo" } as const;

function filtrosOpcionales(filtro: Filtro) {
  return {
    ...(filtro.programa ? { programa: filtro.programa } : {}),
    ...(filtro.tipoPoblacion ? { tipoPoblacion: filtro.tipoPoblacion } : {}),
    ...(filtro.territorioIds ? { territorioId: { in: filtro.territorioIds } } : {}),
  };
}

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

/** Traduce `departamento` (seleccionado en el filtro) a los territorioId reales — `departamento`
 *  vive en Territorio, no en Beneficiario, así que no puede ir directo en un `where` de Beneficiario. */
export async function resolverTerritorioIds(departamento?: string): Promise<number[] | undefined> {
  if (!departamento) return undefined;
  const territorios = await prisma.territorio.findMany({ where: { departamento }, select: { id: true } });
  return territorios.map((t) => t.id);
}

/** Valores realmente presentes en datos activos — no se ofrecen opciones de filtro que darían
 *  una página vacía. */
export async function opcionesDeFiltro(): Promise<{ departamentos: string[]; tiposPoblacion: string[]; programas: string[] }> {
  const [territoriosConGente, tipos, programas] = await Promise.all([
    prisma.beneficiario.groupBy({ by: ["territorioId"], where: { ...ACTIVO, territorioId: { not: null } } }),
    prisma.beneficiario.groupBy({ by: ["tipoPoblacion"], where: { ...ACTIVO, tipoPoblacion: { not: null } } }),
    prisma.beneficiario.groupBy({ by: ["programa"], where: { ...ACTIVO, programa: { not: null } } }),
  ]);
  const ids = territoriosConGente.map((t) => t.territorioId).filter((id): id is number => id != null);
  const territorios = ids.length > 0 ? await prisma.territorio.findMany({ where: { id: { in: ids } }, select: { departamento: true } }) : [];
  return {
    departamentos: Array.from(new Set(territorios.map((t) => t.departamento))).sort(),
    tiposPoblacion: tipos.map((t) => t.tipoPoblacion!).sort(),
    programas: programas.map((p) => p.programa!).sort(),
  };
}

// ===== Composición (8 dimensiones, groupBy de 1 columna — todas flat en Beneficiario) =====

export async function composicionPorEstrato(filtro: Filtro = {}): Promise<Categoria[]> {
  const rows = await prisma.beneficiario.groupBy({
    by: ["estrato"],
    _count: { _all: true },
    where: { ...ACTIVO, ...filtrosOpcionales(filtro) },
  });
  return porCategoria(
    rows.map((r) => ({ count: r._count._all, estrato: r.estrato })),
    (r) => (r.estrato == null ? "Sin dato" : `Estrato ${r.estrato}`)
  );
}

export async function composicionPorUbicacionVivienda(filtro: Filtro = {}): Promise<Categoria[]> {
  const rows = await prisma.beneficiario.groupBy({
    by: ["ubicacionDomicilio"],
    _count: { _all: true },
    where: { ...ACTIVO, ...filtrosOpcionales(filtro) },
  });
  return porCategoria(
    rows.map((r) => ({ count: r._count._all, valor: r.ubicacionDomicilio })),
    (r) => r.valor ?? "Sin dato"
  );
}

export async function composicionPorSexo(filtro: Filtro = {}): Promise<Categoria[]> {
  const rows = await prisma.beneficiario.groupBy({
    by: ["sexo"],
    _count: { _all: true },
    where: { ...ACTIVO, ...filtrosOpcionales(filtro) },
  });
  const etiqueta: Record<string, string> = { F: "Femenino", M: "Masculino", Otro: "Otro" };
  return porCategoria(
    rows.map((r) => ({ count: r._count._all, sexo: r.sexo })),
    (r) => (r.sexo ? etiqueta[r.sexo] ?? r.sexo : "Sin dato")
  );
}

export async function composicionPorDescolarizado(filtro: Filtro = {}): Promise<Categoria[]> {
  const rows = await prisma.beneficiario.groupBy({
    by: ["descolarizado"],
    _count: { _all: true },
    where: { ...ACTIVO, ...filtrosOpcionales(filtro) },
  });
  return porCategoria(
    rows.map((r) => ({ count: r._count._all, valor: r.descolarizado })),
    (r) => (r.valor ? "Sí" : "No")
  );
}

export async function composicionPorSistemaSalud(filtro: Filtro = {}): Promise<Categoria[]> {
  const rows = await prisma.beneficiario.groupBy({
    by: ["afiliacionSalud"],
    _count: { _all: true },
    where: { ...ACTIVO, ...filtrosOpcionales(filtro) },
  });
  return porCategoria(
    rows.map((r) => ({ count: r._count._all, valor: r.afiliacionSalud })),
    (r) => r.valor ?? "Sin dato"
  );
}

export async function composicionPorVictimaConflicto(filtro: Filtro = {}): Promise<Categoria[]> {
  const rows = await prisma.beneficiario.groupBy({
    by: ["victimaConflictoArmado"],
    _count: { _all: true },
    where: { ...ACTIVO, ...filtrosOpcionales(filtro) },
  });
  return porCategoria(
    rows.map((r) => ({ count: r._count._all, valor: r.victimaConflictoArmado })),
    (r) => (r.valor ? "Sí" : "No")
  );
}

export async function composicionPorTipoPoblacion(filtro: Filtro = {}): Promise<Categoria[]> {
  const rows = await prisma.beneficiario.groupBy({
    by: ["tipoPoblacion"],
    _count: { _all: true },
    where: { ...ACTIVO, ...filtrosOpcionales(filtro) },
  });
  return porCategoria(
    rows.map((r) => ({ count: r._count._all, valor: r.tipoPoblacion })),
    (r) => r.valor ?? "Sin dato"
  );
}

export async function composicionPorJornada(filtro: Filtro = {}): Promise<Categoria[]> {
  const rows = await prisma.beneficiario.groupBy({
    by: ["jornada"],
    _count: { _all: true },
    where: { ...ACTIVO, ...filtrosOpcionales(filtro) },
  });
  return porCategoria(
    rows.map((r) => ({ count: r._count._all, valor: r.jornada })),
    (r) => r.valor ?? "Sin dato"
  );
}

// ===== Cruces por grado (4 funciones, groupBy de 2 columnas + pivote en JS) =====

export async function gradoPorDescolarizado(filtro: Filtro = {}): Promise<{ filas: CrossTab[]; series: string[] }> {
  const rows = await prisma.beneficiario.groupBy({
    by: ["grado", "descolarizado"],
    _count: { _all: true },
    where: { ...ACTIVO, grado: { not: null }, ...filtrosOpcionales(filtro) },
  });
  const { filas, series } = pivotarAncho(
    rows,
    (r) => r.grado!,
    (r) => (r.descolarizado ? "Sí" : "No"),
    (r) => r._count._all
  );
  return { filas: ordenarPorGrado(filas), series };
}

export async function afiliacionSaludPorGrado(filtro: Filtro = {}): Promise<{ filas: CrossTab[]; series: string[] }> {
  const rows = await prisma.beneficiario.groupBy({
    by: ["grado", "afiliacionSalud"],
    _count: { _all: true },
    where: { ...ACTIVO, grado: { not: null }, ...filtrosOpcionales(filtro) },
  });
  const { filas, series } = pivotarAncho(
    rows,
    (r) => r.grado!,
    (r) => r.afiliacionSalud ?? "Sin dato",
    (r) => r._count._all
  );
  return { filas: ordenarPorGrado(filas), series };
}

export async function complementoAlimentarioPorGrado(filtro: Filtro = {}): Promise<{ filas: CrossTab[]; series: string[] }> {
  const rows = await prisma.beneficiario.groupBy({
    by: ["grado", "tipoComplementoAlimentario"],
    _count: { _all: true },
    where: { ...ACTIVO, grado: { not: null }, ...filtrosOpcionales(filtro) },
  });
  const { filas, series } = pivotarAncho(
    rows,
    (r) => r.grado!,
    (r) => r.tipoComplementoAlimentario ?? "Sin dato",
    (r) => r._count._all
  );
  return { filas: ordenarPorGrado(filas), series };
}

export async function medioTransportePorGrado(filtro: Filtro = {}): Promise<{ filas: CrossTab[]; series: string[] }> {
  const rows = await prisma.beneficiario.groupBy({
    by: ["grado", "medioTransporte"],
    _count: { _all: true },
    where: { ...ACTIVO, grado: { not: null }, ...filtrosOpcionales(filtro) },
  });
  const { filas, series } = pivotarAncho(
    rows,
    (r) => r.grado!,
    (r) => r.medioTransporte ?? "Sin dato",
    (r) => r._count._all
  );
  return { filas: ordenarPorGrado(filas), series };
}

// ===== Demografía, salud/discapacidad y completitud documental (rediseño lúdico) =====

const RANGOS_EDAD: { desde: number; hasta: number; etiqueta: string }[] = [
  { desde: 0, hasta: 8, etiqueta: "6-8" },
  { desde: 9, hasta: 11, etiqueta: "9-11" },
  { desde: 12, hasta: 14, etiqueta: "12-14" },
  { desde: 15, hasta: 18, etiqueta: "15-18" },
  { desde: 19, hasta: Infinity, etiqueta: "19+" },
];

/** Bucketiza `edad` en rangos escolares — se agrupa en JS, no vale la pena un groupBy de Prisma para 5 buckets. */
export async function distribucionPorEdad(filtro: Filtro = {}): Promise<Categoria[]> {
  const rows = await prisma.beneficiario.findMany({
    where: { ...ACTIVO, ...filtrosOpcionales(filtro) },
    select: { edad: true },
  });
  const conteos = new Map<string, number>(RANGOS_EDAD.map((r) => [r.etiqueta, 0]));
  let sinDato = 0;
  for (const r of rows) {
    if (r.edad == null) { sinDato++; continue; }
    const rango = RANGOS_EDAD.find((rg) => r.edad! >= rg.desde && r.edad! <= rg.hasta);
    if (rango) conteos.set(rango.etiqueta, (conteos.get(rango.etiqueta) ?? 0) + 1);
  }
  const categorias = RANGOS_EDAD.map((r) => ({ categoria: r.etiqueta, count: conteos.get(r.etiqueta) ?? 0 })).filter(
    (c) => c.count > 0
  );
  if (sinDato > 0) categorias.push({ categoria: "Sin dato", count: sinDato });
  return categorias;
}

export async function composicionPorDiscapacidad(filtro: Filtro = {}): Promise<Categoria[]> {
  const rows = await prisma.beneficiario.groupBy({
    by: ["diagnosticadoDiscapacidad"],
    _count: { _all: true },
    where: { ...ACTIVO, ...filtrosOpcionales(filtro) },
  });
  return porCategoria(
    rows.map((r) => ({ count: r._count._all, valor: r.diagnosticadoDiscapacidad })),
    (r) => (r.valor ? "Sí" : "No")
  );
}

/** Cuenta cada tipo de discapacidad SOLO entre quienes tienen `diagnosticadoDiscapacidad: true`.
 *  Un beneficiario puede tener más de un tipo marcado — la suma de estos conteos puede superar
 *  el total de diagnosticados, esto NO es un porcentaje del total. */
export async function tiposDeDiscapacidad(filtro: Filtro = {}): Promise<Categoria[]> {
  const rows = await prisma.beneficiario.findMany({
    where: { ...ACTIVO, diagnosticadoDiscapacidad: true, ...filtrosOpcionales(filtro) },
    select: {
      discapacidadFisicoMotor: true,
      discapacidadVisual: true,
      discapacidadAuditiva: true,
      discapacidadIntelectual: true,
      discapacidadMultiple: true,
    },
  });
  const etiquetas: { clave: keyof (typeof rows)[number]; etiqueta: string }[] = [
    { clave: "discapacidadFisicoMotor", etiqueta: "Físico-motora" },
    { clave: "discapacidadVisual", etiqueta: "Visual" },
    { clave: "discapacidadAuditiva", etiqueta: "Auditiva" },
    { clave: "discapacidadIntelectual", etiqueta: "Intelectual" },
    { clave: "discapacidadMultiple", etiqueta: "Múltiple" },
  ];
  return etiquetas
    .map(({ clave, etiqueta }) => ({ categoria: etiqueta, count: rows.filter((r) => r[clave]).length }))
    .filter((c) => c.count > 0)
    .sort((a, b) => b.count - a.count);
}

/** Etiquetas idénticas a las de `BeneficiarioForm.tsx` (sección "Documentos anexos") para que el
 *  vocabulario coincida entre el formulario y las estadísticas. */
const DOCUMENTOS_CHECKLIST: { clave: string; etiqueta: string }[] = [
  { clave: "docRegistroCivilOTi", etiqueta: "Registro civil o TI" },
  { clave: "docCertificadoEpsAdres", etiqueta: "Certificado EPS/Adres" },
  { clave: "docCedulaAcudiente", etiqueta: "Cédula del acudiente" },
  { clave: "docConsentimientoAsentimiento", etiqueta: "Consentimiento/asentimiento" },
  { clave: "docFichaInscripcion", etiqueta: "Ficha de inscripción" },
  { clave: "docAceptoPoliticaDatos", etiqueta: "Aceptó política de datos" },
];

export type DocumentoPorcentaje = { clave: string; etiqueta: string; presentes: number; total: number };

/** % de beneficiarios activos con cada documento presente — usado por ChecklistCompletitud. */
export async function porcentajeDocumentoPresente(filtro: Filtro = {}): Promise<DocumentoPorcentaje[]> {
  const rows = await prisma.beneficiario.findMany({
    where: { ...ACTIVO, ...filtrosOpcionales(filtro) },
    select: {
      docRegistroCivilOTi: true,
      docCertificadoEpsAdres: true,
      docCedulaAcudiente: true,
      docConsentimientoAsentimiento: true,
      docFichaInscripcion: true,
      docAceptoPoliticaDatos: true,
    },
  });
  const total = rows.length;
  return DOCUMENTOS_CHECKLIST.map(({ clave, etiqueta }) => ({
    clave,
    etiqueta,
    presentes: rows.filter((r) => r[clave as keyof (typeof rows)[number]]).length,
    total,
  }));
}

/** Cuenta, por beneficiario, cuántos de los 6 documentos están presentes (0 a 6). */
export async function distribucionCompletitud(filtro: Filtro = {}): Promise<Categoria[]> {
  const rows = await prisma.beneficiario.findMany({
    where: { ...ACTIVO, ...filtrosOpcionales(filtro) },
    select: {
      docRegistroCivilOTi: true,
      docCertificadoEpsAdres: true,
      docCedulaAcudiente: true,
      docConsentimientoAsentimiento: true,
      docFichaInscripcion: true,
      docAceptoPoliticaDatos: true,
    },
  });
  const conteos = new Map<number, number>();
  for (const r of rows) {
    const n = DOCUMENTOS_CHECKLIST.filter(({ clave }) => r[clave as keyof typeof r]).length;
    conteos.set(n, (conteos.get(n) ?? 0) + 1);
  }
  return Array.from(conteos.entries())
    .map(([n, count]) => ({ categoria: `${n}/${DOCUMENTOS_CHECKLIST.length}`, count }))
    .sort((a, b) => Number(b.categoria.split("/")[0]) - Number(a.categoria.split("/")[0]));
}

// ===== Geográfico (join real vía territorio, mismo patrón que `inversionPorTerritorio` en geo.ts) =====

/** Suma beneficiarios activos por departamento — varios territorios del mismo departamento se agregan
 *  en una sola barra (p. ej. los 6 territorios de Cundinamarca). Sin territorio asignado no cuenta.
 *  Si el filtro ya trae `territorioIds` (usuario filtró por un departamento), se usa ese conjunto en
 *  vez del "no nulo" genérico — el resultado será, honestamente, una sola barra. */
export async function beneficiariosPorDepartamento(filtro: Filtro = {}): Promise<Categoria[]> {
  const [grupos, territorios] = await Promise.all([
    prisma.beneficiario.groupBy({
      by: ["territorioId"],
      _count: { _all: true },
      where: { ...ACTIVO, territorioId: { not: null }, ...filtrosOpcionales(filtro) },
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
