"use client";

import { useActionState } from "react";
import type { FormState } from "@/actions/notificaciones";

type Action = (prev: FormState, fd: FormData) => Promise<FormState>;

export default function NotificacionForm({
  action,
  submitLabel,
}: {
  action: Action;
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(action, {});
  const fe = state.fieldErrors ?? {};

  return (
    <form action={formAction} className="card" style={{ padding: 24 }}>
      {state.error && <div className="alert error">{state.error}</div>}

      <div className="form-grid">
        <div className="field">
          <label htmlFor="tipoEvento">Tipo de evento <span className="req">*</span></label>
          <input id="tipoEvento" name="tipoEvento" className="input" placeholder="Manual, RN-025, RN-024-B…" required />
          {fe.tipoEvento && <span className="err">{fe.tipoEvento}</span>}
        </div>
        <div className="field">
          <label htmlFor="canal">Canal</label>
          <select id="canal" name="canal" className="select" defaultValue="Sistema">
            <option value="Sistema">Sistema</option>
            <option value="Correo">Correo</option>
            <option value="SMS">SMS</option>
          </select>
          {fe.canal && <span className="err">{fe.canal}</span>}
        </div>
      </div>

      <div className="field">
        <label htmlFor="destinatario">Destinatario</label>
        <input id="destinatario" name="destinatario" className="input" placeholder="Correo, número o rol destino (opcional)" />
        {fe.destinatario && <span className="err">{fe.destinatario}</span>}
      </div>

      <div className="field">
        <label htmlFor="mensaje">Mensaje <span className="req">*</span></label>
        <textarea id="mensaje" name="mensaje" className="input" rows={4} required />
        {fe.mensaje && <span className="err">{fe.mensaje}</span>}
      </div>

      <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
        <button className="btn btn-primary" type="submit" disabled={pending}>
          {pending ? "Guardando…" : submitLabel}
        </button>
      </div>
      <p className="page-sub" style={{ marginTop: 12 }}>
        La notificación queda en estado <b>Pendiente</b> hasta que se confirme su envío.
      </p>
    </form>
  );
}
