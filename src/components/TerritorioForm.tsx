"use client";

import { useActionState } from "react";
import Link from "next/link";
import type { FormState } from "@/actions/territorios";

type Values = {
  id?: number;
  codigo?: string;
  municipio?: string;
  zona?: string | null;
  poblacion?: number | null;
  lat?: number | null;
  lng?: number | null;
};

type Action = (prev: FormState, fd: FormData) => Promise<FormState>;

export default function TerritorioForm({
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
          <label htmlFor="codigo">Código <span className="req">*</span></label>
          <input id="codigo" name="codigo" className="input" defaultValue={values.codigo ?? ""} placeholder="TER-001" required />
          {fe.codigo && <span className="err">{fe.codigo}</span>}
        </div>
        <div className="field">
          <label htmlFor="municipio">Municipio <span className="req">*</span></label>
          <input id="municipio" name="municipio" className="input" defaultValue={values.municipio ?? ""} required />
          {fe.municipio && <span className="err">{fe.municipio}</span>}
        </div>
        <div className="field">
          <label htmlFor="zona">Zona</label>
          <input id="zona" name="zona" className="input" defaultValue={values.zona ?? ""} placeholder="Urbana, rural, comuna…" />
          {fe.zona && <span className="err">{fe.zona}</span>}
        </div>
        <div className="field">
          <label htmlFor="poblacion">Población</label>
          <input id="poblacion" name="poblacion" className="input" type="number" min={0} step="any" defaultValue={values.poblacion ?? ""} />
          {fe.poblacion && <span className="err">{fe.poblacion}</span>}
        </div>
        <div className="field">
          <label htmlFor="lat">Latitud</label>
          <input id="lat" name="lat" className="input" type="number" step="any" defaultValue={values.lat ?? ""} placeholder="4.6097" />
          {fe.lat && <span className="err">{fe.lat}</span>}
        </div>
        <div className="field">
          <label htmlFor="lng">Longitud</label>
          <input id="lng" name="lng" className="input" type="number" step="any" defaultValue={values.lng ?? ""} placeholder="-74.0817" />
          {fe.lng && <span className="err">{fe.lng}</span>}
        </div>
      </div>

      <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
        <button className="btn btn-primary" type="submit" disabled={pending}>
          {pending ? "Guardando…" : submitLabel}
        </button>
        <Link href="/territorios" className="btn">Cancelar</Link>
      </div>
    </form>
  );
}
