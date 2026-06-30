import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getModulosVisibles } from "@/lib/permissions";
import Sidebar from "@/components/Sidebar";
import Topbar from "@/components/Topbar";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const modulos = await getModulosVisibles(session.user.rol);

  return (
    <div className="app-shell">
      <Sidebar modulos={modulos.map((m) => ({ codigo: m.codigo, nombre: m.nombre, nivel: m.nivel }))} />
      <div className="main">
        <Topbar nombre={session.user.name ?? "Usuario"} rol={session.user.rol} />
        <div className="content">{children}</div>
      </div>
    </div>
  );
}
