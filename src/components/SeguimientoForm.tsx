"use client";

import { useActionState } from "react";
import Link from "next/link";
import type { FormState } from "@/actions/seguimiento";

type Values = {
  id?: number;
  beneficiarioId?: number;
  programa?: string | null;
  fecha?: string | null;
  actividad?: string;
  observacion?: string | null;
};

type Beneficiario = { id: number; nombre: string; documento: string };
type Action = (prev: FormState, fd: FormData) => Promise<FormState>;

export default function SeguimientoForm({
  action,
  beneficiarios,
  values = {},
  submitLabel,
}: {
  action: Action;
  beneficiarios: Beneficiario[];
  values?: Values;
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(action, {});
  const fe = state.fieldErrors ?? {};
  const d = (v?: string | null) => (v ? v.slice(0, 10) : "");

  return (
    <form action={formAction} className="card" style={{ padding: 24, maxWidth: 760 }}>
      {state.error && <div className="alert error">{state.error}</div>}
      {values.id ? <input type="hidden" name="id" value={values.id} /> : null}

      <div className="form-grid">
        <div className="field">
          <label htmlFor="beneficiarioId">Beneficiario <span className="req">*</span></label>
          <select id="beneficiarioId" name="beneficiarioId" className="select" defaultValue={values.beneficiarioId ?? ""} required>
            <option value="">Selecciona…</option>
            {beneficiarios.map((b) => (
              <option key={b.id} value={b.id}>{b.nombre} · {b.documento}</option>
            ))}
          </select>
          {fe.beneficiarioId && <span className="err">{fe.beneficiarioId}</span>}
        </div>
        <div className="field">
          <label htmlFor="programa">Programa</label>
          <input id="programa" name="programa" className="input" defaultValue={values.programa ?? ""} placeholder="Escuela de fútbol…" />
        </div>
        <div className="field">
          <label htmlFor="fecha">Fecha</label>
          <input id="fecha" name="fecha" className="input" type="date" defaultValue={d(values.fecha)} />
        </div>
      </div>

      <div className="field">
        <label htmlFor="actividad">Actividad <span className="req">*</span></label>
        <input id="actividad" name="actividad" className="input" defaultValue={values.actividad ?? ""} required />
        {fe.actividad && <span className="err">{fe.actividad}</span>}
      </div>

      <div className="field">
        <label htmlFor="observacion">Observación</label>
        <input id="observacion" name="observacion" className="input" defaultValue={values.observacion ?? ""} />
      </div>

      <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
        <button className="btn btn-primary" type="submit" disabled={pending}>
          {pending ? "Guardando…" : submitLabel}
        </button>
        <Link href="/seguimiento" className="btn">Cancelar</Link>
      </div>
    </form>
  );
}
