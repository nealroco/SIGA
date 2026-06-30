"use client";

import { useActionState } from "react";
import Link from "next/link";
import type { FormState } from "@/actions/comunicaciones";

type Values = {
  id?: number;
  tipo?: string;
  canal?: string | null;
  asunto?: string;
  contenido?: string | null;
  publico?: string | null;
};

type Action = (prev: FormState, fd: FormData) => Promise<FormState>;

export default function ComunicacionForm({
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
          <label htmlFor="tipo">Tipo <span className="req">*</span></label>
          <select id="tipo" name="tipo" className="select" defaultValue={values.tipo ?? "Interna"} required>
            <option value="Interna">Interna</option>
            <option value="Externa">Externa</option>
            <option value="Prensa">Prensa</option>
          </select>
          {fe.tipo && <span className="err">{fe.tipo}</span>}
        </div>
        <div className="field">
          <label htmlFor="canal">Canal</label>
          <select id="canal" name="canal" className="select" defaultValue={values.canal ?? ""}>
            <option value="">Selecciona…</option>
            <option value="Correo">Correo</option>
            <option value="WhatsApp">WhatsApp</option>
            <option value="Boletín">Boletín</option>
            <option value="Redes">Redes</option>
          </select>
          {fe.canal && <span className="err">{fe.canal}</span>}
        </div>
      </div>

      <div className="field">
        <label htmlFor="asunto">Asunto <span className="req">*</span></label>
        <input id="asunto" name="asunto" className="input" defaultValue={values.asunto ?? ""} required />
        {fe.asunto && <span className="err">{fe.asunto}</span>}
      </div>

      <div className="field">
        <label htmlFor="contenido">Contenido</label>
        <textarea id="contenido" name="contenido" className="input" rows={6} defaultValue={values.contenido ?? ""} />
        {fe.contenido && <span className="err">{fe.contenido}</span>}
      </div>

      <div className="field">
        <label htmlFor="publico">Público objetivo</label>
        <input id="publico" name="publico" className="input" defaultValue={values.publico ?? ""} placeholder="A quién va dirigida" />
        {fe.publico && <span className="err">{fe.publico}</span>}
      </div>

      <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
        <button className="btn btn-primary" type="submit" disabled={pending}>
          {pending ? "Guardando…" : submitLabel}
        </button>
        <Link href="/comunicaciones" className="btn">Cancelar</Link>
      </div>
    </form>
  );
}
