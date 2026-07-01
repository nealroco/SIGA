import Link from "next/link";
import { redirect } from "next/navigation";
import { LayoutGrid } from "lucide-react";
import { auth } from "@/auth";
import { getModulosVisibles } from "@/lib/permissions";
import { agruparPorCategoria, hrefFor } from "@/lib/navegacion";
import { MODULO_ICONO, CATEGORIA_ICONO } from "@/lib/iconos";

export const dynamic = "force-dynamic";

export default async function ModulosPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  // Vuelve a aplicar el filtro de servidor: esta página es alcanzable por URL directa,
  // no debe confiar en lo que el layout ya filtró para el Sidebar.
  const modulosVisibles = await getModulosVisibles(session.user.rol);
  const grupos = agruparPorCategoria(
    modulosVisibles.map((m) => ({ codigo: m.codigo, nombre: m.nombre, nivel: m.nivel, categoria: m.categoria }))
  );

  return (
    <div>
      <h1 className="page-title">Módulos</h1>
      <p className="page-sub">Catálogo completo de módulos visibles para tu rol · {modulosVisibles.length} de 29.</p>

      {grupos.map(([categoria, items]) => {
        const CategoriaIcon = CATEGORIA_ICONO[categoria] ?? LayoutGrid;
        return (
          <div key={categoria} style={{ marginTop: 28 }}>
            <p className="section-cap" style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <CategoriaIcon size={13} />
              {categoria}
            </p>
            <div className="modulos-grid">
              {items.map((m) => {
                const Icon = MODULO_ICONO[m.codigo] ?? LayoutGrid;
                return (
                  <Link key={m.codigo} href={hrefFor(m.codigo)} className="modulo-card">
                    <Icon size={20} />
                    <span className="nm">{m.nombre}</span>
                    <span className="code mono">{m.codigo}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
