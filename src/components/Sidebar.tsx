"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutGrid } from "lucide-react";
import { MODULO_ICONO, CATEGORIA_ICONO } from "@/lib/iconos";

export type ModuloNav = { codigo: string; nombre: string; nivel: string; categoria: string | null };

function hrefFor(codigo: string): string {
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

function agruparPorCategoria(modulos: ModuloNav[]): [string, ModuloNav[]][] {
  const grupos = new Map<string, ModuloNav[]>();
  for (const m of modulos) {
    const cat = m.categoria ?? "Otros";
    if (!grupos.has(cat)) grupos.set(cat, []);
    grupos.get(cat)!.push(m);
  }
  return Array.from(grupos.entries());
}

export default function Sidebar({ modulos }: { modulos: ModuloNav[] }) {
  const pathname = usePathname();
  const grupos = agruparPorCategoria(modulos);
  return (
    <aside className="sidebar">
      <div className="brand">
        SIGA<span className="d">.</span>Deportes <span className="badge">v4</span>
      </div>
      <div className="side-cap">Módulos · {modulos.length}</div>
      <nav>
        {grupos.map(([categoria, items]) => {
          const CategoriaIcon = CATEGORIA_ICONO[categoria] ?? LayoutGrid;
          return (
            <div key={categoria} className="nav-group">
              <div className="side-cap nav-group-cap">
                <CategoriaIcon size={13} />
                <span>{categoria}</span>
              </div>
              {items.map((m) => {
                const href = hrefFor(m.codigo);
                const active = href === "/dashboard" ? pathname === "/dashboard" : pathname.startsWith(href);
                const ModuloIcon = MODULO_ICONO[m.codigo] ?? LayoutGrid;
                return (
                  <Link key={m.codigo} href={href} className={`nav-item${active ? " active" : ""}`}>
                    <ModuloIcon size={16} />
                    <span>{m.nombre}</span>
                    <span className="code">{m.codigo}</span>
                  </Link>
                );
              })}
            </div>
          );
        })}
      </nav>
    </aside>
  );
}
