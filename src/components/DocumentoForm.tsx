"use client";

import { useActionState } from "react";
import Link from "next/link";
import type { FormState } from "@/actions/documental";

type Contrato = { id: number; numero: string };
type Action = (prev: FormState, fd: FormData) => Promise<FormState>;

export default function DocumentoForm({
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
    <form action={formAction} className="card" style={{ padding: 24, maxWidth: 720 }}>
      {state.error && <div className="alert error">{state.error}</div>}

      <div className="form-grid">
        <div className="field">
          <label htmlFor="contratoId">Contrato <span className="req">*</span></label>
          <select id="contratoId" name="contratoId" className="select" defaultValue="" required>
            <option value="">Selecciona…</option>
            {contratos.map((c) => (
              <option key={c.id} value={c.id}>{c.numero}</option>
            ))}
          </select>
          {fe.contratoId && <span className="err">{fe.contratoId}</span>}
        </div>
        <div className="field">
          <label htmlFor="tipoDocumento">Tipo de documento <span className="req">*</span></label>
          <input id="tipoDocumento" name="tipoDocumento" className="input" placeholder="Acta de inicio, Póliza…" required />
          {fe.tipoDocumento && <span className="err">{fe.tipoDocumento}</span>}
        </div>
      </div>

      <div className="field" style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <input id="obligatorio" name="obligatorio" type="checkbox" style={{ width: "auto" }} />
        <label htmlFor="obligatorio" style={{ marginBottom: 0 }}>Documento obligatorio del expediente</label>
      </div>

      <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
        <button className="btn btn-primary" type="submit" disabled={pending}>
          {pending ? "Guardando…" : submitLabel}
        </button>
        <Link href="/documental" className="btn">Cancelar</Link>
      </div>
      <p className="page-sub" style={{ marginTop: 12 }}>
        El documento se crea en estado <b>Pendiente</b>; la evidencia se adjunta luego como versiones (RN-012, append-only).
      </p>
    </form>
  );
}
