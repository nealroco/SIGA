"use client";

import { useActionState } from "react";
import Link from "next/link";
import type { FormState } from "@/actions/inventarios";

type Values = {
  id?: number;
  codigo?: string;
  nombre?: string;
  categoria?: string | null;
  ubicacion?: string | null;
  cantidad?: number;
};

type Action = (prev: FormState, fd: FormData) => Promise<FormState>;

export default function ItemForm({
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
          <input id="codigo" name="codigo" className="input" defaultValue={values.codigo ?? ""} placeholder="ITM-0001" required />
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
          <label htmlFor="categoria">Categoría</label>
          <input id="categoria" name="categoria" className="input" defaultValue={values.categoria ?? ""} />
        </div>
        <div className="field">
          <label htmlFor="ubicacion">Ubicación</label>
          <input id="ubicacion" name="ubicacion" className="input" defaultValue={values.ubicacion ?? ""} />
        </div>
        <div className="field">
          <label htmlFor="cantidad">Cantidad <span className="req">*</span></label>
          <input id="cantidad" name="cantidad" className="input" type="number" min={0} step="any" defaultValue={values.cantidad ?? 0} required />
          {fe.cantidad && <span className="err">{fe.cantidad}</span>}
        </div>
      </div>

      <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
        <button className="btn btn-primary" type="submit" disabled={pending}>
          {pending ? "Guardando…" : submitLabel}
        </button>
        <Link href="/inventarios" className="btn">Cancelar</Link>
      </div>
    </form>
  );
}
