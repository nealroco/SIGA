"use client";

import { useActionState } from "react";
import Link from "next/link";
import type { FormState } from "@/actions/reservas";

type Values = {
  id?: number;
  nombre?: string;
  tipo?: string | null;
  direccion?: string | null;
  capacidad?: number | null;
};

type Action = (prev: FormState, fd: FormData) => Promise<FormState>;

export default function EscenarioForm({
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

  return (
    <form action={formAction} className="card" style={{ padding: 24, maxWidth: 720 }}>
      {state.error && <div className="alert error">{state.error}</div>}
      {values.id ? <input type="hidden" name="id" value={values.id} /> : null}

      <div className="form-grid">
        <div className="field">
          <label htmlFor="nombre">Nombre del escenario <span className="req">*</span></label>
          <input id="nombre" name="nombre" className="input" defaultValue={values.nombre ?? ""} placeholder="Coliseo Mayor…" required />
          {fe.nombre && <span className="err">{fe.nombre}</span>}
        </div>
        <div className="field">
          <label htmlFor="tipo">Tipo</label>
          <select id="tipo" name="tipo" className="select" defaultValue={values.tipo ?? ""}>
            <option value="">Selecciona…</option>
            <option value="Cancha">Cancha</option>
            <option value="Coliseo">Coliseo</option>
            <option value="Piscina">Piscina</option>
            <option value="Pista">Pista</option>
          </select>
          {fe.tipo && <span className="err">{fe.tipo}</span>}
        </div>
      </div>

      <div className="form-grid">
        <div className="field">
          <label htmlFor="direccion">Dirección</label>
          <input id="direccion" name="direccion" className="input" defaultValue={values.direccion ?? ""} placeholder="Dirección…" />
          {fe.direccion && <span className="err">{fe.direccion}</span>}
        </div>
        <div className="field">
          <label htmlFor="capacidad">Capacidad</label>
          <input id="capacidad" name="capacidad" className="input" type="number" min={0} step="any" defaultValue={values.capacidad ?? ""} />
          {fe.capacidad && <span className="err">{fe.capacidad}</span>}
        </div>
      </div>

      <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
        <button className="btn btn-primary" type="submit" disabled={pending}>
          {pending ? "Guardando…" : submitLabel}
        </button>
        <Link href="/reservas/escenarios" className="btn">Cancelar</Link>
      </div>
    </form>
  );
}
