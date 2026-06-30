"use client";

import { useActionState } from "react";
import Link from "next/link";
import { crearIndicador, type FormState } from "@/actions/indicadores";

export default function IndicadorForm() {
  const [state, formAction, pending] = useActionState<FormState, FormData>(crearIndicador, {});
  const fe = state.fieldErrors ?? {};

  return (
    <form action={formAction} className="card" style={{ padding: 24, maxWidth: 760 }}>
      {state.error && <div className="alert error">{state.error}</div>}

      <div className="form-grid">
        <div className="field">
          <label htmlFor="codigo">Código <span className="req">*</span></label>
          <input id="codigo" name="codigo" className="input" placeholder="IND-2026-00X" required />
          {fe.codigo && <span className="err">{fe.codigo}</span>}
        </div>
        <div className="field">
          <label htmlFor="nombre">Nombre del indicador <span className="req">*</span></label>
          <input id="nombre" name="nombre" className="input" required />
          {fe.nombre && <span className="err">{fe.nombre}</span>}
        </div>
      </div>

      <div className="form-grid">
        <div className="field">
          <label htmlFor="unidad">Unidad</label>
          <input id="unidad" name="unidad" className="input" placeholder="cupos | sesiones | beneficiarios | eventos" />
        </div>
        <div className="field">
          <label htmlFor="programado">Meta programada</label>
          <input id="programado" name="programado" className="input" type="number" min={0} step="any" defaultValue={0} />
          {fe.programado && <span className="err">{fe.programado}</span>}
        </div>
        <div className="field">
          <label htmlFor="periodo">Período <span className="req">*</span></label>
          <input id="periodo" name="periodo" className="input" placeholder="2026-1" required />
          {fe.periodo && <span className="err">{fe.periodo}</span>}
        </div>
      </div>

      <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
        <button className="btn btn-primary" type="submit" disabled={pending}>
          {pending ? "Guardando…" : "Registrar indicador"}
        </button>
        <Link href="/indicadores" className="btn">Cancelar</Link>
      </div>
      <p className="page-sub" style={{ marginTop: 12 }}>
        RN-023: el valor programado no puede ser negativo. El cumplimiento se calculará luego con los avances Aprobados (RN-011).
      </p>
    </form>
  );
}
