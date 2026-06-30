"use client";

import { useActionState } from "react";
import Link from "next/link";
import type { FormState } from "@/actions/reservas";

type Escenario = { id: number; nombre: string; tipo: string | null };
type Action = (prev: FormState, fd: FormData) => Promise<FormState>;

export default function ReservaForm({
  action,
  escenarios,
  esAdministrador,
  submitLabel,
}: {
  action: Action;
  escenarios: Escenario[];
  esAdministrador: boolean;
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(action, {});
  const fe = state.fieldErrors ?? {};

  return (
    <form action={formAction} className="card" style={{ padding: 24, maxWidth: 760 }}>
      {state.error && <div className="alert error">{state.error}</div>}

      <div className="form-grid">
        <div className="field">
          <label htmlFor="escenarioId">Escenario <span className="req">*</span></label>
          <select id="escenarioId" name="escenarioId" className="select" defaultValue="" required>
            <option value="">Selecciona…</option>
            {escenarios.map((e) => (
              <option key={e.id} value={e.id}>{e.nombre}{e.tipo ? ` · ${e.tipo}` : ""}</option>
            ))}
          </select>
          {fe.escenarioId && <span className="err">{fe.escenarioId}</span>}
        </div>
        <div className="field">
          <label htmlFor="tipoUso">Tipo de uso</label>
          <input id="tipoUso" name="tipoUso" className="input" placeholder="Entrenamiento, torneo, evento…" />
          {fe.tipoUso && <span className="err">{fe.tipoUso}</span>}
        </div>
      </div>

      <div className="form-grid">
        <div className="field">
          <label htmlFor="fechaInicio">Fecha y hora de inicio <span className="req">*</span></label>
          <input id="fechaInicio" name="fechaInicio" className="input" type="datetime-local" required />
          {fe.fechaInicio && <span className="err">{fe.fechaInicio}</span>}
        </div>
        <div className="field">
          <label htmlFor="fechaFin">Fecha y hora de fin <span className="req">*</span></label>
          <input id="fechaFin" name="fechaFin" className="input" type="datetime-local" required />
          {fe.fechaFin && <span className="err">{fe.fechaFin}</span>}
        </div>
      </div>

      <div className="field">
        <label htmlFor="periodo">Periodo</label>
        <input id="periodo" name="periodo" className="input" placeholder="2026-1, semestre, temporada…" />
        {fe.periodo && <span className="err">{fe.periodo}</span>}
      </div>

      {esAdministrador && (
        <div className="card" style={{ padding: 16, marginBottom: 16, borderColor: "var(--coral)" }}>
          <div className="field" style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <input id="esEmergencia" name="esEmergencia" type="checkbox" value="true" style={{ width: "auto" }} />
            <label htmlFor="esEmergencia" style={{ marginBottom: 0 }}>Override de emergencia (RN-024-B)</label>
          </div>
          <p className="page-sub" style={{ marginBottom: 10 }}>
            Solo Administrador puede marcar esta opción (RN-024-B). Al marcarla, la reserva se crea sin chequeo de
            solapamiento y queda registrada como conflicto de tipo Override.
          </p>
          <div className="field" style={{ marginBottom: 0 }}>
            <label htmlFor="motivoEmergencia">Motivo de la emergencia</label>
            <input id="motivoEmergencia" name="motivoEmergencia" className="input" placeholder="Motivo…" />
            {fe.motivoEmergencia && <span className="err">{fe.motivoEmergencia}</span>}
          </div>
        </div>
      )}

      <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
        <button className="btn btn-primary" type="submit" disabled={pending}>
          {pending ? "Guardando…" : submitLabel}
        </button>
        <Link href="/reservas" className="btn">Cancelar</Link>
      </div>
      <p className="page-sub" style={{ marginTop: 12 }}>
        RN-024: la reserva se rechaza automáticamente si se solapa (con margen de 30 min) con otra reserva activa del
        mismo escenario.
      </p>
    </form>
  );
}
