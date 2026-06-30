"use client";

import { useActionState } from "react";
import Link from "next/link";
import type { FormState } from "@/actions/evaluacionEsal";

type Values = {
  id?: number;
  terceroId?: number;
  convocatoriaId?: number | null;
  criterio?: string | null;
  puntaje?: number | null;
};

type Tercero = { id: number; razonSocial: string; documento: string };
type Convocatoria = { id: number; nombre: string };
type Action = (prev: FormState, fd: FormData) => Promise<FormState>;

export default function EvaluacionEsalForm({
  action,
  terceros,
  convocatorias,
  values = {},
  submitLabel,
}: {
  action: Action;
  terceros: Tercero[];
  convocatorias: Convocatoria[];
  values?: Values;
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(action, {});
  const fe = state.fieldErrors ?? {};

  return (
    <form action={formAction} className="card" style={{ padding: 24, maxWidth: 760 }}>
      {state.error && <div className="alert error">{state.error}</div>}
      {values.id ? <input type="hidden" name="id" value={values.id} /> : null}

      <div className="form-grid">
        <div className="field">
          <label htmlFor="terceroId">Tercero (ESAL) <span className="req">*</span></label>
          <select id="terceroId" name="terceroId" className="select" defaultValue={values.terceroId ?? ""} required>
            <option value="">Selecciona…</option>
            {terceros.map((t) => (
              <option key={t.id} value={t.id}>{t.razonSocial} · {t.documento}</option>
            ))}
          </select>
          {fe.terceroId && <span className="err">{fe.terceroId}</span>}
        </div>
        <div className="field">
          <label htmlFor="convocatoriaId">Convocatoria</label>
          <select id="convocatoriaId" name="convocatoriaId" className="select" defaultValue={values.convocatoriaId ?? ""}>
            <option value="">Ninguna</option>
            {convocatorias.map((c) => (
              <option key={c.id} value={c.id}>{c.nombre}</option>
            ))}
          </select>
          {fe.convocatoriaId && <span className="err">{fe.convocatoriaId}</span>}
        </div>
      </div>

      <div className="field">
        <label htmlFor="criterio">Criterio evaluado</label>
        <input id="criterio" name="criterio" className="input" defaultValue={values.criterio ?? ""} placeholder="Capacidad técnica, experiencia, idoneidad…" />
        {fe.criterio && <span className="err">{fe.criterio}</span>}
      </div>

      <div className="field">
        <label htmlFor="puntaje">Puntaje (0 a 100)</label>
        <input id="puntaje" name="puntaje" className="input" type="number" min={0} max={100} step="any" defaultValue={values.puntaje ?? ""} />
        {fe.puntaje && <span className="err">{fe.puntaje}</span>}
      </div>

      <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
        <button className="btn btn-primary" type="submit" disabled={pending}>
          {pending ? "Guardando…" : submitLabel}
        </button>
        <Link href="/evaluacion-esal" className="btn">Cancelar</Link>
      </div>
      <p className="page-sub" style={{ marginTop: 12 }}>
        Al registrar/editar, la evaluación queda en estado <b>Registrada</b> (pendiente de aprobación del Supervisor — segregación de funciones).
      </p>
    </form>
  );
}
