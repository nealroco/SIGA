"use client";

import { useActionState } from "react";
import Link from "next/link";
import type { FormState } from "@/actions/informes";

type Values = {
  id?: number;
  contratoId?: number;
  periodo?: string;
  observacion?: string | null;
};

type Contrato = { id: number; numero: string; objeto: string };
type Action = (prev: FormState, fd: FormData) => Promise<FormState>;

export default function InformeForm({
  action,
  contratos,
  values = {},
  submitLabel,
}: {
  action: Action;
  contratos: Contrato[];
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
          <label htmlFor="contratoId">Contrato <span className="req">*</span></label>
          <select id="contratoId" name="contratoId" className="select" defaultValue={values.contratoId ?? ""} required>
            <option value="">Selecciona…</option>
            {contratos.map((c) => (
              <option key={c.id} value={c.id}>{c.numero} · {c.objeto}</option>
            ))}
          </select>
          {fe.contratoId && <span className="err">{fe.contratoId}</span>}
        </div>
        <div className="field">
          <label htmlFor="periodo">Periodo <span className="req">*</span></label>
          <input id="periodo" name="periodo" className="input" defaultValue={values.periodo ?? ""} placeholder="2026-01" required />
          {fe.periodo && <span className="err">{fe.periodo}</span>}
        </div>
      </div>

      <div className="field">
        <label htmlFor="observacion">Observación</label>
        <input id="observacion" name="observacion" className="input" defaultValue={values.observacion ?? ""} placeholder="Opcional…" />
        {fe.observacion && <span className="err">{fe.observacion}</span>}
      </div>

      <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
        <button className="btn btn-primary" type="submit" disabled={pending}>
          {pending ? "Guardando…" : submitLabel}
        </button>
        <Link href="/informes" className="btn">Cancelar</Link>
      </div>
      <p className="page-sub" style={{ marginTop: 12 }}>
        Al radicar/editar, el informe queda en estado <b>Radicado</b>. No se puede radicar en un periodo cerrado (RN-022).
      </p>
    </form>
  );
}
