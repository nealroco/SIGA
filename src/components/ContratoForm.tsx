"use client";

import { useActionState } from "react";
import Link from "next/link";
import type { FormState } from "@/actions/contratos";

type Values = {
  id?: number;
  numero?: string;
  objeto?: string;
  terceroId?: number;
  valorTotal?: number;
  fechaInicio?: string | null;
  fechaFin?: string | null;
  supervisor?: string | null;
  territorioId?: number | null;
};

type Tercero = { id: number; razonSocial: string; tipo: string };
type Territorio = { id: number; municipio: string; zona: string | null };
type Action = (prev: FormState, fd: FormData) => Promise<FormState>;

export default function ContratoForm({
  action,
  terceros,
  territorios = [],
  values = {},
  submitLabel,
}: {
  action: Action;
  terceros: Tercero[];
  territorios?: Territorio[];
  values?: Values;
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(action, {});
  const fe = state.fieldErrors ?? {};
  const d = (v?: string | null) => (v ? v.slice(0, 10) : "");

  return (
    <form action={formAction} className="card" style={{ padding: 24, maxWidth: 760 }}>
      {state.error && <div className="alert error">{state.error}</div>}
      {values.id ? <input type="hidden" name="id" value={values.id} /> : null}

      <div className="form-grid">
        <div className="field">
          <label htmlFor="numero">Número de contrato <span className="req">*</span></label>
          <input id="numero" name="numero" className="input" defaultValue={values.numero ?? ""} placeholder="CTO-2026-00X" required />
          {fe.numero && <span className="err">{fe.numero}</span>}
        </div>
        <div className="field">
          <label htmlFor="terceroId">Tercero (ESAL / operador) <span className="req">*</span></label>
          <select id="terceroId" name="terceroId" className="select" defaultValue={values.terceroId ?? ""} required>
            <option value="">Selecciona…</option>
            {terceros.map((t) => (
              <option key={t.id} value={t.id}>{t.razonSocial} · {t.tipo}</option>
            ))}
          </select>
          {fe.terceroId && <span className="err">{fe.terceroId}</span>}
        </div>
      </div>

      <div className="field">
        <label htmlFor="objeto">Objeto del contrato <span className="req">*</span></label>
        <input id="objeto" name="objeto" className="input" defaultValue={values.objeto ?? ""} required />
        {fe.objeto && <span className="err">{fe.objeto}</span>}
      </div>

      <div className="form-grid">
        <div className="field">
          <label htmlFor="valorTotal">Valor total (COP)</label>
          <input id="valorTotal" name="valorTotal" className="input" type="number" min={0} step="1000" defaultValue={values.valorTotal ?? 0} />
          {fe.valorTotal && <span className="err">{fe.valorTotal}</span>}
        </div>
        <div className="field">
          <label htmlFor="supervisor">Supervisor</label>
          <input id="supervisor" name="supervisor" className="input" defaultValue={values.supervisor ?? ""} />
        </div>
        <div className="field">
          <label htmlFor="territorioId">Municipio de ejecución</label>
          <select id="territorioId" name="territorioId" className="select" defaultValue={values.territorioId ?? ""}>
            <option value="">—</option>
            {territorios.map((t) => (
              <option key={t.id} value={t.id}>{t.municipio}{t.zona ? ` — ${t.zona}` : ""}</option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="fechaInicio">Fecha inicio</label>
          <input id="fechaInicio" name="fechaInicio" className="input" type="date" defaultValue={d(values.fechaInicio)} />
        </div>
        <div className="field">
          <label htmlFor="fechaFin">Fecha fin</label>
          <input id="fechaFin" name="fechaFin" className="input" type="date" defaultValue={d(values.fechaFin)} />
          {fe.fechaFin && <span className="err">{fe.fechaFin}</span>}
        </div>
      </div>

      <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
        <button className="btn btn-primary" type="submit" disabled={pending}>
          {pending ? "Guardando…" : submitLabel}
        </button>
        <Link href="/contratos" className="btn">Cancelar</Link>
      </div>
      <p className="page-sub" style={{ marginTop: 12 }}>
        Al registrar/editar, el contrato queda en estado <b>Registrado</b> (pendiente de aprobación del Administrador — RN-025).
      </p>
    </form>
  );
}
