export type ModuloNav = { codigo: string; nombre: string; nivel: string; categoria: string | null };

export function hrefFor(codigo: string): string {
  if (codigo === "MOD-001") return "/beneficiarios";
  if (codigo === "MOD-002") return "/personal";
  if (codigo === "MOD-003") return "/financiera";
  if (codigo === "MOD-004") return "/inventarios";
  if (codigo === "MOD-005") return "/documental";
  if (codigo === "MOD-006") return "/informes";
  if (codigo === "MOD-007") return "/dashboard";
  if (codigo === "MOD-008") return "/convocatorias";
  if (codigo === "MOD-009") return "/evaluacion-esal";
  if (codigo === "MOD-010") return "/contratos";
  if (codigo === "MOD-011") return "/seguimiento";
  if (codigo === "MOD-012") return "/territorios";
  if (codigo === "MOD-013") return "/dotacion";
  if (codigo === "MOD-014") return "/polizas";
  if (codigo === "MOD-015") return "/comite";
  if (codigo === "MOD-016") return "/indicadores";
  if (codigo === "MOD-017") return "/lotes";
  if (codigo === "MOD-018") return "/psicosocial";
  if (codigo === "MOD-019") return "/comunicaciones";
  if (codigo === "MOD-020") return "/fuentes";
  if (codigo === "MOD-021") return "/notificaciones";
  if (codigo === "MOD-022") return "/reservas";
  if (codigo === "MOD-023") return "/mantenimiento";
  if (codigo === "MOD-024") return "/georeferenciacion";
  if (codigo === "MOD-025") return "/impacto";
  if (codigo === "MOD-026") return "/auditoria";
  if (codigo === "MOD-027") return "/secop";
  if (codigo === "MOD-028") return "/admin/usuarios";
  if (codigo === "MOD-029") return "/infraestructura-cloud";
  return `/modulo/${codigo}`;
}

export function agruparPorCategoria(modulos: ModuloNav[]): [string, ModuloNav[]][] {
  const grupos = new Map<string, ModuloNav[]>();
  for (const m of modulos) {
    const cat = m.categoria ?? "Otros";
    if (!grupos.has(cat)) grupos.set(cat, []);
    grupos.get(cat)!.push(m);
  }
  return Array.from(grupos.entries());
}

/** Accesos rápidos del Sidebar — subconjunto curado de los 29, intersectado contra lo visible por rol. */
const ACCESOS_RAPIDOS = ["MOD-001", "MOD-007", "MOD-010", "MOD-003", "MOD-005", "MOD-011", "MOD-006"];

export function accesosRapidos(modulos: ModuloNav[]): ModuloNav[] {
  const porCodigo = new Map(modulos.map((m) => [m.codigo, m]));
  return ACCESOS_RAPIDOS.map((c) => porCodigo.get(c)).filter((m): m is ModuloNav => m != null);
}
