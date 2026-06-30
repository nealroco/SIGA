import { redirect } from "next/navigation";
import { auth } from "@/auth";
import LoginForm from "./LoginForm";

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
        <div className="login-hint">
          Demo · usuarios sembrados:
          <br />
          <code>admin@siga.gov.co</code> (Administrador) ·{" "}
          <code>revisor@siga.gov.co</code> (Revisor) ·{" "}
          <code>coord@siga.gov.co</code> (Coord. deportiva)
          <br />
          Contraseña: <code>siga2026</code>
        </div>
      </div>
    </main>
  );
}
