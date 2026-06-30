"use client";

import { useActionState } from "react";
import Link from "next/link";
import type { FormState } from "@/actions/financiera";

type Values = {
  id?: number;
  contratoId?: number;
  rubroId?: number;
  periodo?: string;
  valorCobrado?: number;
  informeId?: number | null;
};

type Contrato = { id: number; numero: string; objeto: string; estado: string };
type Rubro = { id: number; codigo: string; nombre: string };
type Action = (prev: FormState, fd: FormData) => Promise<FormState>;

export default function CuentaForm({
  action,
  contratos,
  rubros,
  values = {},
  submitLabel,
}: {
  action: Action;
  contratos: Contrato[];
  rubros: Rubro[];
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
          <label htmlFor="contratoId">Contrato <span className="req">*</span></label>
          <select id="contratoId" name="contratoId" className="select" defaultValue={values.contratoId ?? ""} required>
            <option value="">Selecciona…</option>
            {contratos.map((c) => (
              <option key={c.id} value={c.id} disabled={c.estado !== "Aprobado"}>
                {c.numero} · {c.objeto}{c.estado !== "Aprobado" ? " (no aprobado)" : ""}
              </option>
            ))}
          </select>
          {fe.contratoId && <span className="err">{fe.contratoId}</span>}
        </div>
        <div className="field">
          <label htmlFor="rubroId">Rubro presupuestal <span className="req">*</span></label>
          <select id="rubroId" name="rubroId" className="select" defaultValue={values.rubroId ?? ""} required>
            <option value="">Selecciona…</option>
            {rubros.map((r) => (
              <option key={r.id} value={r.id}>{r.codigo} · {r.nombre}</option>
            ))}
          </select>
          {fe.rubroId && <span className="err">{fe.rubroId}</span>}
        </div>
      </div>

      <div className="form-grid">
        <div className="field">
          <label htmlFor="periodo">Período <span className="req">*</span></label>
          <input id="periodo" name="periodo" className="input" defaultValue={values.periodo ?? ""} placeholder="2026-01" required />
          {fe.periodo && <span className="err">{fe.periodo}</span>}
        </div>
        <div className="field">
          <label htmlFor="valorCobrado">Valor cobrado (COP)</label>
          <input id="valorCobrado" name="valorCobrado" className="input" type="number" min={0} step="1000" defaultValue={values.valorCobrado ?? 0} />
          {fe.valorCobrado && <span className="err">{fe.valorCobrado}</span>}
        </div>
      </div>

      <div className="field">
        <label htmlFor="informeId">ID de informe (opcional)</label>
        <input id="informeId" name="informeId" className="input" type="number" min={1} defaultValue={values.informeId ?? ""} />
        {fe.informeId && <span className="err">{fe.informeId}</span>}
      </div>
      <p className="page-sub" style={{ marginTop: -8, marginBottom: 16 }}>
        RN-006: si indicas un informe, debe estar en estado <b>Aprobado</b>. Si el módulo de Informes aún no aplica a este
        contrato, puedes dejarlo en blanco — la cuenta queda igualmente imputada al rubro seleccionado (RN-007).
      </p>

      <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
        <button className="btn btn-primary" type="submit" disabled={pending}>
          {pending ? "Guardando…" : submitLabel}
        </button>
        <Link href="/financiera" className="btn">Cancelar</Link>
      </div>
      <p className="page-sub" style={{ marginTop: 12 }}>
        Al registrar/editar, la cuenta queda en estado <b>Registrada</b> (pendiente de aprobación del Administrador — RN-025).
        RN-005: el contrato debe estar Aprobado.
      </p>
    </form>
  );
}
