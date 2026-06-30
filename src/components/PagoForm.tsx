"use client";

import { ordenarPago } from "@/actions/financiera";

export default function PagoForm({ cuentaCobroId }: { cuentaCobroId: number }) {
  return (
    <form action={ordenarPago} className="card" style={{ padding: 24, marginTop: 18, maxWidth: 760 }}>
      <p className="section-cap">Ordenar pago</p>
      <input type="hidden" name="cuentaCobroId" value={cuentaCobroId} />

      <div className="form-grid">
        <div className="field">
          <label htmlFor="valorPagado">Valor a ordenar (COP) <span className="req">*</span></label>
          <input id="valorPagado" name="valorPagado" className="input" type="number" min={0} step="any" required />
        </div>
        <div className="field">
          <label htmlFor="medioPago">Medio de pago</label>
          <select id="medioPago" name="medioPago" className="select" defaultValue="Orden bancaria">
            <option value="Orden bancaria">Orden bancaria</option>
            <option value="Cheque">Cheque</option>
            <option value="Giro">Giro</option>
          </select>
        </div>
      </div>

      <div className="field">
        <label htmlFor="comprobante">Referencia / comprobante</label>
        <input id="comprobante" name="comprobante" className="input" placeholder="N.º de orden o referencia interna" />
      </div>

      <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
        <button className="btn btn-primary" type="submit">Ordenar pago</button>
      </div>
      <p className="page-sub" style={{ marginTop: 12 }}>
        No es una transacción en línea: esta orden queda <b>pendiente de aprobación</b> del Administrador
        (RN-025, doble control). RN-008: no puede superar el valor aprobado de la cuenta. RN-009: no puede
        superar el saldo disponible del rubro.
      </p>
    </form>
  );
}
