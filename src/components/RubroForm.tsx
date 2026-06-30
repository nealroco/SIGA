"use client";

import { useActionState } from "react";
import Link from "next/link";
import type { FormState } from "@/actions/rubros";

type Fuente = { id: number; codigo: string; nombre: string };

type Values = {
  id?: number;
  codigo?: string;
  nombre?: string;
  fuenteId?: number;
  valorAsignado?: number;
  vigencia?: string | null;
};

type Action = (prev: FormState, fd: FormData) => Promise<FormState>;

export default function RubroForm({
  action,
  fuentes,
  values = {},
  submitLabel,
}: {
  action: Action;
  fuentes: Fuente[];
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
          <label htmlFor="codigo">Código <span className="req">*</span></label>
          <input id="codigo" name="codigo" className="input" defaultValue={values.codigo ?? ""} placeholder="RUB-2026-00X" required />
          {fe.codigo && <span className="err">{fe.codigo}</span>}
        </div>
        <div className="field">
          <label htmlFor="nombre">Nombre <span className="req">*</span></label>
          <input id="nombre" name="nombre" className="input" defaultValue={values.nombre ?? ""} required />
          {fe.nombre && <span className="err">{fe.nombre}</span>}
        </div>
      </div>

      <div className="form-grid">
        <div className="field">
          <label htmlFor="fuenteId">Fuente de financiación <span className="req">*</span></label>
          <select id="fuenteId" name="fuenteId" className="select" defaultValue={values.fuenteId ?? ""} required>
            <option value="">Selecciona…</option>
            {fuentes.map((f) => (
              <option key={f.id} value={f.id}>{f.codigo} · {f.nombre}</option>
            ))}
          </select>
          {fe.fuenteId && <span className="err">{fe.fuenteId}</span>}
        </div>
        <div className="field">
          <label htmlFor="vigencia">Vigencia</label>
          <input id="vigencia" name="vigencia" className="input" defaultValue={values.vigencia ?? ""} placeholder="2026" />
        </div>
      </div>

      <div className="field">
        <label htmlFor="valorAsignado">Meta de inversión (COP) <span className="req">*</span></label>
        <input id="valorAsignado" name="valorAsignado" className="input" type="number" min={0} step="any" defaultValue={values.valorAsignado ?? 0} required />
        {fe.valorAsignado && <span className="err">{fe.valorAsignado}</span>}
      </div>

      <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
        <button className="btn btn-primary" type="submit" disabled={pending}>
          {pending ? "Guardando…" : submitLabel}
        </button>
        <Link href="/rubros" className="btn">Cancelar</Link>
      </div>
      <p className="page-sub" style={{ marginTop: 12 }}>
        Al registrar/editar, el rubro queda en estado <b>Registrado</b> (pendiente de aprobación — RN-025).
        Solo rubros con meta de inversión <b>Aprobada</b> pueden recibir cuentas de cobro (RN-007).
      </p>
    </form>
  );
}
