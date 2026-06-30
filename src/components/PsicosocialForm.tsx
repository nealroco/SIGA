"use client";

import { useActionState } from "react";
import Link from "next/link";
import type { FormState } from "@/actions/psicosocial";

type Values = {
  id?: number;
  beneficiarioId?: number;
  fecha?: string | null;
  instrumento?: string | null;
  resultado?: string | null;
};

type Beneficiario = { id: number; nombre: string; documento: string };
type Action = (prev: FormState, fd: FormData) => Promise<FormState>;

export default function PsicosocialForm({
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
          <label htmlFor="fecha">Fecha</label>
          <input id="fecha" name="fecha" className="input" type="date" defaultValue={d(values.fecha)} />
        </div>
        <div className="field">
          <label htmlFor="instrumento">Instrumento</label>
          <input id="instrumento" name="instrumento" className="input" defaultValue={values.instrumento ?? ""} placeholder="Escala / cuestionario aplicado…" />
        </div>
      </div>

      <div className="field">
        <label htmlFor="resultado">Resultado</label>
        <input id="resultado" name="resultado" className="input" defaultValue={values.resultado ?? ""} />
        {fe.resultado && <span className="err">{fe.resultado}</span>}
      </div>

      <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
        <button className="btn btn-primary" type="submit" disabled={pending}>
          {pending ? "Guardando…" : submitLabel}
        </button>
        <Link href="/psicosocial" className="btn">Cancelar</Link>
      </div>
    </form>
  );
}
