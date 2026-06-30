"use client";

import { useActionState } from "react";
import Link from "next/link";
import type { FormState } from "@/actions/polizas";

type Values = {
  id?: number;
  contratoId?: number;
  tipo?: string | null;
  aseguradora?: string | null;
  valor?: number;
  vigenciaDesde?: string | null;
  vigenciaHasta?: string | null;
};

type Contrato = { id: number; numero: string; objeto: string };
type Action = (prev: FormState, fd: FormData) => Promise<FormState>;

const TIPOS = ["Cumplimiento", "Responsabilidad civil", "Calidad"];

export default function PolizaForm({
  action,
  contratos,
  values = {},
  submitLabel,
}: {
  action: Action;
  contratos: Contrato[];
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
          <label htmlFor="contratoId">Contrato <span className="req">*</span></label>
          <select id="contratoId" name="contratoId" className="select" defaultValue={values.contratoId ?? ""} required>
            <option value="">Selecciona…</option>
            {contratos.map((c) => (
              <option key={c.id} value={c.id}>{c.numero} · {c.objeto}</option>
            ))}
          </select>
          {fe.contratoId && <span className="err">{fe.contratoId}</span>}
        </div>
        <div className="field">
          <label htmlFor="tipo">Tipo de póliza</label>
          <select id="tipo" name="tipo" className="select" defaultValue={values.tipo ?? ""}>
            <option value="">Selecciona…</option>
            {TIPOS.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
          {fe.tipo && <span className="err">{fe.tipo}</span>}
        </div>
      </div>

      <div className="field">
        <label htmlFor="aseguradora">Aseguradora</label>
        <input id="aseguradora" name="aseguradora" className="input" defaultValue={values.aseguradora ?? ""} />
        {fe.aseguradora && <span className="err">{fe.aseguradora}</span>}
      </div>

      <div className="form-grid">
        <div className="field">
          <label htmlFor="valor">Valor asegurado (COP)</label>
          <input id="valor" name="valor" className="input" type="number" min={0} step="1000" defaultValue={values.valor ?? 0} />
          {fe.valor && <span className="err">{fe.valor}</span>}
        </div>
        <div className="field">
          <label htmlFor="vigenciaDesde">Vigencia desde</label>
          <input id="vigenciaDesde" name="vigenciaDesde" className="input" type="date" defaultValue={d(values.vigenciaDesde)} />
          {fe.vigenciaDesde && <span className="err">{fe.vigenciaDesde}</span>}
        </div>
        <div className="field">
          <label htmlFor="vigenciaHasta">Vigencia hasta</label>
          <input id="vigenciaHasta" name="vigenciaHasta" className="input" type="date" defaultValue={d(values.vigenciaHasta)} />
          {fe.vigenciaHasta && <span className="err">{fe.vigenciaHasta}</span>}
        </div>
      </div>

      <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
        <button className="btn btn-primary" type="submit" disabled={pending}>
          {pending ? "Guardando…" : submitLabel}
        </button>
        <Link href="/polizas" className="btn">Cancelar</Link>
      </div>
      <p className="page-sub" style={{ marginTop: 12 }}>
        Al registrar/editar, la póliza queda en estado <b>Registrada</b> (pendiente de aprobación — RN-025).
      </p>
    </form>
  );
}
