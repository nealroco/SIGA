"use client";

import { useActionState } from "react";
import { reportarAvance, type FormState } from "@/actions/indicadores";

type Indicador = { id: number; codigo: string; nombre: string; programado: number };

export default function AvanceForm({ indicadores }: { indicadores: Indicador[] }) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(reportarAvance, {});
  const fe = state.fieldErrors ?? {};

  return (
    <form action={formAction} className="card" style={{ padding: 24, marginTop: 18, maxWidth: 760 }}>
      <p className="section-cap">Reportar avance</p>
      {state.error && <div className="alert error">{state.error}</div>}

      <div className="form-grid">
        <div className="field">
          <label htmlFor="indicadorId">Indicador <span className="req">*</span></label>
          <select id="indicadorId" name="indicadorId" className="select" required>
            <option value="">Selecciona…</option>
            {indicadores.map((i) => (
              <option key={i.id} value={i.id}>{i.codigo} · {i.nombre} (meta {i.programado})</option>
            ))}
          </select>
          {fe.indicadorId && <span className="err">{fe.indicadorId}</span>}
        </div>
        <div className="field">
          <label htmlFor="cantidadReportada">Cantidad reportada <span className="req">*</span></label>
          <input id="cantidadReportada" name="cantidadReportada" className="input" type="number" min={0} step="any" required />
          {fe.cantidadReportada && <span className="err">{fe.cantidadReportada}</span>}
        </div>
        <div className="field">
          <label htmlFor="periodo">Período</label>
          <input id="periodo" name="periodo" className="input" placeholder="2026-1" />
        </div>
      </div>

      <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
        <button className="btn btn-primary" type="submit" disabled={pending}>
          {pending ? "Guardando…" : "Reportar avance"}
        </button>
      </div>
      <p className="page-sub" style={{ marginTop: 12 }}>
        El avance queda en estado <b>Reportado</b>; solo lo que quede en <b>Aprobado</b> suma al cumplimiento (RN-011).
      </p>
    </form>
  );
}
