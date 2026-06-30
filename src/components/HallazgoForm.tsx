"use client";

import { useActionState } from "react";
import Link from "next/link";
import type { FormState } from "@/actions/auditoria";

type Action = (prev: FormState, fd: FormData) => Promise<FormState>;

export default function HallazgoForm({
  action,
  submitLabel,
}: {
  action: Action;
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(action, {});
  const fe = state.fieldErrors ?? {};

  return (
    <form action={formAction} className="card" style={{ padding: 24, maxWidth: 720 }}>
      {state.error && <div className="alert error">{state.error}</div>}

      <div className="form-grid">
        <div className="field">
          <label htmlFor="modulo">Módulo relacionado</label>
          <input id="modulo" name="modulo" className="input" placeholder="MOD-010" />
          {fe.modulo && <span className="err">{fe.modulo}</span>}
        </div>
        <div className="field">
          <label htmlFor="gravedad">Gravedad</label>
          <select id="gravedad" name="gravedad" className="select" defaultValue="Media">
            <option value="Baja">Baja</option>
            <option value="Media">Media</option>
            <option value="Alta">Alta</option>
          </select>
          {fe.gravedad && <span className="err">{fe.gravedad}</span>}
        </div>
      </div>

      <div className="field">
        <label htmlFor="descripcion">Descripción del hallazgo <span className="req">*</span></label>
        <textarea id="descripcion" name="descripcion" className="input" rows={4} placeholder="Describe la observación de auditoría…" required />
        {fe.descripcion && <span className="err">{fe.descripcion}</span>}
      </div>

      <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
        <button className="btn btn-primary" type="submit" disabled={pending}>
          {pending ? "Guardando…" : submitLabel}
        </button>
        <Link href="/auditoria" className="btn">Cancelar</Link>
      </div>
    </form>
  );
}
