import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { ROL_ICONO } from "@/lib/iconos";
import LoginForm from "./LoginForm";

const AdminIcon = ROL_ICONO["Administrador"];
const RevisorIcon = ROL_ICONO["Revisor"];
const CoordIcon = ROL_ICONO["Coord. deportiva"];

export default async function LoginPage() {
  const session = await auth();
  if (session?.user) redirect("/dashboard");

  return (
    <main className="login-screen">
      <div className="login-grid" />
      <div className="login-card">
        <div className="brand">
          SIGA<span className="d">.</span>Deportes <span className="badge">v4</span>
        </div>
        <div className="eyebrow">Ministerio del Deporte · ESAL-JDEC</div>
        <h1>Acceso a la plataforma</h1>
        <LoginForm />
        {process.env.NEXT_PUBLIC_SHOW_DEMO_HINT === "true" && (
          <div className="login-hint">
            Demo · usuarios sembrados:
            <br />
            <span className="login-hint-row"><AdminIcon size={13} /> <code>admin@sigadeportes.co</code> (Administrador)</span>{" · "}
            <span className="login-hint-row"><RevisorIcon size={13} /> <code>revisor@sigadeportes.co</code> (Revisor)</span>{" · "}
            <span className="login-hint-row"><CoordIcon size={13} /> <code>coord@sigadeportes.co</code> (Coord. deportiva)</span>
            <br />
            Contraseña: <code>siga2026</code>
          </div>
        )}
      </div>
    </main>
  );
}
