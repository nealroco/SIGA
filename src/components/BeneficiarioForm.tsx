"use client";

import { useActionState } from "react";
import Link from "next/link";
import type { FormState } from "@/actions/beneficiarios";

type Values = {
  id?: number;
  documento?: string;
  nombre?: string;
  edad?: number | null;
  sexo?: string | null;
  programa?: string | null;
  territorio?: string | null;
  acudiente?: string | null;
};

type Action = (prev: FormState, fd: FormData) => Promise<FormState>;

export default function BeneficiarioForm({
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
          <label htmlFor="edad">Edad</label>
          <input id="edad" name="edad" className="input" type="number" min={0} max={120} defaultValue={values.edad ?? ""} />
          {fe.edad && <span className="err">{fe.edad}</span>}
        </div>
        <div className="field">
          <label htmlFor="sexo">Sexo</label>
          <select id="sexo" name="sexo" className="select" defaultValue={values.sexo ?? ""}>
            <option value="">—</option>
            <option value="F">Femenino</option>
            <option value="M">Masculino</option>
            <option value="Otro">Otro</option>
          </select>
          {fe.sexo && <span className="err">{fe.sexo}</span>}
        </div>
        <div className="field">
          <label htmlFor="programa">Programa</label>
          <input id="programa" name="programa" className="input" defaultValue={values.programa ?? ""} placeholder="Escuela de fútbol…" />
        </div>
        <div className="field">
          <label htmlFor="territorio">Territorio</label>
          <input id="territorio" name="territorio" className="input" defaultValue={values.territorio ?? ""} placeholder="Municipio — zona" />
        </div>
        <div className="field">
          <label htmlFor="acudiente">Acudiente</label>
          <input id="acudiente" name="acudiente" className="input" defaultValue={values.acudiente ?? ""} />
        </div>
      </div>

      <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
        <button className="btn btn-primary" type="submit" disabled={pending}>
          {pending ? "Guardando…" : submitLabel}
        </button>
        <Link href="/beneficiarios" className="btn">Cancelar</Link>
      </div>
    </form>
  );
}
