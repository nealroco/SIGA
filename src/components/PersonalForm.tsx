"use client";

import { useActionState } from "react";
import Link from "next/link";
import type { FormState } from "@/actions/personal";

type Values = {
  id?: number;
  documento?: string;
  nombre?: string;
  cargo?: string | null;
  perfil?: string | null;
  tipoVinculacion?: string | null;
  fechaIngreso?: string | null;
  correo?: string | null;
  telefono?: string | null;
};

type Action = (prev: FormState, fd: FormData) => Promise<FormState>;

export default function PersonalForm({
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
    <form action={formAction} className="card" style={{ padding: 24, maxWidth: 720 }}>
      {state.error && <div className="alert error">{state.error}</div>}
      {values.id ? <input type="hidden" name="id" value={values.id} /> : null}

      <div className="form-grid">
        <div className="field">
          <label htmlFor="documento">Documento <span className="req">*</span></label>
          <input id="documento" name="documento" className="input" defaultValue={values.documento ?? ""} required />
          {fe.documento && <span className="err">{fe.documento}</span>}
        </div>
        <div className="field">
          <label htmlFor="nombre">Nombre completo <span className="req">*</span></label>
          <input id="nombre" name="nombre" className="input" defaultValue={values.nombre ?? ""} required />
          {fe.nombre && <span className="err">{fe.nombre}</span>}
        </div>
        <div className="field">
          <label htmlFor="cargo">Cargo</label>
          <input id="cargo" name="cargo" className="input" defaultValue={values.cargo ?? ""} placeholder="Coordinador deportivo…" />
          {fe.cargo && <span className="err">{fe.cargo}</span>}
        </div>
        <div className="field">
          <label htmlFor="perfil">Perfil</label>
          <input id="perfil" name="perfil" className="input" defaultValue={values.perfil ?? ""} placeholder="Profesional en cultura física…" />
          {fe.perfil && <span className="err">{fe.perfil}</span>}
        </div>
        <div className="field">
          <label htmlFor="tipoVinculacion">Tipo de vinculación</label>
          <select id="tipoVinculacion" name="tipoVinculacion" className="select" defaultValue={values.tipoVinculacion ?? ""}>
            <option value="">—</option>
            <option value="Planta">Planta</option>
            <option value="Contratista">Contratista</option>
            <option value="OPS">OPS</option>
          </select>
          {fe.tipoVinculacion && <span className="err">{fe.tipoVinculacion}</span>}
        </div>
        <div className="field">
          <label htmlFor="fechaIngreso">Fecha de ingreso</label>
          <input id="fechaIngreso" name="fechaIngreso" className="input" type="date" defaultValue={d(values.fechaIngreso)} />
          {fe.fechaIngreso && <span className="err">{fe.fechaIngreso}</span>}
        </div>
        <div className="field">
          <label htmlFor="correo">Correo</label>
          <input id="correo" name="correo" className="input" type="email" defaultValue={values.correo ?? ""} />
          {fe.correo && <span className="err">{fe.correo}</span>}
        </div>
        <div className="field">
          <label htmlFor="telefono">Teléfono</label>
          <input id="telefono" name="telefono" className="input" defaultValue={values.telefono ?? ""} />
          {fe.telefono && <span className="err">{fe.telefono}</span>}
        </div>
      </div>

      <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
        <button className="btn btn-primary" type="submit" disabled={pending}>
          {pending ? "Guardando…" : submitLabel}
        </button>
        <Link href="/personal" className="btn">Cancelar</Link>
      </div>
    </form>
  );
}
