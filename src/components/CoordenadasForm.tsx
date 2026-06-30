"use client";

import { useActionState } from "react";
import Link from "next/link";
import type { FormState } from "@/actions/georeferenciacion";
import { actualizarCoordenadas } from "@/actions/georeferenciacion";

export default function CoordenadasForm({
  tipo,
  id,
  nombre,
  lat,
  lng,
}: {
  tipo: "Territorio" | "Escenario";
  id: number;
  nombre: string;
  lat: number | null;
  lng: number | null;
}) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(actualizarCoordenadas, {});
  const fe = state.fieldErrors ?? {};

  return (
    <form action={formAction} className="card" style={{ padding: 24, maxWidth: 560 }}>
      {state.error && <div className="alert error">{state.error}</div>}
      <input type="hidden" name="tipo" value={tipo} />
      <input type="hidden" name="id" value={id} />

      <p className="section-cap">{tipo} · {nombre}</p>

      <div className="form-grid">
        <div className="field">
          <label htmlFor="lat">Latitud <span className="req">*</span></label>
          <input
            id="lat"
            name="lat"
            className="input"
            type="number"
            min={-90}
            max={90}
            step="any"
            defaultValue={lat ?? ""}
            required
          />
          {fe.lat && <span className="err">{fe.lat}</span>}
        </div>
        <div className="field">
          <label htmlFor="lng">Longitud <span className="req">*</span></label>
          <input
            id="lng"
            name="lng"
            className="input"
            type="number"
            min={-180}
            max={180}
            step="any"
            defaultValue={lng ?? ""}
            required
          />
          {fe.lng && <span className="err">{fe.lng}</span>}
        </div>
      </div>

      <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
        <button className="btn btn-primary" type="submit" disabled={pending}>
          {pending ? "Guardando…" : "Guardar coordenadas"}
        </button>
        <Link href="/georeferenciacion" className="btn">Cancelar</Link>
      </div>
    </form>
  );
}
