"use client";

import { useActionState } from "react";
import Link from "next/link";
import type { FormState } from "@/actions/convocatorias";

type Values = {
  id?: number;
  nombre?: string;
  tipo?: string;
  descripcion?: string | null;
  cupos?: number;
  fechaApertura?: string | null;
  fechaCierre?: string | null;
};
type Action = (prev: FormState, fd: FormData) => Promise<FormState>;

export default function ConvocatoriaForm({ action, values = {}, submitLabel }: { action: Action; values?: Values; submitLabel: string }) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(action, {});
  const fe = state.fieldErrors ?? {};
  const d = (v?: string | null) => (v ? v.slice(0, 10) : "");

  return (
    <form action={formAction} className="card" style={{ padding: 24, maxWidth: 760 }}>
      {state.error && <div className="alert error">{state.error}</div>}
      {values.id ? <input type="hidden" name="id" value={values.id} /> : null}

      <div className="field">
        <label htmlFor="nombre">Nombre de la convocatoria <span className="req">*</span></label>
        <input id="nombre" name="nombre" className="input" defaultValue={values.nombre ?? ""} required />
        {fe.nombre && <span className="err">{fe.nombre}</span>}
      </div>
      <div className="field">
        <label htmlFor="descripcion">Descripción</label>
        <input id="descripcion" name="descripcion" className="input" defaultValue={values.descripcion ?? ""} />
      </div>
      <div className="form-grid">
        <div className="field">
          <label htmlFor="tipo">Tipo</label>
          <input id="tipo" name="tipo" className="input" defaultValue={values.tipo ?? "Beneficiarios"} />
        </div>
        <div className="field">
          <label htmlFor="cupos">Cupos</label>
          <input id="cupos" name="cupos" className="input" type="number" min={0} defaultValue={values.cupos ?? 0} />
          {fe.cupos && <span className="err">{fe.cupos}</span>}
        </div>
        <div className="field">
          <label htmlFor="fechaApertura">Apertura</label>
          <input id="fechaApertura" name="fechaApertura" className="input" type="date" defaultValue={d(values.fechaApertura)} />
        </div>
        <div className="field">
          <label htmlFor="fechaCierre">Cierre</label>
          <input id="fechaCierre" name="fechaCierre" className="input" type="date" defaultValue={d(values.fechaCierre)} />
        </div>
      </div>

      <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
        <button className="btn btn-primary" type="submit" disabled={pending}>{pending ? "Guardando…" : submitLabel}</button>
        <Link href="/convocatorias" className="btn">Cancelar</Link>
      </div>
    </form>
  );
}
