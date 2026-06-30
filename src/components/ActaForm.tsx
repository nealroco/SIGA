"use client";

import { useActionState } from "react";
import Link from "next/link";
import type { FormState } from "@/actions/comite";

type Values = {
  id?: number;
  tema?: string;
  decision?: string | null;
  fecha?: string | null;
};

type Action = (prev: FormState, fd: FormData) => Promise<FormState>;

export default function ActaForm({
  action,
  values = {},
  submitLabel,
}: {
  action: Action;
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

      <div className="field">
        <label htmlFor="tema">Tema <span className="req">*</span></label>
        <input id="tema" name="tema" className="input" defaultValue={values.tema ?? ""} required />
        {fe.tema && <span className="err">{fe.tema}</span>}
      </div>

      <div className="field">
        <label htmlFor="decision">Decisión</label>
        <textarea id="decision" name="decision" className="input" rows={4} defaultValue={values.decision ?? ""} />
        {fe.decision && <span className="err">{fe.decision}</span>}
      </div>

      <div className="field">
        <label htmlFor="fecha">Fecha</label>
        <input id="fecha" name="fecha" className="input" type="date" defaultValue={d(values.fecha)} style={{ maxWidth: 220 }} />
        {fe.fecha && <span className="err">{fe.fecha}</span>}
      </div>

      <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
        <button className="btn btn-primary" type="submit" disabled={pending}>
          {pending ? "Guardando…" : submitLabel}
        </button>
        <Link href="/comite" className="btn">Cancelar</Link>
      </div>
      <p className="page-sub" style={{ marginTop: 12 }}>
        Al registrar/editar, el acta queda en estado <b>Registrada</b> (pendiente de aprobación del Administrador — RN-025).
      </p>
    </form>
  );
}
