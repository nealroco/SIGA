"use client";

import { useActionState } from "react";
import type { FormState } from "@/actions/iam";

type Action = (prev: FormState, fd: FormData) => Promise<FormState>;

export default function AccesoEmergenciaForm({ action }: { action: Action }) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(action, {});
  const fe = state.fieldErrors ?? {};

  return (
    <form action={formAction} className="card" style={{ padding: 22, marginTop: 18, maxWidth: 760, borderColor: "var(--coral)" }}>
      <p className="section-cap">Acceso de emergencia (RN-026 · break-glass)</p>
      {state.error && <div className="alert error">{state.error}</div>}
      <p className="page-sub" style={{ marginBottom: 14 }}>
        El Administrador actúa como respaldo de Tecnología. Este evento queda registrado en la bitácora de auditoría.
      </p>
      <div className="field">
        <label htmlFor="motivo">Motivo del acceso de emergencia <span className="req">*</span></label>
        <textarea id="motivo" name="motivo" className="input" rows={3} placeholder="Describe el motivo del acceso de emergencia…" required />
        {fe.motivo && <span className="err">{fe.motivo}</span>}
      </div>
      <button className="btn" type="submit" disabled={pending} style={{ borderColor: "var(--coral)", color: "var(--coral)" }}>
        {pending ? "Registrando…" : "Registrar acceso de emergencia"}
      </button>
    </form>
  );
}
