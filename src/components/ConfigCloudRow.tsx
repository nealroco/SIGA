"use client";

import { useActionState } from "react";
import { actualizarConfiguracionCloud, type FormState } from "@/actions/infraestructuraCloud";

type Props = {
  clave: string;
  valor: string;
  descripcion: string | null;
  actualizadoPor: string;
  updatedAt: string;
};

export default function ConfigCloudRow({ clave, valor, descripcion, actualizadoPor, updatedAt }: Props) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(actualizarConfiguracionCloud, {});

  return (
    <tr>
      <td className="mono">{clave}</td>
      <td>
        <form action={formAction} style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <input type="hidden" name="clave" value={clave} />
          <input
            name="nuevoValor"
            className="input"
            defaultValue={valor}
            style={{ width: 220 }}
            required
          />
          <button className="btn btn-sm" type="submit" disabled={pending}>
            {pending ? "Guardando…" : "Guardar"}
          </button>
        </form>
        {state.fieldErrors?.nuevoValor && <span className="err">{state.fieldErrors.nuevoValor}</span>}
        {state.error && <span className="err">{state.error}</span>}
      </td>
      <td>{descripcion ?? "—"}</td>
      <td>{actualizadoPor}</td>
      <td className="mono">{updatedAt}</td>
    </tr>
  );
}
