"use client";

import { useActionState } from "react";
import Link from "next/link";
import type { FormState } from "@/actions/mantenimiento";

type Values = {
  id?: number;
  escenarioId?: number;
  tipo?: string;
  descripcion?: string | null;
  fechaInicio?: string | null;
  fechaFin?: string | null;
  costo?: number;
};

type Escenario = { id: number; nombre: string };
type Action = (prev: FormState, fd: FormData) => Promise<FormState>;

export default function MantenimientoForm({
  action,
  escenarios,
  values = {},
  submitLabel,
}: {
  action: Action;
  escenarios: Escenario[];
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
          <label htmlFor="escenarioId">Escenario <span className="req">*</span></label>
          <select id="escenarioId" name="escenarioId" className="select" defaultValue={values.escenarioId ?? ""} required>
            <option value="">Selecciona…</option>
            {escenarios.map((e) => (
              <option key={e.id} value={e.id}>{e.nombre}</option>
            ))}
          </select>
          {fe.escenarioId && <span className="err">{fe.escenarioId}</span>}
        </div>
        <div className="field">
          <label htmlFor="tipo">Tipo <span className="req">*</span></label>
          <select id="tipo" name="tipo" className="select" defaultValue={values.tipo ?? "Programado"} required>
            <option value="Programado">Programado</option>
            <option value="Correctivo">Correctivo</option>
            <option value="Emergencia">Emergencia</option>
          </select>
          {fe.tipo && <span className="err">{fe.tipo}</span>}
        </div>
      </div>

      <div className="field">
        <label htmlFor="descripcion">Descripción</label>
        <input id="descripcion" name="descripcion" className="input" defaultValue={values.descripcion ?? ""} />
        {fe.descripcion && <span className="err">{fe.descripcion}</span>}
      </div>

      <div className="form-grid">
        <div className="field">
          <label htmlFor="fechaInicio">Fecha inicio</label>
          <input id="fechaInicio" name="fechaInicio" className="input" type="date" defaultValue={d(values.fechaInicio)} />
        </div>
        <div className="field">
          <label htmlFor="fechaFin">Fecha fin</label>
          <input id="fechaFin" name="fechaFin" className="input" type="date" defaultValue={d(values.fechaFin)} />
          {fe.fechaFin && <span className="err">{fe.fechaFin}</span>}
        </div>
        <div className="field">
          <label htmlFor="costo">Costo (COP)</label>
          <input id="costo" name="costo" className="input" type="number" min={0} step="any" defaultValue={values.costo ?? 0} />
          {fe.costo && <span className="err">{fe.costo}</span>}
        </div>
      </div>

      <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
        <button className="btn btn-primary" type="submit" disabled={pending}>
          {pending ? "Guardando…" : submitLabel}
        </button>
        <Link href="/mantenimiento" className="btn">Cancelar</Link>
      </div>
    </form>
  );
}
