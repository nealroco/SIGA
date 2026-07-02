"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutGrid, Menu, X } from "lucide-react";
import { MODULO_ICONO } from "@/lib/iconos";
import { type ModuloNav, hrefFor, accesosRapidos } from "@/lib/navegacion";

export type { ModuloNav };

export default function Sidebar({ modulos }: { modulos: ModuloNav[] }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const rapidos = accesosRapidos(modulos);
  const modulosHref = "/modulos";
  const modulosActive = pathname.startsWith(modulosHref);
  return (
    <>
      <button
        type="button"
        className="sidebar-toggle btn btn-sm"
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "Cerrar menú" : "Abrir menú"}
        aria-expanded={open}
      >
        {open ? <X size={16} /> : <Menu size={16} />}
      </button>
      <div className={`sidebar-scrim${open ? " open" : ""}`} onClick={() => setOpen(false)} aria-hidden="true" />
      <aside className={`sidebar${open ? " open" : ""}`}>
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
              <Link
                key={m.codigo}
                href={href}
                className={`nav-item${active ? " active" : ""}`}
                onClick={() => setOpen(false)}
              >
                <ModuloIcon size={16} />
                <span>{m.nombre}</span>
                <span className="code">{m.codigo}</span>
              </Link>
            );
          })}
        </nav>
        <div className="side-cap">Catálogo</div>
        <nav>
          <Link
            href={modulosHref}
            className={`nav-item${modulosActive ? " active" : ""}`}
            onClick={() => setOpen(false)}
          >
            <LayoutGrid size={16} />
            <span>Módulos</span>
            <span className="code">{modulos.length}</span>
          </Link>
        </nav>
      </aside>
    </>
  );
}
