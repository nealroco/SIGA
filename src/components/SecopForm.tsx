"use client";

import { useActionState } from "react";
import Link from "next/link";
import type { FormState } from "@/actions/secop";

type Contrato = { id: number; numero: string; objeto: string };
type Action = (prev: FormState, fd: FormData) => Promise<FormState>;

export default function SecopForm({
  action,
  contratos,
  submitLabel,
}: {
  action: Action;
  contratos: Contrato[];
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(action, {});
  const fe = state.fieldErrors ?? {};

  return (
    <form action={formAction} className="card" style={{ padding: 24, maxWidth: 760 }}>
      {state.error && <div className="alert error">{state.error}</div>}

      <div className="form-grid">
        <div className="field">
          <label htmlFor="contratoId">Contrato <span className="req">*</span></label>
          <select id="contratoId" name="contratoId" className="select" defaultValue="" required>
            <option value="">Selecciona…</option>
            {contratos.map((c) => (
              <option key={c.id} value={c.id}>{c.numero} · {c.objeto}</option>
            ))}
          </select>
          {fe.contratoId && <span className="err">{fe.contratoId}</span>}
        </div>
        <div className="field">
          <label htmlFor="procesoSecop">Proceso SECOP <span className="req">*</span></label>
          <input
            id="procesoSecop"
            name="procesoSecop"
            className="input"
            placeholder="CO1.BDOS.1234567"
            required
          />
          {fe.procesoSecop && <span className="err">{fe.procesoSecop}</span>}
        </div>
      </div>

      <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
        <button className="btn btn-primary" type="submit" disabled={pending}>
          {pending ? "Guardando…" : submitLabel}
        </button>
        <Link href="/secop" className="btn">Cancelar</Link>
      </div>
      <p className="page-sub" style={{ marginTop: 12 }}>
        Al registrar, el proceso SECOP queda en estado <b>Registrado</b> (pendiente de aprobación — RN-025).
      </p>
    </form>
  );
}
