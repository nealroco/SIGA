"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  // Este error.tsx se renderiza DENTRO de src/app/(app)/layout.tsx — el layout (con su
  // Sidebar/Topbar reales) sigue montado por encima de este boundary, así que aquí solo va
  // el contenido de la sección (nunca duplicar app-shell/Sidebar/Topbar, o queda una barra
  // lateral repetida dentro de la real).
  return (
    <div style={{ maxWidth: 560, margin: "40px auto", padding: "0 20px" }}>
      <div className="card" style={{ padding: 28 }}>
        <h1 className="page-title" style={{ marginBottom: 8 }}>Algo salió mal</h1>
        <div className="alert error">
          Ocurrió un error inesperado al cargar esta sección. Puedes intentar de nuevo o volver al panel principal.
        </div>
        <div style={{ display: "flex", gap: 12, marginTop: 16 }}>
          <button className="btn btn-primary" onClick={() => reset()}>Reintentar</button>
          <Link href="/dashboard" className="btn">Ir al dashboard</Link>
        </div>
      </div>
    </div>
  );
}
