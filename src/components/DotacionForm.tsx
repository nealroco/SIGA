"use client";

import { useActionState } from "react";
import Link from "next/link";
import type { FormState } from "@/actions/dotacion";

type Beneficiario = { id: number; nombre: string; documento: string };
type Item = { id: number; codigo: string; nombre: string; cantidad: number };
type Action = (prev: FormState, fd: FormData) => Promise<FormState>;

export default function DotacionForm({
  action,
  beneficiarios,
  items,
  submitLabel,
}: {
  action: Action;
  beneficiarios: Beneficiario[];
  items: Item[];
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(action, {});
  const fe = state.fieldErrors ?? {};

  return (
    <form action={formAction} className="card" style={{ padding: 24, maxWidth: 760 }}>
      {state.error && <div className="alert error">{state.error}</div>}

      <div className="form-grid">
        <div className="field">
          <label htmlFor="beneficiarioId">Beneficiario <span className="req">*</span></label>
          <select id="beneficiarioId" name="beneficiarioId" className="select" defaultValue="" required>
            <option value="">Selecciona…</option>
            {beneficiarios.map((b) => (
              <option key={b.id} value={b.id}>{b.nombre} · {b.documento}</option>
            ))}
          </select>
          {fe.beneficiarioId && <span className="err">{fe.beneficiarioId}</span>}
        </div>
        <div className="field">
          <label htmlFor="itemId">Ítem <span className="req">*</span></label>
          <select id="itemId" name="itemId" className="select" defaultValue="" required>
            <option value="">Selecciona…</option>
            {items.map((i) => (
              <option key={i.id} value={i.id}>{i.codigo} · {i.nombre} (stock: {i.cantidad})</option>
            ))}
          </select>
          {fe.itemId && <span className="err">{fe.itemId}</span>}
        </div>
      </div>

      <div className="field">
        <label htmlFor="cantidad">Cantidad <span className="req">*</span></label>
        <input id="cantidad" name="cantidad" className="input" type="number" min={0} step="any" defaultValue={1} required />
        {fe.cantidad && <span className="err">{fe.cantidad}</span>}
      </div>

      <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
        <button className="btn btn-primary" type="submit" disabled={pending}>
          {pending ? "Guardando…" : submitLabel}
        </button>
        <Link href="/dotacion" className="btn">Cancelar</Link>
      </div>
      <p className="page-sub" style={{ marginTop: 12 }}>
        Al registrar la entrega se descuenta el stock del ítem. Si no hay stock suficiente, el registro será rechazado.
      </p>
    </form>
  );
}
