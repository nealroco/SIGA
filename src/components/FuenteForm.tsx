"use client";

import { useActionState } from "react";
import Link from "next/link";
import type { FormState } from "@/actions/fuentes";

type Values = {
  id?: number;
  codigo?: string;
  nombre?: string;
  tipo?: string | null;
  valorDisponible?: number;
  vigencia?: string | null;
};

type Action = (prev: FormState, fd: FormData) => Promise<FormState>;

const TIPOS = ["Nación", "Departamento", "Municipio", "Cooperación", "Propios"];

export default function FuenteForm({
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
    <form action={formAction} className="card" style={{ padding: 24, maxWidth: 760 }}>
      {state.error && <div className="alert error">{state.error}</div>}
      {values.id ? <input type="hidden" name="id" value={values.id} /> : null}

      <div className="form-grid">
        <div className="field">
          <label htmlFor="codigo">Código <span className="req">*</span></label>
          <input id="codigo" name="codigo" className="input" defaultValue={values.codigo ?? ""} placeholder="FF-2026-00X" required />
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
          <label htmlFor="tipo">Tipo</label>
          <select id="tipo" name="tipo" className="select" defaultValue={values.tipo ?? ""}>
            <option value="">Selecciona…</option>
            {TIPOS.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
          {fe.tipo && <span className="err">{fe.tipo}</span>}
        </div>
        <div className="field">
          <label htmlFor="vigencia">Vigencia</label>
          <input id="vigencia" name="vigencia" className="input" defaultValue={values.vigencia ?? ""} placeholder="2026" />
          {fe.vigencia && <span className="err">{fe.vigencia}</span>}
        </div>
      </div>

      <div className="field">
        <label htmlFor="valorDisponible">Valor disponible (COP)</label>
        <input id="valorDisponible" name="valorDisponible" className="input" type="number" min={0} step="1000" defaultValue={values.valorDisponible ?? 0} />
        {fe.valorDisponible && <span className="err">{fe.valorDisponible}</span>}
      </div>

      <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
        <button className="btn btn-primary" type="submit" disabled={pending}>
          {pending ? "Guardando…" : submitLabel}
        </button>
        <Link href="/fuentes" className="btn">Cancelar</Link>
      </div>
      <p className="page-sub" style={{ marginTop: 12 }}>
        Al registrar/editar, la fuente queda en estado <b>Registrada</b> (pendiente de aprobación — RN-025).
      </p>
    </form>
  );
}
