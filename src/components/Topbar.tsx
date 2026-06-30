"use client";

import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";

const LABELS: Record<string, string> = {
  dashboard: "Dashboard",
  beneficiarios: "Beneficiarios",
  nuevo: "Nuevo",
  admin: "Administración",
  permisos: "Matriz de permisos",
  modulo: "Módulo",
};

function crumbs(pathname: string): string[] {
  const parts = pathname.split("/").filter(Boolean);
  return parts.map((p) => LABELS[p] ?? (p.startsWith("MOD-") ? p : decodeURIComponent(p)));
}

export default function Topbar({ nombre, rol }: { nombre: string; rol: string }) {
  const pathname = usePathname();
  const items = crumbs(pathname);
  return (
    <header className="topbar">
      <div className="crumbs">
        <span>SIGA</span>
        {items.map((c, i) => (
          <span key={i}>
            <span style={{ margin: "0 8px", color: "var(--line-2)" }}>/</span>
            {i === items.length - 1 ? <b>{c}</b> : c}
          </span>
        ))}
      </div>
      <div className="topbar-right">
        <div className="user-chip">
          <span className="nm">{nombre}</span>
          <span className="rl">{rol}</span>
        </div>
        <button className="btn btn-sm" onClick={() => signOut({ callbackUrl: "/login" })}>
          Salir
        </button>
      </div>
    </header>
  );
}
