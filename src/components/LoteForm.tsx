"use client";

import { useActionState } from "react";
import Link from "next/link";
import type { FormState } from "@/actions/lotes";

type Values = {
  id?: number;
  codigo?: string;
  direccion?: string | null;
  area?: number | null;
  territorioId?: number | null;
};

type Action = (prev: FormState, fd: FormData) => Promise<FormState>;

export default function LoteForm({
  action,
  values = {},
  submitLabel,
  territorios = [],
}: {
  action: Action;
  values?: Values;
  submitLabel: string;
  territorios?: { id: number; codigo: string; municipio: string; zona: string | null }[];
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
          <input id="codigo" name="codigo" className="input" defaultValue={values.codigo ?? ""} placeholder="LOTE-001" required />
          {fe.codigo && <span className="err">{fe.codigo}</span>}
        </div>
        <div className="field">
          <label htmlFor="territorioId">Territorio</label>
          <select id="territorioId" name="territorioId" className="select" defaultValue={values.territorioId ?? ""}>
            <option value="">—</option>
            {territorios.map((t) => (
              <option key={t.id} value={t.id}>{t.municipio}{t.zona ? ` — ${t.zona}` : ""}</option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="direccion">Dirección</label>
          <input id="direccion" name="direccion" className="input" defaultValue={values.direccion ?? ""} />
          {fe.direccion && <span className="err">{fe.direccion}</span>}
        </div>
        <div className="field">
          <label htmlFor="area">Área (m²)</label>
          <input id="area" name="area" className="input" type="number" min={0} step="any" defaultValue={values.area ?? ""} />
          {fe.area && <span className="err">{fe.area}</span>}
        </div>
      </div>

      <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
        <button className="btn btn-primary" type="submit" disabled={pending}>
          {pending ? "Guardando…" : submitLabel}
        </button>
        <Link href="/lotes" className="btn">Cancelar</Link>
      </div>
    </form>
  );
}
