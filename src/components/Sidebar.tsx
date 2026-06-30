"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export type ModuloNav = { codigo: string; nombre: string; nivel: string };

function hrefFor(codigo: string): string {
  if (codigo === "MOD-001") return "/beneficiarios";
  if (codigo === "MOD-002") return "/personal";
  if (codigo === "MOD-003") return "/financiera";
  if (codigo === "MOD-005") return "/documental";
  if (codigo === "MOD-006") return "/informes";
  if (codigo === "MOD-007") return "/dashboard";
  if (codigo === "MOD-008") return "/convocatorias";
  if (codigo === "MOD-010") return "/contratos";
  if (codigo === "MOD-011") return "/seguimiento";
  if (codigo === "MOD-014") return "/polizas";
  if (codigo === "MOD-016") return "/indicadores";
  if (codigo === "MOD-020") return "/fuentes";
  if (codigo === "MOD-025") return "/impacto";
  if (codigo === "MOD-027") return "/secop";
  if (codigo === "MOD-028") return "/admin/permisos";
  return `/modulo/${codigo}`;
}

export default function Sidebar({ modulos }: { modulos: ModuloNav[] }) {
  const pathname = usePathname();
  return (
    <aside className="sidebar">
      <div className="brand">
        SIGA<span className="d">.</span>Deportes <span className="badge">v4</span>
      </div>
      <div className="side-cap">Módulos · {modulos.length}</div>
      <nav>
        {modulos.map((m) => {
          const href = hrefFor(m.codigo);
          const active = href === "/dashboard" ? pathname === "/dashboard" : pathname.startsWith(href);
          return (
            <Link key={m.codigo} href={href} className={`nav-item${active ? " active" : ""}`}>
              <span>{m.nombre}</span>
              <span className="code">{m.codigo}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
