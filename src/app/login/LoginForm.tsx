"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { ArrowRight } from "lucide-react";

export default function LoginForm() {
  const router = useRouter();
  const [correo, setCorreo] = useState("admin@sigadeportes.co");
  const [password, setPassword] = useState("siga2026");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const res = await signIn("credentials", { correo, password, redirect: false });
    setLoading(false);
    if (res?.error) {
      setError("Credenciales inválidas. Verifica el correo y la contraseña.");
    } else {
      router.push("/dashboard");
      router.refresh();
    }
  }

  return (
    <form onSubmit={onSubmit}>
      {error && <div className="alert error">{error}</div>}
      <div className="field">
        <label htmlFor="correo">Correo institucional</label>
        <input
          id="correo"
          className="input"
          type="email"
          value={correo}
          onChange={(e) => setCorreo(e.target.value)}
          placeholder="usuario@sigadeportes.co"
          autoComplete="username"
          required
        />
      </div>
      <div className="field">
        <label htmlFor="password">Contraseña</label>
        <input
          id="password"
          className="input"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          autoComplete="current-password"
          required
        />
      </div>
      <button className="btn btn-primary" type="submit" disabled={loading}>
        {loading ? "Ingresando…" : <>Ingresar <ArrowRight size={16} /></>}
      </button>
    </form>
  );
}
