"use client";

import { useActionState } from "react";
import type { FormState } from "@/actions/impacto";

type Action = (prev: FormState, fd: FormData) => Promise<FormState>;

export default function AnalisisForm({ action }: { action: Action }) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(action, {});
  const fe = state.fieldErrors ?? {};

  return (
    <form action={formAction} className="card" style={{ padding: 24, maxWidth: 480 }}>
      {state.error && <div className="alert error">{state.error}</div>}

      <div className="field">
        <label htmlFor="periodo">Período <span className="req">*</span></label>
        <input id="periodo" name="periodo" className="input" placeholder="2026-01" required />
        {fe.periodo && <span className="err">{fe.periodo}</span>}
      </div>

      <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
        <button className="btn btn-primary" type="submit" disabled={pending}>
          {pending ? "Calculando…" : "Generar análisis"}
        </button>
      </div>
      <p className="page-sub" style={{ marginTop: 12 }}>
        Calcula gasto ejecutado, ejecución financiera y cumplimiento físico con los datos actuales del sistema,
        y registra la desviación entre ambos (RN-021: alerta de desviación cuando supera el 10%).
      </p>
    </form>
  );
}
