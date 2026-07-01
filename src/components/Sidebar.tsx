"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutGrid } from "lucide-react";
import { MODULO_ICONO } from "@/lib/iconos";
import { type ModuloNav, hrefFor, accesosRapidos } from "@/lib/navegacion";

export type { ModuloNav };

export default function Sidebar({ modulos }: { modulos: ModuloNav[] }) {
  const pathname = usePathname();
  const rapidos = accesosRapidos(modulos);
  const modulosHref = "/modulos";
  const modulosActive = pathname.startsWith(modulosHref);
  return (
    <aside className="sidebar">
      <div className="brand">
        SIGA<span className="d">.</span>Deportes <span className="badge">v4</span>
      </div>
      <div className="side-cap">Accesos rápidos</div>
      <nav>
        {rapidos.map((m) => {
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
      </nav>
      <div className="side-cap">Catálogo</div>
      <nav>
        <Link href={modulosHref} className={`nav-item${modulosActive ? " active" : ""}`}>
          <LayoutGrid size={16} />
          <span>Módulos</span>
          <span className="code">{modulos.length}</span>
        </Link>
      </nav>
    </aside>
  );
}
